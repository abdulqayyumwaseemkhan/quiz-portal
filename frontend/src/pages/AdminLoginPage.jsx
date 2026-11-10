import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api';
import { Lock, Mail, ShieldCheck, Sun, Moon, KeyRound, Smartphone, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA challenge state
  const [twoFAState, setTwoFAState] = useState(null); // { tempToken, methods, challenge, allowCredentials }
  const [totpCode, setTotpCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/admin/login', { email, password });
      if (data.requires2FA) {
        setTwoFAState(data);
        toast('Two-factor authentication required');
      } else {
        login(data);
        toast.success('Login successful');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async (e) => {
    e.preventDefault();
    if (!totpCode.trim()) return;
    setVerifying2FA(true);
    try {
      const { data } = await API.post('/admin/login/verify-2fa', {
        tempToken: twoFAState.tempToken,
        method: 'totp',
        code: totpCode.trim(),
      });
      login(data);
      toast.success('Verified with Google Authenticator');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid authenticator code');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleVerifySecurityKey = async () => {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      toast.error('WebAuthn / Windows Security Key is not supported in this browser');
      return;
    }

    setVerifying2FA(true);
    try {
      const challengeBytes = base64UrlToUint8Array(twoFAState.challenge);
      const allowCredentials = (twoFAState.allowCredentials || []).map((credId) => ({
        type: 'public-key',
        id: base64UrlToUint8Array(credId),
      }));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challengeBytes,
          allowCredentials,
          userVerification: 'preferred',
          timeout: 60000,
        },
      });

      const { data } = await API.post('/admin/login/verify-2fa', {
        tempToken: twoFAState.tempToken,
        method: 'securityKey',
        credentialId: assertion.id,
        authenticatorData: arrayBufferToBase64(assertion.response.authenticatorData),
        clientDataJSON: arrayBufferToBase64(assertion.response.clientDataJSON),
        signature: arrayBufferToBase64(assertion.response.signature),
      });

      login(data);
      toast.success('Verified with Windows Security Key');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Security Key verification cancelled or failed'
      );
    } finally {
      setVerifying2FA(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4 relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="max-w-md w-full card p-7 sm:p-9">
        <div className="text-center mb-7">
          <div className="bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border)] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">BanoQabil Admin</h1>
          <p className="text-[var(--text-muted)] mt-1 text-xs font-medium uppercase tracking-wider">
            {twoFAState ? 'Two-Factor Security Verification' : 'Administrator Sign In'}
          </p>
        </div>

        {!twoFAState ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
                <input
                  type="email"
                  placeholder="admin@portal.com"
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
                <input
                  type="password"
                  placeholder="Enter password"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {twoFAState.methods?.totp && (
              <form onSubmit={handleVerifyTotp} className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Google Authenticator Code
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="input-field pl-10 font-mono tracking-widest text-base"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifying2FA || totpCode.length !== 6}
                  className="btn-primary w-full py-2.5 text-sm font-semibold"
                >
                  {verifying2FA ? 'Verifying...' : 'Verify Authenticator Code'}
                </button>
              </form>
            )}

            {twoFAState.methods?.totp && twoFAState.methods?.securityKey && (
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span>OR</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
            )}

            {twoFAState.methods?.securityKey && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleVerifySecurityKey}
                  disabled={verifying2FA}
                  className="btn-secondary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Fingerprint size={18} />
                  <span>{verifying2FA ? 'Waiting for Windows Hello / Key...' : 'Use Windows Security Key / Passkey'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setTwoFAState(null);
                setTotpCode('');
              }}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] pt-2"
            >
              Back to Email & Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;
