const PROD_IMAP = 'https://xs679698.xsrv.jp/webmail/api/imap.php';
const PROD_SMTP = 'https://xs679698.xsrv.jp/webmail/api/smtp.php';
const DEV_IMAP = '/api/imap.php';
const DEV_SMTP = '/api/smtp.php';

const imapUrl = import.meta.env.PROD ? PROD_IMAP : DEV_IMAP;
const smtpUrl = import.meta.env.PROD ? PROD_SMTP : DEV_SMTP;

export interface MailOverview {
  uid: number;
  from: string;
  subject: string;
  date: string;
  seen: boolean;
  flagged: boolean;
}

export interface MailListResponse {
  emails: MailOverview[];
  total: number;
  page: number;
  per_page: number;
}

export interface MailAddress {
  personal: string;
  email: string;
}

export interface MailDetail {
  uid: number;
  from: MailAddress[];
  to: MailAddress[];
  subject: string;
  date: string;
  body: string;
  htmlBody: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FolderInfo {
  name: string;
  messages: number;
  unseen: number;
}

export interface FoldersResponse {
  folders: FolderInfo[];
}

function buildImapParams(user: string, password: string, imapHost: string, folder?: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set('user', user);
  params.set('password', password);
  if (imapHost) params.set('host', imapHost);
  if (folder) params.set('folder', folder);
  return params;
}

export async function fetchFolders(
  user: string, password: string, imapHost: string
): Promise<ApiResponse<FoldersResponse>> {
  const params = buildImapParams(user, password, imapHost);
  params.set('action', 'folders');
  const res = await fetch(`${imapUrl}?${params}`);
  return res.json();
}

export async function fetchMails(
  user: string, password: string, imapHost: string,
  page = 1, perPage = 20, folder = 'INBOX'
): Promise<ApiResponse<MailListResponse>> {
  const params = buildImapParams(user, password, imapHost, folder);
  params.set('action', 'list');
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  const res = await fetch(`${imapUrl}?${params}`);
  return res.json();
}

export async function fetchMail(
  user: string, password: string, imapHost: string, uid: number, folder = 'INBOX'
): Promise<ApiResponse<MailDetail>> {
  const params = buildImapParams(user, password, imapHost, folder);
  params.set('action', 'read');
  params.set('uid', String(uid));
  const res = await fetch(`${imapUrl}?${params}`);
  return res.json();
}

export async function deleteMail(
  user: string, password: string, imapHost: string, uid: number, folder = 'INBOX'
): Promise<ApiResponse<{ deleted: number }>> {
  const params = buildImapParams(user, password, imapHost, folder);
  params.set('action', 'delete');
  params.set('uid', String(uid));
  const res = await fetch(`${imapUrl}?${params}`);
  return res.json();
}

export async function searchMails(
  user: string, password: string, imapHost: string,
  query: string, page = 1, perPage = 20, folder = 'INBOX'
): Promise<ApiResponse<MailListResponse>> {
  const params = buildImapParams(user, password, imapHost, folder);
  params.set('action', 'search');
  params.set('query', query);
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  const res = await fetch(`${imapUrl}?${params}`);
  return res.json();
}

export async function sendMail(
  user: string, password: string, smtpHost: string,
  to: string, subject: string, body: string
): Promise<ApiResponse<{ message: string }>> {
  const params = new URLSearchParams();
  params.set('user', user);
  params.set('password', password);
  if (smtpHost) params.set('host', smtpHost);
  params.set('to', to);
  params.set('subject', subject);
  params.set('body', body);
  const res = await fetch(`${smtpUrl}?${params}`);
  return res.json();
}
