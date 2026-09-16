import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Palette, Users, Plus, Sun, Moon, Monitor, ShieldCheck, MoreHorizontal, UserX, UserCheck, KeyRound } from 'lucide-react';
import { useSettings, useUpdateSettings, useTeam, useCreateUser, useUpdateUser, useUpdateProfile } from '@/api/queries';
import { useAuthStore, can, ROLE_LABELS } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { toast } from '@/stores/uiStore';
import { PageHeader, Card, CardHeader, Tabs, Input, Select, Button, Badge, Avatar, Toggle, Skeleton } from '@/components/ui';
import { Modal, Dropdown, DropdownItem, ConfirmDialog } from '@/components/ui/Overlay';
import { setCurrency, fmt, cn } from '@/utils/format';
import { PRESETS } from '@/utils/dates';

const orgSchema = z.object({
  orgName: z.string().trim().min(2, 'Too short').max(80),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']),
  timezone: z.string().trim().min(1).max(64),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000),
  weekStartsOn: z.enum(['monday', 'sunday']),
});

const userSchema = z.object({
  name: z.string().trim().min(2, 'Too short').max(80),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  role: z.enum(['super_admin', 'admin', 'analyst', 'viewer']),
  jobTitle: z.string().trim().max(80).optional(),
});

export default function SettingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const tabs = [
    { value: 'general', label: 'General', icon: Building2 },
    { value: 'appearance', label: 'Appearance', icon: Palette },
    ...(can.manageTeam(role) ? [{ value: 'team', label: 'Team', icon: Users }] : []),
  ];
  const [tab, setTab] = useState('general');

  return (
    <>
      <PageHeader title="Settings" description="Organisation preferences, appearance and team access" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'general' && <GeneralTab canEdit={can.edit(role)} />}
      {tab === 'appearance' && <AppearanceTab />}
      {tab === 'team' && can.manageTeam(role) && <TeamTab />}
    </>
  );
}

function GeneralTab({ canEdit }) {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(orgSchema) });
  useEffect(() => {
    if (data?.settings) reset(data.settings);
  }, [data, reset]);

  const onSubmit = (values) =>
    update.mutate(values, {
      onSuccess: (d) => {
        setCurrency(d.settings.currency);
        toast.success('Settings saved');
        reset(d.settings);
      },
      onError: (e) => toast.error(e.message),
    });

  if (isLoading) return <Card><Skeleton className="h-64" /></Card>;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Organisation" subtitle={canEdit ? 'These settings apply to every dashboard user.' : 'Only admins can change organisation settings.'} />
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <fieldset disabled={!canEdit} className="contents">
            <Input id="orgName" label="Organisation name" className="sm:col-span-2" error={errors.orgName?.message} {...register('orgName')} />
            <Select id="currency" label="Currency" error={errors.currency?.message} {...register('currency')}>
              {['USD', 'EUR', 'GBP', 'INR'].map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Input id="timezone" label="Timezone" placeholder="UTC" error={errors.timezone?.message} {...register('timezone')} />
            <Select id="fy" label="Fiscal year starts" {...register('fiscalYearStartMonth')}>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select id="week" label="Week starts on" {...register('weekStartsOn')}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </Select>
            <Input id="lowStock" label="Low-stock threshold (units)" type="number" min="0" hint="Products at or below this stock level are flagged." error={errors.lowStockThreshold?.message} {...register('lowStockThreshold')} />
          </fieldset>
          {canEdit && (
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => reset(data.settings)}>Discard</Button>
              <Button type="submit" loading={update.isPending} disabled={!isDirty}>Save changes</Button>
            </div>
          )}
        </form>
      </Card>
      <Card>
        <CardHeader title="About this workspace" />
        <dl className="space-y-3 text-sm">
          {[
            ['Version', '1.0.0'],
            ['Stack', 'React · Express · MongoDB'],
            ['Auth', 'JWT + rotating refresh cookies'],
            ['Last updated', data?.settings.updatedAt ? fmt.dateTime(data.settings.updatedAt) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2 last:border-0">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-success/10 p-3 text-xs text-success">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Roles are enforced server-side on every request; the UI only hides what you cannot do.
        </div>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();
  const save = (preferences) =>
    update.mutate({ preferences }, { onSuccess: () => toast.success('Preferences saved'), onError: (e) => toast.error(e.message) });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Theme" subtitle="Applies on this device instantly and is saved to your profile." />
        <div className="grid grid-cols-3 gap-3">
          {[
            ['light', 'Light', Sun, 'bg-[#F4F7FE]'],
            ['dark', 'Dark', Moon, 'bg-[#0B1437]'],
            ['system', 'System', Monitor, 'bg-gradient-to-r from-[#F4F7FE] to-[#0B1437]'],
          ].map(([v, label, I, swatch]) => (
            <button
              key={v}
              onClick={() => { setTheme(v); save({ theme: v }); }}
              aria-pressed={theme === v}
              className={cn('rounded-2xl border-2 p-3 text-left transition-all focus-ring', theme === v ? 'border-brand' : 'border-line hover:border-brand/40')}
            >
              <div className={cn('mb-3 h-16 rounded-xl border border-line', swatch)} />
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink"><I className="h-4 w-4" /> {label}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Dashboard defaults" subtitle="Personal preferences for your account." />
        <div className="space-y-5">
          <Select id="defRange" label="Default date range" value={user?.preferences?.defaultDateRange || '30d'} onChange={(e) => save({ defaultDateRange: e.target.value })}>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
          <Toggle label="Compact tables" description="Reduce row height in data tables." checked={!!user?.preferences?.compactTables} onChange={(v) => save({ compactTables: v })} />
        </div>
      </Card>
    </div>
  );
}

function TeamTab() {
  const me = useAuthStore((s) => s.user);
  const { data, isLoading } = useTeam(true);
  const update = useUpdateUser();
  const [invite, setInvite] = useState(false);
  const [confirm, setConfirm] = useState(null); // { user, action }
  const [resetPw, setResetPw] = useState(null);

  const act = (user, patch, msg) =>
    update.mutate({ id: user.id, ...patch }, { onSuccess: () => { toast.success(msg); setConfirm(null); setResetPw(null); }, onError: (e) => toast.error(e.message) });

  return (
    <>
      <Card className="p-0">
        <CardHeader className="px-6 pt-6" title="Team members" subtitle="Invite people and control what they can do." action={<Button icon={Plus} size="sm" onClick={() => setInvite(true)}>Invite member</Button>} />
        <div className="scroll-x">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-surface-2/60 text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-6 py-3"><Skeleton className="h-8" /></td></tr>)
                : data?.users.map((u) => {
                    const self = u.id === me.id;
                    return (
                      <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
                        <td className="px-6 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar name={u.name} color={u.avatarColor} />
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink">{u.name} {self && <span className="text-xs font-normal text-muted">(you)</span>}</span>
                              <span className="block text-xs text-muted">{u.email}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select value={u.role} disabled={self} onChange={(e) => act(u, { role: e.target.value }, `${u.name} is now ${ROLE_LABELS[e.target.value]}`)} className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs font-semibold text-ink focus-ring disabled:opacity-60" aria-label="Role">
                            {data.roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3"><Badge status={u.isActive ? 'active' : 'inactive'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge></td>
                        <td className="px-4 py-3 text-muted">{u.lastLoginAt ? fmt.relative(u.lastLoginAt) : 'Never'}</td>
                        <td className="px-6 py-3 text-right">
                          {!self && (
                            <Dropdown trigger={<button className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-ring" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></button>}>
                              <DropdownItem icon={KeyRound} onClick={() => setResetPw(u)}>Reset password</DropdownItem>
                              {u.isActive ? (
                                <DropdownItem icon={UserX} danger onClick={() => setConfirm({ user: u, action: 'deactivate' })}>Deactivate</DropdownItem>
                              ) : (
                                <DropdownItem icon={UserCheck} onClick={() => act(u, { isActive: true }, `${u.name} reactivated`)}>Reactivate</DropdownItem>
                              )}
                            </Dropdown>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </Card>

      <InviteModal open={invite} onClose={() => setInvite(false)} roles={data?.roles || []} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title="Deactivate member?" description={`${confirm?.user.name} will be signed out everywhere and unable to sign in until reactivated.`} confirmLabel="Deactivate" danger loading={update.isPending} onConfirm={() => act(confirm.user, { isActive: false }, `${confirm.user.name} deactivated`)} />
      <ResetPasswordModal user={resetPw} onClose={() => setResetPw(null)} onSave={(pw) => act(resetPw, { password: pw }, 'Password reset')} loading={update.isPending} />
    </>
  );
}

function InviteModal({ open, onClose, roles }) {
  const create = useCreateUser();
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(userSchema), defaultValues: { role: 'viewer' } });
  useEffect(() => { if (open) reset({ name: '', email: '', password: '', role: 'viewer', jobTitle: '' }); }, [open, reset]);
  const onSubmit = async (v) => {
    try {
      await create.mutateAsync(v);
      toast.success(`${v.name} added to the team`);
      onClose();
    } catch (e) {
      if (e.status === 409) setError('email', { message: e.message });
      else if (e.details?.length) e.details.forEach((d) => setError(d.path, { message: d.message }));
      else toast.error(e.message);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Invite team member" description="Create an account and share the temporary password securely.">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input id="i-name" label="Full name" error={errors.name?.message} {...register('name')} />
        <Input id="i-title" label="Job title" error={errors.jobTitle?.message} {...register('jobTitle')} />
        <Input id="i-email" label="Email" type="email" className="sm:col-span-2" error={errors.email?.message} {...register('email')} />
        <Input id="i-pw" label="Temporary password" type="text" autoComplete="off" error={errors.password?.message} {...register('password')} />
        <Select id="i-role" label="Role" error={errors.role?.message} {...register('role')}>
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </Select>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create account</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onSave, loading }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { setPw(''); setErr(''); }, [user]);
  const submit = (e) => {
    e.preventDefault();
    const r = userSchema.shape.password.safeParse(pw);
    if (!r.success) return setErr(r.error.issues[0].message);
    onSave(pw);
  };
  return (
    <Modal open={!!user} onClose={onClose} title="Reset password" description={`Set a new temporary password for ${user?.name}. They will be signed out everywhere.`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Input id="rp" label="New password" type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} error={err} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Reset password</Button>
        </div>
      </form>
    </Modal>
  );
}
