import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import InterfaceIcon from '../components/InterfaceIcon';
import { AmbientBackdrop } from '../components/DashboardKit';

const REQUEST_PATH = '/api/auth/password-reset/request';
const COMPLETE_PATH = '/api/auth/password-reset/complete';

async function postJson(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('APMS could not be reached. Check your connection and try again.');
  }

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error('The APMS reset service returned an invalid response. Please try again shortly.');
  }
  if (!response.ok) throw new Error(data.error || 'We could not complete that request. Please try again.');
  return data;
}

export default function PasswordResetPage({ mode }) {
  const [params] = useSearchParams();
  const reset = mode === 'reset';
  const token = useMemo(() => params.get('token') || '', [params]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (reset && !token) {
      setError('This reset link is incomplete. Request a fresh link to continue.');
      return;
    }
    if (reset && password !== confirm) {
      setError('Those passwords do not match yet.');
      return;
    }

    setBusy(true);
    try {
      const result = await postJson(reset ? COMPLETE_PATH : REQUEST_PATH, reset ? { token, password } : { email: email.trim() });
      setMessage(result.message || (reset ? 'Your password has been updated.' : 'If an approved account uses that email, a reset link has been sent.'));
      if (reset) setComplete(true);
    } catch (requestError) {
      setError(requestError.message || 'We could not complete the request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const expired = reset && !token;
  const success = Boolean(message);

  return (
    <div className="login-page password-reset-page">
      <AmbientBackdrop />
      <header className="reset-header">
        <Link to="/" className="reset-brand" aria-label="KTU APMS home"><BrandLogo /></Link>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setDark(value => !value)}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        ><InterfaceIcon name={dark ? 'light_mode' : 'dark_mode'} /></button>
      </header>

      <main className="reset-stage">
        <div className="reset-glow reset-glow-one" aria-hidden="true" />
        <div className="reset-glow reset-glow-two" aria-hidden="true" />
        <section className="reset-card" aria-labelledby="reset-title">
          <div className="reset-emblem" aria-hidden="true"><InterfaceIcon name={reset ? 'lock_reset' : 'mail'} /></div>
          <div className="reset-kicker">ACCOUNT RECOVERY <span>·</span> KTU APMS</div>
          <div className="login-heading reset-heading">
            <h1 id="reset-title">{complete ? 'You’re back in control.' : reset ? 'Choose a new password.' : 'Forgot your password?'}</h1>
            <p>{complete ? 'Your APMS password has been changed.' : reset ? 'Create a new password for your account.' : 'We’ll send a secure reset link to your inbox.'}</p>
          </div>

          {error && <div role="alert" className="alert alert-error reset-alert"><InterfaceIcon name="error_outline" />{error}</div>}
          {message && <div role="status" className="alert alert-success reset-alert"><InterfaceIcon name="check_circle" /><span>{message}</span></div>}

          {expired ? (
            <div className="reset-state-card">
              <strong>Reset link not found</strong><p>Open the link from your email, or request a fresh one.</p>
              <Link className="login-submit-btn reset-cta" to="/forgot-password">Request a new link <InterfaceIcon name="arrow_forward" /></Link>
            </div>
          ) : success && (!reset || complete) ? (
            <div className="reset-state-card">
              <strong>{reset ? 'Password updated' : 'Check your inbox'}</strong>
              <p>{reset ? 'Your new password is ready. Sign in to continue.' : 'If an approved APMS account uses this email, a reset link will arrive shortly. Check spam too.'}</p>
              {reset ? <Link className="login-submit-btn reset-cta" to="/">Return to sign in <InterfaceIcon name="arrow_forward" /></Link> : <button className="reset-text-button" type="button" onClick={() => { setMessage(''); setEmail(''); }}>Try another email</button>}
            </div>
          ) : (
            <form className="reset-form" onSubmit={handleSubmit}>
              {reset ? (
                <>
                  <div className="reset-field">
                    <label className="form-label" htmlFor="new-password">New password</label>
                    <input className="input" id="new-password" name="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 12 characters" />
                    <small>Use at least 12 characters.</small>
                  </div>
                  <div className="reset-field">
                    <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
                    <input className="input" id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Enter it one more time" />
                  </div>
                </>
              ) : (
                <div className="reset-field">
                  <label className="form-label" htmlFor="reset-email">Account email</label>
                  <input className="input" id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
                  <small>Enter the email linked to your APMS account.</small>
                </div>
              )}
              <button className="login-submit-btn reset-cta" type="submit" disabled={busy}>
                {busy ? <><InterfaceIcon name="progress_activity" /> {reset ? 'Updating password…' : 'Sending secure link…'}</> : <>{reset ? 'Update password' : 'Send reset link'} <InterfaceIcon name="arrow_forward" /></>}
              </button>
              <div className="reset-security-note"><InterfaceIcon name="shield_lock" /><span>{reset ? 'This one-time link expires after 30 minutes.' : 'Private, one-time links expire after 30 minutes.'}</span></div>
            </form>
          )}

          <div className="reset-back-link"><Link to="/"><InterfaceIcon name="arrow_back" /> Back to sign in</Link></div>
        </section>
      </main>
      <footer className="reset-footer">KTU APMS <span>·</span> Your campus, connected.</footer>
    </div>
  );
}
