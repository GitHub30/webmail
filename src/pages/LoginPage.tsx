import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [smtpHost, setSmtpHost] = useState('');

  const domain = user.includes('@') ? user.split('@')[1] : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !password) return;
    const params = new URLSearchParams();
    params.set('user', user);
    params.set('password', password);
    if (imapHost) params.set('imap_host', imapHost);
    if (smtpHost) params.set('smtp_host', smtpHost);
    navigate(`/mail?${params.toString()}`);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 24 24" fill="#EA4335" width="48" height="48">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          <h1>WebMail</h1>
          <p>Sign in to your email account</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user">Email</label>
            <input
              id="user"
              type="email"
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="imap_host">IMAP Host</label>
            <input
              id="imap_host"
              type="text"
              value={imapHost}
              onChange={e => setImapHost(e.target.value)}
              placeholder={domain ? `imap.${domain}` : 'imap.example.com'}
            />
            <span className="hint">Leave empty to auto-detect</span>
          </div>
          <div className="form-group">
            <label htmlFor="smtp_host">SMTP Host</label>
            <input
              id="smtp_host"
              type="text"
              value={smtpHost}
              onChange={e => setSmtpHost(e.target.value)}
              placeholder={domain ? `smtp.${domain}` : 'smtp.example.com'}
            />
            <span className="hint">Leave empty to auto-detect</span>
          </div>
          <button type="submit" className="login-btn">Sign In</button>
        </form>
      </div>
    </div>
  );
}
