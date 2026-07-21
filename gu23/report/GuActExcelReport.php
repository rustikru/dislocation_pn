<?php

require_once __DIR__ . '/../classes/Gu23Db.php';
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

class GuActExcelReport
{
    private Gu23Db $db;

    public function __construct(Gu23Db $db)
    {
        $this->db = $db;
    }

    public function download(array $filter): void
    {
        if (!class_exists('\PhpOffice\PhpSpreadsheet\Spreadsheet')) {
            throw new \RuntimeException('PhpSpreadsheet не найден. Проверьте папку vendor.');
        }

        $acts = $this->acts($filter);
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Архив актов');

        $headers = $this->headers();
        $lastColumn = $this->columnName(count($headers));
        $params = $this->params($filter, $acts);
        $headerRow = count($params) + 4;
        $dataRow = $headerRow + 1;

        $sheet->mergeCells('A1:' . $lastColumn . '1');
        $sheet->setCellValue('A1', 'Архив актов ГУ-23');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        $this->addParams($sheet, $params);

        $columnNumber = 1;
        foreach ($headers as $header) {
            $sheet->setCellValue($this->cell($columnNumber, $headerRow), $header);
            $columnNumber++;
        }

        $rowNumber = $dataRow;
        $num = 1;
        foreach ($acts as $act) {
            $actId = (int) ($act['ID'] ?? 0);
            $fullAct = $this->act($actId) ?: $act;
            $wagons = $this->wagons($actId);
            if (!$wagons) {
                $wagons = [[]];
            }

            foreach ($wagons as $wagon) {
                $this->addLine($sheet, $rowNumber, $num, $fullAct, $wagon);
                $rowNumber++;
                $num++;
            }
        }

        $lastRow = max($headerRow, $rowNumber - 1);
        $sheet->setAutoFilter('A' . $headerRow . ':' . $lastColumn . $headerRow);
        $sheet->freezePane('A' . $dataRow);
        $sheet->getStyle('A' . $headerRow . ':' . $lastColumn . $headerRow)->getFont()->setBold(true);
        $sheet->getStyle('A' . $headerRow . ':' . $lastColumn . $lastRow)->getBorders()->getAllBorders()->setBorderStyle(
            \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN
        );
        $sheet->getStyle('A' . $headerRow . ':' . $lastColumn . $lastRow)->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_TOP);
        $sheet->getStyle('L:L')->getAlignment()->setWrapText(true);
        $sheet->getStyle('M:M')->getAlignment()->setWrapText(true);
        $sheet->getStyle('AB:AB')->getAlignment()->setWrapText(true);

        $this->setWidths($sheet);

        if (ob_get_level() > 0) {
            ob_end_clean();
        }

        $fileName = 'gu23_acts_' . date('Ymd_His') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save('php://output');
        $spreadsheet->disconnectWorksheets();
        exit;
    }

    private function acts(array $filter): array
    {
        $total = (int) $this->db->value(
            'xx_disl_gu23_pkg.gu23_count_acts(p_q => :q, p_type => :type, p_status => :status, p_dept_id => :dept, p_date_from => :date_from, p_date_to => :date_to, p_has_signed => :has_signed, p_reason_categ => :reason_categ)',
            [
                ':q' => $filter['q'] ?? null,
                ':type' => $filter['type'] ?? null,
                ':status' => $filter['status'] ?? null,
                ':dept' => $filter['dept'] ?? null,
                ':date_from' => $filter['date_from'] ?? null,
                ':date_to' => $filter['date_to'] ?? null,
                ':has_signed' => $filter['has_signed'] ?? null,
                ':reason_categ' => $filter['reason_categ'] ?? null,
            ],
            40
        );

        $limit = max(1, $total);
        return $this->db->rows(
            'select * from table(xx_disl_gu23_pkg.gu23_get_acts(p_q => :q, p_type => :type, p_status => :status, p_dept_id => :dept, p_date_from => :date_from, p_date_to => :date_to, p_has_signed => :has_signed, p_reason_categ => :reason_categ, p_page => :page, p_page_size => :page_size))',
            [
                ':q' => $filter['q'] ?? null,
                ':type' => $filter['type'] ?? null,
                ':status' => $filter['status'] ?? null,
                ':dept' => $filter['dept'] ?? null,
                ':date_from' => $filter['date_from'] ?? null,
                ':date_to' => $filter['date_to'] ?? null,
                ':has_signed' => $filter['has_signed'] ?? null,
                ':reason_categ' => $filter['reason_categ'] ?? null,
                ':page' => 1,
                ':page_size' => $limit,
            ]
        );
    }

    private function act(int $actId): ?array
    {
        if ($actId <= 0) {
            return null;
        }

        $rows = $this->db->rows(
            'select * from table(xx_disl_gu23_pkg.gu23_get_act(:b1))',
            [':b1' => $actId]
        );

        return $rows[0] ?? null;
    }

    private function wagons(int $actId): array
    {
        if ($actId <= 0) {
            return [];
        }

        return $this->db->rows(
            'select * from table(xx_disl_gu23_pkg.gu23_get_rows(:b1))',
            [':b1' => $actId]
        );
    }

    private function headers(): array
    {
        return [
            '№',
            'ID акта',
            'Номер акта',
            'Акт начала',
            'Тип акта',
            'Статус',
            'Цех',
            'Станция составления',
            'Станция отправления',
            'Станция назначения',
            'Груз по акту',
            'Причина',
            'Обстоятельства',
            'Начало простоя',
            'Окончание простоя',
            'Дни',
            'Часы',
            'Всего часов',
            'Календарные дни',
            'Дата создания',
            'Создал',
            '№ вагона',
            '№ накладной',
            'Род вагона',
            'Собственник',
            'Ст. отпр. вагона',
            'Ст. назн. вагона',
            'Груз вагона',
            'Вес',
            'Акт начала по вагону',
            'Простой, час.',
        ];
    }

    private function addLine($sheet, int $rowNumber, int $num, array $act, array $wagon): void
    {
        $values = [
            $num,
            $this->text($act, 'ID'),
            $this->text($act, 'ACT_NUMBER'),
            $this->text($act, 'ACT_START_NUMBER'),
            $this->actType($this->text($act, 'ACT_TYPE')),
            $this->actStatus($this->text($act, 'STATUS')),
            $this->text($act, 'DEPT'),
            $this->text($act, 'STATION'),
            $this->text($act, 'ST_FROM'),
            $this->text($act, 'ST_TO'),
            $this->text($act, 'CARGO_REF'),
            $this->text($act, 'REASON_NAME'),
            $this->text($act, 'CIRCUMSTANCES'),
            $this->formatDateTime($this->text($act, 'START_AT')),
            $this->formatDateTime($this->text($act, 'END_AT')),
            $this->text($act, 'DUR_DAYS'),
            $this->text($act, 'DUR_HOURS'),
            $this->text($act, 'DUR_TOTAL_H'),
            $this->text($act, 'CAL_DAYS'),
            $this->formatDateTime($this->text($act, 'CREATED_AT')),
            $this->text($act, 'CREATED_BY'),
            $this->text($wagon, 'WAGON_NO'),
            $this->text($wagon, 'WAYBILL_NO'),
            $this->text($wagon, 'KIND'),
            $this->text($wagon, 'OWNER'),
            $this->text($wagon, 'ST_FROM'),
            $this->text($wagon, 'ST_TO'),
            $this->text($wagon, 'CARGO'),
            $this->text($wagon, 'WEIGHT'),
            $this->text($wagon, 'ACT_START_NUM'),
            $this->text($wagon, 'DUR_TOTAL_H'),
        ];

        foreach ($values as $index => $value) {
            $sheet->setCellValueExplicit(
                $this->cell($index + 1, $rowNumber),
                $value,
                \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING
            );
        }
    }

    private function setWidths($sheet): void
    {
        $widths = [
            'A' => 7,
            'B' => 10,
            'C' => 22,
            'D' => 22,
            'E' => 18,
            'F' => 16,
            'G' => 12,
            'H' => 20,
            'I' => 20,
            'J' => 20,
            'K' => 30,
            'L' => 38,
            'M' => 55,
            'N' => 20,
            'O' => 20,
            'P' => 10,
            'Q' => 10,
            'R' => 12,
            'S' => 14,
            'T' => 20,
            'U' => 18,
            'V' => 15,
            'W' => 18,
            'X' => 18,
            'Y' => 30,
            'Z' => 20,
            'AA' => 20,
            'AB' => 30,
            'AC' => 12,
            'AD' => 22,
            'AE' => 14,
        ];

        foreach ($widths as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }
    }

    private function params(array $filter, array $acts): array
    {
        return [
            ['Дата формирования', date('d.m.Y H:i:s')],
            ['Поиск', $this->filterText($filter['q'] ?? '')],
            ['Тип акта', $this->filterList($filter['type'] ?? '', 'actType')],
            ['Статус', $this->filterList($filter['status'] ?? '', 'actStatus')],
            ['Цех', $this->filterText($filter['dept'] ?? '')],
            ['Дата с', $this->filterText($filter['date_from'] ?? '')],
            ['Дата по', $this->filterText($filter['date_to'] ?? '')],
            ['Подписанный файл', (($filter['has_signed'] ?? '') === 'Y') ? 'Да' : 'Все'],
            //['Актов найдено', (string) count($acts)],
        ];
    }

    private function addParams($sheet, array $params): void
    {
        $rowNumber = 2;
        foreach ($params as $param) {
            $rowNumber++;
            $sheet->setCellValue('A' . $rowNumber, $param[0]);
            $sheet->setCellValue('B' . $rowNumber, $param[1] === '' ? 'Все' : $param[1]);
        }

        $sheet->getStyle('A3:A' . $rowNumber)->getFont()->setBold(true);
    }

    private function text(array $row, string $key): string
    {
        return trim((string) ($row[$key] ?? ''));
    }

    private function formatDateTime(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }

        $formats = [
            'Y-m-d H:i:s',
            'Y-m-d H:i',
            'd.m.Y H:i:s',
            'd.m.Y H:i',
            'd.m.y H:i:s',
            'd.m.y H:i',
        ];

        foreach ($formats as $format) {
            $date = \DateTime::createFromFormat($format, $value);
            if ($date instanceof \DateTime) {
                return $date->format('d.m.Y H:i:s');
            }
        }

        $time = strtotime($value);
        if ($time !== false) {
            return date('d.m.Y H:i:s', $time);
        }

        return $value;
    }

    private function filterText($value): string
    {
        return trim((string) $value);
    }

    private function filterList($value, string $listName): string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }

        $parts = array_filter(array_map('trim', explode(',', $value)), 'strlen');
        $names = [];
        foreach ($parts as $part) {
            $names[] = $listName === 'actStatus' ? $this->actStatus($part) : $this->actType($part);
        }
        return implode(', ', $names);
    }

    private function actType(string $type): string
    {
        $names = [
            'start' => 'Начало простоя',
            'end' => 'Окончание простоя',
            'other' => 'Прочий акт',
        ];
        return $names[$type] ?? $type;
    }

    private function actStatus(string $status): string
    {
        $names = [
            'draft' => 'Проект',
            'active' => 'Открыт',
            'on_correction' => 'На корректировке',
            'closed' => 'Закрыт',
            'annulled' => 'Аннулирован',
            'signed' => 'Подписан',
            'rejected' => 'Отклонён',
        ];
        return $names[$status] ?? $status;
    }

    private function columnName(int $columnNumber): string
    {
        return \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($columnNumber);
    }

    private function cell(int $columnNumber, int $rowNumber): string
    {
        return $this->columnName($columnNumber) . $rowNumber;
    }
}
