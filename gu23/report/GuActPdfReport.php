<?php

class GuActPdfReport
{
    const TEMPLATES = [
        'start' => 'start.php',
        'end' => 'end.php',
        'other' => 'other.php',
    ];

    private string $templateDir;

    public function __construct()
    {
        $this->templateDir = __DIR__ . '/pdf_template/';
    }

    public function download(array $act, array $wagons, array $signers): void
    {
        $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
        if (!is_file($autoload)) {
            throw new RuntimeException('mPDF не найден: отсутствует vendor/autoload.php');
        }
        require_once $autoload;

        if (!class_exists(\Mpdf\Mpdf::class)) {
            throw new RuntimeException('mPDF не найден в vendor');
        }

        $html = $this->prepareHtml($act, $wagons, $this->printSigners($act, $signers));
        $tmpDir = $this->tempDir();

        $mpdf = new \Mpdf\Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'tempDir' => $tmpDir,
            'default_font' => 'dejavusans',
            'margin_left' => 8,
            'margin_right' => 8,
            'margin_top' => 10,
            'margin_bottom' => 10,
        ]);

        $mpdf->WriteHTML($html);
        $mpdf->Output($this->fileName($act), \Mpdf\Output\Destination::DOWNLOAD);
    }

    private function prepareHtml(array $act, array $wagons, array $signers): string
    {
        $actType = strtolower((string) ($act['ACT_TYPE'] ?? 'other'));
        $template = self::TEMPLATES[$actType] ?? self::TEMPLATES['other'];
        $templatePath = $this->templateDir . $template;

        if (!is_file($templatePath)) {
            throw new RuntimeException('PDF-шаблон не найден: ' . $templatePath);
        }

        $h = static fn($value): string => htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $date = fn($value): string => $this->formatDate((string) ($value ?? ''));

        ob_start();
        include $templatePath;
        return (string) ob_get_clean();
    }

    private function printSigners(array $act, array $signers): array
    {
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
            $actType = strtolower((string) ($act['ACT_TYPE'] ?? ''));
            return array_slice($signers, 0, $actType === 'other' ? 2 : 3);
        }

        return array_merge($own, $rzd);
    }

    private function formatDate(string $value): string
    {
        if (preg_match('/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/', $value, $m)) {
            return $m[3] . '.' . $m[2] . '.' . $m[1] . ' ' . $m[4] . ':' . $m[5];
        }
        return $value;
    }

    private function fileName(array $act): string
    {
        $raw = $act['ACT_NUMBER'] ?? ($act['ID'] ?? 'act');
        $safeName = preg_replace('/[^\w\-]/u', '_', (string) $raw);
        return 'act_gu23_' . ($safeName ?: 'act') . '.pdf';
    }

    private function tempDir(): string
    {
        $path = sys_get_temp_dir() . '/gu23_mpdf';
        if (!is_dir($path)) {
            mkdir($path, 0777, true);
        }
        return $path;
    }
}
