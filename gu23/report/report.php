<?php
/**
 * report.php
 *
 * Эндпоинт генерации DOCX-отчёта для акта ГУ-23.
 * Параметры GET:
 *   id=<int>       — ID акта
 *   format=<docx|pdf>
 *
 * Пример: GET /gu23/report/report.php?id=42
 */

session_start();
include('../../login.php');
include('../../connection.php');

$auth = new AuthClass();

if (!$auth->isAuth()) {
    http_response_code(403);
    exit('Доступ запрещён');
}

$actId = (int) ($_GET['id'] ?? 0);
if ($actId <= 0) {
    http_response_code(400);
    exit('Не указан ID акта');
}
$format = strtolower((string) ($_GET['format'] ?? 'docx'));
if (!in_array($format, ['docx', 'pdf'], true)) {
    $format = 'docx';
}

// Подключаем репозиторий и читаем данные акта
require_once __DIR__ . '/../classes/GuActRepository.php';
require_once __DIR__ . '/GuActDocxReport.php';
require_once __DIR__ . '/GuActPdfReport.php';

// Доступ к модулю ГУ-23 (а не только факт авторизации)
if (!GuActRepository::canAccess($conn1, $auth)) {
    http_response_code(403);
    exit('Нет доступа к модулю ГУ-23');
}

// Вспомогательная функция — выполнить пайп-запрос (повторяет логику GuActRepository::pipe)
function queryPipe($conn, string $sql, array $binds = []): array
{
    $st = oci_parse($conn, $sql);
    if (!$st) {
        $e = oci_error($conn);
        throw new RuntimeException('oci_parse: ' . ($e['message'] ?? ''));
    }
    foreach ($binds as $name => $val) {
        oci_bind_by_name($st, $name, $binds[$name]);
    }
    if (!oci_execute($st)) {
        $e = oci_error($st);
        throw new RuntimeException('oci_execute: ' . ($e['message'] ?? ''));
    }
    $rows = [];
    while ($r = oci_fetch_array($st, OCI_ASSOC + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) {
        $rows[] = $r;
    }
    return $rows;
}

try {
    // Загружаем акт
    $actRows = queryPipe($conn1, 'select * from table(xx_disl_gu23_pkg.gu23_get_act(:b1))', [':b1' => $actId]);
    if (empty($actRows)) {
        http_response_code(404);
        exit('Акт не найден');
    }

    $act     = $actRows[0];
    $wagons  = queryPipe($conn1, 'select * from table(xx_disl_gu23_pkg.gu23_get_rows(:b1))',    [':b1' => $actId]);
    $signers = queryPipe($conn1, 'select * from table(xx_disl_gu23_pkg.gu23_get_signers(:b1))', [':b1' => $actId]);

    if ($format === 'pdf') {
        try {
            $generator = new GuActDocxReport();
            $generator->download($act, $wagons, $signers, 'pdf');
        } catch (Throwable $docxPdfError) {
            $generator = new GuActPdfReport();
            $generator->download($act, $wagons, $signers);
        }
    } else {
        $generator = new GuActDocxReport();
        $generator->download($act, $wagons, $signers, 'docx');
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Ошибка генерации отчёта: ' . htmlspecialchars($e->getMessage());
}
