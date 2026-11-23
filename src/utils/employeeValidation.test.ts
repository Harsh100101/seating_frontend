import { describe, expect, it } from 'vitest';
import { mapEmployeeApiError, validateEmployeeForm } from './employeeValidation';

describe('employee form validation', () => {
  const options = {
    unitIds: new Set(['unit-1']),
    departmentIds: new Set(['dept-1']),
    sectionIds: new Set(['section-1']),
    functionIds: new Set(['function-1']),
    availableSeatIds: new Set(['seat-1']),
  };

  it('requires the identity and hierarchy fields', () => {
    expect(validateEmployeeForm({ fullName: '  ', employeeCode: '', unitId: '', departmentId: '' }, options)).toEqual({
      fullName: 'Employee name is required.',
      employeeCode: 'Employee ID is required.',
      unitId: 'Please select a Unit.',
      departmentId: 'Please select a Department.',
    });
  });

  it('accepts multiword names and supported phone punctuation', () => {
    expect(validateEmployeeForm({
      fullName: '  Rajesh Kumar Patel  ',
      employeeCode: 'EMP-1',
      email: 'rajesh@example.com',
      phone: '9876543210',
      ext: '5012',
      unitId: 'unit-1',
      departmentId: 'dept-1',
      sectionId: 'section-1',
      functionId: 'function-1',
      seatId: 'seat-1',
    }, options)).toEqual({});
  });

  it('validates phones, accepts international names with digits and punctuation, and rejects scripts', () => {
    expect(validateEmployeeForm({
      fullName: '<script>alert("x")</script>',
      employeeCode: 'EMP-2',
      phone: '12345',
      ext: 'ext-55',
      unitId: 'unit-1',
      departmentId: 'dept-1',
    }, options)).toEqual({
      fullName: 'HTML/script tags are not allowed in name.',
      phone: 'Phone number must be exactly 10 digits.',
      ext: 'Intercom extension must contain digits only.',
    });

    expect(validateEmployeeForm({
      fullName: 'O\'Connor, René "The Architect" 2',
      employeeCode: 'EMP-3',
      unitId: 'unit-1',
      departmentId: 'dept-1',
    }, options)).toEqual({});

    expect(validateEmployeeForm({
      fullName: 'Name <script>',
      employeeCode: 'EMP-4',
      unitId: 'unit-1',
      departmentId: 'dept-1',
    }, options).fullName).toBe('HTML/script tags are not allowed in name.');
  });

  it('maps duplicate and occupied-seat server errors to fields', () => {
    expect(mapEmployeeApiError(new Error('Employee code already exists'))).toEqual({
      employeeCode: 'This Employee ID already exists.',
    });
    expect(mapEmployeeApiError(new Error('CONFLICT: Workstation is already occupied'))).toEqual({
      seatId: 'This workstation is already occupied.',
    });
  });
});
