<?php
header('Content-Type: application/javascript; charset=utf-8');

$base = __DIR__;
$files = [
    $base . '/state.js',
    $base . '/utils.js',
    $base . '/components/ui.js',
    $base . '/api.js',
    $base . '/components/nav.js',
    $base . '/components/archive.js',
    $base . '/components/wagonSearch.js',
    $base . '/components/form.js',
    $base . '/components/card.js',
    $base . '/app.js',
];

foreach ($files as $file) {
    $code = file_get_contents($file);
    // Убираем import-строки (однострочные и многострочные)
    $code = preg_replace('/^import\s*\{[\s\S]*?\}\s*from\s*[\'"][^\'"]+[\'"]\s*;?[ \t]*\n?/m', '', $code);
    // Убираем ключевое слово export перед объявлениями
    $code = preg_replace('/\bexport\s+(function|const|let|var|class)\b/', '$1', $code);
    echo $code . "\n";
}
