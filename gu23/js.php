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
    $base . '/js/notices.js',
    $base . '/js/app.js',
];
// Concatenate the contents of the JavaScript files, removing 'export' keywords and skipping 'import' statements
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
        // Skip lines that start with 'import' or 'import{' and are not part of a multi-line import statement
        if (strpos($trimmed, 'import ') === 0 || strpos($trimmed, 'import{') === 0) {
            if (strpos($line, '} from') === false) {
                $inImport = true;
            }
            continue;
        }
        // Remove export keywords from function, const, let, var, and class declarations
        $line = preg_replace('/\bexport\s+(function|const|let|var|class)\b/', '$1', $line);
        echo $line . "\n";
    }
    echo "\n";
}
