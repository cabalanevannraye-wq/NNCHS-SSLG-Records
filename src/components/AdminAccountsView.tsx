import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Save,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { auth, normalizeUsername } from '../firebase.ts';
import { firebaseService } from '../lib/firebaseService.ts';
import type { AccountInvite, SystemSettings, UserAccount, UserRole } from '../types.ts';

interface AdminAccountsViewProps {
  currentUser: UserAccount;
  settings: SystemSettings;
  onSettingsUpdated: (settings: SystemSettings) => void;
}

function generateReadablePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function AdminAccountsView({
  currentUser,
  settings,
  onSettingsUpdated,
}: AdminAccountsViewProps) {
  const [invites, setInvites] = useState<AccountInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create Username + Password account form
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('organization');
  const [positionOrClub, setPositionOrClub] = useState('');
  const [department, setDepartment] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
    label: string;
  } | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Admin own password setup/update
  const [myPassword, setMyPassword] = useState('');
  const [showMyPassword, setShowMyPassword] = useState(false);
  const [savingMyPassword, setSavingMyPassword] = useState(false);
  const [hasPasswordLinked, setHasPasswordLinked] = useState(() =>
    Boolean(auth.currentUser?.providerData.some((p) => p.providerId === 'password'))
  );

  // Edit account inline state
  const [editingInviteId, setEditingInviteId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('organization');
  const [editPosition, setEditPosition] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Settings form
  const [organizationHeader, setOrganizationHeader] = useState(settings.organizationHeader);
  const [schoolYear, setSchoolYear] = useState(settings.schoolYear);
  const [generalPrefix, setGeneralPrefix] = useState(settings.generalPrefix);
  const [generalNextSequence, setGeneralNextSequence] = useState(settings.generalNextSequence);
  const [accomplishmentPrefix, setAccomplishmentPrefix] = useState(settings.accomplishmentPrefix);
  const [accomplishmentNextSequence, setAccomplishmentNextSequence] = useState(
    settings.accomplishmentNextSequence
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setOrganizationHeader(settings.organizationHeader);
    setSchoolYear(settings.schoolYear);
    setGeneralPrefix(settings.generalPrefix);
    setGeneralNextSequence(settings.generalNextSequence);
    setAccomplishmentPrefix(settings.accomplishmentPrefix);
    setAccomplishmentNextSequence(settings.accomplishmentNextSequence);
  }, [settings]);

  useEffect(() => {
    firebaseService
      .getAccountInvites()
      .then((list) => setInvites(list))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load accounts'))
      .finally(() => setLoading(false));
  }, []);

  const handleSetMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSavingMyPassword(true);
    try {
      await firebaseService.setMyPassword(myPassword);
      setHasPasswordLinked(true);
      setMyPassword('');
      setNotice(
        `Password saved for ${currentUser.username || currentUser.email}. You can now sign in using Username & Password.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save password');
    } finally {
      setSavingMyPassword(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setCreatedCredentials(null);
    setCopiedSlip(false);
    setCreating(true);
    const submittedPassword = password;
    try {
      const created = await firebaseService.createUsernamePasswordAccount(currentUser.id, {
        username,
        password: submittedPassword,
        fullName,
        role,
        positionOrClub,
        department: department || 'Learner Governance',
      });
      setInvites((prev) =>
        [...prev, created].sort((a, b) => a.positionOrClub.localeCompare(b.positionOrClub))
      );
      setCreatedCredentials({
        username: created.username || normalizeUsername(username),
        password: submittedPassword,
        label: created.positionOrClub,
      });
      setFullName('');
      setUsername('');
      setPassword('');
      setPositionOrClub('');
      setDepartment('');
      setNotice(
        `Created account for ${created.positionOrClub}. Share the Username & Password below with the representative.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdCredentials) return;
    const text = `SSLG Records Login (${createdCredentials.label})\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSlip(true);
      setTimeout(() => setCopiedSlip(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const startEditInvite = (inv: AccountInvite) => {
    setEditingInviteId(inv.id);
    setEditFullName(inv.fullName);
    setEditRole(inv.role);
    setEditPosition(inv.positionOrClub);
    setEditDepartment(inv.department);
    setConfirmDeleteId(null);
  };

  const handleSaveEditInvite = async (inv: AccountInvite) => {
    setError('');
    setNotice('');
    try {
      const updated = await firebaseService.updateAccountInvite(inv, currentUser.id, {
        fullName: editFullName,
        role: editRole,
        positionOrClub: editPosition,
        department: editDepartment,
      });
      setInvites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingInviteId(null);
      setNotice(`Updated account details for ${updated.fullName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const handleDeleteInvite = async (inv: AccountInvite) => {
    setError('');
    setNotice('');
    try {
      await firebaseService.deleteAccountInvite(inv, currentUser.id);
      setInvites((prev) => prev.filter((item) => item.id !== inv.id));
      setConfirmDeleteId(null);
      setNotice('Account access removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const toggleActive = async (inv: AccountInvite) => {
    setError('');
    try {
      const updated = await firebaseService.updateAccountInvite(inv, currentUser.id, {
        active: !inv.active,
      });
      setInvites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSavingSettings(true);
    try {
      const updated = await firebaseService.updateSettings({
        organizationHeader,
        schoolYear,
        generalPrefix,
        generalNextSequence: Number(generalNextSequence),
        accomplishmentPrefix,
        accomplishmentNextSequence: Number(accomplishmentNextSequence),
      });
      onSettingsUpdated(updated);
      setNotice('System prefixes and header settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-6">
          {/* Admin Own Password Setup / Change */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-800" />
              <span>
                {hasPasswordLinked
                  ? 'Update My Login Password'
                  : 'Set Password for My Admin Account'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Login ID:{' '}
              <strong className="font-mono-code text-slate-900">
                {currentUser.username || currentUser.email}
              </strong>
              {!hasPasswordLinked &&
                ' — Link a password here so you can sign in directly with Username & Password.'}
            </p>
            <form onSubmit={handleSetMyPassword} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showMyPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={myPassword}
                  onChange={(e) => setMyPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full px-3 pr-9 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowMyPassword((v) => !v)}
                  aria-label={showMyPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showMyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={savingMyPassword}
                className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {savingMyPassword ? 'Saving...' : hasPasswordLinked ? 'Update' : 'Set Password'}
              </button>
            </form>
          </div>

          {/* Create Username & Password Account */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-800" />
              <span>Create Officer or Club Account</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Public sign-up is disabled. Create Username &amp; Password credentials for SSLG
              officers and school clubs below.
            </p>

            {createdCredentials && (
              <div className="mb-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-emerald-900">
                    New Login Credentials ({createdCredentials.label})
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 rounded inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSlip ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs font-mono-code text-emerald-950 space-y-0.5">
                  <p>Username: {createdCredentials.username}</p>
                  <p>Password: {createdCredentials.password}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="organization">School Organization / Club</option>
                  <option value="officer">SSLG Officer (VP, Secretary, Treasurer, PIO, etc.)</option>
                  <option value="admin">Admin (SSLG President)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {role === 'organization' ? 'Club / Organization Name' : 'Official Position'}
                </label>
                <input
                  type="text"
                  required
                  value={positionOrClub}
                  onChange={(e) => setPositionOrClub(e.target.value)}
                  placeholder={
                    role === 'organization'
                      ? 'e.g., Debate & Journalism Guild'
                      : 'e.g., SSLG Vice President'
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Miguel Dela Cruz"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={60}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., scienceclub or sslg.vp"
                  className="w-full px-3 py-2 text-sm font-mono-code border border-slate-300 rounded-lg"
                />
                {username.trim().length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Normalized username:{' '}
                    <span className="font-mono-code font-semibold text-slate-700">
                      {normalizeUsername(username)}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setPassword(generateReadablePassword());
                      setShowNewPassword(true);
                    }}
                    className="text-[11px] font-semibold text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 pr-9 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Committee / Cluster
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Sports & Athletics"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-60"
              >
                {creating ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>

        {/* Control Number Prefixes & Accounts Directory */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Control Number Sequences &amp; Header Settings
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Used when issuing Stage 3 sequential Control Numbers, Eartags, and Compiled PDF books.
            </p>
            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization Header
                </label>
                <input
                  type="text"
                  required
                  value={organizationHeader}
                  onChange={(e) => setOrganizationHeader(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School Year
                </label>
                <input
                  type="text"
                  required
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  General Docs Prefix
                </label>
                <input
                  type="text"
                  required
                  value={generalPrefix}
                  onChange={(e) => setGeneralPrefix(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-code border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  General Next Seq
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={generalNextSequence}
                  onChange={(e) => setGeneralNextSequence(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-code tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accomplishment Report Prefix
                </label>
                <input
                  type="text"
                  required
                  value={accomplishmentPrefix}
                  onChange={(e) => setAccomplishmentPrefix(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-code border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accomplishment Next Seq
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={accomplishmentNextSequence}
                  onChange={(e) => setAccomplishmentNextSequence(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-code tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Officer &amp; Club Accounts ({invites.length})
              </h3>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading accounts...</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {invites.map((inv) => {
                  const isSelf = inv.claimedUid === currentUser.id;
                  const loginIdentifier = inv.username ? `@${inv.username}` : inv.email;
                  return (
                    <div key={inv.id} className="p-4 space-y-3">
                      {editingInviteId === inv.id ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              placeholder="Full Name"
                              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            />
                            <input
                              type="text"
                              value={editPosition}
                              onChange={(e) => setEditPosition(e.target.value)}
                              placeholder="Position or Club"
                              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            />
                            <input
                              type="text"
                              value={editDepartment}
                              onChange={(e) => setEditDepartment(e.target.value)}
                              placeholder="Committee / Cluster"
                              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            />
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as UserRole)}
                              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            >
                              <option value="organization">Organization / Club</option>
                              <option value="officer">SSLG Officer</option>
                              <option value="admin">Admin (SSLG President)</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingInviteId(null)}
                              className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditInvite(inv)}
                              className="px-3 py-1 text-xs font-semibold bg-blue-800 text-white rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {inv.positionOrClub}
                              </span>
                              <span className="text-xs text-slate-500 uppercase font-semibold">
                                · {inv.role}
                              </span>
                              {!inv.active ? (
                                <span className="text-xs font-semibold text-rose-700">
                                  · Disabled
                                </span>
                              ) : inv.claimedUid ? (
                                <span className="text-xs font-semibold text-emerald-700">
                                  · Active
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-amber-700">
                                  · Pending Sign-In
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 inline-flex items-center gap-1.5">
                              <span>{inv.fullName}</span>
                              <span>·</span>
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="font-mono-code">{loginIdentifier}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditInvite(inv)}
                              className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            {!isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleActive(inv)}
                                  className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer"
                                >
                                  {inv.active ? 'Disable' : 'Enable'}
                                </button>

                                {confirmDeleteId === inv.id ? (
                                  <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInvite(inv)}
                                      className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="text-xs text-slate-500 ml-1 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(inv.id)}
                                    title="Remove Account"
                                    className="p-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
