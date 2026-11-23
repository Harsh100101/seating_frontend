import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  applyInitialImportPlan,
  fetchInitialImportStatus,
  generateInitialImportDryRun,
  generateInitialImportPlan,
  InitialImportPlan,
  InitialImportStatus,
  saveInitialImportExtraDecision,
  saveInitialImportOverride
} from '../api/initialImport';

type PlanMode = 'DRY_RUN' | 'PERSISTED';

export const InitialImportPage: React.FC = () => {
  const [status, setStatus] = useState<InitialImportStatus | null>(null);
  const [plan, setPlan] = useState<InitialImportPlan | null>(null);
  const [planMode, setPlanMode] = useState<PlanMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrideIndex, setOverrideIndex] = useState<number | null>(null);
  const [overrideRow, setOverrideRow] = useState('');
  const [correctedValue, setCorrectedValue] = useState('');
  const [explanation, setExplanation] = useState('');
  const [extraDecisionIndex, setExtraDecisionIndex] = useState<number | null>(null);
  const [extraDecision, setExtraDecision] = useState<'QUARANTINED' | 'ARCHIVED'>('QUARANTINED');
  const [extraExplanation, setExtraExplanation] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchInitialImportStatus());
    } catch (err: any) {
      setError(err.message || 'Initial migration status could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadStatus(); }, []);

  const generateDryRun = async () => {
    setLoading(true);
    setError(null);
    try {
      setPlan(await generateInitialImportDryRun());
      setPlanMode('DRY_RUN');
    } catch (err: any) {
      setError(err.message || 'Read-only comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      setPlan(await generateInitialImportPlan());
      setPlanMode('PERSISTED');
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Migration plan generation failed.');
      setLoading(false);
    }
  };

  const applyPlan = async () => {
    if (!plan || planMode !== 'PERSISTED' || !window.confirm(`This will apply the validated authoritative workbook plan for ${plan.sourceFilename}. Continue?`)) return;
    setLoading(true);
    setError(null);
    try {
      await applyInitialImportPlan(plan.runId, plan.sourceHash);
      setPlan(null);
      setPlanMode(null);
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Migration apply failed.');
      setLoading(false);
    }
  };

  const startOverride = (index: number) => {
    const blocker = plan?.blockers[index];
    const rows = Array.isArray(blocker?.excelRows) ? blocker.excelRows : Array.isArray(blocker?.rows) ? blocker.rows : [];
    setOverrideIndex(index);
    setOverrideRow(String(rows[0] || ''));
    setCorrectedValue('');
    setExplanation('');
  };

  const submitOverride = async () => {
    if (!plan || overrideIndex === null) return;
    const blocker = plan.blockers[overrideIndex];
    setLoading(true);
    setError(null);
    try {
      await saveInitialImportOverride({
        sourceHash: plan.sourceHash,
        sheet: 'Sheet1',
        rowNumber: Number(overrideRow),
        field: String(blocker.problemField || blocker.field || ''),
        originalValue: blocker.currentSourceValue ?? blocker.value,
        correctedValue,
        explanation
      });
      setOverrideIndex(null);
      setPlan(await generateInitialImportDryRun());
      setPlanMode('DRY_RUN');
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Approved override could not be saved.');
      setLoading(false);
    }
  };

  const submitExtraDecision = async () => {
    if (!plan || extraDecisionIndex === null) return;
    const blocker = plan.blockers[extraDecisionIndex];
    setLoading(true);
    setError(null);
    try {
      await saveInitialImportExtraDecision({
        sourceHash: plan.sourceHash,
        entityType: String(blocker.entityType) as 'EMPLOYEE' | 'WORKSTATION',
        entityId: String(blocker.entityId),
        decision: extraDecision,
        explanation: extraExplanation
      });
      setExtraDecisionIndex(null);
      setExtraExplanation('');
      setPlan(await generateInitialImportDryRun());
      setPlanMode('DRY_RUN');
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Extra-record decision could not be saved.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="initial-import-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Controlled owner operation</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Authoritative Excel Migration</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Read-only comparison is available before a controlled plan is persisted. This workflow never invokes the legacy importer.</p>
        </div>
        <button type="button" onClick={() => void loadStatus()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </header>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert"><ShieldAlert className="mr-2 inline h-4 w-4" />{error}</div>}

      <section className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-950"><Lock className="h-4 w-4" /> Migration lifecycle</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div><div className="text-[10px] uppercase text-slate-500">Status</div><div className="font-mono text-lg font-bold text-slate-900">{status?.status || '—'}</div></div>
          <div><div className="text-[10px] uppercase text-slate-500">Rows processed</div><div className="font-mono text-lg font-bold text-slate-900">{status?.processedRows ?? 0}</div></div>
          <div><div className="text-[10px] uppercase text-slate-500">Blocked</div><div className="font-mono text-lg font-bold text-amber-700">{status?.blockedRows ?? 0}</div></div>
          <div><div className="text-[10px] uppercase text-slate-500">Database mode</div><div className="text-sm font-semibold text-slate-800">{status?.mode || '—'}</div></div>
        </div>
        {status?.sourceFilename && <p className="mt-3 break-all text-xs text-slate-600">Source: <strong>{status.sourceFilename}</strong> · SHA-256: <span className="font-mono">{status.sourceHash}</span></p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold text-slate-900">Migration plan</h2><p className="text-xs text-slate-500">The source path is server-controlled; no workbook upload or blind overwrite is available.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void generateDryRun()} disabled={loading} className="rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">Run read-only comparison</button>
            <button type="button" onClick={() => void generatePlan()} disabled={loading || status?.status === 'COMPLETED'} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Prepare controlled plan</button>
          </div>
        </div>
        {plan && <>
          <p className="text-xs font-semibold text-slate-600">Mode: {planMode === 'DRY_RUN' ? 'READ-ONLY — lifecycle state unchanged' : 'PERSISTED CONTROLLED PLAN'}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{Object.entries(plan.counts).map(([key, count]) => <div key={key} className="rounded border border-slate-200 px-2 py-1.5"><div className="text-[10px] uppercase text-slate-500">{key.replaceAll('_', ' ')}</div><div className="font-mono text-lg font-bold">{count}</div></div>)}</div>
          {plan.blockers.length > 0 ? <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mr-1 inline h-4 w-4" />Blocked rows require manual resolution and cannot be applied. Showing first {Math.min(50, plan.blockers.length)}.</div> : <div className="text-sm text-emerald-800"><CheckCircle2 className="mr-1 inline h-4 w-4" />No blocking rows detected.</div>}
          {plan.blockers.length > 0 && <div className="max-h-80 overflow-auto rounded border border-slate-200">{plan.blockers.slice(0, 50).map((blocker, index) => <div key={index} className="border-b border-slate-100 px-3 py-2 text-xs">
            <strong>{String(blocker.type)}</strong> · Employee {String(blocker.employeeId || blocker.employeeCode || '—')} · Row(s) {Array.isArray(blocker.excelRows) ? blocker.excelRows.join(', ') : Array.isArray(blocker.rows) ? blocker.rows.join(', ') : '—'} · {String(blocker.reason || blocker.problemField || blocker.value || '')}
            {Array.isArray(blocker.availableValidChoices) && blocker.availableValidChoices.length > 0 && <p className="mt-1 text-slate-500">Valid choices: {blocker.availableValidChoices.slice(0, 12).join(', ')}{blocker.availableValidChoices.length > 12 ? '…' : ''}</p>}
            {blocker.type === 'EXTRA_MONGO_RECORD'
              ? <button type="button" onClick={() => { setExtraDecisionIndex(index); setExtraExplanation(''); }} className="mt-2 rounded border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-900">Record archive decision</button>
              : <button type="button" onClick={() => startOverride(index)} className="mt-2 rounded border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-900">Provide approved override</button>}
          </div>)}</div>}
          {extraDecisionIndex !== null && <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2" aria-label="Extra record decision">
            <label className="text-xs font-semibold text-slate-700">Decision<select value={extraDecision} onChange={(event) => setExtraDecision(event.target.value as 'QUARANTINED' | 'ARCHIVED')} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-normal"><option value="QUARANTINED">Quarantine</option><option value="ARCHIVED">Archive</option></select></label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Approval explanation<textarea value={extraExplanation} onChange={(event) => setExtraExplanation(event.target.value)} rows={2} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-normal" /></label>
            <div className="flex gap-2 sm:col-span-2"><button type="button" disabled={loading || !extraExplanation.trim()} onClick={() => void submitExtraDecision()} className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save archive decision</button><button type="button" onClick={() => setExtraDecisionIndex(null)} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Cancel</button></div>
          </div>}
          {overrideIndex !== null && <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2" aria-label="Migration override">
            <label className="text-xs font-semibold text-slate-700">Excel row<input value={overrideRow} onChange={(event) => setOverrideRow(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-normal" /></label>
            <label className="text-xs font-semibold text-slate-700">Corrected value<input value={correctedValue} onChange={(event) => setCorrectedValue(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-normal" /></label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Approval explanation<textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={2} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-normal" /></label>
            <div className="flex gap-2 sm:col-span-2"><button type="button" disabled={loading || !overrideRow || !correctedValue.trim() || !explanation.trim()} onClick={() => void submitOverride()} className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save audited override</button><button type="button" onClick={() => setOverrideIndex(null)} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Cancel</button></div>
          </div>}
          <button type="button" onClick={() => void applyPlan()} disabled={loading || planMode !== 'PERSISTED' || plan.blockers.length > 0} className="rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 disabled:opacity-50">Apply only after owner approval</button>
        </>}
      </section>
    </div>
  );
};

export default InitialImportPage;
