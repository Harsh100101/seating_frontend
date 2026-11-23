import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  Clock,
  Wrench,
  FileEdit,
  ShieldAlert,
} from 'lucide-react';
import { ReconciliationSummary } from '../../api/reconciliation';

interface SummaryCardsProps {
  summary: ReconciliationSummary | null;
  loading?: boolean;
  activeFilter?: string;
  onFilterClick?: (filterKey: string, filterValue: string) => void;
}

export const ReconciliationSummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  loading = false,
  activeFilter,
  onFilterClick,
}) => {
  const cards = [
    {
      id: 'totalExcel',
      label: 'Total Excel Employees',
      value: summary?.totalExcelEmployees ?? 0,
      icon: FileSpreadsheet,
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      filterKey: 'status',
      filterValue: 'ALL',
      description: 'Records in authoritative source',
    },
    {
      id: 'matched',
      label: 'Matched Employees',
      value: summary?.matchedEmployees ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      filterKey: 'status',
      filterValue: 'RESOLVED',
      description: 'No discrepancies with MongoDB',
    },
    {
      id: 'open',
      label: 'Open Mismatches',
      value: summary?.openMismatches ?? 0,
      icon: AlertCircle,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      filterKey: 'status',
      filterValue: 'OPEN',
      description: 'Requires administrator triage',
    },
    {
      id: 'resolved',
      label: 'Resolved Mismatches',
      value: summary?.resolvedMismatches ?? 0,
      icon: ShieldCheck,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      filterKey: 'status',
      filterValue: 'RESOLVED',
      description: 'Reconciled & finalized',
    },
    {
      id: 'needsReview',
      label: 'Needs Review',
      value: summary?.needsReview ?? 0,
      icon: HelpCircle,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      filterKey: 'status',
      filterValue: 'NEEDS_REVIEW',
      description: 'Pending external verification',
    },
    {
      id: 'excelStale',
      label: 'Excel Stale',
      value: summary?.excelStale ?? 0,
      icon: Clock,
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      filterKey: 'status',
      filterValue: 'EXCEL_STALE',
      description: 'Live MongoDB record is more recent',
    },
    {
      id: 'systemCorrection',
      label: 'System Correction Required',
      value: summary?.systemCorrectionRequired ?? 0,
      icon: Wrench,
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      filterKey: 'status',
      filterValue: 'SYSTEM_CORRECTION_REQUIRED',
      description: 'MongoDB record requires correction',
    },
    {
      id: 'formattingOnly',
      label: 'Formatting-Only',
      value: summary?.formattingOnly ?? 0,
      icon: FileEdit,
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      filterKey: 'status',
      filterValue: 'FORMATTING_ONLY',
      description: 'Casing or whitespace discrepancies',
    },
    {
      id: 'blocked',
      label: 'Blocked / Ambiguous',
      value: summary?.blockedAmbiguous ?? 0,
      icon: ShieldAlert,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      filterKey: 'status',
      filterValue: 'BLOCKED',
      description: 'Seat conflict or duplicate Excel ID',
    },
  ];

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3"
      role="region"
      aria-label="Reconciliation summary metrics"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.filterValue && card.filterValue !== 'ALL';
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterClick && onFilterClick(card.filterKey, card.filterValue)}
            className={`flex flex-col text-left p-3 rounded-lg border transition-all duration-150 relative overflow-hidden bg-white hover:shadow-xs focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
              isSelected ? `${card.border} ring-2 ring-blue-500 shadow-xs` : 'border-slate-200 hover:border-slate-300'
            }`}
            title={`${card.label}: ${card.description}`}
            aria-pressed={isSelected}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                {card.label}
              </span>
              <div className={`p-1 rounded-md ${card.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                  loading ? 'opacity-40 animate-pulse' : card.color
                }`}
                data-testid={`metric-${card.id}`}
              >
                {loading ? '…' : card.value.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate mt-1">{card.description}</span>
          </button>
        );
      })}
    </div>
  );
};
