import { z } from 'zod';

// Helper validator functions
const cpfValidator = z
  .string()
  .min(1, 'CPF é obrigatório')
  .refine((val) => {
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length === 11;
  }, 'CPF deve conter 11 dígitos');

const phoneValidator = z
  .string()
  .min(1, 'Telefone é obrigatório')
  .refine((val) => {
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length === 11;
  }, 'Telefone deve conter 11 dígitos (DDD + número)');

const optionalPhoneValidator = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val || val === '') return true;
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length === 11;
    },
    'Telefone deve conter 11 dígitos (DDD + número)'
  );

const zipCodeValidator = z
  .string()
  .min(1, 'CEP é obrigatório')
  .refine((val) => {
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length === 8;
  }, 'CEP deve conter 8 dígitos');

const birthDateValidator = z
  .string()
  .min(1, 'Data de nascimento é obrigatória')
  .refine((val) => {
    const date = new Date(val);
    const today = new Date();
    return date < today;
  }, 'Data de nascimento não pode ser no futuro')
  .refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Data de nascimento inválida');

const stateValidator = z
  .string()
  .min(1, 'Estado é obrigatório')
  .length(2, 'Estado deve ter 2 caracteres')
  .toUpperCase();

// Main patient form schema
export const patientFormSchema = z.object({
  // Basic Information
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),

  cpf: cpfValidator,

  birthDate: birthDateValidator,

  // Contact Information
  phone: phoneValidator,

  whatsapp: optionalPhoneValidator,

  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),

  // Address
  address: z.object({
    zipCode: zipCodeValidator,

    street: z
      .string()
      .min(3, 'Rua é obrigatória')
      .max(100, 'Rua deve ter no máximo 100 caracteres'),

    number: z
      .string()
      .min(1, 'Número é obrigatório')
      .max(10, 'Número deve ter no máximo 10 caracteres'),

    complement: z
      .string()
      .max(50, 'Complemento deve ter no máximo 50 caracteres')
      .optional()
      .or(z.literal('')),

    neighborhood: z
      .string()
      .min(2, 'Bairro é obrigatório')
      .max(50, 'Bairro deve ter no máximo 50 caracteres'),

    city: z
      .string()
      .min(2, 'Cidade é obrigatória')
      .max(50, 'Cidade deve ter no máximo 50 caracteres'),

    state: stateValidator,
  }),

  // Emergency Contact (optional - all fields are optional)
  emergencyContact: z
    .object({
      name: z
        .string()
        .min(3, 'Nome deve ter no mínimo 3 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),

      relationship: z
        .string()
        .min(2, 'Relacionamento é obrigatório')
        .max(50, 'Relacionamento deve ter no máximo 50 caracteres'),

      phone: phoneValidator,
    })
    .optional(),
});

export type PatientFormData = z.infer<typeof patientFormSchema>;
