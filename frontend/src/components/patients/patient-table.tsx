'use client';

import { Patient } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatCPF, formatPhone, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PatientTableProps {
  patients: Patient[];
  onDelete: (id: string) => void;
}

export function PatientTable({ patients, onDelete }: PatientTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Data Nasc.</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">{patient.name}</TableCell>
              <TableCell>{formatCPF(patient.cpf)}</TableCell>
              <TableCell>{formatPhone(patient.phone)}</TableCell>
              <TableCell>{formatDate(patient.birthDate)}</TableCell>
              <TableCell>
                {patient.address.city} - {patient.address.state}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      router.push(`/dashboard/patients/${patient.id}`)
                    }
                    title="Ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      router.push(`/dashboard/patients/${patient.id}/edit`)
                    }
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(patient.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
