import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCog, UserX } from 'lucide-react';
import { apiRequest } from '../api/client';

type Unit = { id: string; name: string; code?: string };
type AdminRecord = { id: string; email: string; name: string; role: string; assignedUnitId?: string | null; isActive: boolean; createdAt?: string };
type FormState = { id?: string; email: string; name: string; password: string; role: 'TECH_ADMIN' | 'SUPER_ADMIN' | 'UNIT_ADMIN'; assignedUnitId: string; isActive: boolean };
const emptyForm: FormState = { email: '', name: '', password: '', role: 'UNIT_ADMIN', assignedUnitId: '', isActive: true };

export const AdminManagementPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [adminResponse, unitResponse] = await Promise.all([apiRequest<{ admins: AdminRecord[] }>('/admin-users'), apiRequest<Unit[]>('/units')]);
      setAdmins(adminResponse.admins || []);
      setUnits(unitResponse || []);
    } catch (err: any) {
      setError(err?.message || 'Administrator accounts could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const unitName = (id?: string | null) => units.find((unit) => unit.id === id)?.name || 'Global';
  const filtered = useMemo(() => admins.filter((admin) => {
    const text = `${admin.name} ${admin.email}`.toLowerCase();
    return (!search.trim() || text.includes(search.trim().toLowerCase())) && (roleFilter === 'ALL' || admin.role === roleFilter);
  }), [admins, roleFilter, search]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      if (!form.email.trim() || !form.name.trim() || (!form.id && form.password.length < 12) || (form.role === 'UNIT_ADMIN' && !form.assignedUnitId)) {
        throw new Error(form.id ? 'Name, email and Unit scope are required.' : 'Name, email, a 12-character password and Unit scope are required.');
      }
      if (form.id) {
        await apiRequest(`/admin-users/${form.id}`, { method: 'PATCH', body: JSON.stringify({ email: form.email, name: form.name, role: form.role, assignedUnitId: form.role === 'UNIT_ADMIN' ? form.assignedUnitId : null, isActive: form.isActive }) });
        setNotice('Administrator account updated.');
      } else {
        await apiRequest('/admin-users', { method: 'POST', body: JSON.stringify({ email: form.email, name: form.name, password: form.password, role: form.role, assignedUnitId: form.role === 'UNIT_ADMIN' ? form.assignedUnitId : null }) });
        setNotice('Administrator account created. The password is not retained in the browser.');
      }
      setForm(emptyForm); await load();
    } catch (err: any) { setError(err?.message || 'The administrator account could not be saved.'); } finally { setBusy(false); }
  };

  const edit = (admin: AdminRecord) => setForm({ id: admin.id, email: admin.email, name: admin.name, password: '', role: admin.role as FormState['role'], assignedUnitId: admin.assignedUnitId || '', isActive: admin.isActive });
  const toggle = async (admin: AdminRecord) => {
    if (!window.confirm(`${admin.isActive ? 'Deactivate' : 'Reactivate'} ${admin.email}?`)) return;
    setBusy(true); setError('');
    try { await apiRequest(`/admin-users/${admin.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !admin.isActive }) }); await load(); } catch (err: any) { setError(err?.message || 'Account status could not be changed.'); } finally { setBusy(false); }
  };
  const resetPassword = async (admin: AdminRecord) => {
    const password = window.prompt('Enter a new 12-character minimum password. It will not be displayed again.');
    if (!password) return;
    if (password.length < 12) { setError('Password must contain at least 12 characters.'); return; }
    setBusy(true); setError('');
    try { await apiRequest(`/admin-users/${admin.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }); setNotice('Password reset completed.'); } catch (err: any) { setError(err?.message || 'Password reset failed.'); } finally { setBusy(false); }
  };
  const remove = async (admin: AdminRecord) => {
    if (!window.confirm(`Delete ${admin.email} permanently from administrator access? Audit history will be preserved.`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await apiRequest(`/admin-users/${admin.id}`, { method: 'DELETE' }); setNotice('Administrator account deleted.'); setForm(emptyForm); await load(); } catch (err: any) { setError(err?.message || 'Administrator account could not be deleted.'); } finally { setBusy(false); }
  };

  return <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="admin-management-page">
    <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"><ShieldCheck className="h-4 w-4" /> Technical administration</div><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Admin Management</h1><p className="mt-1 text-sm text-slate-500">TECH_ADMIN-only account controls with backend-enforced scope and last-admin protection.</p></div><button type="button" onClick={() => { setForm(emptyForm); setNotice(''); setError(''); }} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"><Plus className="h-4 w-4" /> New administrator</button></section>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search administrators" className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm" /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter administrator role" className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="ALL">All roles</option><option value="UNIT_ADMIN">Unit Admin</option><option value="SUPER_ADMIN">Super Admin</option><option value="TECH_ADMIN">Tech Admin</option></select></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500"><th className="px-4 py-3 font-medium">Administrator</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Scope</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading administrator accounts…</td></tr> : filtered.map((admin) => <tr key={admin.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3"><div className="font-semibold text-slate-900">{admin.name}</div><div className="text-xs text-slate-500">{admin.email}</div></td><td className="px-4 py-3 text-xs font-semibold text-slate-700">{admin.role.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-slate-600">{unitName(admin.assignedUnitId)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${admin.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{admin.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => edit(admin)} aria-label={`Edit ${admin.email}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void toggle(admin)} disabled={busy} aria-label={`${admin.isActive ? 'Deactivate' : 'Reactivate'} ${admin.email}`} className="rounded-md p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-50"><UserX className="h-4 w-4" /></button><button type="button" onClick={() => void resetPassword(admin)} disabled={busy} aria-label={`Reset password for ${admin.email}`} className="rounded-md p-2 text-blue-700 hover:bg-blue-700 disabled:opacity-50"><KeyRound className="h-4 w-4" /></button><button type="button" onClick={() => void remove(admin)} disabled={busy} aria-label={`Delete ${admin.email}`} className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}{!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No administrator accounts match these filters.</td></tr>}</tbody></table></div></section>
      <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"><div className="flex items-center gap-2"><UserCog className="h-5 w-5 text-emerald-700" /><div><h2 className="text-base font-semibold text-slate-900">{form.id ? 'Edit account' : 'Create account'}</h2><p className="text-xs text-slate-500">Credentials are sent only to the protected API.</p></div></div><label className="block text-xs font-semibold text-slate-700">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>{!form.id && <label className="block text-xs font-semibold text-slate-700">Temporary password<input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Minimum 12 characters. It is never shown after submit.</span></label>}<label className="block text-xs font-semibold text-slate-700">Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as FormState['role'] })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="UNIT_ADMIN">Unit Admin</option><option value="SUPER_ADMIN">Super Admin</option>{form.id && <option value="TECH_ADMIN">Tech Admin</option>}</select></label>{form.role === 'UNIT_ADMIN' && <label className="block text-xs font-semibold text-slate-700">Assigned Unit<select value={form.assignedUnitId} onChange={(e) => setForm({ ...form, assignedUnitId: e.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Select Unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>}{form.id && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active account</label>}<div className="flex gap-2 border-t border-slate-100 pt-4"><button type="submit" disabled={busy} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : form.id ? 'Save changes' : 'Create administrator'}</button>{form.id && <button type="button" onClick={() => setForm(emptyForm)} className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700">Cancel</button>}</div></form>
    </div>
  </div>;
};

export default AdminManagementPage;
