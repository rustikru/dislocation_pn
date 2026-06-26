<?php
header('Content-Type: application/javascript; charset=utf-8');

$base = __DIR__;
$files = [
    $base . '/state.js',
    $base . '/utils.js',
    $base . '/components/ui.js',
    $base . '/api.js',
    $base . '/components/nav.js',
    $base . '/components/registry.js',
    $base . '/components/wagonSearch.js',
    $base . '/components/form.js',
    $base . '/components/card.js',
    $base . '/components/refs.js',
    $base . '/components/roles.js',
    $base . '/app.js',
];

foreach ($files as $file) {
    $lines = file($file, FILE_IGNORE_NEW_LINES);
    $output = [];
    $inImport = false;
    foreach ($lines as $line) {
        $trimmed = ltrim($line);
        if ($inImport) {
            if (strpos($line, '} from') !== false) {
                $inImport = false;
            }
            continue;
        }
        if (strpos($trimmed, 'import ') === 0 || strpos($trimmed, 'import{') === 0) {
            if (strpos($line, '} from') === false) {
                $inImport = true;
            }
            continue;
        }
        $line = preg_replace('/\bexport\s+(function|const|let|var|class)\b/', '$1', $line);
        $output[] = $line;
    }
    // Оборачиваем в IIFE — изолируем const/let от других файлов
    echo ";(function(){\n";
    echo implode("\n", $output);
    echo "\n})();\n\n";
}