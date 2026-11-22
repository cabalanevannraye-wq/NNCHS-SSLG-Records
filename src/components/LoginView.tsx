import React, { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  auth,
  clearGoogleDriveAccessToken,
  googleProvider,
  setGoogleDriveAccessToken,
  usernameOrEmailToAuthEmail,
} from '../firebase.ts';
import { buildApiUrl } from '../lib/api.ts';
import { NNCHSSchoolSeal, SSLGCrest } from './SSLGCrest.tsx';

export interface CmsAdminSession {
  username: string;
  token: string;
}

interface BackendAdminStatus {
  backendAvailable: boolean;
  configured: boolean;
  envManaged: boolean;
}

interface LoginViewProps {
  authBlockState?: {
    status: 'unauthorized' | 'disabled' | 'unverified';
    email: string;
  } | null;
  onClearBlockState?: () => void;
  onCmsAdminSignedIn?: (session: CmsAdminSession) => void;
  onReturnToPortal?: () => void;
}

export function LoginView({
  authBlockState,
  onClearBlockState,
  onCmsAdminSignedIn,
  onReturnToPortal,
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  // Server-side CMS Admin First-Run Status
  const [backendStatus, setBackendStatus] = useState<BackendAdminStatus>({
    backendAvailable: false,
    configured: false,
    envManaged: false,
  });
  const [claimUser, setClaimUser] = useState('admin');
  const [claimPassword, setClaimPassword] = useState('');
  const [claimConfirm, setClaimConfirm] = useState('');

  useEffect(() => {
    let active = true;
    fetch(buildApiUrl('/api/admin/status'))
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as BackendAdminStatus;
      })
      .then((data) => {
        if (active && data?.backendAvailable) {
          setBackendStatus(data);
        }
      })
      .catch(() => {
        // Static deploy without Express server backend — fall back seamlessly to Firebase Auth
      });
    return () => {
      active = false;
    };
  }, []);

  const handleClaimAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (claimPassword.length < 6) {
      setError('Admin password must be at least 6 characters.');
      return;
    }
    if (claimPassword !== claimConfirm) {
      setError('Password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: claimUser.trim(),
          password: claimPassword,
        }),
      });
      const payload = (await res.json()) as { token?: string; username?: string; error?: string };
      if (!res.ok || !payload.token) {
        setError(payload.error || 'Unable to configure Admin account.');
        return;
      }
      setBackendStatus((prev) => ({ ...prev, configured: true }));
      onCmsAdminSignedIn?.({
        username: payload.username || claimUser.trim(),
        token: payload.token,
      });
    } catch {
      setError('Unable to reach server Admin setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernamePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Please enter both your username and password.');
      return;
    }

    setLoading(true);
    try {
      // 1. Try server-side CMS Admin Auth if backend is configured and user didn't enter a full external email
      if (backendStatus.backendAvailable && backendStatus.configured && !trimmedUser.includes('@')) {
        try {
          const cmsRes = await fetch(buildApiUrl('/api/admin/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: trimmedUser, password }),
          });
          if (cmsRes.ok) {
            const cmsData = (await cmsRes.json()) as { token?: string; username?: string };
            if (cmsData.token) {
              onCmsAdminSignedIn?.({
                username: cmsData.username || trimmedUser,
                token: cmsData.token,
              });
              return;
            }
          }
        } catch {
          // Proceed to Firebase Auth attempt cleanly
        }
      }

      // 2. Firebase Officer / President Auth
      const authEmail = usernameOrEmailToAuthEmail(trimmedUser);
      await signInWithEmailAndPassword(auth, authEmail, password);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        setError('Invalid username or password.');
      } else if (code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password sign-in is not yet enabled in Firebase Console. Open Firebase Console → Authentication → Sign-in method → Enable Email/Password, or claim your Admin CMS password above.'
        );
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed sign-in attempts. Please wait a moment and try again.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Contact the SSLG President (Admin).');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminGoogleVerify = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleDriveAccessToken(credential.accessToken);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed before completing verification.');
      } else if (code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setError(
          `Domain "${host}" is not authorized in Firebase Authentication. Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setError(err instanceof Error ? err.message : 'Unable to verify Admin Google account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setError('');
    setNotice('');
    const clean = username.trim().toLowerCase();
    if (!clean.includes('@')) {
      setError(
        'Username accounts do not have a personal inbox. Ask the SSLG President (Admin) under Accounts & Settings to issue a new account or reset credentials.'
      );
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, clean);
      setNotice(`Password reset email sent to ${clean}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setError('');
    setNotice('');
    clearGoogleDriveAccessToken();
    await signOut(auth);
    onClearBlockState?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-blue-50/60 to-yellow-50/40 dark:from-[#0b1120] dark:via-slate-950 dark:to-blue-950/40 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md backdrop-blur-md bg-white/85 dark:bg-slate-900/80 rounded-2xl border border-blue-900/15 dark:border-yellow-400/20 shadow-xl p-8 sm:p-10">
        {onReturnToPortal && (
          <div className="mb-4">
            <button
              type="button"
              onClick={onReturnToPortal}
              className="text-xs font-bold text-[#1e3a8a] dark:text-[#fde047] hover:underline cursor-pointer"
            >
              ← Return to NNCHS SSLG Website
            </button>
          </div>
        )}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <NNCHSSchoolSeal className="w-16 h-16" />
            <SSLGCrest className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-950 dark:text-white">
            NNCHS SSLG Admin Portal
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Dynamic Website Content &amp; Records Hub
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-sm font-semibold text-blue-950 dark:text-[#fde047]">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 p-3 rounded-lg bg-yellow-50 dark:bg-slate-800 border border-[#eab308] text-sm font-semibold text-blue-950 dark:text-[#fde047]">
            {notice}
          </div>
        )}

        {authBlockState ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-slate-800 border border-[#eab308] text-sm text-blue-950 dark:text-slate-100 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-[#1e3a8a] dark:text-[#fde047] shrink-0" />
                <span>
                  {authBlockState.status === 'disabled'
                    ? 'Account Deactivated'
                    : authBlockState.status === 'unverified'
                    ? 'Verification Required'
                    : 'Account Not Authorized'}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {authBlockState.status === 'disabled' ? (
                  <>
                    The account <strong>{authBlockState.email}</strong> has been deactivated by the
                    SSLG President (Admin).
                  </>
                ) : authBlockState.status === 'unverified' ? (
                  <>
                    Please verify your account email or sign in with credentials created by the
                    SSLG President (Admin).
                  </>
                ) : (
                  <>
                    <strong>{authBlockState.email}</strong> is not registered in the SSLG Records
                    portal. Ask the SSLG President (Admin) to create your Username and Password
                    under <strong>Accounts &amp; Settings</strong>.
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSwitchAccount}
              className="w-full py-2.5 px-4 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Return to Login</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* One-Time First-Run CMS Admin Password Claim when Backend is Active & Unconfigured */}
            {backendStatus.backendAvailable && !backendStatus.configured && (
              <form
                onSubmit={handleClaimAdminAccount}
                className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950 dark:text-[#fde047]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>First-Run Portal Admin Setup</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Set your SSLG Portal Admin username and password once to unlock the CMS, Free Printing Ready-to-Print queue, and Moderation hub.
                </p>
                <input
                  type="text"
                  required
                  value={claimUser}
                  onChange={(e) => setClaimUser(e.target.value)}
                  placeholder="Admin username"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  placeholder="Create password (min. 6 chars)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={claimConfirm}
                  onChange={(e) => setClaimConfirm(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  Save Admin Credentials &amp; Enter Hub
                </button>
              </form>
            )}

            <form onSubmit={handleUsernamePasswordSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#1e3a8a] hover:bg-[#1d4ed8] dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? 'Signing in...' : 'Sign In to Admin Portal'}</span>
                <ArrowRight className="w-4 h-4 text-[#fde047]" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setShowAdminSetup((v) => !v)}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-[#fde047] cursor-pointer"
              >
                {showAdminSetup
                  ? 'Hide Firebase Admin verification'
                  : 'Verify SSLG President Google Account or reset password'}
              </button>

              {showAdminSetup && (
                <div className="mt-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 text-left space-y-2.5">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Verify your SSLG President Google account to unlock the Firebase 5-Stage Document Archive and Google Drive vault.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleAdminGoogleVerify}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-950 dark:text-slate-100 border border-blue-200 dark:border-slate-700 font-semibold text-xs rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-800 dark:text-[#fde047]" />
                      <span>Verify Admin via Google</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendPasswordReset}
                      className="w-full py-1.5 text-[11px] font-medium text-blue-800 dark:text-[#fde047] hover:underline cursor-pointer"
                    >
                      Send password reset email (if using email username)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Authorized NNCHS SSLG Officers &amp; School Clubs only.
        </p>
      </div>
    </div>
  );
}
