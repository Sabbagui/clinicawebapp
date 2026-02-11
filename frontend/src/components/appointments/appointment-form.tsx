'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AppointmentFormData,
  appointmentFormSchema,
} from '@/lib/validation/appointment-schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PatientSelect } from './patient-select';
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_DURATIONS,
  TIME_SLOTS,
} from '@/lib/constants/appointment-constants';
import { getDoctors, type Doctor } from '@/lib/api/endpoints/users';
import { Loader2 } from 'lucide-react';

interface AppointmentFormProps {
  defaultValues?: Partial<AppointmentFormData>;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function AppointmentForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
}: AppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      duration: 30,
      ...defaultValues,
    },
  });

  useEffect(() => {
    getDoctors().then(setDoctors).catch(console.error);
  }, []);

  const handleFormSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Patient Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Paciente</h3>
        <div>
          <Label>Paciente *</Label>
          <Controller
            name="patientId"
            control={control}
            render={({ field }) => (
              <PatientSelect
                value={field.value}
                onChange={field.onChange}
                error={errors.patientId?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Doctor and Type */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Consulta</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="doctorId">Médico(a) *</Label>
            <Select
              id="doctorId"
              {...register('doctorId')}
              error={errors.doctorId?.message}
            >
              <option value="">Selecione...</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Tipo *</Label>
            <Select
              id="type"
              {...register('type')}
              error={errors.type?.message}
            >
              <option value="">Selecione...</option>
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Date and Time */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Data e Horário</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />
          </div>

          <div>
            <Label htmlFor="time">Horário *</Label>
            <Select
              id="time"
              {...register('time')}
              error={errors.time?.message}
            >
              <option value="">Selecione...</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="duration">Duração *</Label>
            <Select
              id="duration"
              {...register('duration', { valueAsNumber: true })}
              error={errors.duration?.message}
            >
              {APPOINTMENT_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Observações</h3>
        <div>
          <Label htmlFor="notes">Observações</Label>
          <textarea
            id="notes"
            {...register('notes')}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Observações sobre a consulta..."
            maxLength={500}
          />
          {errors.notes?.message && (
            <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
