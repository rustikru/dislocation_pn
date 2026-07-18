<?php
/**
 * report.php
 *
 * генерации DOCX-отчёта для акта ГУ-23.
 * Параметры GET:
 *   id=<int>       — ID акта
 *   format=<docx|pdf>

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
require_once __DIR__ . '/../classes/Gu23Db.php';
require_once __DIR__ . '/GuActPhpWordReport.php';

// Доступ к модулю ГУ-23 (а не только факт авторизации)
if (!GuActRepository::canAccess($conn1, $auth)) {
    http_response_code(403);
    exit('Нет доступа к модулю ГУ-23');
}

try {
    $db = new Gu23Db($conn1);

    // Загружаем акт
    $actRows = $db->rows('select * from table(xx_disl_gu23_pkg.gu23_get_act(:b1))', [':b1' => $actId]);
    if (empty($actRows)) {
        http_response_code(404);
        exit('Акт не найден');
    }

    $act     = $actRows[0];
    $wagons  = $db->rows('select * from table(xx_disl_gu23_pkg.gu23_get_rows(:b1))', [':b1' => $actId]);
    $signers = $db->rows('select * from table(xx_disl_gu23_pkg.gu23_get_signers(:b1))', [':b1' => $actId]);
    $approvals = $db->rows('select * from table(xx_disl_gu23_pkg.gu23_get_approvals(:b1))', [':b1' => $actId]);

    $generator = new GuActPhpWordReport();
    $generator->download($act, $wagons, $signers, $approvals, $format);
} catch (Throwable $e) {
    if (class_exists('Gu23Logger')) {
        Gu23Logger::exception($e, 'gu23_report_' . $format);
    }
    http_response_code(500);
    echo 'Ошибка генерации отчёта: ' . htmlspecialchars($e->getMessage());
}
