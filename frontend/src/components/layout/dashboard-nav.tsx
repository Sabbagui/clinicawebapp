'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Calendar, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Pacientes', icon: Users },
  { href: '/dashboard/appointments', label: 'Agendamentos', icon: Calendar },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / App Name */}
          <button
            onClick={() => router.push('/dashboard')}
            className="font-bold text-primary text-lg"
          >
            GynClinic
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.name}
            </span>
            <Button onClick={logout} variant="ghost" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
