import React, { useEffect, useState } from 'react';
import { CheckCircle2, Edit3, KeyRound, Save, Trash2, UserPlus, X } from 'lucide-react';
import { api } from '../lib/api.ts';
import type { SystemSettings, UserAccount, UserRole } from '../types.ts';

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
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create account form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('organization');
  const [positionOrClub, setPositionOrClub] = useState('');
  const [department, setDepartment] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit account inline state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('organization');
  const [editPosition, setEditPosition] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

  // Delete confirmation
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Password reset inline
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

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
    api
      .getUsers()
      .then((list) => setUsers(list))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load accounts'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setCreating(true);
    try {
      const created = await api.createUser({
        fullName,
        email,
        password,
        role,
        positionOrClub,
        department: department || 'Student Governance',
      });
      setUsers((prev) => [...prev, created]);
      setFullName('');
      setEmail('');
      setPassword('');
      setPositionOrClub('');
      setDepartment('');
      setNotice(`Account created for ${created.fullName} (${created.positionOrClub}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const startEditUser = (u: UserAccount) => {
    setEditingUserId(u.id);
    setEditFullName(u.fullName);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPosition(u.positionOrClub);
    setEditDepartment(u.department);
    setResetUserId(null);
    setConfirmDeleteUserId(null);
  };

  const handleSaveEditUser = async (userId: string) => {
    setError('');
    setNotice('');
    try {
      const updated = await api.updateUser(userId, {
        fullName: editFullName,
        email: editEmail,
        role: editRole,
        positionOrClub: editPosition,
        department: editDepartment,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUserId(null);
      setNotice(`Updated account for ${updated.fullName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setError('');
    setNotice('');
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDeleteUserId(null);
      setNotice('Account deleted permanently.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const toggleActive = async (user: UserAccount) => {
    setError('');
    try {
      const updated = await api.updateUser(user.id, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setError('');
    try {
      await api.updateUser(userId, { password: newPassword.trim() });
      setResetUserId(null);
      setNewPassword('');
      setNotice('Account password updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSavingSettings(true);
    try {
      const updated = await api.updateSettings({
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
        {/* Create New Account */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-800" />
            <span>Create Officer or Club Account</span>
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            Public registration is disabled. Only the SSLG President (Admin) issues credentials.
          </p>

          <form onSubmit={handleCreateUser} className="space-y-3.5">
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
                  role === 'organization' ? 'e.g., Debate & Journalism Guild' : 'e.g., SSLG Vice President'
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Miguel Dela Cruz"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Login Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@sslg.edu"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 4 chars"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">School Year</label>
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
                Registered Officer &amp; Club Credentials ({users.length})
              </h3>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading accounts...</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {users.map((u) => (
                  <div key={u.id} className="p-4 space-y-3">
                    {editingUserId === u.id ? (
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
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Email"
                            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                          />
                          <input
                            type="text"
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                            placeholder="Position or Club"
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
                            onClick={() => setEditingUserId(null)}
                            className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded inline-flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditUser(u.id)}
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {u.positionOrClub}
                            </span>
                            <span className="text-xs text-slate-500 uppercase font-semibold">
                              · {u.role}
                            </span>
                            {!u.active && (
                              <span className="text-xs font-semibold text-rose-700">· Inactive</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {u.fullName} · {u.email}
                          </p>

                          {resetUserId === u.id && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password (min 4 chars)"
                                className="px-2.5 py-1 text-xs border border-slate-300 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleResetPassword(u.id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-blue-800 text-white rounded cursor-pointer"
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetUserId(null);
                                  setNewPassword('');
                                }}
                                className="px-2 py-1 text-xs text-slate-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditUser(u)}
                            className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetUserId(u.id);
                              setNewPassword('');
                              setConfirmDeleteUserId(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Password</span>
                          </button>
                          {u.id !== currentUser.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleActive(u)}
                                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer"
                              >
                                {u.active ? 'Disable' : 'Enable'}
                              </button>

                              {confirmDeleteUserId === u.id ? (
                                <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUserId(null)}
                                    className="text-xs text-slate-500 ml-1 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(u.id)}
                                  title="Delete Account"
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
