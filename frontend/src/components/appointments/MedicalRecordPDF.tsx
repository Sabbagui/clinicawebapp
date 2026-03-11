'use client';

import { useMemo } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import type { MedicalRecord } from '@/types';
import type { Appointment } from '@/lib/api/endpoints/appointments';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Register a standard font so text renders cleanly
Font.register({
  family: 'Helvetica',
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 12,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 2,
  },
  clinicSubtitle: {
    fontSize: 9,
    color: '#6b7280',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 20,
  },
  metaLabel: {
    fontWeight: 'bold',
    width: 80,
    color: '#374151',
  },
  metaValue: {
    flex: 1,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    paddingBottom: 3,
  },
  soapLabel: {
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 3,
  },
  soapText: {
    color: '#111827',
    lineHeight: 1.5,
    marginBottom: 10,
    paddingLeft: 8,
  },
  cid10Row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  cid10Code: {
    fontWeight: 'bold',
    color: '#1e40af',
    fontFamily: 'Courier',
  },
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 9,
  },
  col1: { width: '20%' },
  col2: { width: '12%' },
  col3: { width: '15%' },
  col4: { width: '12%' },
  col5: { width: '41%' },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

function formatDate(isoOrNull?: string | null) {
  if (!isoOrNull) return '—';
  return new Date(isoOrNull).toLocaleDateString('pt-BR');
}

function formatDateTime(isoOrNull?: string | null) {
  if (!isoOrNull) return '—';
  return new Date(isoOrNull).toLocaleString('pt-BR');
}

interface PDFDocProps {
  record: MedicalRecord;
  appointment: Appointment;
}

function PDFDocument({ record, appointment }: PDFDocProps) {
  const prescriptions = record.prescriptions ?? [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.clinicName}>Clínica Ginecológica</Text>
          <Text style={styles.clinicSubtitle}>Prontuário Médico — Confidencial</Text>
        </View>

        {/* Meta */}
        <View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Paciente:</Text>
            <Text style={styles.metaValue}>{appointment.patient?.name ?? '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Médico(a):</Text>
            <Text style={styles.metaValue}>{appointment.doctor?.name ?? '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Data:</Text>
            <Text style={styles.metaValue}>{appointment.scheduledDate ? appointment.scheduledDate.toLocaleDateString('pt-BR') : '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tipo:</Text>
            <Text style={styles.metaValue}>{appointment.type}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status:</Text>
            <Text style={styles.metaValue}>{record.status}</Text>
          </View>
          {record.cid10 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>CID-10:</Text>
              <Text style={[styles.metaValue, { fontFamily: 'Courier', color: '#1e40af' }]}>{record.cid10}</Text>
            </View>
          )}
        </View>

        {/* SOAP */}
        <Text style={styles.sectionTitle}>Notas SOAP</Text>

        {[
          { key: 'subjective', label: 'Subjetivo (S)' },
          { key: 'objective', label: 'Objetivo (O)' },
          { key: 'assessment', label: 'Avaliação (A)' },
          { key: 'plan', label: 'Plano (P)' },
        ].map(({ key, label }) => (
          <View key={key}>
            <Text style={styles.soapLabel}>{label}</Text>
            <Text style={styles.soapText}>{(record as unknown as Record<string, unknown>)[key] as string || '(sem conteúdo)'}</Text>
          </View>
        ))}

        {/* Prescriptions */}
        {prescriptions.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Prescrições</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Medicamento</Text>
                <Text style={styles.col2}>Dose</Text>
                <Text style={styles.col3}>Frequência</Text>
                <Text style={styles.col4}>Duração</Text>
                <Text style={styles.col5}>Instruções</Text>
              </View>
              {prescriptions.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{p.drug}</Text>
                  <Text style={styles.col2}>{p.dosage}</Text>
                  <Text style={styles.col3}>{p.frequency}</Text>
                  <Text style={styles.col4}>{p.duration}</Text>
                  <Text style={styles.col5}>{p.instructions}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Finalizado em {formatDateTime(record.finalizedAt)}
          {record.finalizedBy ? ` por ${record.finalizedBy.name}` : ''}
          {' — '}Documento gerado em {new Date().toLocaleString('pt-BR')}
        </Text>
      </Page>
    </Document>
  );
}

interface MedicalRecordPDFProps {
  record: MedicalRecord;
  appointment: Appointment;
}

export function MedicalRecordPDF({ record, appointment }: MedicalRecordPDFProps) {
  const dateStr = useMemo(() => {
    if (!appointment.scheduledDate) return 'prontuario';
    return new Date(appointment.scheduledDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
  }, [appointment]);

  return (
    <PDFDownloadLink
      document={<PDFDocument record={record} appointment={appointment} />}
      fileName={`prontuario-${dateStr}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" disabled={loading} type="button">
          <Download className="mr-2 h-4 w-4" />
          {loading ? 'Gerando PDF...' : 'Exportar PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
