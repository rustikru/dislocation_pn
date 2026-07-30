<?php
/**
 * get_file.php — отдача приложения акта ГУ-23 на скачивание/просмотр.
 * По образцу /get_document.php.
 *
 *   GET /gu23/get_file.php?id=<file_id>[&inline=1]
 *   GET /gu23/get_file.php?source=notice&id=<notice_file_id>
 */
require_once __DIR__ . '/session_bootstrap.php';
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
$source = strtolower(trim((string) ($_GET['source'] ?? 'act')));

$packageFunction = $source === 'notice'
    ? 'xx_disl_gu23_pkg.gu23_notice_file_info'
    : 'xx_disl_gu23_pkg.gu23_file_info';
$st = oci_parse($conn, 'BEGIN :r := ' . $packageFunction . '(:fid); END;');
$fileInfo = '';
oci_bind_by_name($st, ':r', $fileInfo, 4000);
oci_bind_by_name($st, ':fid', $fileId);
oci_execute($st);
oci_close($conn);

if (!$fileInfo) {
    http_response_code(404);
    echo 'Файл не найден';
    exit;
}

$parts = explode("\x1F", $fileInfo);
$savedPath = (string) ($parts[1] ?? '');
if ($savedPath !== '' && $savedPath[0] !== '/' && !preg_match('/^[A-Za-z]:[\/\\\\]/', $savedPath)) {
    $savedPath = __DIR__ . '/' . ltrim($savedPath, '/\\');
}

if (!is_file($savedPath)) {
    http_response_code(404);
    echo 'Файл не найден';
    exit;
}

$path = $savedPath;
if ($source === 'notice') {
    $storageRoot = realpath(__DIR__ . '/storage/notices/files');
    $realPath = realpath($path);
    if (
        $storageRoot === false
        || $realPath === false
        || !str_starts_with($realPath, $storageRoot . DIRECTORY_SEPARATOR)
    ) {
        http_response_code(404);
        echo 'Файл не найден';
        exit;
    }
    $path = $realPath;
    $name = ($parts[2] ?? '') ?: basename($path);
    $mime = ($parts[3] ?? '') ?: 'application/octet-stream';
} else {
    $name = ($parts[3] ?? '') ?: basename($path);
    $mime = ($parts[4] ?? '') ?: 'application/octet-stream';
}
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
