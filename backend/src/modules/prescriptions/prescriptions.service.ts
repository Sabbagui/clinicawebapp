import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionType, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { signpdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CertificateService } from './certificate.service';
import { PdfBuilderService } from './pdf-builder.service';
import { IssuePrescriptionDto } from './dto/issue-prescription.dto';

interface AccessUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly certificateService: CertificateService,
    private readonly pdfBuilderService: PdfBuilderService,
  ) {}

  private getPrescriptionStoragePath(): string {
    const base = process.env.PRESCRIPTION_STORAGE_PATH ?? 'uploads/prescriptions';
    const abs = path.isAbsolute(base) ? base : path.join(process.cwd(), base);
    fs.mkdirSync(abs, { recursive: true });
    return abs;
  }

  async issuePrescription(
    dto: IssuePrescriptionDto,
    requestingUser: AccessUser,
    ip?: string,
    userAgent?: string,
  ) {
    // 1. Carrega o prontuário com paciente, médico e prescrições
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: dto.medicalRecordId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!record) throw new NotFoundException('Prontuário não encontrado.');

    // 2. Validações
    if (!record.prescriptions || (record.prescriptions as object[]).length === 0) {
      throw new BadRequestException('O prontuário não possui prescrições.');
    }

    // Médico só pode emitir receita do próprio prontuário; ADMIN pode emitir qualquer um
    if (requestingUser.role === UserRole.DOCTOR && record.doctorId !== requestingUser.id) {
      throw new ForbiddenException('Você não pode emitir receita de um prontuário de outro médico.');
    }

    const doctorId = record.doctorId;
    const doctor = record.doctor;

    if (!doctor.crm || !doctor.crmUf) {
      throw new BadRequestException(
        'CRM do médico não cadastrado. Acesse Meu Perfil e preencha o CRM antes de emitir receitas.',
      );
    }

    // 3. Hash de autenticidade
    const issuedAt = new Date();
    const canonicalPayload = JSON.stringify({
      prescriptions: record.prescriptions,
      doctorId,
      patientId: record.patientId,
      medicalRecordId: record.id,
      issuedAt: issuedAt.toISOString(),
    });
    const authHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

    // 4. Monta dados para o PDF
    const p = record.patient;
    const pdfData = {
      patient: {
        name: p.name,
        cpf: p.cpf,
        street: p.street,
        number: p.number,
        complement: p.complement,
        neighborhood: p.neighborhood,
        city: p.city,
        state: p.state,
        zipCode: p.zipCode,
      },
      doctor: {
        name: doctor.name,
        crm: doctor.crm,
        crmUf: doctor.crmUf,
        clinicName: doctor.clinicName ?? doctor.name,
        clinicAddress: doctor.clinicAddress ?? '',
        clinicPhone: doctor.clinicPhone ?? '',
      },
      prescriptions: record.prescriptions as {
        drug: string; dosage: string; frequency: string; duration: string; instructions: string;
      }[],
      cid10: record.cid10,
      issuedAt,
      authHash,
      type: dto.type,
    };

    // 5. Gera PDF (com placeholder para assinatura)
    let pdfBuffer = await this.pdfBuilderService.buildPrescription(pdfData);

    // 6. Assina com o certificado do médico
    let isSigned = false;
    try {
      const { p12Buffer, password } = await this.certificateService.loadDecryptedP12(doctorId);
      const signer = new P12Signer(p12Buffer, { passphrase: password });
      pdfBuffer = await signpdf.sign(pdfBuffer, signer);
      isSigned = true;
    } catch (err: any) {
      // Se o médico não tem certificado configurado, emite sem assinatura (aviso)
      if (err instanceof BadRequestException) {
        // sem certificado → PDF sem assinatura digital
        isSigned = false;
      } else {
        throw err;
      }
    }

    // 7. Salva PDF no disco
    const filename = `${crypto.randomUUID()}.pdf`;
    const storagePath = this.getPrescriptionStoragePath();
    fs.writeFileSync(path.join(storagePath, filename), pdfBuffer);
    const pdfPath = `prescriptions/${filename}`;

    // 8. Calcula expiração (30 dias para C1)
    const expiresAt =
      dto.type === PrescriptionType.CONTROLE_ESPECIAL_C1
        ? new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        : null;

    // 9. Persiste no banco
    const issued = await this.prisma.issuedPrescription.create({
      data: {
        medicalRecordId: record.id,
        doctorId,
        patientId: record.patientId,
        type: dto.type,
        pdfPath,
        authHash,
        isSigned,
        issuedAt,
        expiresAt,
      },
    });

    // 10. Audit log
    await this.auditService.log({
      actorUserId: requestingUser.id,
      actorRole: requestingUser.role,
      action: 'PRESCRIPTION_ISSUED',
      entityType: 'IssuedPrescription',
      entityId: issued.id,
      metadata: { type: dto.type, isSigned, medicalRecordId: record.id },
      ip,
      userAgent,
    });

    return { ...issued, pdfUrl: `/uploads/${pdfPath}` };
  }

  async findByMedicalRecord(medicalRecordId: string, requestingUser: AccessUser) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: medicalRecordId },
      select: { doctorId: true },
    });
    if (!record) throw new NotFoundException('Prontuário não encontrado.');

    if (requestingUser.role === UserRole.DOCTOR && record.doctorId !== requestingUser.id) {
      throw new ForbiddenException('Acesso negado.');
    }

    const items = await this.prisma.issuedPrescription.findMany({
      where: { medicalRecordId },
      orderBy: { issuedAt: 'desc' },
    });

    return items.map((i) => ({ ...i, pdfUrl: `/uploads/${i.pdfPath}` }));
  }

  async getPdfBuffer(prescriptionId: string, requestingUser: AccessUser) {
    const item = await this.prisma.issuedPrescription.findUnique({
      where: { id: prescriptionId },
    });
    if (!item) throw new NotFoundException('Receita não encontrada.');

    if (requestingUser.role === UserRole.DOCTOR && item.doctorId !== requestingUser.id) {
      throw new ForbiddenException('Acesso negado.');
    }

    const abs = path.isAbsolute(item.pdfPath)
      ? item.pdfPath
      : path.join(process.cwd(), 'uploads', item.pdfPath.replace('prescriptions/', ''));

    // Tenta o caminho direto ou via uploads/
    const fullPath = fs.existsSync(abs)
      ? abs
      : path.join(process.cwd(), 'uploads', 'prescriptions', path.basename(item.pdfPath));

    if (!fs.existsSync(fullPath)) throw new NotFoundException('Arquivo PDF não encontrado.');

    const buffer = fs.readFileSync(fullPath);
    const filename = `receita-${item.type.toLowerCase()}-${new Date(item.issuedAt).toISOString().slice(0, 10)}.pdf`;
    return { buffer, filename };
  }
}
