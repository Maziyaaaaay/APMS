import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { AmbientBackdrop } from '../components/DashboardKit';
import { confirmSignupEmail } from '../utils/auth';

export default function EmailConfirmationPage() {
  const [status, setStatus] = useState('Checking your confirmation link…');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get('access_token');
    const authError = hash.get('error_description') || hash.get('error');

    if (authError) {
      setStatus('This confirmation link could not be used. Request a new one from the signup page.');
      return () => { active = false; };
    }
    if (!accessToken) {
      setStatus('The confirmation link is missing or expired. Request a new confirmation email.');
      return () => { active = false; };
    }

    confirmSignupEmail(accessToken)
      .then(() => {
        if (!active) return;
        setConfirmed(true);
        setStatus('Email confirmed. Your APMS request is now ready for review.');
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(err => {
        if (active) setStatus(err.message || 'We could not confirm this email. Request a new link.');
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="login-page">
      <AmbientBackdrop />
      <main className="login-form-panel" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <section className="login-form-inner" style={{ width: 'min(100%, 480px)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}><BrandLogo /></div>
          <span className="material-symbols-outlined" style={{ fontSize: 52, color: confirmed ? 'var(--success)' : 'var(--accent)', marginBottom: 12 }}>
            {confirmed ? 'verified' : 'mark_email_read'}
          </span>
          <h1 style={{ color: 'var(--text)', margin: '0 0 12px' }}>{confirmed ? 'Email confirmed' : 'Confirming email'}</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 auto 24px' }}>{status}</p>
          <Link className="btn btn-primary" to="/">Continue to sign in</Link>
        </section>
      </main>
    </div>
  );
}
