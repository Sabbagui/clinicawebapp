import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">
            Sistema de Gestão
          </h1>
          <p className="text-lg text-muted-foreground">
            Consultório de Ginecologia
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Acessar Sistema
          </h2>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © 2026 Sistema de Gestão de Consultório
        </p>
      </div>
    </div>
  );
}
