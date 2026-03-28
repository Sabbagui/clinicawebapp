import { Injectable } from '@nestjs/common';
import { PrescriptionType } from '@prisma/client';
import * as PDFDocument from 'pdfkit';
import { pdfkitAddPlaceholder } from '@signpdf/placeholder-pdfkit';
import * as qrcode from 'qrcode';
import { numberToWords } from '../../common/utils/number-to-words';

export interface PrescriptionItem {
  drug: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionPdfData {
  patient: {
    name: string;
    cpf: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  doctor: {
    name: string;
    crm: string;
    crmUf: string;
    clinicName: string;
    clinicAddress: string;
    clinicPhone: string;
  };
  prescriptions: PrescriptionItem[];
  cid10?: string | null;
  issuedAt: Date;
  authHash: string;
  type: PrescriptionType;
}

// Formata CPF: 12345678901 → 123.456.789-01
function formatCpf(cpf: string): string {
  const c = cpf.replace(/\D/g, '');
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Formata CEP: 12345678 → 12345-678
function formatCep(cep: string): string {
  const c = cep.replace(/\D/g, '');
  return c.replace(/(\d{5})(\d{3})/, '$1-$2');
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

async function streamToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

@Injectable()
export class PdfBuilderService {

  async buildPrescription(data: PrescriptionPdfData): Promise<Buffer> {
    if (data.type === PrescriptionType.SIMPLES) {
      return this.buildReceitaSimples(data);
    }
    return this.buildReceitaC1(data);
  }

  // ─── Receita Simples ──────────────────────────────────────────────────────

  private async buildReceitaSimples(data: PrescriptionPdfData): Promise<Buffer> {
    const qrDataUrl = await qrcode.toDataURL(
      JSON.stringify({ hash: data.authHash.slice(0, 16), issuedAt: data.issuedAt.toISOString() }),
      { width: 80, margin: 1 },
    );
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });
    doc.addPage();

    this.drawReceitaSimplesPage(doc, data, qrBuffer);

    pdfkitAddPlaceholder({ pdf: doc as any, reason: 'Assinatura digital ICP-Brasil' });
    return streamToBuffer(doc);
  }

  private drawReceitaSimplesPage(
    doc: InstanceType<typeof PDFDocument>,
    data: PrescriptionPdfData,
    qrBuffer: Buffer,
  ): void {
    const W = doc.page.width;
    const margin = 50;
    let y = margin;

    // ── Cabeçalho
    doc.font('Helvetica-Bold').fontSize(14)
      .text(data.doctor.clinicName || 'Clínica', margin, y, { align: 'center', width: W - margin * 2 });
    y += 18;
    doc.font('Helvetica').fontSize(9)
      .text(data.doctor.clinicAddress || '', margin, y, { align: 'center', width: W - margin * 2 });
    y += 12;
    doc.text(data.doctor.clinicPhone || '', margin, y, { align: 'center', width: W - margin * 2 });
    y += 20;

    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor('#000').stroke();
    y += 10;

    doc.font('Helvetica-Bold').fontSize(12)
      .text('RECEITUÁRIO MÉDICO', margin, y, { align: 'center', width: W - margin * 2 });
    y += 22;

    // ── Dados do paciente
    doc.font('Helvetica').fontSize(10)
      .text(`Paciente: ${data.patient.name}`, margin, y);
    doc.text(`CPF: ${formatCpf(data.patient.cpf)}`, margin + 320, y);
    y += 16;
    doc.text(`Data: ${formatDate(data.issuedAt)}`, margin, y);
    y += 24;

    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor('#ccc').stroke();
    y += 14;

    // ── Prescrições
    data.prescriptions.forEach((rx, i) => {
      if (y > 680) { doc.addPage(); y = margin; }

      doc.font('Helvetica-Bold').fontSize(10)
        .text(`${i + 1}. ${rx.drug}${rx.dosage ? ` — ${rx.dosage}` : ''}`, margin, y);
      y += 15;
      doc.font('Helvetica').fontSize(10)
        .text(`Uso: ${rx.frequency} por ${rx.duration}`, margin + 12, y);
      y += 14;
      if (rx.instructions) {
        doc.text(`Instruções: ${rx.instructions}`, margin + 12, y);
        y += 14;
      }
      y += 6;
    });

    if (data.cid10) {
      y += 4;
      doc.font('Helvetica').fontSize(9).fillColor('#555')
        .text(`CID-10: ${data.cid10}`, margin, y);
      doc.fillColor('#000');
      y += 16;
    }

    // ── Assinatura
    y = Math.max(y + 20, 640);
    doc.moveTo(margin + 20, y).lineTo(margin + 220, y).strokeColor('#000').stroke();
    y += 6;
    doc.font('Helvetica').fontSize(9)
      .text(`Dr(a). ${data.doctor.name}`, margin + 20, y);
    y += 12;
    doc.text(`CRM ${data.doctor.crm}/${data.doctor.crmUf}`, margin + 20, y);

    // ── QR code + hash (canto inferior direito)
    const qrX = W - margin - 85;
    const qrY = doc.page.height - margin - 90;
    doc.image(qrBuffer, qrX, qrY, { width: 75 });
    doc.font('Helvetica').fontSize(7).fillColor('#555')
      .text(`Auth: ${data.authHash.slice(0, 16)}...`, qrX - 10, qrY + 77, { width: 95, align: 'center' });
    doc.fillColor('#000');
  }

  // ─── Receita C1 (Controle Especial — 2 vias) ─────────────────────────────

  private async buildReceitaC1(data: PrescriptionPdfData): Promise<Buffer> {
    const qrDataUrl = await qrcode.toDataURL(
      JSON.stringify({ hash: data.authHash.slice(0, 16), issuedAt: data.issuedAt.toISOString() }),
      { width: 80, margin: 1 },
    );
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });

    // 1ª via — farmácia
    doc.addPage();
    this.drawReceitaC1Page(doc, data, qrBuffer, '1ª VIA — FARMÁCIA');

    // 2ª via — paciente
    doc.addPage();
    this.drawReceitaC1Page(doc, data, qrBuffer, '2ª VIA — PACIENTE');

    pdfkitAddPlaceholder({ pdf: doc as any, reason: 'Assinatura digital ICP-Brasil' });
    return streamToBuffer(doc);
  }

  private drawReceitaC1Page(
    doc: InstanceType<typeof PDFDocument>,
    data: PrescriptionPdfData,
    qrBuffer: Buffer,
    viaLabel: string,
  ): void {
    const W = doc.page.width;
    const margin = 50;
    let y = margin;

    // ── Banner ANVISA
    doc.rect(margin, y, W - margin * 2, 36).fillAndStroke('#1a1a2e', '#1a1a2e');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
      .text('RECEITA DE CONTROLE ESPECIAL', margin, y + 5, { align: 'center', width: W - margin * 2 });
    doc.font('Helvetica').fontSize(8)
      .text('Portaria SVS/MS nº 344/98', margin, y + 20, { align: 'center', width: W - margin * 2 });
    doc.fillColor('#000');
    y += 50;

    // ── Via
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#555')
      .text(viaLabel, margin, y, { align: 'right', width: W - margin * 2 });
    doc.fillColor('#000');
    y += 18;

    // ── Médico
    doc.font('Helvetica-Bold').fontSize(10).text('IDENTIFICAÇÃO DO EMITENTE', margin, y);
    y += 14;
    doc.font('Helvetica').fontSize(10).text(`Dr(a). ${data.doctor.name}`, margin, y);
    y += 14;
    doc.text(`CRM: ${data.doctor.crm}/${data.doctor.crmUf}`, margin, y);
    y += 14;
    doc.text(data.doctor.clinicAddress || '', margin, y);
    y += 14;
    doc.text(data.doctor.clinicPhone || '', margin, y);
    y += 20;

    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor('#ccc').stroke();
    y += 14;

    // ── Paciente
    const address = [
      data.patient.street,
      data.patient.number,
      data.patient.complement,
      data.patient.neighborhood,
      `${data.patient.city}/${data.patient.state}`,
      `CEP: ${formatCep(data.patient.zipCode)}`,
    ].filter(Boolean).join(', ');

    doc.font('Helvetica-Bold').fontSize(10).text('IDENTIFICAÇÃO DO PACIENTE', margin, y);
    y += 14;
    doc.font('Helvetica').fontSize(10)
      .text(`Nome: ${data.patient.name}`, margin, y);
    y += 14;
    doc.text(`CPF: ${formatCpf(data.patient.cpf)}`, margin, y);
    y += 14;
    doc.text(`Endereço: ${address}`, margin, y, { width: W - margin * 2 });
    y += 28;

    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor('#ccc').stroke();
    y += 14;

    // ── Medicamentos
    doc.font('Helvetica-Bold').fontSize(10).text('PRESCRIÇÃO', margin, y);
    if (data.cid10) {
      doc.font('Helvetica').fontSize(9).fillColor('#555')
        .text(`CID-10: ${data.cid10}`, margin + 200, y + 2);
      doc.fillColor('#000');
    }
    y += 18;

    data.prescriptions.forEach((rx, i) => {
      if (y > 640) { return; } // segurança: evita overflow

      // Estima quantidade a partir da duração (ex: "30 dias" → 30)
      const daysMatch = rx.duration.match(/(\d+)/);
      const qty = daysMatch ? parseInt(daysMatch[1], 10) : 30;
      const qtyWords = numberToWords(qty);

      doc.font('Helvetica-Bold').fontSize(10)
        .text(`${i + 1}. ${rx.drug}${rx.dosage ? ` ${rx.dosage}` : ''}`, margin, y);
      y += 15;
      doc.font('Helvetica').fontSize(10)
        .text(`Quantidade: ${qty} (${qtyWords}) unidade(s)`, margin + 12, y);
      y += 14;
      doc.text(`Posologia: ${rx.frequency} por ${rx.duration}`, margin + 12, y);
      y += 14;
      if (rx.instructions) {
        doc.text(`Instruções: ${rx.instructions}`, margin + 12, y);
        y += 14;
      }
      y += 8;
    });

    // ── Validade
    const expiry = new Date(data.issuedAt);
    expiry.setDate(expiry.getDate() + 30);

    y += 4;
    doc.font('Helvetica').fontSize(9).fillColor('#555')
      .text(
        `Válido por 30 dias — emitido em ${formatDate(data.issuedAt)} — vencimento: ${formatDate(expiry)}`,
        margin, y,
      );
    doc.fillColor('#000');
    y += 22;

    // ── Assinatura
    y = Math.max(y, 630);
    doc.moveTo(margin + 20, y).lineTo(margin + 220, y).strokeColor('#000').stroke();
    y += 6;
    doc.font('Helvetica').fontSize(9)
      .text(`Assinatura — Dr(a). ${data.doctor.name}`, margin + 20, y);
    y += 12;
    doc.text(`CRM ${data.doctor.crm}/${data.doctor.crmUf}    Data: ___/___/______`, margin + 20, y);

    // ── QR + hash
    const qrX = W - margin - 85;
    const qrY = doc.page.height - margin - 90;
    doc.image(qrBuffer, qrX, qrY, { width: 75 });
    doc.font('Helvetica').fontSize(7).fillColor('#555')
      .text(`Auth: ${data.authHash.slice(0, 16)}...`, qrX - 10, qrY + 77, { width: 95, align: 'center' });
    doc.fillColor('#000');
  }
}
