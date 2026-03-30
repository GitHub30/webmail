const ja: Record<string, string> = {
  // Login
  'Sign in to your email account': 'メールアカウントにログイン',
  'Email': 'メールアドレス',
  'Password': 'パスワード',
  'Advanced settings': '詳細設定',
  'IMAP Host': 'IMAP ホスト',
  'SMTP Host': 'SMTP ホスト',
  'Leave empty to auto-detect': '空欄で自動検出',
  'Sign In': 'ログイン',

  // Folders
  'Inbox': '受信トレイ',
  'Sent': '送信済み',
  'Drafts': '下書き',
  'Trash': 'ゴミ箱',
  'Spam': '迷惑メール',
  'Starred': 'スター付き',
  'All Mail': 'すべてのメール',

  // Mail page
  'Search mail': 'メールを検索',
  'Compose': '作成',
  'Sign out': 'ログアウト',
  'Refresh': '更新',
  'Delete': '削除',
  'Clear': 'クリア',
  'No emails': 'メールなし',
  'Loading...': '読み込み中...',
  'No emails found': 'メールが見つかりません',
  'Network error': 'ネットワークエラー',
  'Failed to load emails': 'メールの読み込みに失敗しました',
  'Failed to delete': '削除に失敗しました',

  // Mail detail
  '← Back': '← 戻る',
  'From:': '差出人:',
  'To:': '宛先:',
  'Date:': '日付:',
  'Failed to load email': 'メールの読み込みに失敗しました',
  'Email content': 'メール本文',

  // Compose
  'New Message': '新規メッセージ',
  'To': '宛先',
  'Recipients': '受信者',
  'Subject': '件名',
  'Write your message...': 'メッセージを入力...',
  'Send': '送信',
  'Sending...': '送信中...',
  'Failed to send': '送信に失敗しました',

  // Star
  'Star': 'スター付け',
  'Unstar': 'スター解除',

  // Shortcuts
  'Keyboard Shortcuts': 'キーボードショートカット',
  'Move down / up': '下 / 上に移動',
  'Open email': 'メールを開く',
  'Back to list': '一覧に戻る',
  'Star / unstar': 'スター切替',
  'Search': '検索',
  'Show shortcuts': 'ショートカット表示',

  // Tooltips
  'Keyboard shortcuts': 'キーボードショートカット',
  'Toggle dark mode': 'ダークモード切替',
  'Menu': 'メニュー',
};

const isJa = navigator.language.startsWith('ja');

export function t(key: string): string {
  if (isJa) return ja[key] ?? key;
  return key;
}
