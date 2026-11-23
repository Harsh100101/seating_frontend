export type EmployeeFormField =
  | 'fullName'
  | 'employeeCode'
  | 'email'
  | 'phone'
  | 'ext'
  | 'reportingTo'
  | 'hod'
  | 'unitId'
  | 'departmentId'
  | 'sectionId'
  | 'functionId'
  | 'seatId'
  | 'form';

export type EmployeeFormErrors = Partial<Record<EmployeeFormField, string>>;

export interface EmployeeFormValues {
  fullName: string;
  employeeCode: string;
  email?: string;
  phone?: string;
  ext?: string;
  reportingTo?: string;
  hod?: string;
  unitId?: string;
  departmentId?: string;
  sectionId?: string;
  functionId?: string;
  seatId?: string;
}

export interface EmployeeValidationOptions {
  unitIds?: ReadonlySet<string>;
  departmentIds?: ReadonlySet<string>;
  sectionIds?: ReadonlySet<string>;
  functionIds?: ReadonlySet<string>;
  availableSeatIds?: ReadonlySet<string>;
  validReportingManagers?: ReadonlySet<string>;
  validHods?: ReadonlySet<string>;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Support international names, numerals, and common punctuation without HTML.
const namePattern = /^[\p{L}\p{M}\p{N}\s.,'"()-]+$/u;
const scriptTagPattern = /<[^>]*script/i;

export function validateEmployeeForm(
  values: EmployeeFormValues,
  options: EmployeeValidationOptions = {},
): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};
  const fullName = values.fullName.trim();
  const employeeCode = values.employeeCode.trim();
  const email = (values.email || '').trim();
  const phone = (values.phone || '').trim();
  const ext = (values.ext || '').trim();
  const reportingTo = (values.reportingTo || '').trim();
  const hod = (values.hod || '').trim();

  // Full Name validation: Required; allow international names and common punctuation.
  if (!fullName) {
    errors.fullName = 'Employee name is required.';
  } else if (scriptTagPattern.test(fullName) || fullName.includes('<') || fullName.includes('>')) {
    errors.fullName = 'HTML/script tags are not allowed in name.';
  } else if (!namePattern.test(fullName)) {
    errors.fullName = 'Name may contain letters, numbers, spaces, and standard name punctuation only.';
  }

  // Employee Code validation: Required
  if (!employeeCode) {
    errors.employeeCode = 'Employee ID is required.';
  } else if (scriptTagPattern.test(employeeCode)) {
    errors.employeeCode = 'Invalid characters in Employee ID.';
  }

  // Email validation: Optional, but if provided must be valid email
  if (email && !emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  // Phone validation: Digits only, exactly 10 digits
  if (phone) {
    if (!/^\d+$/.test(phone)) {
      errors.phone = 'Phone number must contain digits only.';
    } else if (phone.length !== 10) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    }
  }

  // Intercom Extension (Ext) validation: Digits only
  if (ext) {
    if (!/^\d+$/.test(ext)) {
      errors.ext = 'Intercom extension must contain digits only.';
    }
  }

  // Reporting Manager validation: Cannot be the employee themselves, and must be a valid manager from options if restricted
  if (reportingTo) {
    if (fullName && reportingTo.toLowerCase() === fullName.toLowerCase()) {
      errors.reportingTo = 'An employee cannot be their own Reporting Manager.';
    } else if (options.validReportingManagers && !options.validReportingManagers.has(reportingTo)) {
      errors.reportingTo = 'Selected Reporting Manager is not a recognized manager.';
    }
  }

  // HOD validation: Cannot be the employee themselves, and must be a valid HOD from options if restricted
  if (hod) {
    if (fullName && hod.toLowerCase() === fullName.toLowerCase()) {
      errors.hod = 'An employee cannot be their own Department Head (HOD).';
    } else if (options.validHods && !options.validHods.has(hod)) {
      errors.hod = 'Selected HOD is not a recognized Department Head.';
    }
  }

  const unitId = values.unitId?.trim() || '';
  if (!unitId || unitId === 'ALL') {
    errors.unitId = 'Please select a Unit.';
  } else if (options.unitIds && !options.unitIds.has(unitId)) {
    errors.unitId = 'Selected Unit is not available for your account.';
  }

  const departmentId = values.departmentId?.trim() || '';
  if (!departmentId) {
    errors.departmentId = 'Please select a Department.';
  } else if (options.departmentIds && !options.departmentIds.has(departmentId)) {
    errors.departmentId = 'Selected Department is not valid for this Unit.';
  }

  const sectionId = values.sectionId?.trim() || '';
  if (sectionId && !sectionId.startsWith('legacy:') && options.sectionIds && !options.sectionIds.has(sectionId)) {
    errors.sectionId = 'Selected Section is not valid for this Department.';
  }

  const functionId = values.functionId?.trim() || '';
  if (functionId && !functionId.startsWith('legacy:') && options.functionIds && !options.functionIds.has(functionId)) {
    errors.functionId = 'Selected Function is not valid for this Section.';
  }

  const seatId = values.seatId?.trim() || '';
  if (seatId && options.availableSeatIds && !options.availableSeatIds.has(seatId)) {
    errors.seatId = 'This workstation is already occupied or unavailable.';
  }

  return errors;
}

export function mapEmployeeApiError(error: unknown): EmployeeFormErrors {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();

  if (lower.includes('employee code already exists') || lower.includes('employee id already exists')) {
    return { employeeCode: 'This Employee ID already exists.' };
  }
  if (lower.includes('employee email already exists')) {
    return { email: 'This email address already exists.' };
  }
  if (lower.includes('invalid email') || lower.includes('email must')) {
    return { email: 'Enter a valid email address.' };
  }
  if (lower.includes('invalid phone') || lower.includes('phone number') || lower.includes('10 digits')) {
    return { phone: 'Enter a valid 10-digit phone number.' };
  }
  if (lower.includes('intercom') || lower.includes('ext')) {
    return { ext: 'Intercom extension must contain digits only.' };
  }
  if (lower.includes('cannot be their own reporting manager') || lower.includes('reporting manager')) {
    return { reportingTo: 'Invalid reporting manager.' };
  }
  if (lower.includes('cannot be their own hod') || lower.includes('hod')) {
    return { hod: 'Invalid department head (HOD).' };
  }
  if (lower.includes('workstation is already occupied') || lower.includes('seat is already occupied')) {
    return { seatId: 'This workstation is already occupied.' };
  }
  if (lower.includes('department not found') || lower.includes('department')) {
    return { departmentId: 'Selected Department is not valid for this Unit.' };
  }
  if (lower.includes('unit') && (lower.includes('forbidden') || lower.includes('assigned'))) {
    return { unitId: 'You are not authorized to use this Unit.' };
  }
  if (lower.includes('section')) return { sectionId: 'Selected Section is not valid for this Department.' };
  if (lower.includes('function')) return { functionId: 'Selected Function is not valid for this Section.' };
  if (/prisma|mongo|stack|internal server|database|updatemany/i.test(message)) {
    return { form: 'Employee could not be saved because of a server validation error. Please try again.' };
  }
  return { form: message || 'Employee could not be saved. Please try again.' };
}
