import React, { ReactNode } from 'react';
import { Briefcase, X } from 'lucide-react';

interface EmployeeFormModalProps {
  mode: 'ADD' | 'EDIT';
  activeTab: 'profile' | 'workstation';
  onTabChange: (tab: 'profile' | 'workstation') => void;
  onClose: () => void;
  children: ReactNode;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ mode, activeTab, onTabChange, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
    <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-slate-200 text-xs flex flex-col max-h-[90vh]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{mode === 'ADD' ? 'Register New Industrial Employee' : 'Edit Employee Dossier & Workstation'}</h2>
          <p className="text-[11px] text-slate-400">Full Excel field parity with inline cascading workstation allocation &amp; IT PC Number management.</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close employee form">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-1">
        <button type="button" onClick={() => onTabChange('profile')} className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'profile' ? 'border-orange-600 text-orange-600 bg-white rounded-t-sm' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Briefcase className="w-3.5 h-3.5" /> Tab 1: Profile &amp; Organization
        </button>
        <button type="button" onClick={() => onTabChange('workstation')} className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'workstation' ? 'border-orange-600 text-orange-600 bg-white rounded-t-sm' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Tab 2: Workstation &amp; Hardware
        </button>
      </div>
      {children}
    </div>
  </div>
);
