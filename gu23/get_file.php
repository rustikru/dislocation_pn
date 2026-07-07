<?php
/**
 * get_file.php — отдача на скачивание/просмотр.
 *
 *   GET /gu23/get_file.php?id=<file_id>[&inline=1]
 * 
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

if (!$row || !is_file($row['REAL_PATH'])) {
    http_response_code(404);
    echo 'Файл не найден';
    exit;
}

$path = $row['REAL_PATH'];
$name = $row['FILE_NAME'] ?: basename($path);
$mime = $row['MIME_TYPE'] ?: 'application/octet-stream';

if (ob_get_level()) {
    ob_end_clean();
}
header('Content-Type: ' . $mime);
header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . rawurlencode($name) . '"');
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
