import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MailList from '../components/MailList';
import MailDetail from '../components/MailDetail';
import ComposeModal from '../components/ComposeModal';
import { fetchMails, fetchFolders, searchMails, deleteMail, toggleFlag, type MailOverview, type MailListResponse, type FolderInfo } from '../api/mailApi';
import '../styles/mail.css';

export default function MailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = searchParams.get('user') || '';
  const password = searchParams.get('password') || '';
  const imapHost = searchParams.get('imap_host') || '';
  const smtpHost = searchParams.get('smtp_host') || '';

  const [emails, setEmails] = useState<MailOverview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set());
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [currentFolder, setCurrentFolder] = useState('INBOX');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const prevEmailUids = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const emailsRef = useRef(emails);
  const totalRef = useRef(total);
  emailsRef.current = emails;
  totalRef.current = total;

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
    }
  }, [user, password, navigate]);

  useEffect(() => {
    if (!user || !password) return;
    fetchFolders(user, password, imapHost).then(res => {
      if (res.success && res.data) {
        setFolders(sortFolders(res.data.folders));
      }
    });
  }, [user, password, imapHost]);

  const loadMails = useCallback(async (silent = false) => {
    if (!user || !password) return;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      let res: { success: boolean; data?: MailListResponse; error?: string };
      if (activeSearch) {
        res = await searchMails(user, password, imapHost, activeSearch, page, perPage, currentFolder);
      } else {
        res = await fetchMails(user, password, imapHost, page, perPage, currentFolder);
      }
      if (res.success && res.data) {
        const newEmails = res.data.emails;
        // Detect new emails for notification
        if (!isFirstLoad.current && currentFolder === 'INBOX' && !activeSearch) {
          const currentUids = new Set(newEmails.map(e => e.uid));
          const newArrivals = newEmails.filter(e => !prevEmailUids.current.has(e.uid));
          if (newArrivals.length > 0) {
            notifyNewEmails(newArrivals);
          }
          prevEmailUids.current = currentUids;
        } else {
          prevEmailUids.current = new Set(newEmails.map(e => e.uid));
          isFirstLoad.current = false;
        }
        // Only update state if data actually changed
        const key = (e: MailOverview) => `${e.uid}:${e.seen}:${e.flagged}`;
        const oldKey = emailsRef.current.map(key).join(',');
        const newKey = newEmails.map(key).join(',');
        if (oldKey !== newKey) {
          setEmails(newEmails);
        }
        if (res.data.total !== totalRef.current) {
          setTotal(res.data.total);
        }
      } else if (!silent) {
        setError(res.error || 'Failed to load emails');
      }
    } catch (e) {
      if (!silent) setError('Network error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, password, imapHost, page, perPage, activeSearch, currentFolder]);

  useEffect(() => {
    loadMails();
  }, [loadMails]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMails(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMails]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Follow system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      localStorage.removeItem('theme');
      setDarkMode(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showCompose) { setShowCompose(false); return; }
        if (selectedUid) { setSelectedUid(null); return; }
        return;
      }

      if (inInput) return;

      switch (e.key) {
        case 'j':
          e.preventDefault();
          setFocusedIndex(i => Math.min(i + 1, emails.length - 1));
          break;
        case 'k':
          e.preventDefault();
          setFocusedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
        case 'o':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < emails.length && !selectedUid) {
            setSelectedUid(emails[focusedIndex].uid);
          }
          break;
        case 'u':
          e.preventDefault();
          if (selectedUid) setSelectedUid(null);
          break;
        case 'c':
          e.preventDefault();
          setShowCompose(true);
          break;
        case 's':
          e.preventDefault();
          if (!selectedUid && focusedIndex >= 0 && focusedIndex < emails.length) {
            const email = emails[focusedIndex];
            handleToggleStar(email.uid, email.flagged);
          }
          break;
        case 'e':
        case 'Delete':
          e.preventDefault();
          if (selectedUid) {
            handleDelete(selectedUid);
          } else if (focusedIndex >= 0 && focusedIndex < emails.length) {
            handleDelete(emails[focusedIndex].uid);
          }
          break;
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [emails, focusedIndex, selectedUid, showCompose, showShortcuts]);

  const notifyNewEmails = (newArrivals: MailOverview[]) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    for (const email of newArrivals.slice(0, 3)) {
      new Notification(email.from || 'New email', {
        body: email.subject,
        icon: '/webmail/favicon.svg',
        tag: `mail-${email.uid}`,
      });
    }
    if (newArrivals.length > 3) {
      new Notification(`+${newArrivals.length - 3} more new emails`, {
        icon: '/webmail/favicon.svg',
        tag: 'mail-more',
      });
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedUid(null);
    setActiveSearch(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
  };

  const handleFolderChange = (folder: string) => {
    setCurrentFolder(folder);
    setPage(1);
    setSelectedUid(null);
    setSelectedUids(new Set());
    setActiveSearch('');
    setSearchQuery('');
  };

  const folderSortOrder = (name: string): number => {
    const lower = name.replace(/^INBOX\./i, '').toLowerCase();
    if (lower === 'inbox') return 0;
    if (lower === 'starred' || lower === 'flagged') return 1;
    if (lower === 'sent' || lower === 'sent mail' || lower === 'sent items') return 2;
    if (lower === 'drafts' || lower === 'draft') return 3;
    if (lower === 'all mail' || lower === 'all' || lower === 'archive') return 4;
    if (lower === 'spam' || lower === 'junk' || lower === 'junk e-mail' || lower === 'bulk mail') return 5;
    if (lower === 'trash' || lower === 'deleted' || lower === 'deleted items' || lower === 'deleted messages' || lower === 'bin') return 6;
    return 3.5; // custom folders between Drafts and All Mail
  };

  const sortFolders = (list: FolderInfo[]) =>
    [...list].sort((a, b) => folderSortOrder(a.name) - folderSortOrder(b.name));

  const folderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'inbox') return '📥';
    if (lower.includes('sent')) return '📤';
    if (lower.includes('draft')) return '📝';
    if (lower.includes('spam') || lower.includes('junk')) return '⚠️';
    if (lower.includes('trash') || lower.includes('bin')) return '🗑️';
    if (lower.includes('starred') || lower.includes('flagged')) return '⭐';
    if (lower.includes('archive') || lower.includes('all')) return '📦';
    return '📁';
  };

  const folderDisplayName = (name: string) => {
    // Strip "INBOX." prefix for display
    const stripped = name.replace(/^INBOX\./i, '');
    // Normalize known folder names
    const lower = stripped.toLowerCase();
    if (lower === 'inbox') return 'Inbox';
    if (lower === 'sent' || lower === 'sent mail' || lower === 'sent items') return 'Sent';
    if (lower === 'drafts' || lower === 'draft') return 'Drafts';
    if (lower === 'trash' || lower === 'deleted' || lower === 'deleted items' || lower === 'deleted messages') return 'Trash';
    if (lower === 'spam' || lower === 'junk' || lower === 'junk e-mail' || lower === 'bulk mail') return 'Spam';
    if (lower === 'starred' || lower === 'flagged') return 'Starred';
    if (lower === 'archive' || lower === 'all mail' || lower === 'all') return 'All Mail';
    return stripped;
  };

  const handleDelete = async (uid: number) => {
    try {
      const res = await deleteMail(user, password, imapHost, uid, currentFolder);
      if (res.success) {
        if (selectedUid === uid) setSelectedUid(null);
        loadMails();
      } else {
        setError(res.error || 'Failed to delete');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleToggleStar = async (uid: number, currentFlagged: boolean) => {
    try {
      const res = await toggleFlag(user, password, imapHost, uid, currentFlagged, currentFolder);
      if (res.success) {
        setEmails(prev => prev.map(e => e.uid === uid ? { ...e, flagged: !currentFlagged } : e));
      }
    } catch {
      // silently fail
    }
  };

  const handleBulkDelete = async () => {
    for (const uid of selectedUids) {
      await deleteMail(user, password, imapHost, uid, currentFolder);
    }
    setSelectedUids(new Set());
    setSelectedUid(null);
    loadMails();
  };

  const toggleSelect = (uid: number) => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const totalPages = Math.ceil(total / perPage);

  if (!user) return null;

  return (
    <div className="mail-layout">
      {/* Header */}
      <header className="mail-header">
        <div className="header-left">
          <button className="menu-btn" title="Menu">☰</button>
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="#EA4335" width="32" height="32">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <span className="logo-text">WebMail</span>
          </div>
        </div>
        <form className="search-bar" onSubmit={handleSearch}>
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search mail"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {activeSearch && (
            <button type="button" className="clear-search" onClick={handleClearSearch}>✕</button>
          )}
        </form>
        <div className="header-right">
          <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <span className="user-email">{user}</span>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="mail-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <button className="compose-btn" onClick={() => setShowCompose(true)}>
            <span className="compose-icon">✏️</span>
            Compose
          </button>
          <nav className="sidebar-nav">
            {folders.length > 0 ? folders.map(f => (
              <a
                key={f.name}
                className={`nav-item ${currentFolder === f.name ? 'active' : ''}`}
                href="#"
                onClick={e => { e.preventDefault(); handleFolderChange(f.name); }}
              >
                <span className="nav-icon">{folderIcon(f.name)}</span>
                <span className="nav-label">{folderDisplayName(f.name)}</span>
                {f.unseen > 0 && <span className="nav-count">{f.unseen}</span>}
              </a>
            )) : (
              <a
                className="nav-item active"
                href="#"
                onClick={e => { e.preventDefault(); handleFolderChange('INBOX'); }}
              >
                <span className="nav-icon">📥</span>
                <span className="nav-label">Inbox</span>
                {total > 0 && <span className="nav-count">{total}</span>}
              </a>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="mail-content">
          {error && <div className="error-bar">{error}</div>}

          {selectedUid ? (
            <MailDetail
              user={user}
              password={password}
              imapHost={imapHost}
              uid={selectedUid}
              folder={currentFolder}
              onBack={() => setSelectedUid(null)}
              onDelete={() => handleDelete(selectedUid)}
            />
          ) : (
            <>
              {/* Toolbar */}
              <div className="mail-toolbar">
                <div className="toolbar-left">
                  {selectedUids.size > 0 && (
                    <button className="toolbar-btn delete-btn" onClick={handleBulkDelete} title="Delete selected">
                      🗑️ Delete
                    </button>
                  )}
                  <button className="toolbar-btn" onClick={() => loadMails()} title="Refresh">
                    🔄 Refresh
                  </button>
                </div>
                <div className="toolbar-right">
                  {activeSearch && (
                    <span className="search-info">
                      Results for "{activeSearch}"
                      <button className="clear-link" onClick={handleClearSearch}>Clear</button>
                    </span>
                  )}
                  <span className="page-info">
                    {total === 0 ? 'No emails' : `${(page - 1) * perPage + 1}-${Math.min(page * perPage, total)} of ${total}`}
                  </span>
                  <button
                    className="toolbar-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >‹</button>
                  <button
                    className="toolbar-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >›</button>
                </div>
              </div>

              {/* Email list */}
              {loading ? (
                <div className="loading">Loading...</div>
              ) : (
                <MailList
                  emails={emails}
                  selectedUids={selectedUids}
                  focusedUid={focusedIndex >= 0 && focusedIndex < emails.length ? emails[focusedIndex].uid : null}
                  onToggleSelect={toggleSelect}
                  onSelect={uid => setSelectedUid(uid)}
                  onDelete={handleDelete}
                  onToggleStar={handleToggleStar}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <ComposeModal
          user={user}
          password={password}
          smtpHost={smtpHost}
          onClose={() => setShowCompose(false)}
          onSent={() => { setShowCompose(false); loadMails(); }}
        />
      )}

      {/* Shortcuts help */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-dialog" onClick={e => e.stopPropagation()}>
            <h3>Keyboard Shortcuts</h3>
            <table>
              <tbody>
                <tr><td><kbd>j</kbd> / <kbd>k</kbd></td><td>Move down / up</td></tr>
                <tr><td><kbd>Enter</kbd> / <kbd>o</kbd></td><td>Open email</td></tr>
                <tr><td><kbd>u</kbd> / <kbd>Esc</kbd></td><td>Back to list</td></tr>
                <tr><td><kbd>c</kbd></td><td>Compose</td></tr>
                <tr><td><kbd>s</kbd></td><td>Star / unstar</td></tr>
                <tr><td><kbd>e</kbd></td><td>Delete</td></tr>
                <tr><td><kbd>/</kbd></td><td>Search</td></tr>
                <tr><td><kbd>?</kbd></td><td>Show shortcuts</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
