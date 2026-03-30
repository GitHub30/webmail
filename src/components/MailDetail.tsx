import { useState, useEffect } from 'react';
import { fetchMail, type MailDetail as MailDetailType } from '../api/mailApi';
import { t } from '../i18n';

interface Props {
  user: string;
  password: string;
  imapHost: string;
  uid: number;
  folder: string;
  onBack: () => void;
  onDelete: () => void;
}

export default function MailDetail({ user, password, imapHost, uid, folder, onBack, onDelete }: Props) {
  const [mail, setMail] = useState<MailDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchMail(user, password, imapHost, uid, folder);
        if (cancelled) return;
        if (res.success && res.data) {
          setMail(res.data);
        } else {
          setError(res.error || 'Failed to load email');
        }
      } catch {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, password, imapHost, uid, folder]);

  if (loading) return <div className="loading">{t('Loading...')}</div>;
  if (error) return <div className="error-bar">{error}</div>;
  if (!mail) return null;

  const formatAddress = (addr: { personal: string; email: string }) =>
    addr.personal ? `${addr.personal} <${addr.email}>` : addr.email;

  return (
    <div className="mail-detail">
      <div className="detail-toolbar">
        <button className="toolbar-btn" onClick={onBack}>{t('← Back')}</button>
        <button className="toolbar-btn delete-btn" onClick={onDelete}>🗑️ {t('Delete')}</button>
      </div>
      <div className="detail-header">
        <h2 className="detail-subject">{mail.subject}</h2>
        <div className="detail-meta">
          <div className="detail-from">
            <strong>{t('From:')}</strong> {mail.from.map(formatAddress).join(', ')}
          </div>
          <div className="detail-to">
            <strong>{t('To:')}</strong> {mail.to.map(formatAddress).join(', ')}
          </div>
          <div className="detail-date">
            <strong>{t('Date:')}</strong> {new Date(mail.date).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="detail-body">
        {mail.htmlBody ? (
          <iframe
            srcDoc={mail.htmlBody}
            title={t('Email content')}
            className="html-frame"
            sandbox="allow-same-origin"
          />
        ) : (
          <pre className="text-body">{mail.body}</pre>
        )}
      </div>
    </div>
  );
}
