'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/auth';
import { labels } from '@sismovbe/labels';
import {
  Settings,
  Package,
  Building2,
  Users,
  FileText,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Send,
  List,
} from 'lucide-react';

const adminNavItems = [
  { href: '/resumo', label: labels.nav.resumo, icon: LayoutDashboard },
  { href: '/movements', label: labels.nav.movements, icon: FileText },
  { href: '/requests', label: labels.nav.requests, icon: ClipboardList },
  { href: '/pending-asiweb', label: labels.nav.pendingAsiweb, icon: Clock },
  { href: '/assets', label: labels.nav.assets, icon: Package },
  { href: '/units', label: labels.nav.units, icon: Building2 },
  { href: '/users', label: labels.nav.users, icon: Users },
  { href: '/settings', label: labels.nav.settings, icon: Settings },
];

const techNavItems = [
  { href: '/resumo', label: labels.nav.resumo, icon: LayoutDashboard },
  { href: '/fila', label: labels.tech.queue, icon: List },
  { href: '/receber', label: labels.tech.receive, icon: Package },
];

const unitUserNavItems = [
  { href: '/resumo', label: labels.nav.resumo, icon: LayoutDashboard },
  { href: '/solicitar-envio', label: labels.unitUser.requestShipment, icon: Send },
  { href: '/minhas-solicitacoes', label: labels.unitUser.myRequests, icon: List },
];

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const navItemsByRole: Record<UserRole, NavItem[]> = {
  PATRIMONIO_ADMIN: adminNavItems,
  SEAME_ADMIN: adminNavItems,
  TECH: techNavItems,
  UNIT_USER: unitUserNavItems,
};

type SidebarProps = {
  userRole?: string;
};

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const candidate = userRole ? navItemsByRole[userRole as UserRole] : undefined;
  const navItems: NavItem[] = Array.isArray(candidate) ? candidate : adminNavItems;

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/resumo" className="text-lg font-semibold hover:opacity-80">
          {labels.appName}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
