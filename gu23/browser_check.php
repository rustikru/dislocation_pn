<?php
/**
 * browser_check.php — серверная проверка браузера для модуля ГУ-23.
 *
 * Пропускаются только поддерживаемые браузеры (по минимальной версии):
 *   Chrome >= 80, Edge >= 80, Yandex >= 20, Firefox >= 60, Safari >= 12.
 * Старые браузеры (FF45, IE и пр.) получают страницу-заглушку.
 *
 */

/**
 * Определить браузер и версию из User-Agent.
 * @return array{name:string, version:int}  name='unknown' если не распознан
 */
function gu23_detect_browser(string $ua): array
{
    // Порядок важен: UA-строки браузеров пересекаются (Edge/Yandex содержат "Chrome").
    $checks = [
        // Internet Explorer — блокируем всегда
        ['ie', '/(?:MSIE\s|Trident\/)/i', null],
        ['edge', '/Edg(?:e|A|iOS)?\/(\d+)/i', 1],   // новый Edge (Chromium)
        ['yandex', '/YaBrowser\/(\d+)/i', 1],
        ['opera', '/(?:OPR|Opera)\/(\d+)/i', 1],
        ['firefox', '/Firefox\/(\d+)/i', 1],
        ['chrome', '/Chrome\/(\d+)/i', 1],
        ['safari', '/Version\/(\d+).*Safari/i', 1],
    ];

    foreach ($checks as [$name, $re, $grp]) {
        if (preg_match($re, $ua, $m)) {
            return ['name' => $name, 'version' => $grp !== null ? (int) ($m[$grp] ?? 0) : 0];
        }
    }
    return ['name' => 'unknown', 'version' => 0];
}

/**
 * Поддерживается ли браузер.
 */
function gu23_browser_supported(array $b): bool
{
    $minVersions = [
        'chrome' => 80,
        'edge' => 80,
        'yandex' => 20,
        'firefox' => 60,
        'safari' => 12,
        'safari' => 67,
        // 'opera' можно добавить при необходимости: 'opera' => 67,
    ];
    if (!isset($minVersions[$b['name']])) {
        return false; // ie, opera, unknown — не поддерживаются
    }
    return $b['version'] >= $minVersions[$b['name']];
}

// --- DEV: при локальной разработке проверку пропускаем ---
if (file_exists(dirname(__DIR__) . '/db_config.local.php')) {
    return;
}

$gu23_ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$gu23_browser = gu23_detect_browser($gu23_ua);

if (!gu23_browser_supported($gu23_browser)) {
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    ?>
    <!DOCTYPE html>
    <html lang="ru">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Браузер не поддерживается — ГУ-23</title>
        <style>
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background: #f8f9fa;
                color: #202124;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
            }

            .box {
                background: #fff;
                max-width: 520px;
                width: 100%;
                padding: 36px 32px;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
                text-align: center;
            }

            h1 {
                font-size: 22px;
                margin: 0 0 14px;
            }

            p {
                font-size: 15px;
                line-height: 1.6;
                color: #3c4043;
                margin: 0 0 18px;
            }

            .browsers {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
                margin-top: 8px;
            }

            .browsers span {
                background: #e8f0fe;
                color: #1a73e8;
                padding: 7px 14px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
            }
        </style>
    </head>

    <body>
        <div class="box">
            <h1>Браузер не поддерживается</h1>
            <p>
                Модуль ГУ-23 не работает в вашем браузере.<br>
                Откройте систему в одном из поддерживаемых браузеров:
            </p>
            <div class="browsers">
                <span>Google Chrome</span>
                <span>Microsoft Edge</span>
                <span>Яндекс.Браузер</span>
                <span>Mozilla Firefox >60</span>
                <span>Opera</span>
            </div>
        </div>
    </body>

    </html>
    <?php
    exit;
}
