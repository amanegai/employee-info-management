import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';
import { canManageUsers } from '../auth';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import ListSectionBar from '../components/ListSectionBar';
import RecoveryCodesPanel from '../components/RecoveryCodesPanel';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';

const RECOMMENDED_APPS = [
  { name: 'Google Authenticator', icon: 'bi-google' },
  { name: 'Microsoft Authenticator', icon: 'bi-microsoft' },
];

export default function AccountSecurityPage() {
  const { user, refreshUser } = useAuth();
  const { showMessage } = useAppMessage();
  const isAdmin = canManageUsers(user);
  const totpEnabled = Boolean(user?.totpEnabled);
  const recoveryCodesRemaining = user?.recoveryCodesRemaining ?? 0;
  const needsTotpForRegenerate = recoveryCodesRemaining > 0;

  const [setupMode, setSetupMode] = useState(false);
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [regenerateCode, setRegenerateCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleBeginSetup() {
    setSubmitting(true);
    try {
      const result = await api.beginMfaSetup();
      setOtpauthUri(result.otpauthUri);
      setSetupMode(true);
      setCode('');
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmSetup(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.confirmMfaSetup({ code });
      await refreshUser();
      setSetupMode(false);
      setOtpauthUri('');
      setCode('');
      setRecoveryCodes(result.recoveryCodes || []);
      showMessage('二段階認証を有効にしました');
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegenerateRecovery(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = needsTotpForRegenerate || regenerateCode ? { code: regenerateCode } : {};
      const result = await api.regenerateRecoveryCodes(payload);
      setRecoveryCodes(result.recoveryCodes || []);
      setRegenerateCode('');
      await refreshUser();
      showMessage('バックアップコードを再発行しました');
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable() {
    if (!window.confirm('二段階認証を無効にしますか？')) return;
    setSubmitting(true);
    try {
      await api.disableMfa();
      await refreshUser();
      showMessage('二段階認証を無効にしました');
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelSetup() {
    setSetupMode(false);
    setOtpauthUri('');
    setCode('');
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page account-security-page">
      <PageHeader
        guideId="account-security"
        icon="bi-shield-lock-fill"
        iconClassName="account-security-page-icon"
        title="セキュリティ設定"
        lead="二段階認証（TOTP）でアカウントを保護"
      >
        <Link to="/" className="btn btn-outline-secondary app-btn account-security-back-btn">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          社員一覧に戻る
        </Link>
      </PageHeader>

      <div className="account-security-layout">
        <section className="account-security-overview" aria-label="二段階認証の状態">
          <div className={`account-security-status-card ${totpEnabled ? 'is-enabled' : 'is-disabled'}`}>
            <div className="account-security-status-visual" aria-hidden="true">
              <span className="account-security-status-ring">
                <i className={`bi ${totpEnabled ? 'bi-shield-check' : 'bi-shield'}`} />
              </span>
            </div>
            <div className="account-security-status-body">
              <span className={`account-security-status-pill ${totpEnabled ? 'is-on' : 'is-off'}`}>
                {totpEnabled ? '有効' : '無効'}
              </span>
              <h2 className="account-security-status-title">
                {totpEnabled ? '二段階認証が有効です' : '二段階認証は未設定です'}
              </h2>
              <p className="account-security-status-desc mb-0">
                {totpEnabled
                  ? 'ログイン時に認証アプリの 6 桁コードが必要です。'
                  : 'パスワードに加えて認証アプリのコードを入力することで、不正ログインを防げます。'}
              </p>
            </div>
          </div>

          <ul className="account-security-benefits">
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              30 秒ごとに更新されるワンタイムコード
            </li>
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              インターネット接続不要（オフラインでも利用可）
            </li>
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              Google / Microsoft Authenticator などに対応
            </li>
          </ul>

          {isAdmin && (
            <div className="account-security-policy-card" role="note">
              <div className="account-security-policy-icon" aria-hidden="true">
                <i className="bi bi-shield-lock-fill" />
              </div>
              <div>
                <strong>管理者アカウント</strong>
                <p className="mb-0">
                  二段階認証は必須です。設定後は無効にできません。
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="table-section list-section-panel account-security-panel">
          <ListSectionBar
            icon="bi-phone"
            title={setupMode ? '認証アプリの設定' : '操作'}
          />

          <div className="list-section-body list-section-body-padded account-security-panel-body">
            {!totpEnabled && !setupMode && (
              <div className="account-security-action-card">
                <h3 className="account-security-action-title">二段階認証を有効にする</h3>
                <p className="account-security-action-desc">
                  認証アプリをお持ちでない場合は、以下のアプリをインストールしてください。
                </p>
                <div className="account-security-app-list">
                  {RECOMMENDED_APPS.map((app) => (
                    <span key={app.name} className="account-security-app-chip">
                      <i className={`bi ${app.icon}`} aria-hidden="true" />
                      {app.name}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-primary app-btn account-security-primary-btn"
                  onClick={handleBeginSetup}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      準備中…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-plus" aria-hidden="true" />
                      設定を開始
                    </>
                  )}
                </button>
              </div>
            )}

            {!totpEnabled && setupMode && (
              <form onSubmit={handleConfirmSetup} className="account-security-setup-form">
                <ol className="account-security-steps">
                  <li className="account-security-step is-active">
                    <span className="account-security-step-num">1</span>
                    <div>
                      <strong>QR コードを読み取る</strong>
                      <p className="mb-0">認証アプリでスキャンしてください</p>
                    </div>
                  </li>
                  <li className={`account-security-step ${code.length === 6 ? 'is-active' : ''}`}>
                    <span className="account-security-step-num">2</span>
                    <div>
                      <strong>6 桁コードを入力</strong>
                      <p className="mb-0">アプリに表示された数字を入力</p>
                    </div>
                  </li>
                </ol>

                <div className="account-security-qr-panel">
                  <div className="account-security-qr-frame">
                    <QRCodeSVG value={otpauthUri} size={184} includeMargin />
                  </div>
                  <p className="account-security-qr-caption mb-0">
                    アカウント: <strong>{user?.username}</strong>
                  </p>
                </div>

                <div className="account-security-code-block">
                  <label htmlFor="accountMfaCode" className="form-label account-security-code-label">
                    認証コード
                  </label>
                  <input
                    id="accountMfaCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="form-control account-security-code-input"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>

                <div className="account-security-form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary app-btn"
                    disabled={submitting || code.length !== 6}
                  >
                    {submitting ? '確認中…' : '有効化する'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary app-btn"
                    onClick={cancelSetup}
                    disabled={submitting}
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            )}

            {totpEnabled && (
              <div className="account-security-active-card">
                <div className="account-security-active-icon" aria-hidden="true">
                  <i className="bi bi-check-lg" />
                </div>
                <div>
                  <h3 className="account-security-active-title">保護が有効です</h3>
                  <p className="account-security-active-desc mb-0">
                    次回ログインから、認証アプリのコード入力が求められます。
                    {typeof user?.recoveryCodesRemaining === 'number' && (
                      <> 未使用のバックアップコード: {recoveryCodesRemaining} 件</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {recoveryCodes?.length > 0 && (
              <RecoveryCodesPanel
                codes={recoveryCodes}
                onClose={() => setRecoveryCodes(null)}
                title="新しいバックアップコード"
              />
            )}

            {totpEnabled && (
              <form onSubmit={handleRegenerateRecovery} className="account-security-recovery-form">
                <h3 className="account-security-action-title">
                  {needsTotpForRegenerate ? 'バックアップコードの再発行' : 'バックアップコードの発行'}
                </h3>
                <p className="account-security-action-desc">
                  {needsTotpForRegenerate
                    ? '既存のバックアップコードはすべて無効になります。認証アプリの最新 6 桁コードで確認してください。'
                    : 'バックアップコードが未発行です。ログイン済みのため、認証コードなしで発行できます。'}
                </p>
                {needsTotpForRegenerate && (
                  <div className="account-security-code-block">
                    <label htmlFor="regenerateMfaCode" className="form-label account-security-code-label">
                      認証コード
                    </label>
                    <input
                      id="regenerateMfaCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="form-control account-security-code-input"
                      placeholder="000000"
                      value={regenerateCode}
                      onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                    />
                  </div>
                )}
                <div className="account-security-form-actions account-security-recovery-actions">
                  <button
                    type="submit"
                    className="btn btn-outline-primary app-btn"
                    disabled={submitting || (needsTotpForRegenerate && regenerateCode.length !== 6)}
                  >
                    {submitting
                      ? '発行中…'
                      : needsTotpForRegenerate
                        ? 'バックアップコードを再発行'
                        : 'バックアップコードを発行'}
                  </button>
                </div>
              </form>
            )}

            {totpEnabled && !isAdmin && (
              <div className="account-security-danger-zone">
                <div>
                  <h3 className="account-security-danger-title">二段階認証を無効にする</h3>
                  <p className="account-security-danger-desc mb-0">
                    無効にすると、パスワードのみでログインできるようになります。
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger app-btn"
                  onClick={handleDisable}
                  disabled={submitting}
                >
                  無効にする
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <AppFooter />
    </div>
  );
}
