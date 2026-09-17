import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Shield, Calendar, Clock, Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore, ROLE_LABELS } from '@/stores/authStore';
import { useUpdateProfile, useChangePassword } from '@/api/queries';
import { toast } from '@/stores/uiStore';
import { PageHeader, Card, CardHeader, Input, Button, Avatar, Badge } from '@/components/ui';
import { fmt, cn } from '@/utils/format';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  jobTitle: z.string().trim().max(80).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
  .refine((d) => d.newPassword !== d.currentPassword, { message: 'Choose a different password', path: ['newPassword'] });

/** 0–4 strength score for the meter (advisory only; the API enforces the rules). */
function passwordStrength(pw = '') {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  ['Too short', 'bg-danger'],
  ['Weak', 'bg-danger'],
  ['Fair', 'bg-warning'],
  ['Good', 'bg-info'],
  ['Strong', 'bg-success'],
];

const COLORS = ['#4318FF', '#39B8FF', '#05CD99', '#FFB547', '#EE5D50', '#6C63FF', '#F97316', '#0EA5E9', '#A855F7', '#14B8A6'];

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();
  const changePw = useChangePassword();
  const [show, setShow] = useState(false);

  const profile = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name, jobTitle: user?.jobTitle } });
  useEffect(() => profile.reset({ name: user?.name, jobTitle: user?.jobTitle || '' }), [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const pw = useForm({ resolver: zodResolver(passwordSchema) });
  const newPw = pw.watch('newPassword') || '';
  const strength = passwordStrength(newPw);

  const saveProfile = (v) => update.mutate(v, { onSuccess: () => toast.success('Profile updated'), onError: (e) => toast.error(e.message) });
  const savePassword = async (v) => {
    try {
      const r = await changePw.mutateAsync({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      toast.success(r.message || 'Password updated');
      pw.reset({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      if (e.details?.length) e.details.forEach((d) => pw.setError(d.path, { message: d.message }));
      else toast.error(e.message);
    }
  };

  return (
    <>
      <PageHeader title="Profile" description="Manage your personal details and security" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:row-span-2">
          <div className="flex flex-col items-center text-center">
            <Avatar name={user.name} color={user.avatarColor} size="xl" />
            <h2 className="mt-4 text-xl font-extrabold text-ink">{user.name}</h2>
            <p className="text-sm text-muted">{user.jobTitle || 'Team member'}</p>
            <Badge status={user.role} className="mt-2">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            {[
              [Mail, 'Email', user.email],
              [Shield, 'Role', ROLE_LABELS[user.role]],
              [Calendar, 'Member since', fmt.date(user.createdAt)],
              [Clock, 'Last login', user.lastLoginAt ? fmt.dateTime(user.lastLoginAt) : '—'],
            ].map(([I, k, v]) => (
              <div key={k} className="flex items-center gap-3 rounded-xl bg-surface-2/70 px-3 py-2.5">
                <I className="h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="truncate font-medium text-ink">{v}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <p className="label">Avatar colour</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update.mutate({ avatarColor: c }, { onError: (e) => toast.error(e.message) })}
                  aria-label={`Use colour ${c}`}
                  className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform hover:scale-110 focus-ring', user.avatarColor === c ? 'ring-ink' : 'ring-transparent')}
                  style={{ background: c }}
                >
                  {user.avatarColor === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Personal details" subtitle="How you appear to your team." />
          <form onSubmit={profile.handleSubmit(saveProfile)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Input id="name" label="Full name" error={profile.formState.errors.name?.message} {...profile.register('name')} />
            <Input id="jobTitle" label="Job title" error={profile.formState.errors.jobTitle?.message} {...profile.register('jobTitle')} />
            <Input id="email" label="Email" value={user.email} disabled hint="Contact an administrator to change your email." className="sm:col-span-2" readOnly />
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" loading={update.isPending} disabled={!profile.formState.isDirty}>Save changes</Button>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Change password" subtitle="Changing your password signs you out of all other devices." />
          <form onSubmit={pw.handleSubmit(savePassword)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2">
              <label htmlFor="cur" className="label">Current password</label>
              <div className="relative">
                <input id="cur" type={show ? 'text' : 'password'} autoComplete="current-password" className={cn('input pr-11', pw.formState.errors.currentPassword && 'border-danger/60')} {...pw.register('currentPassword')} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink focus-ring" aria-label="Toggle visibility">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pw.formState.errors.currentPassword && <p className="mt-1 text-xs text-danger">{pw.formState.errors.currentPassword.message}</p>}
            </div>
            <div>
              <Input id="new" label="New password" type={show ? 'text' : 'password'} autoComplete="new-password" error={pw.formState.errors.newPassword?.message} hint="8+ characters with a letter and a number. Longer, mixed-case with symbols is stronger." {...pw.register('newPassword')} />
              {newPw && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={cn('h-1.5 flex-1 rounded-full bg-line transition-colors', i < strength && STRENGTH[strength][1])} />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted">Strength: {STRENGTH[strength][0]}</p>
                </div>
              )}
            </div>
            <Input id="confirm" label="Confirm new password" type={show ? 'text' : 'password'} autoComplete="new-password" error={pw.formState.errors.confirm?.message} {...pw.register('confirm')} />
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" variant="secondary" loading={changePw.isPending}>Update password</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
