import React from 'react';
import { FileText, X } from 'lucide-react';

interface CsvImportModalProps {
  open: boolean;
  file: File | null;
  previewRows: string[];
  result: { imported: number; failed: number; errors?: any[] } | null;
  onClose: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  open,
  file,
  previewRows,
  result,
  onClose,
  onFileSelect,
  onUpload
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-5 space-y-3.5 shadow-xl border border-slate-200 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Bulk Employee Roster Ingestion (.xlsx / .csv)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close import dialog">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Supported formats: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">.xlsx</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">.xls</code>, and{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">.csv</code>.
        </p>

        <div className="border border-dashed border-slate-300 rounded-md p-5 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
          <input type="file" accept=".xlsx, .xls, .csv" onChange={onFileSelect} className="hidden" id="csv-file-input" />
          <label htmlFor="csv-file-input" className="cursor-pointer space-y-1.5 block">
            <FileText className="w-6 h-6 text-slate-400 mx-auto" strokeWidth={1.75} />
            <span className="text-xs font-medium text-slate-700 block">{file ? file.name : 'Click to select or drop Excel (.xlsx, .xls) or CSV file'}</span>
            <span className="text-[11px] text-slate-400 block font-mono">Native Excel (.xlsx, .xls) or UTF-8 CSV</span>
          </label>
        </div>

        {previewRows.length > 0 && (
          <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider block mb-1">Preview ({previewRows.length} rows)</span>
            <div className="font-mono text-[11px] text-slate-600 space-y-0.5 overflow-x-auto">
              {previewRows.map((line, idx) => <div key={idx} className="truncate">{line}</div>)}
            </div>
          </div>
        )}

        {result && (
          <div className={`p-2.5 rounded-md border text-xs font-mono ${result.failed > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            Import complete: {result.imported} ingested, {result.failed} failed
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="h-8 px-3 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50">Close</button>
          <button type="button" onClick={onUpload} disabled={!file} className="h-8 px-3 bg-orange-600 text-white rounded-md text-xs font-semibold hover:bg-orange-500 disabled:opacity-50 transition-colors">Upload &amp; Process</button>
        </div>
      </div>
    </div>
  );
};
