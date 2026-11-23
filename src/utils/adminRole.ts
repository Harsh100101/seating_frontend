export type AdminRole = 'TECH_ADMIN' | 'SUPER_ADMIN' | 'UNIT_ADMIN' | string;

/** Normalize legacy role spellings before applying client-side presentation rules. */
export function normalizeAdminRole(rawRole?: string | null): AdminRole {
  const clean = (rawRole || 'UNIT_ADMIN').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (clean === 'TECHADMIN' || clean === 'TECH_ADMIN') return 'TECH_ADMIN';
  if (clean === 'SUPERADMIN' || clean === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (clean === 'UNITADMIN' || clean === 'UNIT_ADMIN') return 'UNIT_ADMIN';
  return clean;
}
