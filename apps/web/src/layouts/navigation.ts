import type { LucideIcon } from 'lucide-react';
import { FolderKanban, Gauge, History, PanelsTopLeft, Settings } from 'lucide-react';
import type { UserRole } from '../auth/auth.types';

// VI: Khai bao route app shell de desktop sidebar va mobile bottom nav dung chung mot nguon.
export interface AppNavItem {
  path: string;
  labelKey: string;
  shortLabelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const appNavItems: AppNavItem[] = [
  {
    path: '/app/dashboard',
    labelKey: 'navigation.dashboard',
    shortLabelKey: 'navigation.dashboardShort',
    descriptionKey: 'navigation.dashboardDescription',
    icon: Gauge,
  },
  {
    path: '/app/projects',
    labelKey: 'navigation.projects',
    shortLabelKey: 'navigation.projectsShort',
    descriptionKey: 'navigation.projectsDescription',
    icon: FolderKanban,
  },
  {
    path: '/app/admin',
    labelKey: 'navigation.admin',
    shortLabelKey: 'navigation.adminShort',
    descriptionKey: 'navigation.adminDescription',
    icon: PanelsTopLeft,
    adminOnly: true,
  },
  {
    path: '/app/settings',
    labelKey: 'navigation.settings',
    shortLabelKey: 'navigation.settingsShort',
    descriptionKey: 'navigation.settingsDescription',
    icon: Settings,
    adminOnly: true,
  },
  {
    path: '/app/audit-logs',
    labelKey: 'navigation.audit',
    shortLabelKey: 'navigation.auditShort',
    descriptionKey: 'navigation.auditDescription',
    icon: History,
    adminOnly: true,
  },
];

// VI: Loc navigation theo role de user thuong khong thay entry admin-only.
export function getVisibleNavItems(role?: UserRole): AppNavItem[] {
  return appNavItems.filter((item) => !item.adminOnly || role === 'admin');
}
