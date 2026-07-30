<?php

require_once __DIR__ . '/Gu23Db.php';
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\RichText\RichText;

/**
 * Импорт справочника причин из XLSX-шаблона.
 *
 */
class Gu23ReasonImportRepository
{
    private const SHEET_NAME = 'Причины';
    private const HEADER_ROW = 1;
    private const FIRST_DATA_ROW = 2;
    private const MAX_DATA_ROW = 1000;
    private const MAX_FILE_SIZE = 5 * 1024 * 1024;
    private const US = "\x1F";

    private Gu23Db $db;

    public function __construct($conn)
    {
        $this->db = new Gu23Db($conn);
    }

    public function importUploadedFile(array $file): array
    {
        $this->validateUpload($file);

        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load((string) $file['tmp_name']);

        try {
            $sheet = $spreadsheet->getSheetByName(self::SHEET_NAME);
            if ($sheet === null) {
                throw new \RuntimeException(
                    'В файле отсутствует лист «' . self::SHEET_NAME . '»'
                );
            }

            $this->validateHeaders($sheet);
            $categories = $this->loadCategories();
            $rows = $this->readRows($sheet);
            if (!$rows) {
                throw new \RuntimeException('На листе «Причины» нет данных для загрузки');
            }

            return $this->processRows($rows, $categories);
        } finally {
            $spreadsheet->disconnectWorksheets();
        }
    }

    private function validateUpload(array $file): void
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            throw new \RuntimeException($this->uploadErrorMessage($error));
        }
        if (empty($file['tmp_name']) || !is_uploaded_file((string) $file['tmp_name'])) {
            throw new \RuntimeException('Файл не был загружен');
        }
        if ((int) ($file['size'] ?? 0) <= 0) {
            throw new \RuntimeException('Загружен пустой файл');
        }
        if ((int) $file['size'] > self::MAX_FILE_SIZE) {
            throw new \RuntimeException('Размер файла превышает 5 МБ');
        }
        $extension = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
        if ($extension !== 'xlsx') {
            throw new \RuntimeException('Можно загрузить только файл формата XLSX');
        }
    }

    private function validateHeaders($sheet): void
    {
        $expected = ['ID', 'Название', 'Тип акта', 'Категория', 'Статус'];
        foreach ($expected as $offset => $header) {
            $column = Coordinate::stringFromColumnIndex($offset + 1);
            $actual = $this->cellText($sheet->getCell($column . self::HEADER_ROW)->getValue());
            if ($this->normalize($actual) !== $this->normalize($header)) {
                throw new \RuntimeException(
                    sprintf(
                        'Некорректный заголовок %s%d: ожидается «%s», получено «%s»',
                        $column,
                        self::HEADER_ROW,
                        $header,
                        $actual
                    )
                );
            }
        }
    }

    private function readRows($sheet): array
    {
        $highestDataRow = max(self::FIRST_DATA_ROW, $sheet->getHighestDataRow());
        if ($highestDataRow > self::MAX_DATA_ROW) {
            throw new \RuntimeException(
                'В шаблоне допускаются данные только до строки ' . self::MAX_DATA_ROW
            );
        }
        $lastRow = $highestDataRow;
        $rows = [];

        for ($rowNumber = self::FIRST_DATA_ROW; $rowNumber <= $lastRow; $rowNumber++) {
            $values = [];
            for ($column = 1; $column <= 5; $column++) {
                $coordinate = Coordinate::stringFromColumnIndex($column) . $rowNumber;
                $value = $sheet->getCell($coordinate)->getValue();
                $values[] = $this->cellText($value);
            }

            if ($this->isEmptyRow($values)) {
                continue;
            }

            $rows[] = [
                'row' => $rowNumber,
                'id_raw' => $values[0],
                'name' => $values[1],
                'act_kind_raw' => $values[2],
                'category_raw' => $values[3],
                'status_raw' => $values[4],
            ];
        }

        return $rows;
    }

    private function processRows(array $rows, array $categories): array
    {
        $created = 0;
        $updated = 0;
        $errors = [];
        $seen = [];
        $seenIds = [];

        foreach ($rows as $row) {
            try {
                $prepared = $this->prepareRow($row, $categories);
                if ($prepared['id'] !== null) {
                    if (isset($seenIds[$prepared['id']])) {
                        throw new \RuntimeException(
                            'ID ' . $prepared['id']
                            . ' повторяется внутри файла; впервые указан в строке '
                            . $seenIds[$prepared['id']]
                        );
                    }
                    $seenIds[$prepared['id']] = $prepared['row'];
                }
                $duplicateKey = $this->duplicateKey($prepared);

                if (isset($seen[$duplicateKey])) {
                    throw new \RuntimeException(
                        'дубликат внутри файла; такая же запись находится в строке '
                        . $seen[$duplicateKey]
                    );
                }
                $seen[$duplicateKey] = $prepared['row'];

                $result = $this->db->value(
                    'xx_disl_gu23_pkg.gu23_ref_reason_import('
                    . ':id, :name, :kind, :categ, :active)',
                    [
                        ':id' => $prepared['id'],
                        ':name' => $prepared['name'],
                        ':kind' => $prepared['act_kind'],
                        ':categ' => $prepared['category_id'],
                        ':active' => $prepared['active'],
                    ],
                    4000
                );
                $parts = explode(self::US, (string) $result, 3);
                if (($parts[0] ?? '') !== 'OK') {
                    throw new \RuntimeException($parts[1] ?? 'Ошибка сохранения в БД');
                }

                if ($prepared['id'] === null) {
                    $created++;
                } else {
                    $updated++;
                }
            } catch (\Throwable $e) {
                $errors[] = [
                    'row' => (int) $row['row'],
                    'id' => trim((string) $row['id_raw']),
                    'name' => trim((string) $row['name']),
                    'message' => $this->publicErrorMessage($e),
                ];
            }
        }

        $processed = $created + $updated;
        $report = $this->buildTextReport(count($rows), $created, $updated, $errors);

        return [
            'ok' => true,
            'total' => count($rows),
            'processed' => $processed,
            'created' => $created,
            'updated' => $updated,
            'errors_count' => count($errors),
            'errors' => $errors,
            'report' => $report,
            'report_name' => 'gu23_reason_import_' . date('Ymd_His') . '.txt',
        ];
    }

    private function prepareRow(array $row, array $categories): array
    {
        $idRaw = trim((string) $row['id_raw']);
        $id = null;
        if ($idRaw !== '') {
            if (!preg_match('/^[1-9][0-9]*$/', $idRaw)) {
                throw new \RuntimeException('ID должен быть пустым или целым числом больше 0');
            }
            $id = (int) $idRaw;
        }

        $name = trim((string) $row['name']);
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;
        if ($name === '') {
            throw new \RuntimeException('не заполнено название причины');
        }
        if ($this->textLength($name) > 500) {
            throw new \RuntimeException('название причины длиннее 500 символов');
        }

        $actKind = $this->mapActKind((string) $row['act_kind_raw']);
        $categoryId = $this->mapCategory((string) $row['category_raw'], $categories);
        $active = $this->mapStatus((string) $row['status_raw']);

        return [
            'row' => (int) $row['row'],
            'id' => $id,
            'name' => $name,
            'act_kind' => $actKind,
            'category_id' => $categoryId,
            'active' => $active,
        ];
    }

    private function loadCategories(): array
    {
        $rows = $this->db->rows(
            "select * from table(xx_disl_gu23_pkg.gu23_get_general_ref('CATEG_CAUSE'))"
        );
        $categories = [];

        foreach ($rows as $row) {
            $id = isset($row['ID']) ? (int) $row['ID'] : 0;
            $name = trim((string) ($row['NAME'] ?? ''));
            $code = trim((string) ($row['CODE'] ?? ''));
            if ($id <= 0 || $name === '') {
                continue;
            }

            foreach (array_filter([$name, $code]) as $value) {
                $key = $this->normalize((string) $value);
                if (isset($categories[$key]) && $categories[$key] !== $id) {
                    $categories[$key] = null;
                } else {
                    $categories[$key] = $id;
                }
            }
        }

        return $categories;
    }

    private function mapCategory(string $value, array $categories): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $key = $this->normalize($value);
        if (!array_key_exists($key, $categories)) {
            throw new \RuntimeException('категория «' . $value . '» не найдена');
        }
        if ($categories[$key] === null) {
            throw new \RuntimeException(
                'категория «' . $value . '» найдена неоднозначно'
            );
        }
        return (int) $categories[$key];
    }

    private function mapActKind(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return 'any';
        }

        $key = $this->normalize($value);
        $map = [
            $this->normalize('Любой') => 'any',
            $this->normalize('Начало') => 'start',
            $this->normalize('Начало простоя') => 'start',
            $this->normalize('Окончание') => 'end',
            $this->normalize('Окончание простоя') => 'end',
            $this->normalize('Прочий') => 'other',
            $this->normalize('Прочий акт') => 'other',
            'ANY' => 'any',
            'START' => 'start',
            'END' => 'end',
            'OTHER' => 'other',
        ];
        if (!isset($map[$key])) {
            throw new \RuntimeException('неизвестный тип акта «' . $value . '»');
        }
        return $map[$key];
    }

    private function mapStatus(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return 'Y';
        }

        $key = $this->normalize($value);
        $map = [
            $this->normalize('Активный') => 'Y',
            $this->normalize('Неактивный') => 'N',
            'Y' => 'Y',
            'N' => 'N',
        ];
        if (!isset($map[$key])) {
            throw new \RuntimeException('неизвестный статус «' . $value . '»');
        }
        return $map[$key];
    }

    private function duplicateKey(array $row): string
    {
        return implode('|', [
            $this->normalize((string) $row['name']),
            $row['act_kind'],
            (string) ($row['category_id'] ?? ''),
        ]);
    }

    private function buildTextReport(
        int $total,
        int $created,
        int $updated,
        array $errors
    ): string {
        $lines = [
            'Импорт справочника причин ГУ-23',
            'Дата: ' . date('d.m.Y H:i:s'),
            'Всего строк: ' . $total,
            'Создано: ' . $created,
            'Обновлено: ' . $updated,
            'Ошибок: ' . count($errors),
            '',
        ];

        if (!$errors) {
            $lines[] = 'Ошибок не обнаружено.';
        } else {
            $lines[] = 'Ошибки:';
            foreach ($errors as $error) {
                $context = [];
                if ($error['id'] !== '') {
                    $context[] = 'ID=' . $error['id'];
                }
                if ($error['name'] !== '') {
                    $context[] = 'Название=' . $error['name'];
                }
                $suffix = $context ? ' (' . implode(', ', $context) . ')' : '';
                $lines[] = sprintf(
                    'Строка %d%s: %s',
                    $error['row'],
                    $suffix,
                    $error['message']
                );
            }
        }

        return implode("\r\n", $lines) . "\r\n";
    }

    private function publicErrorMessage(\Throwable $e): string
    {
        $message = trim($e->getMessage());
        if (str_starts_with($message, 'oci_execute:')) {
            return 'ошибка обращения к БД';
        }
        return $message !== '' ? $message : 'неизвестная ошибка';
    }

    private function normalize(string $value): string
    {
        $value = trim($value);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
        if (function_exists('mb_strtoupper')) {
            return mb_strtoupper($value, 'UTF-8');
        }
        return strtoupper($value);
    }

    private function textLength(string $value): int
    {
        return function_exists('mb_strlen')
            ? mb_strlen($value, 'UTF-8')
            : strlen($value);
    }

    private function cellText($value): string
    {
        if ($value instanceof RichText) {
            return trim($value->getPlainText());
        }
        if ($value === null) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        return trim((string) $value);
    }

    private function isEmptyRow(array $values): bool
    {
        foreach ($values as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }
        return true;
    }

    private function uploadErrorMessage(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Размер файла превышает допустимый',
            UPLOAD_ERR_PARTIAL => 'Файл был загружен не полностью',
            UPLOAD_ERR_NO_FILE => 'Файл не выбран',
            default => 'Ошибка загрузки файла',
        };
    }
}
