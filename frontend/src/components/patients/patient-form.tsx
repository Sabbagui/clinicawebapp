'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientFormData, patientFormSchema } from '@/lib/validation/patient-schema';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { BRAZILIAN_STATES } from '@/lib/constants/brazilian-states';
import { formatCPF, formatPhone, formatZipCode, stripFormatting } from '@/lib/utils';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PatientFormProps {
  defaultValues?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function PatientForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
}: PatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: defaultValues || {
      address: {},
    },
  });

  const zipCode = watch('address.zipCode');

  // Auto-format CPF on blur
  const handleCPFBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue('cpf', formatted);
  };

  // Auto-format phone on blur
  const handlePhoneBlur = (field: 'phone' | 'whatsapp' | 'emergencyContact.phone') => (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const formatted = formatPhone(e.target.value);
    setValue(field, formatted);
  };

  // Auto-format ZIP code and fetch address
  const handleZipCodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatZipCode(e.target.value);
    setValue('address.zipCode', formatted);

    // Fetch address from ViaCEP
    const cleanedZip = stripFormatting(formatted);
    if (cleanedZip.length === 8) {
      setIsFetchingAddress(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedZip}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setValue('address.street', data.logradouro || '');
          setValue('address.neighborhood', data.bairro || '');
          setValue('address.city', data.localidade || '');
          setValue('address.state', data.uf || '');
        }
      } catch (error) {
        console.error('Error fetching address:', error);
      } finally {
        setIsFetchingAddress(false);
      }
    }
  };

  const handleFormSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Maria Silva Santos"
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              {...register('cpf')}
              onBlur={handleCPFBlur}
              error={errors.cpf?.message}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="birthDate">Data de Nascimento *</Label>
            <Controller
              control={control}
              name="birthDate"
              render={({ field }) => (
                <DateInput
                  id="birthDate"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.birthDate?.message}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Contato</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              {...register('phone')}
              onBlur={handlePhoneBlur('phone')}
              error={errors.phone?.message}
              placeholder="(11) 98765-4321"
              maxLength={15}
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              {...register('whatsapp')}
              onBlur={handlePhoneBlur('whatsapp')}
              error={errors.whatsapp?.message}
              placeholder="(11) 98765-4321"
              maxLength={15}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="maria.silva@email.com"
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="zipCode">CEP *</Label>
            <div className="relative">
              <Input
                id="zipCode"
                {...register('address.zipCode')}
                onBlur={handleZipCodeBlur}
                error={errors.address?.zipCode?.message}
                placeholder="00000-000"
                maxLength={9}
              />
              {isFetchingAddress && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="street">Rua *</Label>
            <Input
              id="street"
              {...register('address.street')}
              error={errors.address?.street?.message}
              placeholder="Rua das Flores"
            />
          </div>

          <div>
            <Label htmlFor="number">Número *</Label>
            <Input
              id="number"
              {...register('address.number')}
              error={errors.address?.number?.message}
              placeholder="123"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              {...register('address.complement')}
              error={errors.address?.complement?.message}
              placeholder="Apto 45"
            />
          </div>

          <div>
            <Label htmlFor="neighborhood">Bairro *</Label>
            <Input
              id="neighborhood"
              {...register('address.neighborhood')}
              error={errors.address?.neighborhood?.message}
              placeholder="Centro"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              {...register('address.city')}
              error={errors.address?.city?.message}
              placeholder="São Paulo"
            />
          </div>

          <div>
            <Label htmlFor="state">Estado *</Label>
            <Select
              id="state"
              {...register('address.state')}
              error={errors.address?.state?.message}
            >
              <option value="">Selecione...</option>
              {BRAZILIAN_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">
          Contato de Emergência (Opcional)
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Nome</Label>
            <Input
              id="emergencyContactName"
              {...register('emergencyContact.name')}
              error={errors.emergencyContact?.name?.message}
              placeholder="João Silva"
            />
          </div>

          <div>
            <Label htmlFor="emergencyContactRelationship">Relação</Label>
            <Input
              id="emergencyContactRelationship"
              {...register('emergencyContact.relationship')}
              error={errors.emergencyContact?.relationship?.message}
              placeholder="Esposo, Filho(a), etc."
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactPhone">Telefone</Label>
            <Input
              id="emergencyContactPhone"
              {...register('emergencyContact.phone')}
              onBlur={handlePhoneBlur('emergencyContact.phone')}
              error={errors.emergencyContact?.phone?.message}
              placeholder="(11) 98765-4321"
              maxLength={15}
            />
          </div>
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
