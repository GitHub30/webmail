import type { MailOverview } from '../api/mailApi';

interface Props {
  emails: MailOverview[];
  selectedUids: Set<number>;
  onToggleSelect: (uid: number) => void;
  onSelect: (uid: number) => void;
  onDelete: (uid: number) => void;
}

export default function MailList({ emails, selectedUids, onToggleSelect, onSelect, onDelete }: Props) {
  if (emails.length === 0) {
    return <div className="empty-list">No emails found</div>;
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
          className={`mail-row ${email.seen ? 'read' : 'unread'} ${selectedUids.has(email.uid) ? 'selected' : ''}`}
        >
          <div className="mail-checkbox">
            <input
              type="checkbox"
              checked={selectedUids.has(email.uid)}
              onChange={() => onToggleSelect(email.uid)}
            />
          </div>
          <div className="mail-info" onClick={() => onSelect(email.uid)}>
            <span className="mail-from">{email.from || '(unknown)'}</span>
            <span className="mail-subject">{email.subject}</span>
            <span className="mail-date">{formatDate(email.date)}</span>
          </div>
          <div className="mail-actions">
            <button
              className="action-btn delete"
              onClick={e => { e.stopPropagation(); onDelete(email.uid); }}
              title="Delete"
            >🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}
