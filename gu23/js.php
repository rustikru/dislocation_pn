<?php
header('Content-Type: application/javascript; charset=utf-8');

$base = __DIR__;
$files = [
    $base . '/js/state.js',
    $base . '/js/utils.js',
    $base . '/js/ui.js',
    $base . '/js/api.js',
    $base . '/js/nav.js',
    $base . '/js/registry.js',
    $base . '/js/wagonSearch.js',
    $base . '/js/form.js',
    $base . '/js/card.js',
    $base . '/js/refs.js',
    $base . '/js/roles.js',
    $base . '/js/app.js',
];

foreach ($files as $file) {
    $lines = file($file, FILE_IGNORE_NEW_LINES);
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
        echo $line . "\n";
    }
    echo "\n";
}