'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import { getPatients } from '@/lib/api/endpoints/patients';
import { getDoctors, type Doctor } from '@/lib/api/endpoints/users';
import {
  type AppointmentType,
  type CreateAppointmentDto,
  createAppointment,
  getAvailableSlots,
} from '@/lib/api/appointments';

const appointmentTypeOptions: Array<{ value: AppointmentType; label: string }> = [
  { value: 'FIRST_VISIT', label: 'Primeira Consulta' },
  { value: 'FOLLOW_UP', label: 'Retorno' },
  { value: 'EXAM', label: 'Exame' },
  { value: 'PROCEDURE', label: 'Procedimento' },
  { value: 'URGENT', label: 'Urgencia' },
];

const formSchema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente'),
  doctorId: z.string().min(1, 'Selecione um médico'),
  type: z.enum(['FIRST_VISIT', 'FOLLOW_UP', 'EXAM', 'PROCEDURE', 'URGENT']),
  date: z.string().min(1, 'Informe a data'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário inválido'),
  notes: z.string().max(500, 'Máximo de 500 caracteres').optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PatientOption {
  id: string;
  name: string;
  cpf: string;
}

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  defaultTime?: string;
  defaultDoctorId?: string;
  onCreated: () => Promise<void> | void;
}

export function NewAppointmentModal({
  open,
  onClose,
  defaultDate,
  defaultTime,
  defaultDoctorId,
  onCreated,
}: NewAppointmentModalProps) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [isPatientLoading, setIsPatientLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slots, setSlots] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: '',
      doctorId: defaultDoctorId ?? '',
      type: 'FIRST_VISIT',
      date: defaultDate,
      startTime: defaultTime ?? '',
      notes: '',
    },
  });

  const selectedDoctorId = watch('doctorId');
  const selectedDate = watch('date');

  useEffect(() => {
    if (!open) return;
    reset({
      patientId: '',
      doctorId: defaultDoctorId ?? '',
      type: 'FIRST_VISIT',
      date: defaultDate,
      startTime: defaultTime ?? '',
      notes: '',
    });
    setSearch('');
    setError(null);
  }, [open, defaultDate, defaultTime, defaultDoctorId, reset]);

  useEffect(() => {
    if (!open) return;
    getDoctors().then(setDoctors).catch(() => {
      setError('Não foi possível carregar médicos.');
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setIsPatientLoading(true);
      try {
        const data = await getPatients();
        const query = search.trim().toLowerCase();
        const filtered = data
          .filter((patient) => {
            if (!query) return true;
            return (
              patient.name.toLowerCase().includes(query) ||
              patient.cpf.includes(query.replace(/\D/g, ''))
            );
          })
          .slice(0, 25)
          .map((patient) => ({
            id: patient.id,
            name: patient.name,
            cpf: patient.cpf,
          }));
        setPatients(filtered);
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Falha ao buscar pacientes.'));
      } finally {
        setIsPatientLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [open, search]);

  useEffect(() => {
    if (!open || !selectedDoctorId || !selectedDate) {
      setSlots([]);
      return;
    }

    getAvailableSlots(selectedDoctorId, selectedDate)
      .then(setSlots)
      .catch((apiError) => {
        setError(getApiErrorMessage(apiError, 'Falha ao carregar horários disponíveis.'));
        setSlots([]);
      });
  }, [open, selectedDoctorId, selectedDate]);

  const patientOptions = useMemo(() => {
    return patients.map((patient) => ({
      value: patient.id,
      label: `${patient.name} - ${patient.cpf}`,
    }));
  }, [patients]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateAppointmentDto = {
        patientId: values.patientId,
        doctorId: values.doctorId,
        type: values.type,
        date: values.date,
        startTime: values.startTime,
        notes: values.notes?.trim() || undefined,
      };
      await createAppointment(payload);
      await onCreated();
      onClose();
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, 'Erro ao criar agendamento.');
      setError(message);
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo Agendamento"
      description="Preencha os dados para criar um novo agendamento."
      className="max-w-2xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="space-y-2">
          <Label htmlFor="patient-search">Buscar paciente</Label>
          <Input
            id="patient-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite nome ou CPF"
          />
          {isPatientLoading && <p className="text-xs text-muted-foreground">Buscando pacientes...</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="patientId">Paciente</Label>
          <Select id="patientId" {...register('patientId')} error={errors.patientId?.message}>
            <option value="">Selecione...</option>
            {patientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doctorId">Médico</Label>
            <Select id="doctorId" {...register('doctorId')} error={errors.doctorId?.message}>
              <option value="">Selecione...</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select id="type" {...register('type')} error={errors.type?.message}>
              {appointmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" {...register('date')} error={errors.date?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Horário</Label>
            <Select id="startTime" {...register('startTime')} error={errors.startTime?.message}>
              <option value="">Selecione...</option>
              {slots.map((slot) => (
                <option key={slot.startTime} value={slot.startTime}>
                  {slot.startTime} - {slot.endTime}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Informações adicionais"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
