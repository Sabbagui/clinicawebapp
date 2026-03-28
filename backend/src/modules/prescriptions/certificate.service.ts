import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as forge from 'node-forge';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface CertificateMeta {
  id: string;
  subjectCN: string | null;
  issuerCN: string | null;
  notBefore: Date | null;
  notAfter: Date | null;
  uploadedAt: Date;
}

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private getEncryptionKey(doctorId: string): Buffer {
    const masterKey = process.env.CERT_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('CERT_ENCRYPTION_KEY não está definida nas variáveis de ambiente.');
    }
    // Chave derivada específica por médico usando scrypt
    return crypto.scryptSync(masterKey, doctorId, 32) as Buffer;
  }

  private encryptBuffer(data: Buffer, key: Buffer): { iv: string; authTag: string; ciphertext: Buffer } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { iv: iv.toString('hex'), authTag: authTag.toString('hex'), ciphertext };
  }

  private decryptBuffer(ciphertext: Buffer, key: Buffer, iv: string, authTag: string): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  private getCertStoragePath(): string {
    const base = process.env.CERT_STORAGE_PATH ?? 'uploads/certificates';
    const abs = path.isAbsolute(base) ? base : path.join(process.cwd(), base);
    fs.mkdirSync(abs, { recursive: true });
    return abs;
  }

  private extractCertMetadata(p12Buffer: Buffer, password: string) {
    try {
      const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;

      if (!cert) return { subjectCN: null, issuerCN: null, notBefore: null, notAfter: null };

      const subjectCN = cert.subject.getField('CN')?.value ?? null;
      const issuerCN = cert.issuer.getField('CN')?.value ?? null;
      const notBefore = cert.validity.notBefore ?? null;
      const notAfter = cert.validity.notAfter ?? null;

      return { subjectCN, issuerCN, notBefore, notAfter };
    } catch {
      this.logger.warn('Não foi possível extrair metadados do certificado — verifique senha e formato.');
      return { subjectCN: null, issuerCN: null, notBefore: null, notAfter: null };
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async saveCertificate(
    doctorId: string,
    fileBuffer: Buffer,
    password: string,
  ): Promise<CertificateMeta> {
    const key = this.getEncryptionKey(doctorId);

    // Valida o .p12 antes de salvar
    const meta = this.extractCertMetadata(fileBuffer, password);

    // Criptografa o arquivo .p12
    const { iv, authTag, ciphertext } = this.encryptBuffer(fileBuffer, key);

    // Criptografa a senha
    const { iv: pwIv, authTag: pwAuthTag, ciphertext: pwCiphertext } = this.encryptBuffer(
      Buffer.from(password, 'utf-8'),
      key,
    );
    const encPassword = `${pwIv}:${pwAuthTag}:${pwCiphertext.toString('hex')}`;

    // Salva o arquivo criptografado em disco
    const storagePath = this.getCertStoragePath();
    const filePath = path.join(storagePath, `${doctorId}.enc`);
    fs.writeFileSync(filePath, ciphertext);

    const storedPath = `certificates/${doctorId}.enc`;

    // Remove certificado anterior se existir
    await this.prisma.doctorCertificate.deleteMany({ where: { doctorId } });

    // Persiste metadados no banco
    const record = await this.prisma.doctorCertificate.create({
      data: {
        doctorId,
        storedPath,
        iv,
        authTag,
        encPassword,
        subjectCN: meta.subjectCN,
        issuerCN: meta.issuerCN,
        notBefore: meta.notBefore,
        notAfter: meta.notAfter,
      },
    });

    return {
      id: record.id,
      subjectCN: record.subjectCN,
      issuerCN: record.issuerCN,
      notBefore: record.notBefore,
      notAfter: record.notAfter,
      uploadedAt: record.uploadedAt,
    };
  }

  async loadDecryptedP12(doctorId: string): Promise<{ p12Buffer: Buffer; password: string }> {
    const record = await this.prisma.doctorCertificate.findUnique({ where: { doctorId } });
    if (!record) {
      throw new BadRequestException(
        'Certificado digital não configurado. Acesse Meu Perfil para fazer o upload do seu certificado ICP-Brasil.',
      );
    }

    // Valida expiração
    if (record.notAfter && record.notAfter < new Date()) {
      throw new BadRequestException(
        `Certificado digital expirado em ${record.notAfter.toLocaleDateString('pt-BR')}. Faça upload de um certificado válido.`,
      );
    }

    const key = this.getEncryptionKey(doctorId);

    // Lê e descriptografa o arquivo
    const storagePath = this.getCertStoragePath();
    const filePath = path.join(storagePath, `${doctorId}.enc`);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo de certificado não encontrado no servidor.');
    }
    const ciphertext = fs.readFileSync(filePath);
    const p12Buffer = this.decryptBuffer(ciphertext, key, record.iv, record.authTag);

    // Descriptografa a senha
    const [pwIv, pwAuthTag, pwHex] = record.encPassword.split(':');
    const password = this.decryptBuffer(
      Buffer.from(pwHex, 'hex'),
      key,
      pwIv,
      pwAuthTag,
    ).toString('utf-8');

    return { p12Buffer, password };
  }

  async getCertificateMeta(doctorId: string): Promise<CertificateMeta | null> {
    const record = await this.prisma.doctorCertificate.findUnique({ where: { doctorId } });
    if (!record) return null;
    return {
      id: record.id,
      subjectCN: record.subjectCN,
      issuerCN: record.issuerCN,
      notBefore: record.notBefore,
      notAfter: record.notAfter,
      uploadedAt: record.uploadedAt,
    };
  }

  async deleteCertificate(doctorId: string): Promise<void> {
    const record = await this.prisma.doctorCertificate.findUnique({ where: { doctorId } });
    if (!record) return;

    // Remove arquivo físico
    const storagePath = this.getCertStoragePath();
    const filePath = path.join(storagePath, `${doctorId}.enc`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await this.prisma.doctorCertificate.delete({ where: { doctorId } });
  }
}
