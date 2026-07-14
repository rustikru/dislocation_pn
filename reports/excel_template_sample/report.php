<?php
/**
 * Шаблон Excel-отчёта по готовому .xlsx файлу.
 *
 * Что обычно менять:
 * 1. $templatePath
 * 2. $outputFileName
 * 3. $headerSql и $tableSql
 * 4. $placeholders
 * 5. $tableColumns
 */

session_start();

require_once __DIR__ . '/../../vendor/autoload.php';
include __DIR__ . '/../../login.php';
include __DIR__ . '/../../connection.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

$auth = new AuthClass();
if (!$auth->isAuth()) {
    http_response_code(403);
    exit('Доступ запрещён');
}

/* -------------------------------------------------------------------------- */
/* Настройки отчёта                                                           */
/* -------------------------------------------------------------------------- */

$templatePath = __DIR__ . '/template.xlsx';
$outputFileName = 'excel_report_' . date('Ymd_His') . '.xlsx';

// Запрос для одиночных значений шапки отчёта.
// Поменяйте SQL на свой.
$headerSql = "
    select
        'ГУ-23' as report_name,
        to_char(sysdate, 'dd.mm.yyyy hh24:mi') as report_date,
        :user_name as user_name
    from dual
";

$headerBinds = [
    ':user_name' => $_SESSION['full_name'] ?? ($_SESSION['login'] ?? ''),
];

// Запрос для табличной части.
// Поменяйте SQL на свой.
$tableSql = "
    select 1 as row_num, '3242343' as wagon_no, 'Метанол' as cargo_name from dual
    union all
    select 2 as row_num, '5645678' as wagon_no, 'Карбамид' as cargo_name from dual
";

$tableBinds = [];

// Какие плейсхолдеры в шаблоне заменить значениями из $headerSql.
// Ключ — текст в Excel, значение — колонка из запроса.
$placeholders = [
    '{{REPORT_NAME}}' => 'REPORT_NAME',
    '{{REPORT_DATE}}' => 'REPORT_DATE',
    '{{USER_NAME}}' => 'USER_NAME',
];

// Строка в шаблоне, которую нужно размножить под строки запроса.
$tableStartRow = 7;

// В какие колонки писать данные табличной части.
// Ключ — колонка Excel, значение — колонка из $tableSql.
$tableColumns = [
    'A' => 'ROW_NUM',
    'B' => 'WAGON_NO',
    'C' => 'CARGO_NAME',
];

/* -------------------------------------------------------------------------- */
/* Формирование отчёта                                                        */
/* -------------------------------------------------------------------------- */

try {
    if (!is_file($templatePath)) {
        throw new RuntimeException('Шаблон не найден: ' . $templatePath);
    }

    $headerRows = queryRows($conn1, $headerSql, $headerBinds);
    $header = $headerRows[0] ?? [];
    $tableRows = queryRows($conn1, $tableSql, $tableBinds);

    $spreadsheet = IOFactory::load($templatePath);
    $sheet = $spreadsheet->getActiveSheet();

    replacePlaceholders($sheet, $placeholders, $header);
    fillTable($sheet, $tableStartRow, $tableColumns, $tableRows);

    streamExcel($spreadsheet, $outputFileName);
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Ошибка формирования Excel: ' . htmlspecialchars($e->getMessage());
}

function queryRows($conn, string $sql, array $binds = []): array
{
    $st = oci_parse($conn, $sql);
    if (!$st) {
        $e = oci_error($conn);
        throw new RuntimeException('oci_parse: ' . ($e['message'] ?? ''));
    }

    foreach ($binds as $name => $value) {
        oci_bind_by_name($st, $name, $binds[$name]);
    }

    if (!oci_execute($st)) {
        $e = oci_error($st);
        throw new RuntimeException('oci_execute: ' . ($e['message'] ?? ''));
    }

    $rows = [];
    while ($row = oci_fetch_array($st, OCI_ASSOC + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) {
        $rows[] = $row;
    }

    return $rows;
}

function replacePlaceholders($sheet, array $placeholders, array $header): void
{
    foreach ($sheet->getRowIterator() as $row) {
        foreach ($row->getCellIterator() as $cell) {
            $value = (string) $cell->getValue();
            if ($value === '') {
                continue;
            }

            foreach ($placeholders as $placeholder => $column) {
                if (str_contains($value, $placeholder)) {
                    $value = str_replace($placeholder, (string) ($header[$column] ?? ''), $value);
                }
            }

            $cell->setValue($value);
        }
    }
}

function fillTable($sheet, int $startRow, array $columns, array $rows): void
{
    if (!$rows) {
        $sheet->removeRow($startRow);
        return;
    }

    if (count($rows) > 1) {
        $sheet->insertNewRowBefore($startRow + 1, count($rows) - 1);
    }

    foreach ($rows as $index => $row) {
        $excelRow = $startRow + $index;

        if ($index > 0) {
            copyRowStyle($sheet, $startRow, $excelRow, array_key_first($columns), array_key_last($columns));
        }

        foreach ($columns as $excelColumn => $dataColumn) {
            $sheet->setCellValue($excelColumn . $excelRow, $row[$dataColumn] ?? '');
        }
    }
}

function copyRowStyle($sheet, int $fromRow, int $toRow, string $firstColumn, string $lastColumn): void
{
    $sheet->duplicateStyle(
        $sheet->getStyle($firstColumn . $fromRow . ':' . $lastColumn . $fromRow),
        $firstColumn . $toRow . ':' . $lastColumn . $toRow
    );

    $sheet->getRowDimension($toRow)->setRowHeight($sheet->getRowDimension($fromRow)->getRowHeight());
}

function streamExcel($spreadsheet, string $fileName): void
{
    while (ob_get_level()) {
        ob_end_clean();
    }

    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header(
        'Content-Disposition: attachment; filename="report.xlsx"; filename*=UTF-8\'\''
        . rawurlencode($fileName)
    );
    header('Cache-Control: private, no-cache');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;
}
