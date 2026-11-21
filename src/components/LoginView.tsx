import React, { useState } from 'react';
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
  User,
} from 'lucide-react';
import {
  auth,
  clearGoogleDriveAccessToken,
  googleProvider,
  setGoogleDriveAccessToken,
  usernameOrEmailToAuthEmail,
} from '../firebase.ts';
import { SSLGCrest } from './SSLGCrest.tsx';

interface LoginViewProps {
  authBlockState?: {
    status: 'unauthorized' | 'disabled' | 'unverified';
    email: string;
  } | null;
  onClearBlockState?: () => void;
}

export function LoginView({ authBlockState, onClearBlockState }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  const handleUsernamePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Please enter both your username and password.');
      return;
    }

    const authEmail = usernameOrEmailToAuthEmail(trimmedUser);
    setLoading(true);
    try {
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
          'Email/Password sign-in is not yet enabled in Firebase Console. Open Firebase Console → Authentication → Sign-in method → Enable Email/Password, then try again.'
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <SSLGCrest className="w-20 h-20 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">SSLG Records</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            NNCHS · Supreme Secondary Learner Government
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-900">
            {notice}
          </div>
        )}

        {authBlockState ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {authBlockState.status === 'disabled'
                    ? 'Account Deactivated'
                    : authBlockState.status === 'unverified'
                    ? 'Verification Required'
                    : 'Account Not Authorized'}
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
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
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-blue-900 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Return to Login</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <form onSubmit={handleUsernamePasswordSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
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
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-slate-950 hover:bg-blue-900 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setShowAdminSetup((v) => !v)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showAdminSetup
                  ? 'Hide setup options'
                  : 'First-time Admin setup or forgot password?'}
              </button>

              {showAdminSetup && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    If you are the SSLG President (Admin) and have not set a password yet, verify
                    your Admin Google account once to set your password and create officer/club
                    usernames.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleAdminGoogleVerify}
                      className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-semibold text-xs rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-800" />
                      <span>Verify Admin via Google &amp; Set Password</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendPasswordReset}
                      className="w-full py-1.5 text-[11px] font-medium text-blue-800 hover:underline cursor-pointer"
                    >
                      Send password reset email (if using email username)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Authorized SSLG Officers &amp; School Clubs only. Accounts are created by the SSLG
          President (Admin).
        </p>
      </div>
    </div>
  );
}
