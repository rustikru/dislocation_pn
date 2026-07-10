<?php
/**
 * get_file.php — отдача приложения акта ГУ-23 на скачивание/просмотр.
 * По образцу /get_document.php.
 *
 *   GET /gu23/get_file.php?id=<file_id>[&inline=1]
 */
session_start();
include('../login.php');
include('../connection.php');

$auth = new AuthClass();
if (!$auth->isAuth()) {
    header('location: /index.php');
    exit;
}

$conn = oci_connect($user, $pwd, $db, 'AL32UTF8');
if (!$conn) {
    $e = oci_error();
    trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
}

$fileId = (int) ($_GET['id'] ?? 0);
$inline = !empty($_GET['inline']);

$st = oci_parse($conn, 'select real_path, file_name, mime_type
                          from xx_disl_gu23_file where id = :b1');
oci_bind_by_name($st, ':b1', $fileId);
oci_execute($st);
$row = oci_fetch_array($st, OCI_ASSOC + OCI_RETURN_NULLS);
oci_close($conn);

if (!$row) {
    http_response_code(404);
    echo 'Файл не найден';
    exit;
}

$savedPath = (string) ($row['REAL_PATH'] ?? '');
if ($savedPath !== '' && $savedPath[0] !== '/' && !preg_match('/^[A-Za-z]:[\/\\\\]/', $savedPath)) {
    $savedPath = __DIR__ . '/' . ltrim($savedPath, '/\\');
}

if (!is_file($savedPath)) {
    http_response_code(404);
    echo 'Файл не найден';
    exit;
}

$path = $savedPath;
$name = $row['FILE_NAME'] ?: basename($path);
$mime = $row['MIME_TYPE'] ?: 'application/octet-stream';
$fallbackName = preg_replace('/[^A-Za-z0-9._-]+/', '_', $name);
if ($fallbackName === '' || $fallbackName === null) {
    $fallbackName = 'file';
}

if (ob_get_level()) {
    ob_end_clean();
}
header('Content-Type: ' . $mime);
header(
    'Content-Disposition: ' . ($inline ? 'inline' : 'attachment')
    . '; filename="' . $fallbackName . '"'
    . "; filename*=UTF-8''" . rawurlencode($name)
);
header('Content-Length: ' . filesize($path));
header('Cache-Control: must-revalidate');
header('Pragma: public');

if ($fd = fopen($path, 'rb')) {
    while (!feof($fd)) {
        print fread($fd, 8192);
    }
    fclose($fd);
}
exit;
