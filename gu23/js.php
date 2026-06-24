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

$combined_js = '';

foreach ($files as $file) {
    if (!file_exists($file)) continue;
    
    $lines = file($file, FILE_IGNORE_NEW_LINES);
    $inImport = false;
    
    foreach ($lines as $line) {
        $trimmed = ltrim($line);
        
        // Пропускаем многострочные импорты
        if ($inImport) {
            if (strpos($line, '} from') !== false || strpos($line, "} from") !== false) {
                $inImport = false;
            }
            continue;
        }
        
        // Пропускаем однострочные импорты
        if (strpos($trimmed, 'import ') === 0 || strpos($trimmed, 'import{') === 0) {
            if (strpos($line, '} from') === false) {
                $inImport = true;
            }
            continue;
        }
        
        // Удаляем ключевые слова export, превращая их в глобальные объявления
        $line = preg_replace('/\bexport\s+(function|const|let|var|class)\b/', '$1', $line);
        $combined_js .= $line . "\n";
    }
    $combined_js .= "\n";
}

/**
 * БОЕВОЙ ТРАНСПИЛЯТОР ES6 -> ES5 НА РЕГУЛЯРНЫХ ВЫРАЖЕНИЯХ
 * Позволяет запустить код со стрелочными функциями и let/const на Firefox 45
 */

// 1. Заменяем let и const на старый добрый var
$combined_js = preg_replace('/\b(let|const)\s+/', 'var ', $combined_js);

// 2. Трансформируем простейшие стрелочные функции без аргументов: () => { ... }  ->  function() { ... }
$combined_js = preg_replace(: '/\(\)\s*=>\s*\{/', 'function() {', $combined_js);

// 3. Трансформируем стрелочные функции с одним аргументом: (e) => { ... }  ->  function(e) { ... }
$combined_js = preg_replace(: '/\((\s*[a-zA-Z0-9_\$]+\s*)\)\s*=>\s*\{/', 'function($1) {', $combined_js);

// 4. Трансформируем стрелочные функции с двумя аргументами: (val, idx) => { ... } -> function(val, idx) { ... }
$combined_js = preg_replace(: '/\((\s*[a-zA-Z0-9_\$]+\s*,\s*[a-zA-Z0-9_\$]+\s*)\)\s*=>\s*\{/', 'function($1) {', $combined_js);

// 5. Исправляем inline-стрелки в методах обработки массивов (например, в .map или .forEach)
// Превращает: (d) => d.CODE  в  function(d) { return d.CODE; }
$combined_js = preg_replace(: '/\((\s*[a-zA-Z0-9_\$]+\s*)\)\s*=>\s*([^\{;\n]+)/', 'function($1) { return $2; }', $combined_js);

echo $combined_js;