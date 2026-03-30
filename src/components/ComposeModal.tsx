import { useState } from 'react';
import { sendMail } from '../api/mailApi';
import { t } from '../i18n';

interface Props {
  user: string;
  password: string;
  smtpHost: string;
  onClose: () => void;
  onSent: () => void;
}

export default function ComposeModal({ user, password, smtpHost, onClose, onSent }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) return;
    setSending(true);
    setError('');
    try {
      const res = await sendMail(user, password, smtpHost, to, subject, body);
      if (res.success) {
        onSent();
      } else {
        setError(res.error || t('Failed to send'));
      }
    } catch {
      setError(t('Network error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="compose-modal">
      <div className="compose-window">
        <div className="compose-header">
          <span>{t('New Message')}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSend}>
          <div className="compose-field">
            <label>{t('To')}</label>
            <input
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder={t('Recipients')}
              required
            />
          </div>
          <div className="compose-field">
            <label>{t('Subject')}</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={t('Subject')}
            />
          </div>
          {error && <div className="compose-error">{error}</div>}
          <textarea
            className="compose-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={t('Write your message...')}
          />
          <div className="compose-footer">
            <button type="submit" className="send-btn" disabled={sending}>
              {sending ? t('Sending...') : t('Send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
