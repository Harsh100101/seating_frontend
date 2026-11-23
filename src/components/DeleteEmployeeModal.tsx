import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteEmployeeModalProps {
  employee: any | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteEmployeeModal: React.FC<DeleteEmployeeModalProps> = ({
  employee,
  deleting,
  onCancel,
  onConfirm
}) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-3.5 shadow-xl border border-red-100 text-xs">
        <div className="flex items-center gap-2.5 text-red-600">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900">Deactivate Employee Confirmation</h2>
        </div>

        <p className="text-slate-600 leading-relaxed">
          Are you sure you want to deactivate{' '}
          <strong className="text-slate-900 font-semibold">{employee.fullName}</strong> (
          <span className="font-mono font-semibold">{employee.employeeCode}</span>)?
        </p>

        {employee.seat && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] space-y-1">
            <strong className="block font-semibold">Automatic Desk Release Invariant:</strong>
            <p>
              Workstation <span className="font-mono font-bold">{employee.seat.label}</span> on{' '}
              <span className="font-medium">{employee.seat.floor?.name || 'Floor'}</span> will be immediately
              released to <span className="font-bold text-emerald-800">AVAILABLE</span> status.
            </p>
            {(employee.pcNumber || employee.seat.pcNumber) && (
              <p>
                Hardware asset <span className="font-mono font-bold">{employee.pcNumber || employee.seat.pcNumber}</span> will be unlinked.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="h-8 px-3 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={deleting} onClick={onConfirm} className="h-8 px-3 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-500 disabled:opacity-50 transition-colors">
            {deleting ? 'Deactivating...' : 'Deactivate & Release Desk'}
          </button>
        </div>
      </div>
    </div>
  );
};
