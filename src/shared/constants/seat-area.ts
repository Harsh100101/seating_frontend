export function normalizeAreaName(rawArea: string | null | undefined): string {
  if (!rawArea || !rawArea.trim()) return '';
  const a = rawArea.trim().replace(/\s+/g, ' ');
  const lower = a.toLowerCase();
  if (lower === 'sap & it office' || lower === 'sap &  it office') return 'SAP & IT Office';
  if (lower === 'central store' || (lower === 'central store office' && !a.includes('Stores'))) return 'Central Store';
  if (lower === 'central stores office') return 'Central Stores Office';
  if (lower === 'admin' || lower === 'admin office') return 'Admin Office';
  if (lower === 'safety office') return 'Safety Office';
  if (lower === 'fe office') return 'FE Office';
  if (lower === 'cq office') return 'CQ Office';
  if (lower === 'me office') return 'ME Office';
  if (lower === 'proto office') return 'Proto Office';
  if (lower === 'hod office') return 'HOD Office';
  if (lower === 'gnc container') return 'GNC Container';
  if (lower === 'spair container' || lower === 'spare container') return 'Spare Container';
  return a;
}

export function resolveSeatOfficeArea(seat: {
  label: string;
  officeArea?: string | null;
  zone?: string | null;
  department?: { name: string; code?: string | null } | null;
  employee?: { officeArea?: string | null; subLocation?: string | null } | null;
  floor?: { name?: string; floorNumber?: number } | null;
}): string {
  if (seat.officeArea && seat.officeArea.trim()) {
    return normalizeAreaName(seat.officeArea);
  }
  if (seat.employee?.officeArea && seat.employee.officeArea.trim()) {
    return normalizeAreaName(seat.employee.officeArea);
  }
  if (seat.zone && seat.zone.trim()) {
    return normalizeAreaName(seat.zone);
  }
  if (seat.employee?.subLocation && seat.employee.subLocation.trim()) {
    return normalizeAreaName(seat.employee.subLocation);
  }

  const lbl = (seat.label || '').toUpperCase();
  if (lbl.startsWith('WS-20') || lbl.startsWith('WS-210') || lbl.startsWith('WS-211') || lbl.startsWith('WS-212')) {
    return 'South Bay 1 - Engineering';
  }
  if (lbl.startsWith('WS-21') || lbl.startsWith('WS-220') || lbl.startsWith('WS-221') || lbl.startsWith('WS-222') || lbl.startsWith('WS-223') || lbl.startsWith('WS-224')) {
    return 'South Bay 2 - Product';
  }
  if (lbl.startsWith('WS-22') || lbl.startsWith('WS-23') || lbl.startsWith('WS-240')) {
    return 'South Bay 3 - Design & Marketing';
  }
  if (lbl.startsWith('MEET')) {
    return 'Meeting Bay';
  }
  if (lbl.startsWith('CLASS')) {
    return 'Training Wing - Classroom';
  }
  if (lbl.startsWith('RECEP')) {
    return 'Main Reception Area';
  }
  if (lbl.startsWith('CONF')) {
    return 'North Board Conference Hall';
  }
  if (lbl.startsWith('MD-')) {
    return 'Executive Suite - MD Wing';
  }
  if (lbl.startsWith('CHAIR-')) {
    return 'Executive Suite - Chairman Wing';
  }
  if (lbl.startsWith('CABIN-E')) {
    return 'East Executive Cabins';
  }
  if (lbl.startsWith('OFFICE-W')) {
    return 'West Management Offices';
  }
  if (lbl.startsWith('TR1')) {
    return 'Training Center 1';
  }
  if (lbl.startsWith('TR2')) {
    return 'Training Center 2';
  }
  if (lbl.includes('CABIN')) {
    return 'Executive Cabin Zone';
  }
  if (seat.department?.name && !seat.department.name.toLowerCase().includes('vacant') && !seat.department.name.toLowerCase().includes('out sour') && seat.department.name !== 'General Operations') {
    return `${seat.department.name} Workstation Bay`;
  }
  if (seat.floor?.name) {
    return `${seat.floor.name} Main Bay`;
  }
  return 'Main Workstation Bay';
}
