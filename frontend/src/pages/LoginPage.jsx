import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Navigate, useNavigate } from 'react-router-dom';
import RecoveryCodesPanel from '../components/RecoveryCodesPanel';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const DEMO_ACCOUNTS = [
  { user: 'admin', pass: 'admin123', role: '管理者・全社員' },
  { user: 'hr', pass: 'hr123', role: '人事・全社員' },
  { user: 'sales', pass: 'sales123', role: '営業・人事部除く全社員' },
  { user: 'div1', pass: 'div123', role: '事業一部長・事業一部配下' },
  { user: 'dept1', pass: 'dept123', role: '開発一部長・開発一部のみ' },
  { user: 'user', pass: 'user123', role: '一般・全社員閲覧' },
];

function normalizeMfaVerifyInput(value) {
  const upper = value.toUpperCase();
  if (/[A-Z-]/.test(upper)) {
    return upper.replace(/[^A-Z0-9-]/g, '').slice(0, 9);
  }
  return value.replace(/\D/g, '').slice(0, 6);
}

function isValidMfaVerifyCode(code) {
  if (/^\d{6}$/.test(code)) return true;
  const normalized = code.replace(/-/g, '').trim();
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(normalized);
}

function MfaCodeField({ id, value, onChange, disabled, mode = 'totp' }) {
  const isVerify = mode === 'verify';
  const input = (
    <input
      id={id}
      type="text"
      inputMode={isVerify ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      maxLength={isVerify ? 9 : 6}
      className={`form-control login-mfa-code-input${isVerify ? ' login-mfa-code-input--verify' : ''}`}
      placeholder={isVerify ? '6桁コード / 復旧コード' : '000000'}
      value={value}
      onChange={(e) => onChange(normalizeMfaVerifyInput(e.target.value))}
      disabled={disabled}
      required
    />
  );

  if (isVerify) {
    return (
      <div className="login-mfa-input-wrap">
        <i className="bi bi-shield-check login-mfa-input-icon" aria-hidden="true" />
        {input}
      </div>
    );
  }

  return <div className="login-mfa-input-wrap login-mfa-input-wrap--totp">{input}</div>;
}

function LoginMfaHero({ icon, title, subtitle, badge }) {
  return (
    <div className="login-mfa-hero">
      <div className="login-mfa-hero-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </div>
      <div className="login-mfa-hero-body">
        {badge && (
          <span className="login-mfa-user-badge">
            <i className="bi bi-person-fill" aria-hidden="true" />
            {badge}
          </span>
        )}
        <h2 className="login-form-title">{title}</h2>
        {subtitle && <p className="login-form-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, completeMfaLogin, completeMfaSetup, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('credentials');
  const [challengeToken, setChallengeToken] = useState('');
  const [mfaUsername, setMfaUsername] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 'mfa-setup' || !challengeToken || otpauthUri) return;
    let cancelled = false;
    (async () => {
      setSubmitting(true);
      try {
        const result = await api.beginMfaSetup({ challengeToken });
        if (!cancelled) {
          setOtpauthUri(result.otpauthUri);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '二段階認証の準備に失敗しました');
          setStep('credentials');
        }
      } finally {
        if (!cancelled) {
          setSubmitting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, challengeToken, otpauthUri]);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function resetMfaFlow() {
    setStep('credentials');
    setChallengeToken('');
    setMfaUsername('');
    setOtpauthUri('');
    setMfaCode('');
    setRecoveryCodes([]);
    setError('');
  }

  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      if (result.status === 'SUCCESS') {
        navigate('/', { replace: true });
        return;
      }
      setChallengeToken(result.challengeToken);
      setMfaUsername(result.username || username.trim());
      setMfaCode('');
      if (result.status === 'MFA_SETUP_REQUIRED') {
        setOtpauthUri('');
        setStep('mfa-setup');
      } else {
        setStep('mfa-verify');
      }
    } catch (err) {
      setError(err.message || 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaVerifySubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await completeMfaLogin(challengeToken, mfaCode);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || '認証コードが正しくありません');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSetupSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await completeMfaSetup(challengeToken, mfaCode);
      setRecoveryCodes(result.recoveryCodes || []);
      setStep('recovery-codes');
    } catch (err) {
      setError(err.message || '認証コードが正しくありません');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(account) {
    resetMfaFlow();
    setUsername(account.user);
    setPassword(account.pass);
  }

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden="true">
        <span className="login-blob login-blob-1" />
        <span className="login-blob login-blob-2" />
        <span className="login-blob login-blob-3" />
      </div>

      <div className="login-shell">
        <div className="login-card">
          <aside className="login-brand-panel">
            <div className="login-brand-content">
              <div className="login-logo">
                <i className="bi bi-people-fill" aria-hidden="true" />
              </div>
              <div className="login-brand-heading">
                <p className="login-brand-eyebrow">派遣会社向けプラットフォーム</p>
                <h1 className="login-brand-title">
                  <span className="login-brand-title-main">社員情報</span>
                  <span className="login-brand-title-sub">管理</span>
                </h1>
                <p className="login-brand-tagline">
                  Manage talent, skills, and projects in one place.
                </p>
              </div>
              <ul className="login-brand-features">
                <li>
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  社員・スキル・評価を統合管理
                </li>
                <li>
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  案件マッチング・イベント管理
                </li>
                <li>
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  権限に応じた安全なアクセス
                </li>
              </ul>
            </div>
          </aside>

          <div className="login-form-panel">
            {step === 'credentials' && (
              <>
                <div className="login-form-head">
                  <h2 className="login-form-title">ログイン</h2>
                  <p className="login-form-subtitle">アカウント情報を入力してください</p>
                </div>

                {error && (
                  <div className="alert alert-danger login-error py-2" role="alert">
                    <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="login-form">
                  <div className="mb-3">
                    <label htmlFor="loginUsername" className="form-label login-label">
                      ユーザー名
                    </label>
                    <div className="login-input-wrap">
                      <i className="bi bi-person login-input-icon" aria-hidden="true" />
                      <input
                        id="loginUsername"
                        type="text"
                        className="form-control login-input"
                        autoComplete="username"
                        placeholder="ユーザー名を入力"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="loginPassword" className="form-label login-label">
                      パスワード
                    </label>
                    <div className="login-input-wrap">
                      <i className="bi bi-lock login-input-icon" aria-hidden="true" />
                      <input
                        id="loginPassword"
                        type="password"
                        className="form-control login-input"
                        autoComplete="current-password"
                        placeholder="パスワードを入力"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100 app-btn login-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        ログイン中…
                      </>
                    ) : (
                      <>
                        ログイン
                        <i className="bi bi-arrow-right-short" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>

                <div className="login-demo">
                  <div className="login-demo-head">
                    <i className="bi bi-info-circle" aria-hidden="true" />
                    <span>初期アカウント（初回起動時自動作成）</span>
                  </div>
                  <div className="login-demo-grid">
                    {DEMO_ACCOUNTS.map((account) => (
                      <button
                        key={account.user}
                        type="button"
                        className="login-demo-item"
                        onClick={() => fillDemoAccount(account)}
                        title="クリックで入力欄に反映"
                      >
                        <span className="login-demo-credentials">
                          <code>{account.user}</code>
                          <span className="login-demo-sep">/</span>
                          <code>{account.pass}</code>
                        </span>
                        <span className="login-demo-role">{account.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 'mfa-verify' && (
              <>
                <LoginMfaHero
                  icon="bi-shield-lock-fill"
                  title="二段階認証"
                  subtitle="本人確認のため、追加の認証情報を入力してください"
                  badge={mfaUsername || undefined}
                />

                <div className="login-mfa-hint-grid" aria-hidden="true">
                  <div className="login-mfa-hint-card">
                    <span className="login-mfa-hint-icon login-mfa-hint-icon--app">
                      <i className="bi bi-phone" />
                    </span>
                    <div>
                      <strong>認証アプリ</strong>
                      <span>6 桁のワンタイムコード</span>
                    </div>
                  </div>
                  <div className="login-mfa-hint-card">
                    <span className="login-mfa-hint-icon login-mfa-hint-icon--key">
                      <i className="bi bi-key-fill" />
                    </span>
                    <div>
                      <strong>バックアップコード</strong>
                      <span>XXXX-XXXX 形式</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger login-error py-2" role="alert">
                    <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleMfaVerifySubmit} className="login-form login-mfa-form">
                  <div className="login-mfa-field">
                    <label htmlFor="mfaVerifyCode" className="form-label login-label">
                      認証コード
                    </label>
                    <MfaCodeField
                      id="mfaVerifyCode"
                      value={mfaCode}
                      onChange={setMfaCode}
                      disabled={submitting}
                      mode="verify"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100 app-btn login-submit-btn"
                    disabled={submitting || !isValidMfaVerifyCode(mfaCode)}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        確認中…
                      </>
                    ) : (
                      <>
                        確認してログイン
                        <i className="bi bi-arrow-right-short" aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link w-100 login-mfa-back-btn"
                    onClick={resetMfaFlow}
                    disabled={submitting}
                  >
                    <i className="bi bi-arrow-left" aria-hidden="true" />
                    ログイン画面に戻る
                  </button>
                </form>
              </>
            )}

            {step === 'recovery-codes' && (
              <>
                <LoginMfaHero
                  icon="bi-patch-check-fill"
                  title="バックアップコード"
                  subtitle="設定が完了しました。以下のコードを安全な場所に保存してください"
                />
                <RecoveryCodesPanel
                  codes={recoveryCodes}
                  onClose={() => navigate('/', { replace: true })}
                  variant="login"
                />
              </>
            )}

            {step === 'mfa-setup' && (
              <>
                <LoginMfaHero
                  icon="bi-qr-code-scan"
                  title="二段階認証の設定"
                  subtitle="管理者アカウントは二段階認証が必須です"
                  badge={mfaUsername || undefined}
                />

                {error && (
                  <div className="alert alert-danger login-error py-2" role="alert">
                    <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />
                    {error}
                  </div>
                )}

                <div className="login-mfa-setup-panel">
                  <ol className="login-mfa-setup-steps">
                    <li className={otpauthUri ? 'is-done' : 'is-active'}>
                      <span className="login-mfa-setup-step-num">1</span>
                      QR コードをスキャン
                    </li>
                    <li className={mfaCode.length === 6 ? 'is-active' : ''}>
                      <span className="login-mfa-setup-step-num">2</span>
                      6 桁コードを入力
                    </li>
                  </ol>

                  {otpauthUri ? (
                    <div className="login-mfa-qr-wrap">
                      <div className="login-mfa-qr-glow" aria-hidden="true" />
                      <QRCodeSVG value={otpauthUri} size={168} includeMargin />
                    </div>
                  ) : (
                    <div className="login-mfa-qr-loading">
                      <div className="spinner-border text-primary" role="status" />
                      <p className="mb-0 text-muted small">QR コードを準備しています…</p>
                    </div>
                  )}
                  <p className="login-mfa-setup-note">
                    <i className="bi bi-info-circle" aria-hidden="true" />
                    Google Authenticator / Microsoft Authenticator などに対応
                  </p>
                </div>

                <form onSubmit={handleMfaSetupSubmit} className="login-form login-mfa-form">
                  <div className="login-mfa-field">
                    <label htmlFor="mfaSetupCode" className="form-label login-label">
                      認証コード（6 桁）
                    </label>
                    <MfaCodeField
                      id="mfaSetupCode"
                      value={mfaCode}
                      onChange={setMfaCode}
                      disabled={submitting || !otpauthUri}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100 app-btn login-submit-btn"
                    disabled={submitting || !otpauthUri || mfaCode.length !== 6}
                  >
                    {submitting ? '設定中…' : '設定してログイン'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link w-100 login-mfa-back-btn"
                    onClick={resetMfaFlow}
                    disabled={submitting}
                  >
                    <i className="bi bi-arrow-left" aria-hidden="true" />
                    ログイン画面に戻る
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="login-footer-note">Copyright © 社員情報管理システム 2026</p>
      </div>
    </div>
  );
}
