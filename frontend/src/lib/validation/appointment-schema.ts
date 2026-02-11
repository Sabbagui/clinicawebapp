import { z } from 'zod';

export const appointmentFormSchema = z.object({
  patientId: z.string().min(1, 'Paciente é obrigatório'),

  doctorId: z.string().min(1, 'Médico(a) é obrigatório'),

  date: z
    .string()
    .min(1, 'Data é obrigatória')
    .refine((val) => !isNaN(new Date(val).getTime()), 'Data inválida'),

  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:MM'),

  duration: z
    .number()
    .min(15, 'Duração mínima de 15 minutos')
    .max(120, 'Duração máxima de 120 minutos'),

  type: z.string().min(1, 'Tipo de consulta é obrigatório'),

  notes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;
