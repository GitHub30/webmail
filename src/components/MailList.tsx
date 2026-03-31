import type { MailOverview } from '../api/mailApi';
import { t } from '../i18n';

interface Props {
  emails: MailOverview[];
  selectedUids: Set<number>;
  focusedUid: number | null;
  onToggleSelect: (uid: number) => void;
  onSelect: (uid: number) => void;
  onDelete: (uid: number) => void;
  onToggleStar: (uid: number, flagged: boolean) => void;
}

const AVATAR_COLORS = [
  '#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#ff6d01',
  '#46bdc6', '#7baaf7', '#e07070', '#4db6ac', '#9575cd',
  '#f06292', '#4fc3f7', '#aed581', '#ff8a65', '#a1887f',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(from: string): string {
  // Extract name from "Name <email>" or just use first char
  const match = from.match(/^"?([^"<]*)/);
  const name = match?.[1]?.trim() || from;
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export default function MailList({ emails, selectedUids, focusedUid, onToggleSelect, onSelect, onDelete, onToggleStar }: Props) {
  if (emails.length === 0) {
    return <div className="empty-list">{t('No emails found')}</div>;
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (d.getFullYear() === now.getFullYear()) {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mail-list">
      {emails.map(email => (
        <div
          key={email.uid}
          className={`mail-row ${email.seen ? 'read' : 'unread'} ${selectedUids.has(email.uid) ? 'selected' : ''} ${focusedUid === email.uid ? 'focused' : ''}`}
          onClick={() => onSelect(email.uid)}
          style={{ cursor: 'pointer' }}
        >
          <div className="mail-checkbox" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedUids.has(email.uid)}
              onChange={() => onToggleSelect(email.uid)}
            />
          </div>
          <button
            className={`star-btn ${email.flagged ? 'starred' : ''}`}
            onClick={e => { e.stopPropagation(); onToggleStar(email.uid, email.flagged); }}
            title={email.flagged ? t('Unstar') : t('Star')}
          >
            {email.flagged ? '★' : '☆'}
          </button>
          <div
            className="mail-avatar"
            style={{ backgroundColor: getAvatarColor(email.from) }}
          >
            {getInitial(email.from)}
          </div>
          <div className="mail-info">
            <span className="mail-from">{email.from || '(unknown)'}</span>
            <span className="mail-subject">{email.subject}</span>
            <span className="mail-date">{formatDate(email.date)}</span>
          </div>
          <div className="mail-actions">
            <button
              className="action-btn delete"
              onClick={e => { e.stopPropagation(); onDelete(email.uid); }}
              title={t('Delete')}
            >🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}
