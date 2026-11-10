import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Users,
  FileArchive,
  BookOpen,
  MapPin,
  Trophy,
  Video,
  CalendarCheck,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  Smartphone,
  Fingerprint,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

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

const AdminNavbar = () => {
  const { admin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 2FA Security Modal state
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState({ totpEnabled: false, securityKeys: [] });
  const [loading2FA, setLoading2FA] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState(null); // { secret, otpauthUri }
  const [verifyCode, setVerifyCode] = useState('');
  const [keyLabel, setKeyLabel] = useState('Windows Hello / Security Key');
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const openSecurityModal = async () => {
    setSecurityModalOpen(true);
    setTotpSetupData(null);
    setVerifyCode('');
    setLoading2FA(true);
    try {
      const { data } = await API.get('/admin/2fa/status');
      setTwoFAStatus(data);
    } catch {
      toast.error('Failed to load security settings');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleStartTotpSetup = async () => {
    try {
      const { data } = await API.post('/admin/2fa/totp/setup');
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUri, { width: 200, margin: 1 });
      setTotpSetupData({ ...data, qrDataUrl });
      setVerifyCode('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start Authenticator setup');
    }
  };

  const handleConfirmEnableTotp = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/2fa/totp/enable', { code: verifyCode.trim() });
      setTwoFAStatus((prev) => ({ ...prev, totpEnabled: true }));
      setTotpSetupData(null);
      setVerifyCode('');
      toast.success('Google Authenticator enabled');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid 6-digit verification code');
    }
  };

  const handleDisableTotp = async () => {
    if (!window.confirm('Disable Google Authenticator 2FA?')) return;
    try {
      await API.post('/admin/2fa/totp/disable');
      setTwoFAStatus((prev) => ({ ...prev, totpEnabled: false }));
      setTotpSetupData(null);
      toast.success('Google Authenticator disabled');
    } catch {
      toast.error('Failed to disable Google Authenticator');
    }
  };

  const handleRegisterSecurityKey = async () => {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      toast.error('Windows Hello / Security Key is not supported in this browser');
      return;
    }

    try {
      const { data: challengeData } = await API.post('/admin/2fa/security-key/challenge');
      const challengeBytes = base64UrlToUint8Array(challengeData.challenge);
      const userIdBytes = new TextEncoder().encode(challengeData.user.id);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: {
            name: 'BanoQabil LMS',
            id: window.location.hostname,
          },
          user: {
            id: userIdBytes,
            name: challengeData.user.email,
            displayName: challengeData.user.displayName,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            userVerification: 'preferred',
          },
          timeout: 60000,
        },
      });

      if (!credential.response.getPublicKey) {
        toast.error('Browser does not support WebAuthn getPublicKey()');
        return;
      }

      const publicKeySpki = arrayBufferToBase64(credential.response.getPublicKey());
      const alg = credential.response.getPublicKeyAlgorithm
        ? credential.response.getPublicKeyAlgorithm()
        : -7;

      const { data: updated } = await API.post('/admin/2fa/security-key/register', {
        credentialId: credential.id,
        publicKeySpki,
        alg,
        label: keyLabel.trim() || 'Windows Security Key',
      });

      setTwoFAStatus((prev) => ({ ...prev, securityKeys: updated.securityKeys || [] }));
      toast.success('Windows Security Key registered');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Security Key registration cancelled or failed'
      );
    }
  };

  const handleRemoveSecurityKey = async (keyId) => {
    if (!window.confirm('Remove this security key?')) return;
    try {
      const { data } = await API.delete(`/admin/2fa/security-key/${keyId}`);
      setTwoFAStatus((prev) => ({ ...prev, securityKeys: data.securityKeys || [] }));
      toast.success('Security key removed');
    } catch {
      toast.error('Failed to remove security key');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Campuses & Batches', path: '/admin/manage-campuses', icon: MapPin },
    { name: 'Students', path: '/admin/manage-students', icon: Users },
    { name: 'Create Quiz', path: '/admin/create-quiz', icon: FileText },
    { name: 'Quiz Results', path: '/admin/results', icon: Trophy },
    { name: 'Video Lectures', path: '/admin/manage-lectures', icon: Video },
    { name: 'Attendance', path: '/admin/manage-attendance', icon: CalendarCheck },
    { name: 'Assignments', path: '/admin/manage-assignments', icon: FileArchive },
    { name: 'Lecture Notes', path: '/admin/manage-notes', icon: BookOpen },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[var(--bg-surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-base text-[var(--text-primary)] tracking-tight">
            BanoQabil Admin
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openSecurityModal}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            title="2FA & Security Key Settings"
          >
            <ShieldCheck size={17} />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop fixed, Mobile drawer) */}
      <aside
        className={`w-64 bg-[var(--bg-surface)] h-screen fixed left-0 top-0 flex flex-col z-50 border-r border-[var(--border)] transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">BanoQabil</h2>
            <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider mt-0.5 truncate max-w-[180px]">
              {admin?.email || 'Admin Portal'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] text-white font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--border)] space-y-1">
          <button
            type="button"
            onClick={openSecurityModal}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ShieldCheck size={18} />
            <span>2FA & Security Key</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <span className="flex items-center gap-3">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)] uppercase">
              {theme}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors font-medium text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Admin 2FA & Security Key Modal */}
      {securityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-[var(--text-primary)]" />
                <div>
                  <h2 className="text-base font-bold">Admin 2FA & Security Key</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Protect admin sign-in with Google Authenticator or Windows Security Key
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            {loading2FA ? (
              <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                Loading security settings...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Section 1: Google Authenticator */}
                <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Smartphone size={18} className="text-[var(--text-secondary)]" />
                      <div>
                        <h3 className="text-sm font-bold">Google Authenticator (TOTP)</h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Require a 6-digit code from Google Authenticator on login
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        twoFAStatus.totpEnabled
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                      }`}
                    >
                      {twoFAStatus.totpEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {twoFAStatus.totpEnabled ? (
                    <button
                      type="button"
                      onClick={handleDisableTotp}
                      className="btn-secondary text-xs text-rose-500 w-full"
                    >
                      Disable Google Authenticator
                    </button>
                  ) : !totpSetupData ? (
                    <button
                      type="button"
                      onClick={handleStartTotpSetup}
                      className="btn-primary text-xs w-full"
                    >
                      Setup Google Authenticator
                    </button>
                  ) : (
                    <form onSubmit={handleConfirmEnableTotp} className="space-y-3 pt-2 border-t border-[var(--border)]">
                      <p className="text-xs text-[var(--text-secondary)]">
                        1. Scan this QR code in <strong>Google Authenticator</strong> (or enter the setup key manually):
                      </p>
                      <div className="flex flex-col items-center gap-3 p-3 rounded-lg bg-white">
                        <img
                          src={totpSetupData.qrDataUrl}
                          alt="Google Authenticator QR Code"
                          className="w-40 h-40"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                        <code className="text-xs font-mono break-all text-[var(--text-primary)]">
                          {totpSetupData.secret}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(totpSetupData.secret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 1800);
                          }}
                          className="btn-secondary text-xs px-2.5 py-1 shrink-0 flex items-center gap-1"
                        >
                          {copiedSecret ? <Check size={13} /> : <Copy size={13} />}
                          {copiedSecret ? 'Copied' : 'Copy Key'}
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          2. Enter 6-digit code from app to confirm:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="123456"
                            className="input-field font-mono tracking-widest"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                            required
                          />
                          <button type="submit" className="btn-primary text-xs shrink-0 px-4">
                            Activate
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Section 2: Windows Hello / Security Key */}
                <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Fingerprint size={18} className="text-[var(--text-secondary)]" />
                      <div>
                        <h3 className="text-sm font-bold">Windows Security Key / Windows Hello</h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Use Windows Hello PIN/Fingerprint or USB Security Key
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                      {twoFAStatus.securityKeys?.length || 0} Registered
                    </span>
                  </div>

                  {twoFAStatus.securityKeys?.length > 0 && (
                    <div className="space-y-2">
                      {twoFAStatus.securityKeys.map((k) => (
                        <div
                          key={k._id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{k.label}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              Added {new Date(k.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSecurityKey(k._id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                            title="Remove Security Key"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Key label (e.g. Laptop Windows Hello)"
                      className="input-field text-xs"
                      value={keyLabel}
                      onChange={(e) => setKeyLabel(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleRegisterSecurityKey}
                      className="btn-primary text-xs shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Fingerprint size={15} /> Add Security Key
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminNavbar;
