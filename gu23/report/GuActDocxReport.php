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
        'start' => 'act23_start.docx',
        'end' => 'act23_end.docx',
        'other' => 'act23_general.docx',
    ];

    private string $templateDir;

    public function __construct()
    {
        $this->templateDir = __DIR__ . '/template/';
    }

    /**
     * Сформировать DOCX/PDF
     *
     * @param array $act     Строка акта (ACT_NUMBER, DEPT, ACT_TYPE, START_AT …)
     * @param array $wagons  Массив вагонов  (WAGON_NO, KIND, CARGO, WEIGHT, OWNER …)
     * @param array $signers Массив подписантов (FIO, POST, ORG …)
     */
    public function download(array $act, array $wagons, array $signers, string $format = 'docx'): void
    {
        $format = strtolower($format) === 'pdf' ? 'pdf' : 'docx';
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

            $xml = $this->fillDocumentXml($xml, $act, $wagons, $signers);

            $zip->addFromString('word/document.xml', $xml);
            $zip->close();

            if ($format === 'pdf') {
                $pdfPath = $this->makePdf($tmp);
                try {
                    $this->streamFile($pdfPath, $act, 'pdf');
                } finally {
                    if (file_exists($pdfPath)) {
                        unlink($pdfPath);
                    }
                }
            } else {
                $this->streamFile($tmp, $act, 'docx');
            }
        } finally {
            if (file_exists($tmp)) {
                unlink($tmp);
            }
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Заполнение XML                                                          */
    /* ---------------------------------------------------------------------- */

    private function fillDocumentXml(string $xml, array $act, array $wagons, array $signers): string
    {
        $printSigners = $this->getPrintSigners($act, $signers);

        // Убираем маркеры проверки орфографии — они разбивают слова на несколько ранов
        $xml = preg_replace('#<w:proofErr[^>]*/>#', '', $xml);

        // Склеиваем соседние раны в каждом параграфе
        $xml = $this->mergeRuns($xml);

        // Динамический список подписантов в шаблонах, где есть {{SIGNER_LINE}} / {{SIGNER_FIO}}
        $xml = $this->fillSignerLines($xml, $printSigners);
        $xml = $this->fillSignerRows($xml, $printSigners);

        // Простая замена плейсхолдеров
        $xml = $this->replacePlaceholders($xml, $act, $printSigners);

        // Автоподбор ширины колонок таблицы вагонов по содержимому
        // (до размножения строк, пока в таблице ещё есть маркер {{WAGON_NO}})
        $xml = $this->autofitWagonTable($xml);

        // Динамические строки вагонов
        $xml = $this->fillWagonRows($xml, $wagons);

        return $xml;
    }

    private function getPrintSigners(array $act, array $signers): array
    {
        $actType = strtolower((string) ($act['ACT_TYPE'] ?? ''));
        $ownLimit = 2;
        $rzdLimit = 1;
        $own = [];
        $rzd = [];

        foreach ($signers as $signer) {
            $stype = strtolower((string) ($signer['STYPE'] ?? ''));
            if ($stype === 'rzd') {
                if (count($rzd) < $rzdLimit) {
                    $rzd[] = $signer;
                }
            } elseif (count($own) < $ownLimit) {
                $own[] = $signer;
            }
        }

        if (!$own && !$rzd) {
            return array_slice($signers, 0, $actType === 'other' ? 2 : 3);
        }

        return array_merge($own, $rzd);
    }

    private function fillSignerLines(string $xml, array $signers): string
    {
        if (!str_contains($xml, '{{SIGNER_LINE}}')) {
            return $xml;
        }

        if (!preg_match('#(<w:p\b(?![^>]*/>)[^>]*>(?:(?!</w:p>).)*\{\{SIGNER_LINE\}\}(?:(?!</w:p>).)*</w:p>)#s', $xml, $m)) {
            return $xml;
        }

        $rowTemplate = $m[1];
        $rows = '';
        foreach ($signers as $signer) {
            if (strtolower((string) ($signer['STYPE'] ?? '')) === 'rzd') {
                $rows .= $this->makeParagraphText($rowTemplate, 'Участник:', true);
                $rows .= $this->makeParagraphText($rowTemplate, $this->getSignerLineText($signer), false);
            } else {
                $rows .= $this->makeParagraphText($rowTemplate, $this->getSignerLineText($signer), false);
            }
        }

        return str_replace($rowTemplate, $rows, $xml);
    }

    private function fillSignerRows(string $xml, array $signers): string
    {
        if (!str_contains($xml, '{{SIGNER_FIO}}')) {
            return $xml;
        }

        $pattern = '#(<w:tr\b(?:(?!</w:tr>).)*\{\{SIGNER_POST\}\}(?:(?!</w:tr>).)*\{\{SIGNER_FIO\}\}(?:(?!</w:tr>).)*</w:tr>)(\s*<w:tr\b(?:(?!</w:tr>).)*</w:tr>)#s';
        if (!preg_match($pattern, $xml, $m)) {
            return $xml;
        }

        $rowTemplate = $m[1] . $m[2];
        $rows = '';
        foreach ($signers as $signer) {
            $row = $rowTemplate;
            if (strtolower((string) ($signer['STYPE'] ?? '')) === 'rzd') {
                $row = $this->replaceSignerPostRun($row, (string) ($signer['POST'] ?? ''));
            } else {
                $row = $this->replaceTextInXml($row, '{{SIGNER_POST}}', (string) ($signer['POST'] ?? ''));
            }
            $row = $this->replaceTextInXml($row, '{{SIGNER_FIO}}', (string) ($signer['FIO'] ?? ''));
            $rows .= $row;
        }

        return str_replace($rowTemplate, $rows, $xml);
    }

    private function replaceTextInXml(string $xml, string $placeholder, string $value): string
    {
        return str_replace($placeholder, htmlspecialchars($value, ENT_XML1, 'UTF-8'), $xml);
    }

    private function makeParagraphText(string $paragraphXml, string $text, bool $bold): string
    {
        $run = '<w:r>';
        if ($bold) {
            $run .= '<w:rPr><w:b/></w:rPr>';
        }
        $run .= '<w:t xml:space="preserve">' . htmlspecialchars($text, ENT_XML1, 'UTF-8') . '</w:t></w:r>';

        if (preg_match('#^(<w:p\b(?![^>]*/>)[^>]*>(?:<w:pPr\b(?:(?!</w:pPr>).)*</w:pPr>)?)(.*)(</w:p>)$#s', $paragraphXml, $m)) {
            return $m[1] . $run . $m[3];
        }

        return $this->replaceTextInXml($paragraphXml, '{{SIGNER_LINE}}', $text);
    }

    private function replaceSignerPostRun(string $xml, string $post): string
    {
        $post = trim($post);
        $runs = '<w:r><w:rPr><w:b/></w:rPr><w:t>Участник:</w:t></w:r>';
        if ($post !== '') {
            $runs .= '<w:r><w:br/></w:r><w:r><w:t xml:space="preserve">'
                . htmlspecialchars($post, ENT_XML1, 'UTF-8')
                . '</w:t></w:r>';
        }

        return preg_replace(
            '#<w:r\b(?:(?!</w:r>).)*<w:t[^>]*>\{\{SIGNER_POST\}\}</w:t>(?:(?!</w:r>).)*</w:r>#s',
            $runs,
            $xml,
            1
        ) ?? $xml;
    }

    private function getSignerLineText(array $signer): string
    {
        $post = trim((string) ($signer['POST'] ?? ''));
        $fio = trim((string) ($signer['FIO'] ?? ''));
        if (strtolower((string) ($signer['STYPE'] ?? '')) === 'rzd') {
            return $post !== ''
                ? 'Должность: ' . $post . '    Ф.И.О.: ' . $fio
                : 'Ф.И.О.: ' . $fio;
        }

        return $post !== ''
            ? 'Должность: ' . $post . '    Ф.И.О.: ' . $fio
            : 'Ф.И.О.: ' . $fio;
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

                $widths = [520, 1100, 1500, 1250, 1800, 900, 1250];
                $tableWidth = array_sum($widths);

                $tbl = preg_replace(
                    '/<w:tblW\b[^>]*\/>/',
                    '<w:tblW w:w="' . $tableWidth . '" w:type="dxa"/>',
                    $tbl,
                    1
                );

                if (str_contains($tbl, '<w:tblLayout')) {
                    $tbl = preg_replace(
                        '/<w:tblLayout\b[^>]*\/>/',
                        '<w:tblLayout w:type="fixed"/>',
                        $tbl
                    );
                } else {
                    $tbl = preg_replace(
                        '/(<w:tblLook\b)/',
                        '<w:tblLayout w:type="fixed"/>$1',
                        $tbl,
                        1
                    );
                }

                $tbl = preg_replace_callback(
                    '/<w:tblGrid>.*?<\/w:tblGrid>/s',
                    static function () use ($widths): string {
                        $cols = '';
                        foreach ($widths as $width) {
                            $cols .= '<w:gridCol w:w="' . $width . '"/>';
                        }
                        return '<w:tblGrid>' . $cols . '</w:tblGrid>';
                    },
                    $tbl,
                    1
                );

                $cellIndex = 0;
                $tbl = preg_replace_callback(
                    '/<w:tcW\b[^>]*\/>/',
                    static function () use ($widths, &$cellIndex): string {
                        $width = $widths[$cellIndex % count($widths)];
                        $cellIndex++;
                        return '<w:tcW w:w="' . $width . '" w:type="dxa"/>';
                    },
                    $tbl
                );

                $tbl = preg_replace_callback(
                    '/<w:rPr\b[^>]*>.*?<\/w:rPr>|<w:t\b/s',
                    static function (array $r): string {
                        if (str_starts_with($r[0], '<w:rPr')) {
                            return str_contains($r[0], '<w:sz ')
                                ? preg_replace('/<w:sz\b[^>]*\/>/', '<w:sz w:val="18"/>', $r[0])
                                : str_replace('</w:rPr>', '<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>', $r[0]);
                        }
                        return '<w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>' . $r[0];
                    },
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
            $filledRows = $this->fillWagonRow($rowTemplate, 1, []);
        } else {
            foreach ($wagons as $idx => $wagon) {
                $filledRows .= $this->fillWagonRow($rowTemplate, $idx + 1, $wagon);
            }
        }

        return str_replace($rowTemplate, $filledRows, $xml);
    }

    private function fillWagonRow(string $rowTemplate, int $idx, array $wagon): string
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
            '{{WAGON_ACT_START}}' => $wagon['ACT_START_NUM'] ?? '',
            '{{WAGON_DUR_TOTAL_H}}' => $wagon['DUR_TOTAL_H'] ?? '',


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

    private function makePdf(string $docxPath): string
    {
        $soffice = $this->findSoffice();
        if ($soffice === '') {
            throw new \RuntimeException('LibreOffice не найден для формирования PDF');
        }

        $outDir = sys_get_temp_dir();
        $homeDir = $this->makeTempDir('gu23_lo_home_');
        $profileDir = $this->makeTempDir('gu23_lo_profile_');
        $cmd = escapeshellarg($soffice)
            . ' -env:UserInstallation=file://' . $profileDir
            . ' --headless --nologo --nofirststartwizard --convert-to pdf'
            . ' --outdir ' . escapeshellarg($outDir)
            . ' ' . escapeshellarg($docxPath);
        $oldHome = getenv('HOME');
        putenv('HOME=' . $homeDir);

        try {
            exec($cmd, $output, $code);

            $pdfPath = $outDir . '/' . pathinfo($docxPath, PATHINFO_FILENAME) . '.pdf';
            if ($code !== 0 || !is_file($pdfPath)) {
                throw new \RuntimeException('Не удалось сформировать PDF');
            }

            return $pdfPath;
        } finally {
            if ($oldHome !== false) {
                putenv('HOME=' . $oldHome);
            }
            $this->removeDir($homeDir);
            $this->removeDir($profileDir);
        }
    }

    private function findSoffice(): string
    {
        $config = $this->loadConfig();
        $candidates = [
            (string) ($config['soffice_path'] ?? ''),
            getenv('SOFFICE_PATH') ?: '',

        ];

        foreach ($candidates as $path) {
            if ($path !== '' && is_executable($path)) {
                return $path;
            }
        }

        $which = trim((string) shell_exec('command -v soffice 2>/dev/null'));
        return $which !== '' ? $which : '';
    }

    private function loadConfig(): array
    {
        $path = __DIR__ . '/../config.php';
        if (!is_file($path)) {
            return [];
        }

        $config = require $path;
        return is_array($config) ? $config : [];
    }

    private function makeTempDir(string $prefix): string
    {
        $path = tempnam(sys_get_temp_dir(), $prefix);
        if ($path === false) {
            throw new \RuntimeException('Не удалось создать временную папку');
        }
        unlink($path);
        mkdir($path, 0777, true);
        return $path;
    }

    private function removeDir(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if ($items === false) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $child = $path . '/' . $item;
            if (is_dir($child) && !is_link($child)) {
                $this->removeDir($child);
            } else {
                @unlink($child);
            }
        }
        @rmdir($path);
    }

    private function streamFile(string $path, array $act, string $format): void
    {
        $raw = $act['ACT_NUMBER'] ?? ($act['ID'] ?? 'act');
        $safeName = preg_replace('/[^\w\-]/u', '_', $raw);
        $filename = 'act_gu23_' . $safeName . '.' . $format;
        $fallbackName = preg_replace('/[^A-Za-z0-9._-]+/', '_', $filename) ?: 'act_gu23.' . $format;
        $contentType = $format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        header('Content-Type: ' . $contentType);
        header(
            'Content-Disposition: attachment; filename="' . $fallbackName . '"'
            . "; filename*=UTF-8''" . rawurlencode($filename)
        );
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, no-cache');
        readfile($path);
    }
}
