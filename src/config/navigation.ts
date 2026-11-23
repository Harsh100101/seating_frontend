import type { ElementType } from 'react';
import {
  BarChart3,
  Building2,
  FileText,
  GitPullRequest,
  LayoutDashboard,
  Lock,
  Map,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import type { AdminRole } from '../utils/adminRole';

export type NavigationItem = {
  label: string;
  path: string;
  icon: ElementType;
  badge: string | null;
  badgeIcon?: ElementType;
};

/**
 * Presentation-only navigation policy. API authorization remains enforced by
 * the backend; this keeps all screen sizes and role views in sync.
 */
export function getNavigationItems(role: AdminRole): NavigationItem[] {
  const operationalItems: NavigationItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: null },
    { label: 'Hierarchy & Workstations', path: '/hierarchy', icon: Building2, badge: null },
    { label: 'Floor Plan', path: '/floor-plan', icon: Map, badge: null },
    { label: 'Employees', path: '/employees', icon: Users, badge: null },
    { label: 'Transfer Requests', path: '/transfer-requests', icon: GitPullRequest, badge: null },
    {
      label: 'Data Quality',
      path: '/data-quality',
      icon: ShieldCheck,
      badge: role === 'UNIT_ADMIN' ? 'Unit scope' : role === 'TECH_ADMIN' ? 'Read Only' : null,
      badgeIcon: role === 'UNIT_ADMIN' || role === 'TECH_ADMIN' ? Lock : undefined,
    },
    { label: 'Reports', path: '/reports', icon: BarChart3, badge: null },
    { label: 'Facilities', path: '/facilities', icon: Wrench, badge: null },
  ];

  if (role === 'UNIT_ADMIN') return operationalItems;

  return [
    ...operationalItems,
    {
      label: 'Audit Logs',
      path: '/audit-logs',
      icon: FileText,
      badge: role === 'TECH_ADMIN' ? 'Technical' : 'Super Admin',
      badgeIcon: Lock,
    },
    ...(role === 'TECH_ADMIN'
      ? [{ label: 'Admin Management', path: '/admin-management', icon: Settings2, badge: 'Technical', badgeIcon: Lock }]
      : []),
  ];
}
