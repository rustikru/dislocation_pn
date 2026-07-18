<?php

use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\TemplateProcessor;

class GuActPhpWordReport
{
    const TEMPLATES = [
        'start' => 'act23_start.docx',
        'end' => 'act23_end.docx',
        'other' => 'act23_general.docx',
    ];

    private string $templateDir;

    public function __construct()
    {
        $autoload = __DIR__ . '/../../vendor/autoload.php';
        if (is_file($autoload)) {
            require_once $autoload;
        }

        if (!class_exists(TemplateProcessor::class)) {
            throw new RuntimeException('PHPWord не найден. Нужно установить phpoffice/phpword.');
        }

        Settings::setOutputEscapingEnabled(true);

        $this->templateDir = __DIR__ . '/template/';
    }

    public function download(array $act, array $wagons, array $signers, array $approvals = [], string $format = 'docx'): void
    {
        $format = strtolower($format) === 'pdf' ? 'pdf' : 'docx';
        $docxPath = $this->saveDocx($act, $wagons, $signers, $approvals);

        try {
            if ($format === 'pdf') {
                $pdfPath = $this->savePdfFile($docxPath);
                try {
                    $this->sendFile($pdfPath, $act, 'pdf');
                } finally {
                    if (is_file($pdfPath)) {
                        unlink($pdfPath);
                    }
                }
            } else {
                $this->sendFile($docxPath, $act, 'docx');
            }
        } finally {
            if (is_file($docxPath)) {
                unlink($docxPath);
            }
        }
    }

    private function saveDocx(array $act, array $wagons, array $signers, array $approvals): string
    {
        $actType = strtolower((string) ($act['ACT_TYPE'] ?? 'other'));
        $templateName = self::TEMPLATES[$actType] ?? self::TEMPLATES['other'];
        $templatePath = $this->templateDir . $templateName;

        if (!is_file($templatePath)) {
            throw new RuntimeException('Шаблон PHPWord не найден: ' . $templatePath);
        }

        $doc = new TemplateProcessor($templatePath);

        $printSigners = $this->getPrintSigners($act, $signers);
        $usePep = $this->canShowPepStamp($act, $approvals);
        $paperSigners = $usePep ? $this->getPaperSigners($printSigners) : $printSigners;
        $pepApprovals = $usePep ? $this->getPepApprovals($approvals, $printSigners) : [];
        $rzdSigners = $this->getRzdSigners($paperSigners);
        $hasRzdBlock = $this->templateHas($templatePath, 'SIGNER_RZD_POST')
            || $this->templateHas($templatePath, 'SIGNER_RZD_FIO');
        $mainSigners = $hasRzdBlock ? $this->getNonRzdSigners($paperSigners) : $paperSigners;

        $this->fillAct($doc, $act);
        $this->fillSignerLine($doc, $printSigners);
        $this->fillWagons($doc, $wagons);
        $this->fillMainSigners($doc, $mainSigners);
        $this->fillRzdSigners($doc, $rzdSigners, $hasRzdBlock);

        $path = tempnam(sys_get_temp_dir(), 'gu23_phpword_');
        if ($path === false) {
            throw new RuntimeException('Не удалось создать временный файл');
        }
        $docxPath = $path . '.docx';
        unlink($path);

        $doc->saveAs($docxPath);
        $this->fixDocxXml($docxPath, $mainSigners, $rzdSigners, $pepApprovals);
        $this->checkDocxXml($docxPath);
        return $docxPath;
    }

    private function fillAct(TemplateProcessor $doc, array $act): void
    {
        $values = [
            'ACT_NUMBER' => $act['ACT_NUMBER'] ?? '',
            'DEPT' => $act['DEPT'] ?? '',
            'STATION' => $act['STATION'] ?? '',
            'ST_FROM' => $act['ST_FROM'] ?? '',
            'ST_TO' => $act['ST_TO'] ?? '',
            'REASON_NAME' => $act['REASON_NAME'] ?? '',
            'CARGO_REF' => $act['CARGO_REF'] ?? '',
            'START_AT' => $this->formatDate((string) ($act['START_AT'] ?? '')),
            'END_AT' => $this->formatDate((string) ($act['END_AT'] ?? '')),
            'CREATED_AT' => $this->formatDate((string) ($act['CREATED_AT'] ?? '')),
            'CIRCUMSTANCES' => $act['CIRCUMSTANCES'] ?? '',
        ];

        foreach ($values as $name => $value) {
            $doc->setValue($name, $this->cleanValue((string) $value));
        }
    }

    private function fillSignerLine(TemplateProcessor $doc, array $signers): void
    {
        $lines = [];
        foreach ($signers as $signer) {
            if (strtolower((string) ($signer['STYPE'] ?? '')) === 'rzd') {
                $lines[] = 'Участник:';
            }
            $lines[] = $this->signerLineText($signer);
        }

        $doc->setValue('SIGNER_LINE', $this->cleanValue(implode("\n", $lines)));
    }

    private function fillWagons(TemplateProcessor $doc, array $wagons): void
    {
        $rows = $wagons ?: [[]];
        $doc->cloneRow('WAGON_NO', count($rows));

        foreach ($rows as $idx => $wagon) {
            $num = $idx + 1;
            $values = [
                "WAGON_IDX#$num" => (string) $num,
                "WAGON_NO#$num" => $wagon['WAGON_NO'] ?? '',
                "WAGON_WAYBILL_NO#$num" => $wagon['WAYBILL_NO'] ?? '',
                "WAGON_KIND#$num" => $wagon['KIND'] ?? '',
                "WAGON_CARGO#$num" => $wagon['CARGO'] ?? '',
                "WAGON_ACT_START#$num" => $wagon['ACT_START_NUM'] ?? '',
                "WAGON_DUR_TOTAL_H#$num" => $wagon['DUR_TOTAL_H'] ?? '',
                "WAGON_WEIGHT#$num" => $wagon['WEIGHT'] ?? '',
                "WAGON_OWNER#$num" => $wagon['OWNER'] ?? '',
            ];

            foreach ($values as $name => $value) {
                $doc->setValue($name, $this->cleanValue((string) $value));
            }
        }
    }

    private function fillMainSigners(TemplateProcessor $doc, array $signers): void
    {
        if (!$signers) {
            return;
        }

        $rows = $signers;
        $doc->cloneRow('SIGNER_POST', count($rows));

        foreach ($rows as $idx => $signer) {
            $num = $idx + 1;
            $doc->setValue("SIGNER_POST#$num", $this->cleanValue($this->signerCellText((string) ($signer['POST'] ?? ''), $idx, count($rows))));
            $doc->setValue("SIGNER_FIO#$num", $this->cleanValue($this->signerCellText((string) ($signer['FIO'] ?? ''), $idx, count($rows))));
        }

        $doc->setValue('SIGNER_1_POST', $this->cleanValue((string) ($signers[0]['POST'] ?? '')));
        $doc->setValue('SIGNER_1_FIO', $this->cleanValue((string) ($signers[0]['FIO'] ?? '')));
        $doc->setValue('SIGNER_2_POST', $this->cleanValue((string) ($signers[1]['POST'] ?? '')));
        $doc->setValue('SIGNER_2_FIO', $this->cleanValue((string) ($signers[1]['FIO'] ?? '')));
        $doc->setValue('SIGNER_3_POST', $this->cleanValue((string) ($signers[2]['POST'] ?? '')));
        $doc->setValue('SIGNER_3_FIO', $this->cleanValue((string) ($signers[2]['FIO'] ?? '')));
    }

    private function fillRzdSigners(TemplateProcessor $doc, array $signers, bool $hasRzdBlock): void
    {
        if (!$hasRzdBlock || !$signers) {
            return;
        }

        $rows = $signers;
        $doc->cloneRow('SIGNER_RZD_POST', count($rows));

        foreach ($rows as $idx => $signer) {
            $num = $idx + 1;
            $doc->setValue("SIGNER_RZD_POST#$num", $this->cleanValue($this->signerCellText((string) ($signer['POST'] ?? ''), $idx, count($rows))));
            $doc->setValue("SIGNER_RZD_FIO#$num", $this->cleanValue($this->signerCellText((string) ($signer['FIO'] ?? ''), $idx, count($rows))));
        }

        $doc->setValue('SIGNER_RZD_POST', $this->cleanValue((string) ($signers[0]['POST'] ?? '')));
        $doc->setValue('SIGNER_RZD_FIO', $this->cleanValue((string) ($signers[0]['FIO'] ?? '')));
    }

    private function fixDocxXml(string $path, array $mainSigners, array $rzdSigners, array $pepApprovals): void
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('Не удалось открыть сформированный DOCX');
        }

        try {
            $xml = $zip->getFromName('word/document.xml');
            if ($xml === false) {
                return;
            }

            if (!$mainSigners) {
                $xml = $this->removeTablesByText($xml, ['${SIGNER_POST}', '${SIGNER_FIO}']);
            }
            if (!$rzdSigners) {
                $xml = $this->removeTablesByText($xml, ['${SIGNER_RZD_POST}', '${SIGNER_RZD_FIO}']);
            }

            $xml = $this->formatSignerLineLabels($xml);
            $xml = $pepApprovals
                ? $this->fillPepTableXml($xml, $pepApprovals)
                : $this->removeTablesByText($xml, ['${PEP_FULL_NAME}', '${PEP_APPROVED_ID}', '${PEP_DECIDED_AT}']);

            $zip->addFromString('word/document.xml', $xml);
        } finally {
            $zip->close();
        }
    }

    private function removeTablesByText(string $xml, array $needles): string
    {
        return preg_replace_callback(
            '#<w:tbl\b.*?</w:tbl>#s',
            static function (array $m) use ($needles): string {
                foreach ($needles as $needle) {
                    if (str_contains($m[0], $needle)) {
                        return '';
                    }
                }
                return $m[0];
            },
            $xml
        ) ?? $xml;
    }

    private function formatSignerLineLabels(string $xml): string
    {
        return preg_replace_callback(
            '#<w:r\b[^>]*>.*?</w:r>#s',
            function (array $m): string {
                $runXml = $m[0];
                if (
                    !str_contains($runXml, 'Должность:')
                    && !str_contains($runXml, 'Ф.И.О.:')
                    && !str_contains($runXml, 'Участник:')
                ) {
                    return $runXml;
                }

                $runPr = '';
                if (preg_match('#<w:rPr\b.*?</w:rPr>#s', $runXml, $pr)) {
                    $runPr = $pr[0];
                }

                $parts = [];
                preg_match_all('#<w:t(?:\s+xml:space="preserve")?>(.*?)</w:t>|<w:br\s*/>#s', $runXml, $items, PREG_SET_ORDER);
                foreach ($items as $item) {
                    if (str_starts_with($item[0], '<w:br')) {
                        $parts[] = '<w:r>' . $runPr . '<w:br/></w:r>';
                        continue;
                    }

                    $text = html_entity_decode($item[1], ENT_XML1, 'UTF-8');
                    foreach ($this->signerLineTextParts($text) as $part) {
                        if ($part['text'] === '') {
                            continue;
                        }
                        $parts[] = '<w:r>'
                            . $this->runProperties($runPr, $part['bold'])
                            . $this->textNode($part['text'])
                            . '</w:r>';
                    }
                }

                return $parts ? implode('', $parts) : $runXml;
            },
            $xml
        ) ?? $xml;
    }

    private function signerLineTextParts(string $text): array
    {
        $labels = ['Должность:', 'Ф.И.О.:', 'Участник:'];
        $pattern = '/(' . implode('|', array_map(static fn(string $label): string => preg_quote($label, '/'), $labels)) . ')/u';
        $parts = preg_split($pattern, $text, -1, PREG_SPLIT_DELIM_CAPTURE);
        if ($parts === false) {
            return [['text' => $text, 'bold' => false]];
        }

        $result = [];
        foreach ($parts as $part) {
            $result[] = [
                'text' => $part,
                'bold' => in_array($part, $labels, true),
            ];
        }
        return $result;
    }

    private function runProperties(string $runPr, bool $bold): string
    {
        if (!$bold) {
            return $runPr;
        }

        if ($runPr === '') {
            return '<w:rPr><w:b/><w:bCs/></w:rPr>';
        }

        $props = $runPr;
        if (!preg_match('#<w:b(?:\s|/|>)#', $props)) {
            $props = preg_replace('#</w:rPr>$#', '<w:b/>$0', $props) ?? $props;
        }
        if (!preg_match('#<w:bCs(?:\s|/|>)#', $props)) {
            $props = preg_replace('#</w:rPr>$#', '<w:bCs/>$0', $props) ?? $props;
        }
        return $props;
    }

    private function textNode(string $text): string
    {
        $text = $this->cleanValue($text);
        $space = preg_match('/^\s|\s$/u', $text) ? ' xml:space="preserve"' : '';
        return '<w:t' . $space . '>' . htmlspecialchars($text, ENT_XML1, 'UTF-8') . '</w:t>';
    }

    private function fillPepTableXml(string $xml, array $approvals): string
    {
        $done = false;
        return preg_replace_callback(
            '#<w:tbl\b.*?</w:tbl>#s',
            function (array $m) use ($approvals, &$done): string {
                if ($done || !str_contains($m[0], '${PEP_FULL_NAME}')) {
                    return $m[0];
                }

                $done = true;
                return $this->pepTableXml($m[0], $approvals);
            },
            $xml
        ) ?? $xml;
    }

    private function pepTableXml(string $tableXml, array $approvals): string
    {
        if (!preg_match_all('#<w:p\b[^>]*>.*?</w:p>#s', $tableXml, $paragraphs, PREG_OFFSET_CAPTURE)) {
            return $tableXml;
        }

        $first = null;
        $last = null;
        foreach ($paragraphs[0] as $idx => [$paragraphXml]) {
            if (
                str_contains($paragraphXml, '${PEP_FULL_NAME}')
                || str_contains($paragraphXml, '${PEP_APPROVED_ID}')
                || str_contains($paragraphXml, '${PEP_APPROVER_ID}')
                || str_contains($paragraphXml, '${PEP_DECIDED_AT}')
            ) {
                $first ??= $idx;
                $last = $idx;
            }
        }

        if ($first === null || $last === null) {
            return $tableXml;
        }

        $start = $paragraphs[0][$first][1];
        $endParagraph = $paragraphs[0][$last];
        $end = $endParagraph[1] + strlen($endParagraph[0]);
        $templateBlock = substr($tableXml, $start, $end - $start);
        $emptyLine = $this->emptyPepLine($templateBlock);

        $filled = '';
        foreach ($approvals as $idx => $approval) {
            if ($idx > 0) {
                $filled .= $emptyLine;
            }
            $block = $templateBlock;
            $values = [
                '${PEP_FULL_NAME}' => (string) ($approval['FULL_NAME'] ?? ''),
                '${PEP_APPROVED_ID}' => (string) ($approval['APPROVER_ID'] ?? ''),
                '${PEP_APPROVER_ID}' => (string) ($approval['APPROVER_ID'] ?? ''),
                '${PEP_DECIDED_AT}' => (string) ($approval['DECIDED_AT'] ?? ''),
            ];

            foreach ($values as $placeholder => $value) {
                $block = str_replace($placeholder, htmlspecialchars($this->cleanValue($value), ENT_XML1, 'UTF-8'), $block);
            }
            $filled .= $block;
        }

        return substr_replace($tableXml, $filled, $start, $end - $start);
    }

    private function emptyPepLine(string $xml): string
    {
        if (!preg_match_all('#<w:p\b[^>]*>.*?</w:p>#s', $xml, $paragraphs)) {
            return '<w:p/>';
        }

        $paragraph = end($paragraphs[0]);
        if (!is_string($paragraph)) {
            return '<w:p/>';
        }

        if (preg_match('#^(<w:p\b[^>]*>(?:<w:pPr\b.*?</w:pPr>)?).*(</w:p>)$#s', $paragraph, $parts)) {
            return $parts[1] . '<w:r><w:t></w:t></w:r>' . $parts[2];
        }

        return '<w:p/>';
    }

    private function getPrintSigners(array $act, array $signers): array
    {
        $actType = strtolower((string) ($act['ACT_TYPE'] ?? ''));
        $ownLimit = 10;
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

    private function getPaperSigners(array $signers): array
    {
        return array_values(array_filter($signers, function (array $signer): bool {
            return !$this->isPepSigner($signer);
        }));
    }

    private function getRzdSigners(array $signers): array
    {
        return array_values(array_filter($signers, static function (array $signer): bool {
            return strtolower((string) ($signer['STYPE'] ?? '')) === 'rzd';
        }));
    }

    private function getNonRzdSigners(array $signers): array
    {
        return array_values(array_filter($signers, static function (array $signer): bool {
            return strtolower((string) ($signer['STYPE'] ?? '')) !== 'rzd';
        }));
    }

    private function getPepApprovals(array $approvals, array $signers): array
    {
        $users = [];
        foreach ($signers as $signer) {
            if ($this->isPepSigner($signer)) {
                $users[(int) $signer['USER_ID']] = true;
            }
        }

        return array_values(array_filter($approvals, static function (array $approval) use ($users): bool {
            return isset($users[(int) ($approval['APPROVER_ID'] ?? 0)]);
        }));
    }

    private function isPepSigner(array $signer): bool
    {
        return strtolower((string) ($signer['STYPE'] ?? '')) === 'own'
            && (int) ($signer['USER_ID'] ?? 0) > 0;
    }

    private function canShowPepStamp(array $act, array $approvals): bool
    {
        $actType = strtolower((string) ($act['ACT_TYPE'] ?? ''));
        $status = strtolower((string) ($act['STATUS'] ?? ''));
        $allowedStatuses = $actType === 'start' ? ['signed', 'closed'] : ['closed'];

        if (!in_array($status, $allowedStatuses, true) || !$approvals) {
            return false;
        }

        foreach ($approvals as $approval) {
            if (strtolower((string) ($approval['STATUS'] ?? '')) !== 'approved') {
                return false;
            }
        }

        return true;
    }

    private function signerLineText(array $signer): string
    {
        $post = trim((string) ($signer['POST'] ?? ''));
        $fio = trim((string) ($signer['FIO'] ?? ''));

        if ($post !== '' && $fio !== '') {
            return 'Должность: ' . $post . '    Ф.И.О.: ' . $fio;
        }

        return $post !== '' ? 'Должность: ' . $post : 'Ф.И.О.: ' . $fio;
    }

    private function signerCellText(string $text, int $idx, int $count): string
    {
        return $idx + 1 < $count ? $text . "\n" : $text;
    }

    private function formatDate(string $date): string
    {
        if (preg_match('/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/', $date, $m)) {
            $sec = $m[6] ?? '00';
            return "$m[3].$m[2].$m[1] $m[4]:$m[5]:$sec";
        }

        return $date;
    }

    private function cleanValue(string $value): string
    {
        $value = str_replace(["\r\n", "\r"], "\n", $value);

        $clean = @preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $value);
        if ($clean !== null) {
            return $clean;
        }

        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $value) ?? $value;
    }

    private function checkDocxXml(string $docxPath): void
    {
        $zip = new ZipArchive();
        if ($zip->open($docxPath) !== true) {
            throw new RuntimeException('Не удалось проверить сформированный DOCX');
        }

        try {
            $xml = $zip->getFromName('word/document.xml');
        } finally {
            $zip->close();
        }

        if ($xml === false) {
            throw new RuntimeException('В DOCX не найден word/document.xml');
        }

        if (!class_exists('DOMDocument')) {
            return;
        }

        $old = libxml_use_internal_errors(true);
        libxml_clear_errors();
        $dom = new DOMDocument();
        $ok = $dom->loadXML($xml);
        $errors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($old);

        if ($ok) {
            return;
        }

        $error = $errors[0] ?? null;
        $message = $error
            ? trim($error->message) . ' строка ' . $error->line . ', колонка ' . $error->column
            : 'неизвестная ошибка XML';

        if (class_exists('Gu23Logger')) {
            Gu23Logger::error('docx_xml_error', ['msg' => $message]);
        }

        throw new RuntimeException('DOCX сформирован с ошибкой XML: ' . $message);
    }

    private function templateHas(string $templatePath, string $name): bool
    {
        $zip = new ZipArchive();
        if ($zip->open($templatePath) !== true) {
            return false;
        }

        $xml = (string) $zip->getFromName('word/document.xml');
        $zip->close();

        return str_contains($xml, $name);
    }

    private function savePdfFile(string $docxPath): string
    {
        $soffice = $this->findSoffice();
        if ($soffice === '') {
            throw new RuntimeException('LibreOffice не найден для формирования PDF');
        }

        $outDir = sys_get_temp_dir();
        $homeDir = $this->createTempDir('gu23_lo_home_');
        $profileDir = $this->createTempDir('gu23_lo_profile_');
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
                throw new RuntimeException('Не удалось сформировать PDF');
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

    private function createTempDir(string $prefix): string
    {
        $path = tempnam(sys_get_temp_dir(), $prefix);
        if ($path === false) {
            throw new RuntimeException('Не удалось создать временную папку');
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

    private function sendFile(string $path, array $act, string $format): void
    {
        $raw = $act['ACT_NUMBER'] ?? ($act['ID'] ?? 'act');
        $safeName = preg_replace('/[^\w\-]/u', '_', (string) $raw);
        $filename = 'act_gu23_' . $safeName . '.' . $format;
        $fallbackName = preg_replace('/[^A-Za-z0-9._-]+/', '_', $filename) ?: 'act_gu23.' . $format;
        $contentType = $format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        header('Content-Type: ' . $contentType);
        $disposition = $format === 'pdf' ? 'inline' : 'attachment';
        header(
            'Content-Disposition: ' . $disposition . '; filename="' . $fallbackName . '"'
            . "; filename*=UTF-8''" . rawurlencode($filename)
        );
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, no-cache');
        readfile($path);
    }
}
