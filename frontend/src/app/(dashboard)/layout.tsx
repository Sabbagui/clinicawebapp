import { AuthProvider } from '@/components/auth/auth-provider';
import { DashboardNav } from '@/components/layout/dashboard-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardNav />
        <main className="container mx-auto flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
