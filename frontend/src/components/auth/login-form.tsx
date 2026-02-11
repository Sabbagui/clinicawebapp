'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      // Extract error message from API response
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Erro ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        disabled={isSubmitting}
      >
        Entrar
      </Button>

      <div className="mt-6 p-3 rounded-md bg-muted/50 border">
        <p className="text-xs text-muted-foreground text-center font-medium mb-2">
          Credenciais de teste:
        </p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Admin:</span> admin@example.com / admin123
          </p>
          <p>
            <span className="font-medium">Médica:</span> doctor@example.com / doctor123
          </p>
          <p>
            <span className="font-medium">Recepcionista:</span> reception@example.com / reception123
          </p>
        </div>
      </div>
    </form>
  );
}
