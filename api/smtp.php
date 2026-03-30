<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: *');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$user = $_GET['user'] ?? '';
$password = $_GET['password'] ?? '';
$host = $_GET['host'] ?? '';
$to = $_GET['to'] ?? '';
$subject = $_GET['subject'] ?? '';
$body = $_GET['body'] ?? '';

if (empty($user) || empty($password)) {
    echo json_encode(['success' => false, 'error' => 'user and password are required']);
    exit;
}

if (empty($to)) {
    echo json_encode(['success' => false, 'error' => 'to is required']);
    exit;
}

if (empty($host)) {
    $domain = substr($user, strpos($user, '@') + 1);
    if (in_array($domain, ['gmail.com', 'googlemail.com'])) {
        $host = 'smtp.gmail.com';
    } elseif (in_array($domain, ['yahoo.com', 'yahoo.co.jp'])) {
        $host = 'smtp.mail.yahoo.com';
    } elseif (in_array($domain, ['outlook.com', 'hotmail.com', 'live.com'])) {
        $host = 'smtp-mail.outlook.com';
    } elseif (in_array($domain, ['ethereal.email', 'mailtrap.io', 'mailinator.com'])) {
        $host = 'smtp.' . $domain;
    } else {
        $host = gethostbyaddr(gethostbyname($domain));
    }
}

try {
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host = $host;
    $mail->SMTPAuth = true;
    $mail->Username = $user;
    $mail->Password = $password;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->CharSet = 'UTF-8';

    $mail->setFrom($user);
    
    $toAddresses = array_map('trim', explode(',', $to));
    foreach ($toAddresses as $addr) {
        if (!empty($addr)) {
            $mail->addAddress($addr);
        }
    }

    $mail->Subject = $subject;
    $mail->Body = $body;

    $mail->send();

    echo json_encode(['success' => true, 'data' => ['message' => 'Email sent successfully']]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Failed to send email: ' . $mail->ErrorInfo]);
}
