import { AuthProvider } from '@/components/auth/auth-provider';
import { DashboardNav } from '@/components/layout/dashboard-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto py-6 px-4">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
