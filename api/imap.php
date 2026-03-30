<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: *');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$user = $_GET['user'] ?? '';
$password = $_GET['password'] ?? '';
$host = $_GET['host'] ?? '';
$action = $_GET['action'] ?? 'list';

if (empty($user) || empty($password)) {
    echo json_encode(['success' => false, 'error' => 'user and password are required']);
    exit;
}

if (empty($host)) {
    $domain = substr($user, strpos($user, '@') + 1);
    if (in_array($domain, ['gmail.com', 'googlemail.com'])) {
        $host = 'imap.gmail.com';
    } elseif (in_array($domain, ['yahoo.com', 'yahoo.co.jp'])) {
        $host = 'imap.mail.yahoo.com';
    } elseif (in_array($domain, ['outlook.com', 'hotmail.com', 'live.com'])) {
        $host = 'imap-mail.outlook.com';
    } elseif (in_array($domain, ['ethereal.email', 'mailtrap.io', 'mailinator.com'])) {
        $host = 'imap.' . $domain;
    } else {
        $host = gethostbyaddr(gethostbyname($domain));
    }
}

$folder = $_GET['folder'] ?? 'INBOX';
$serverPath = '{' . $host . ':993/imap/ssl}';
$mailbox = $serverPath . $folder;

$imap = @imap_open($mailbox, $user, $password);

if (!$imap) {
    echo json_encode(['success' => false, 'error' => imap_last_error(), 'host' => $host, 'user' => $user, 'password_len' => count($password)]);
    exit;
}

try {
    switch ($action) {
        case 'folders':
            $folders = imap_list($imap, $serverPath, '*');
            $result = [];
            if ($folders) {
                foreach ($folders as $f) {
                    $name = str_replace($serverPath, '', $f);
                    $status = @imap_status($imap, $f, SA_MESSAGES | SA_UNSEEN);
                    $result[] = [
                        'name' => $name,
                        'messages' => $status ? $status->messages : 0,
                        'unseen' => $status ? $status->unseen : 0,
                    ];
                }
            }
            echo json_encode(['success' => true, 'data' => ['folders' => $result]]);
            break;


        case 'list':
            $page = max(1, intval($_GET['page'] ?? 1));
            $perPage = max(1, min(100, intval($_GET['per_page'] ?? 20)));

            $emails = imap_search($imap, 'ALL', SE_UID);
            if ($emails === false) {
                echo json_encode(['success' => true, 'data' => ['emails' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage]]);
                break;
            }

            rsort($emails);
            $total = count($emails);
            $offset = ($page - 1) * $perPage;
            $pageEmails = array_slice($emails, $offset, $perPage);

            $result = [];
            foreach ($pageEmails as $uid) {
                $msgno = imap_msgno($imap, $uid);
                if ($msgno === 0) continue;
                $overview = imap_fetch_overview($imap, (string)$uid, FT_UID);
                if (!empty($overview)) {
                    $ov = $overview[0];
                    $result[] = [
                        'uid' => $uid,
                        'from' => isset($ov->from) ? imap_utf8($ov->from) : '',
                        'subject' => isset($ov->subject) ? imap_utf8($ov->subject) : '(no subject)',
                        'date' => $ov->date ?? '',
                        'seen' => isset($ov->seen) && $ov->seen,
                        'flagged' => isset($ov->flagged) && $ov->flagged,
                    ];
                }
            }

            echo json_encode(['success' => true, 'data' => ['emails' => $result, 'total' => $total, 'page' => $page, 'per_page' => $perPage]]);
            break;

        case 'read':
            $uid = intval($_GET['uid'] ?? 0);
            if ($uid === 0) {
                echo json_encode(['success' => false, 'error' => 'uid is required']);
                break;
            }

            $msgno = imap_msgno($imap, $uid);
            if ($msgno === 0) {
                echo json_encode(['success' => false, 'error' => 'Message not found']);
                break;
            }

            $header = imap_headerinfo($imap, $msgno);
            $structure = imap_fetchstructure($imap, $uid, FT_UID);

            $body = '';
            $htmlBody = '';

            if (empty($structure->parts)) {
                $body = imap_fetchbody($imap, $uid, '1', FT_UID);
                $body = decodeBody($body, $structure->encoding ?? 0);
                if (isset($structure->subtype) && strtoupper($structure->subtype) === 'HTML') {
                    $htmlBody = $body;
                    $body = '';
                }
            } else {
                foreach ($structure->parts as $partNum => $part) {
                    $partNumber = $partNum + 1;
                    if (strtoupper($part->subtype ?? '') === 'PLAIN') {
                        $body = imap_fetchbody($imap, $uid, (string)$partNumber, FT_UID);
                        $body = decodeBody($body, $part->encoding ?? 0);
                    } elseif (strtoupper($part->subtype ?? '') === 'HTML') {
                        $htmlBody = imap_fetchbody($imap, $uid, (string)$partNumber, FT_UID);
                        $htmlBody = decodeBody($htmlBody, $part->encoding ?? 0);
                    }
                }
            }

            // Decode charset
            $charset = getCharset($structure);
            if ($charset && strtolower($charset) !== 'utf-8') {
                if ($body) $body = mb_convert_encoding($body, 'UTF-8', $charset);
                if ($htmlBody) $htmlBody = mb_convert_encoding($htmlBody, 'UTF-8', $charset);
            }

            // Mark as seen
            imap_setflag_full($imap, (string)$uid, '\\Seen', ST_UID);

            $fromArr = [];
            if (isset($header->from)) {
                foreach ($header->from as $f) {
                    $fromArr[] = [
                        'personal' => isset($f->personal) ? imap_utf8($f->personal) : '',
                        'email' => ($f->mailbox ?? '') . '@' . ($f->host ?? ''),
                    ];
                }
            }
            $toArr = [];
            if (isset($header->to)) {
                foreach ($header->to as $t) {
                    $toArr[] = [
                        'personal' => isset($t->personal) ? imap_utf8($t->personal) : '',
                        'email' => ($t->mailbox ?? '') . '@' . ($t->host ?? ''),
                    ];
                }
            }

            echo json_encode(['success' => true, 'data' => [
                'uid' => $uid,
                'from' => $fromArr,
                'to' => $toArr,
                'subject' => isset($header->subject) ? imap_utf8($header->subject) : '(no subject)',
                'date' => $header->date ?? '',
                'body' => $body,
                'htmlBody' => $htmlBody,
            ]]);
            break;

        case 'delete':
            $uid = intval($_GET['uid'] ?? 0);
            if ($uid === 0) {
                echo json_encode(['success' => false, 'error' => 'uid is required']);
                break;
            }

            imap_delete($imap, (string)$uid, FT_UID);
            imap_expunge($imap);

            echo json_encode(['success' => true, 'data' => ['deleted' => $uid]]);
            break;

        case 'search':
            $query = $_GET['query'] ?? '';
            if (empty($query)) {
                echo json_encode(['success' => false, 'error' => 'query is required']);
                break;
            }

            $page = max(1, intval($_GET['page'] ?? 1));
            $perPage = max(1, min(100, intval($_GET['per_page'] ?? 20)));

            // Search in subject, from, body
            $criteria = 'OR OR SUBJECT "' . addslashes($query) . '" FROM "' . addslashes($query) . '" BODY "' . addslashes($query) . '"';
            $emails = @imap_search($imap, $criteria, SE_UID);

            if ($emails === false) {
                // Fallback: try simpler search
                $emails = @imap_search($imap, 'SUBJECT "' . addslashes($query) . '"', SE_UID);
            }

            if ($emails === false) {
                echo json_encode(['success' => true, 'data' => ['emails' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage]]);
                break;
            }

            rsort($emails);
            $total = count($emails);
            $offset = ($page - 1) * $perPage;
            $pageEmails = array_slice($emails, $offset, $perPage);

            $result = [];
            foreach ($pageEmails as $uid) {
                $msgno = imap_msgno($imap, $uid);
                if ($msgno === 0) continue;
                $overview = imap_fetch_overview($imap, (string)$uid, FT_UID);
                if (!empty($overview)) {
                    $ov = $overview[0];
                    $result[] = [
                        'uid' => $uid,
                        'from' => isset($ov->from) ? imap_utf8($ov->from) : '',
                        'subject' => isset($ov->subject) ? imap_utf8($ov->subject) : '(no subject)',
                        'date' => $ov->date ?? '',
                        'seen' => isset($ov->seen) && $ov->seen,
                        'flagged' => isset($ov->flagged) && $ov->flagged,
                    ];
                }
            }

            echo json_encode(['success' => true, 'data' => ['emails' => $result, 'total' => $total, 'page' => $page, 'per_page' => $perPage]]);
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Unknown action: ' . $action]);
    }
} finally {
    imap_close($imap);
}

function decodeBody(string $body, int $encoding): string {
    switch ($encoding) {
        case 0: // 7BIT
        case 1: // 8BIT
            return $body;
        case 2: // BINARY
            return $body;
        case 3: // BASE64
            return base64_decode($body);
        case 4: // QUOTED-PRINTABLE
            return quoted_printable_decode($body);
        default:
            return $body;
    }
}

function getCharset($structure): ?string {
    if (isset($structure->parameters)) {
        foreach ($structure->parameters as $param) {
            if (strtolower($param->attribute) === 'charset') {
                return $param->value;
            }
        }
    }
    if (isset($structure->ifparameters) && $structure->ifparameters && isset($structure->parameters)) {
        foreach ($structure->parameters as $param) {
            if (strtolower($param->attribute) === 'charset') {
                return $param->value;
            }
        }
    }
    return null;
}
