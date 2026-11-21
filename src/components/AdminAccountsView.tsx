import React, { useEffect, useState } from 'react';
import { CheckCircle2, Edit3, Mail, Save, Trash2, UserPlus, X } from 'lucide-react';
import { BOOTSTRAPPED_ADMIN_EMAIL, firebaseService } from '../lib/firebaseService.ts';
import type { AccountInvite, SystemSettings, UserAccount, UserRole } from '../types.ts';

interface AdminAccountsViewProps {
  currentUser: UserAccount;
  settings: SystemSettings;
  onSettingsUpdated: (settings: SystemSettings) => void;
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

  // Create account invite form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('organization');
  const [positionOrClub, setPositionOrClub] = useState('');
  const [department, setDepartment] = useState('');
  const [creating, setCreating] = useState(false);

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

  const isBootstrappedAdmin = currentUser.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;

  useEffect(() => {
    setOrganizationHeader(settings.organizationHeader);
    setSchoolYear(settings.schoolYear);
    setGeneralPrefix(settings.generalPrefix);
    setGeneralNextSequence(settings.generalNextSequence);
    setAccomplishmentPrefix(settings.accomplishmentPrefix);
    setAccomplishmentNextSequence(settings.accomplishmentNextSequence);
  }, [settings]);

  useEffect(() => {
    if (!isBootstrappedAdmin) {
      setLoading(false);
      return;
    }
    firebaseService
      .getAccountInvites()
      .then((list) => setInvites(list))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load accounts'))
      .finally(() => setLoading(false));
  }, [isBootstrappedAdmin]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setCreating(true);
    try {
      const created = await firebaseService.createAccountInvite({
        fullName,
        email,
        role,
        positionOrClub,
        department: department || 'Student Governance',
      });
      setInvites((prev) =>
        [...prev, created].sort((a, b) => a.positionOrClub.localeCompare(b.positionOrClub))
      );
      setFullName('');
      setEmail('');
      setPositionOrClub('');
      setDepartment('');
      setNotice(
        `Authorized ${created.email} as ${created.positionOrClub}. They can now sign in with Google.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authorize account');
    } finally {
      setCreating(false);
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
      setNotice(`Updated account authorization for ${updated.fullName}.`);
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
      setNotice('Account authorization removed.');
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
        {/* Authorize Google Account */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-800" />
            <span>Authorize Officer or Club Google Account</span>
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            Public registration is disabled. Add an authorized Google email below so the officer or
            club representative can sign in using Google Sign-In.
          </p>

          <form onSubmit={handleCreateInvite} className="space-y-3.5">
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
                Authorized Google Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="representative@gmail.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
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
              {creating ? 'Authorizing...' : 'Authorize Google Account'}
            </button>
          </form>
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
                Authorized Officer &amp; Club Accounts ({invites.length})
              </h3>
            </div>
            {!isBootstrappedAdmin ? (
              <div className="p-6 text-xs text-slate-600">
                Full account invitation roster management is reserved for the Primary SSLG
                President account ({BOOTSTRAPPED_ADMIN_EMAIL}). You can still authorize new emails
                using the form on the left.
              </div>
            ) : loading ? (
              <div className="p-6 text-sm text-slate-500">Loading authorized accounts...</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {invites.map((inv) => {
                  const isSelf = inv.claimedUid === currentUser.id;
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
                                  · Pending First Google Sign-In
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 inline-flex items-center gap-1.5">
                              <span>{inv.fullName}</span>
                              <span>·</span>
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{inv.email}</span>
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
                                    title="Remove Authorization"
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
