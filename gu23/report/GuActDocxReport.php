<?php
/**
 * GuActDocxReport.php
 *
 * Генератор DOCX-отчётов для актов ГУ-23.
 * с помощью ZipArchive)
 *
 * Шаблоны: gu23/report/template/*.docx
 * Плейсхолдеры в шаблоне: {{ACT_NUMBER}}, {{DEPT}}, {{WAGON_NO}} и т.д.
 * Строки вагонов: первая строка таблицы, содержащая {{WAGON_NO}}, повторяется
 * для каждого вагона.
 */
class GuActDocxReport
{
    /**
     * Маппинг тип_акта => имя файла шаблона (относительно папки template/).
     */
    const TEMPLATES = [
        'start' => 'act23_general.docx',
        'end' => 'act23_general.docx',
        'other' => 'act23_general.docx',
    ];

    private string $templateDir;

    public function __construct()
    {
        $this->templateDir = __DIR__ . '/template/';
    }

    /**
     * Сформировать DOCX 
     *
     * @param array $act     Строка акта (ACT_NUMBER, DEPT, ACT_TYPE, START_AT …)
     * @param array $wagons  Массив вагонов  (WAGON_NO, KIND, CARGO, WEIGHT, OWNER …)
     * @param array $signers Массив подписантов (FIO, POST, ORG …)
     */
    public function download(array $act, array $wagons, array $signers): void
    {
        $actType = strtolower($act['ACT_TYPE'] ?? 'other');
        $templateName = self::TEMPLATES[$actType] ?? 'act23_general.docx';
        $templatePath = $this->templateDir . $templateName;

        if (!file_exists($templatePath)) {
            throw new \RuntimeException(
                'Шаблон не найден: ' . $templatePath . '. '
            );
        }

        // временной копией
        $tmp = tempnam(sys_get_temp_dir(), 'gu23_docx_');
        copy($templatePath, $tmp);

        try {
            $zip = new \ZipArchive();
            if ($zip->open($tmp) !== true) {
                throw new \RuntimeException('Не удалось открыть шаблон DOCX');
            }

            $xml = $zip->getFromName('word/document.xml');
            if ($xml === false) {
                $zip->close();
                throw new \RuntimeException('document.xml не найден в шаблоне');
            }

            $xml = $this->process($xml, $act, $wagons, $signers);

            $zip->addFromString('word/document.xml', $xml);
            $zip->close();

            $this->streamFile($tmp, $act);
        } finally {
            if (file_exists($tmp)) {
                unlink($tmp);
            }
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Обработка XML                                                           */
    /* ---------------------------------------------------------------------- */

    private function process(string $xml, array $act, array $wagons, array $signers): string
    {
        // Убираем маркеры проверки орфографии — они разбивают слова на несколько ранов
        $xml = preg_replace('#<w:proofErr[^>]*/>#', '', $xml);

        // Склеиваем соседние раны в каждом параграфе
        $xml = $this->mergeRuns($xml);

        // Простая замена плейсхолдеров
        $xml = $this->replacePlaceholders($xml, $act, $signers);

        // Автоподбор ширины колонок таблицы вагонов по содержимому
        // (до размножения строк, пока в таблице ещё есть маркер {{WAGON_NO}})
        $xml = $this->autofitWagonTable($xml);

        // Динамические строки вагонов
        $xml = $this->fillWagonRows($xml, $wagons);

        // Итоги по таблице вагонов (кол-во и сумма веса)
        $xml = $this->fillTotals($xml, $wagons);

        return $xml;
    }

    /**
     * Подставляет итоги таблицы вагонов: {{TOTAL_COUNT}} — число вагонов,
     * {{TOTAL_WEIGHT}} — сумма веса. Плейсхолдеры размещаются в строке «Итого»
     * шаблона. Если их нет — замена просто ничего не делает.
     */
    private function fillTotals(string $xml, array $wagons): string
    {
        $count = count($wagons);

        $sum = 0.0;
        foreach ($wagons as $w) {
            $raw = str_replace([' ', ','], ['', '.'], (string) ($w['WEIGHT'] ?? ''));
            if (is_numeric($raw)) {
                $sum += (float) $raw;
            }
        }
        // без хвостовых нулей: 127.000 -> 127, 127.060 -> 127.06
        $weight = $sum > 0
            ? rtrim(rtrim(sprintf('%.3f', $sum), '0'), '.')
            : '0';

        $xml = $this->replaceInXml($xml, '{{TOTAL_COUNT}}', (string) $count);
        $xml = $this->replaceInXml($xml, '{{TOTAL_WEIGHT}}', $weight);

        return $xml;
    }

    /**
     * Включает для таблицы вагонов автоподбор ширины колонок «по содержимому»:
     * предпочтительная ширина таблицы и ячеек переводится в тип "auto",
     * добавляется <w:tblLayout w:type="autofit"/>. Word пересчитывает
     * ширину колонок по их содержимому вместо фиксированных значений шаблона.
     * Затрагивается только таблица, содержащая {{WAGON_NO}}.
     */
    private function autofitWagonTable(string $xml): string
    {
        return preg_replace_callback(
            '/<w:tbl\b.*?<\/w:tbl>/s',
            static function (array $m): string {
                $tbl = $m[0];
                if (!str_contains($tbl, '{{WAGON_NO}}')) {
                    return $tbl; // не таблица вагонов — не трогаем
                }

                // Предпочтительная ширина таблицы -> авто
                $tbl = preg_replace(
                    '/<w:tblW\b[^>]*\/>/',
                    '<w:tblW w:w="0" w:type="auto"/>',
                    $tbl,
                    1
                );

                // Раскладка -> автоподбор (если ещё не задана — добавляем перед tblLook)
                if (str_contains($tbl, '<w:tblLayout')) {
                    $tbl = preg_replace(
                        '/<w:tblLayout\b[^>]*\/>/',
                        '<w:tblLayout w:type="autofit"/>',
                        $tbl
                    );
                } else {
                    $tbl = preg_replace(
                        '/(<w:tblLook\b)/',
                        '<w:tblLayout w:type="autofit"/>$1',
                        $tbl,
                        1
                    );
                }

                // Ширина каждой ячейки -> авто (по содержимому)
                $tbl = preg_replace(
                    '/<w:tcW\b[^>]*\/>/',
                    '<w:tcW w:w="0" w:type="auto"/>',
                    $tbl
                );

                return $tbl;
            },
            $xml
        );
    }

    /**
     * Склеивает соседние <w:r>, у которых одинаковый (или отсутствующий) <w:rPr>.
     */
    private function mergeRuns(string $xml): string
    {
        return preg_replace_callback(
            '/(<w:p\b[^>]*>)(.*?)(<\/w:p>)/s',
            function (array $m): string {
                return $m[1] . $this->mergeParaRuns($m[2]) . $m[3];
            },
            $xml
        );
    }

    private function mergeParaRuns(string $para): string
    {
        // Извлекаем все <w:r>...</w:r> вместе с позицией
        if (!preg_match_all('/<w:r\b[^>]*>.*?<\/w:r>/s', $para, $matches, PREG_OFFSET_CAPTURE)) {
            return $para;
        }

        $runs = $matches[0]; // [[xml, offset], ...]

        // Сначала разбираем каждый ран
        $parsed = [];
        foreach ($runs as [$runXml, $offset]) {
            preg_match('/<w:rPr>(.*?)<\/w:rPr>/s', $runXml, $rprM);
            $rpr = $rprM[1] ?? '';

            preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/s', $runXml, $tM);
            $texts = $tM[1] ?? [];

            // Ран с <w:br/> не сливаем (line break нельзя терять)
            $hasBr = str_contains($runXml, '<w:br');

            $parsed[] = [
                'xml' => $runXml,
                'offset' => $offset,
                'rpr' => $rpr,
                'text' => implode('', $texts),
                'hasBr' => $hasBr,
            ];
        }

        if (count($parsed) <= 1) {
            return $para;
        }

        // Строим сгруппированные серии (сливаем раны с одинаковым rPr, без br)
        $groups = [];
        $cur = null;

        foreach ($parsed as $r) {
            if ($cur === null) {
                $cur = $r;
                continue;
            }
            if (!$r['hasBr'] && !$cur['hasBr'] && $r['rpr'] === $cur['rpr']) {
                // Сливаем тексты
                $cur['text'] .= $r['text'];
                $cur['xml'] = $r['xml']; // Сохраним последний XML как шаблон рана
            } else {
                $groups[] = $cur;
                $cur = $r;
            }
        }
        $groups[] = $cur;

        if (count($groups) === count($parsed)) {
            return $para; // Ничего не слилось
        }

       // Собираем новый XML параграфа
        $firstOffset = $runs[0][1];
        $lastRun = end($runs);
        $lastEnd = $lastRun[1] + strlen($lastRun[0]);

        $before = substr($para, 0, $firstOffset);
        $after = substr($para, $lastEnd);

        $newRuns = '';
        foreach ($groups as $g) {
            $escapedText = htmlspecialchars($g['text'], ENT_XML1, 'UTF-8');
            if ($g['hasBr']) {
                // Ран с переносом строки — оставляем исходный XML
                $newRuns .= $g['xml'];
            } else {
                $rprXml = $g['rpr'] !== ''
                    ? '<w:rPr>' . $g['rpr'] . '</w:rPr>'
                    : '';
                $space = str_contains($g['text'], ' ') ? ' xml:space="preserve"' : '';
                $newRuns .= '<w:r>' . $rprXml
                    . '<w:t' . $space . '>' . $escapedText . '</w:t>'
                    . '</w:r>';
            }
        }

        return $before . $newRuns . $after;
    }

    /* ---------------------------------------------------------------------- */
    /* Замена плейсхолдеров                                                   */
    /* ---------------------------------------------------------------------- */

    private function replacePlaceholders(string $xml, array $act, array $signers): string
    {
        $s = static function (array $arr, int $idx, string $key): string {
            return (string) ($arr[$idx][$key] ?? '');
        };

        $vars = [
            '{{ACT_NUMBER}}' => $act['ACT_NUMBER'] ?? '',
            '{{DEPT}}' => $act['DEPT'] ?? '',
            '{{STATION}}' => $act['STATION'] ?? '',
            '{{ST_FROM}}' => $act['ST_FROM'] ?? '',
            '{{ST_TO}}' => $act['ST_TO'] ?? '',
            '{{REASON_NAME}}' => $act['REASON_NAME'] ?? '',
            '{{CARGO_REF}}' => $act['CARGO_REF'] ?? '',
            '{{START_AT}}' => $this->fmtDate($act['START_AT'] ?? ''),
            '{{END_AT}}' => $this->fmtDate($act['END_AT'] ?? ''),
            '{{CIRCUMSTANCES}}' => $act['CIRCUMSTANCES'] ?? '',
            '{{CREATED_AT}}' => $this->fmtDate($act['CREATED_AT'] ?? ''),
            '{{SIGNER_1_POST}}' => $s($signers, 0, 'POST'),
            '{{SIGNER_1_FIO}}' => $s($signers, 0, 'FIO'),
            '{{SIGNER_2_POST}}' => $s($signers, 1, 'POST'),
            '{{SIGNER_2_FIO}}' => $s($signers, 1, 'FIO'),
            '{{SIGNER_3_POST}}' => $s($signers, 2, 'POST'),
            '{{SIGNER_3_FIO}}' => $s($signers, 2, 'FIO'),
        ];

        foreach ($vars as $placeholder => $value) {
            $xml = $this->replaceInXml($xml, $placeholder, (string) $value);
        }

        return $xml;
    }

    /**
     * Заменяет плейсхолдер в XML, корректно обрабатывая переносы строк (→ w:br)
     * и экранируя спецсимволы XML.
     */
    private function replaceInXml(string $xml, string $placeholder, string $value): string
    {
        if (!str_contains($xml, $placeholder)) {
            return $xml;
        }

        // Если значение содержит переносы строк, заменяем через w:br
        if (str_contains($value, "\n")) {
            $lines = explode("\n", $value);
            $escaped = array_map(
                static fn(string $l): string => htmlspecialchars($l, ENT_XML1, 'UTF-8'),
                $lines
            );
            $xmlValue = implode('</w:t><w:br/><w:t xml:space="preserve">', $escaped);
        } else {
            $xmlValue = htmlspecialchars($value, ENT_XML1, 'UTF-8');
        }

        return str_replace($placeholder, $xmlValue, $xml);
    }

    /* ---------------------------------------------------------------------- */
    /* Динамические строки таблицы вагонов                                    */
    /* ---------------------------------------------------------------------- */

    /**
     * Находит в шаблоне строку <w:tr>, содержащую {{WAGON_NO}},
     * и заменяет её N повторениями (по одному на вагон).
     */
    private function fillWagonRows(string $xml, array $wagons): string
    {
        // Ищем строку-шаблон вагонов
        if (!preg_match('/(<w:tr\b[^>]*>(?:(?!<\/w:tr>).)*\{\{WAGON_NO\}\}(?:(?!<\/w:tr>).)*<\/w:tr>)/s', $xml, $m)) {
            return $xml;
        }

        $rowTemplate = $m[1];
        $filledRows = '';

        if (empty($wagons)) {
            // Нет вагонов — пустая строка
            $filledRows = $this->buildWagonRow($rowTemplate, 1, []);
        } else {
            foreach ($wagons as $idx => $wagon) {
                $filledRows .= $this->buildWagonRow($rowTemplate, $idx + 1, $wagon);
            }
        }

        return str_replace($rowTemplate, $filledRows, $xml);
    }

    private function buildWagonRow(string $rowTemplate, int $idx, array $wagon): string
    {
        $map = [
            '{{WAGON_IDX}}' => (string) $idx,
            '{{WAGON_NO}}' => $wagon['WAGON_NO'] ?? '',
            '{{WAGON_KIND}}' => $wagon['KIND'] ?? '',
            '{{WAGON_CARGO}}' => $wagon['CARGO'] ?? '',
            '{{WAGON_WEIGHT}}' => $wagon['WEIGHT'] ?? '',
            '{{WAGON_OWNER}}' => $wagon['OWNER'] ?? '',
            '{{WAGON_ST_FROM}}' => $wagon['ST_FROM'] ?? '',
            '{{WAGON_ST_TO}}' => $wagon['ST_TO'] ?? '',
            '{{WAGON_WAYBILL_NO}}' => $wagon['WAYBILL_NO'] ?? '',
            
        ];

        $row = $rowTemplate;
        foreach ($map as $ph => $val) {
            $row = str_replace($ph, htmlspecialchars((string) $val, ENT_XML1, 'UTF-8'), $row);
        }
        return $row;
    }
    
    private function fmtDate(string $d): string
    {
        if (preg_match('/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/', $d, $m)) {
            return "$m[3].$m[2].$m[1] $m[4]:$m[5]";
        }
        return $d;
    }

    private function streamFile(string $path, array $act): void
    {
        $raw = $act['ACT_NUMBER'] ?? ($act['ID'] ?? 'act');

        $filename = 'act_gu23_' . preg_replace('/[^\w\-]/u', '_', $raw) . '.docx';

        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, no-cache');
        readfile($path);
    }
}
