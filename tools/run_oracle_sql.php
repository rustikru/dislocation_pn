<?php
declare(strict_types=1);

if ($argc < 2) {
    fwrite(STDERR, "Usage: php tools/run_oracle_sql.php /path/to/file.sql\n");
    exit(2);
}

$sqlFile = $argv[1];
if (!is_file($sqlFile) || !is_readable($sqlFile)) {
    fwrite(STDERR, "SQL file is not readable: {$sqlFile}\n");
    exit(2);
}

$configFile = __DIR__ . '/../db_config.local.php';
if (!is_file($configFile)) {
    $configFile = __DIR__ . '/../db_config.php';
}
require $configFile;

$conn = oci_connect($user, $pwd, $db, 'AL32UTF8');
if (!$conn) {
    $error = oci_error();
    fwrite(STDERR, "Connection failed: " . ($error['message'] ?? 'unknown error') . "\n");
    exit(1);
}

$content = file_get_contents($sqlFile);
if ($content === false) {
    fwrite(STDERR, "Cannot read SQL file: {$sqlFile}\n");
    exit(2);
}
$content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
$content = str_replace(["\r\n", "\r"], "\n", $content);

$statements = [];
$buffer = [];
$inPlsql = false;

foreach (explode("\n", $content) as $line) {
    $trimmed = trim($line);

    if ($buffer === [] && $trimmed === '') {
        continue;
    }

    if (
        $buffer === []
        && preg_match('/^(CREATE\s+(OR\s+REPLACE\s+)?(TRIGGER|PACKAGE|PROCEDURE|FUNCTION|TYPE)\b|DECLARE\b|BEGIN\b)/i', $trimmed)
    ) {
        $inPlsql = true;
    }

    if ($inPlsql && $trimmed === '/') {
        $statement = trim(implode("\n", $buffer));
        if ($statement !== '') {
            $statements[] = $statement;
        }
        $buffer = [];
        $inPlsql = false;
        continue;
    }

    $buffer[] = $line;

    if (!$inPlsql && endsWithSqlTerminator($line)) {
        $statement = trim(implode("\n", $buffer));
        $statement = stripSqlTerminator($statement);
        if ($statement !== '') {
            $statements[] = $statement;
        }
        $buffer = [];
    }
}

$tail = trim(implode("\n", $buffer));
if ($tail !== '') {
    $statements[] = stripSqlTerminator($tail);
}

$ok = 0;
$errors = [];
$total = count($statements);

foreach ($statements as $index => $statement) {
    $cursor = oci_parse($conn, $statement);
    if (!$cursor) {
        $errors[] = [
            'index' => $index + 1,
            'sql' => firstLine($statement),
            'error' => oci_error($conn)['message'] ?? 'parse failed',
        ];
        continue;
    }

    $result = @oci_execute($cursor);
    if ($result) {
        $ok++;
        continue;
    }

    $error = oci_error($cursor);
    $errors[] = [
        'index' => $index + 1,
        'sql' => firstLine($statement),
        'error' => $error['message'] ?? 'execute failed',
    ];
}

oci_close($conn);

printf("Statements: %d\nSucceeded: %d\nFailed: %d\n", $total, $ok, count($errors));

foreach ($errors as $error) {
    printf(
        "\n[%d] %s\n%s\n",
        $error['index'],
        $error['sql'],
        trim($error['error'])
    );
}

exit(count($errors) === 0 ? 0 : 1);

function firstLine(string $statement): string
{
    foreach (explode("\n", $statement) as $line) {
        $line = trim($line);
        if ($line !== '' && !str_starts_with($line, '--')) {
            return mb_substr($line, 0, 180);
        }
    }

    return mb_substr(trim($statement), 0, 180);
}

function endsWithSqlTerminator(string $line): bool
{
    $line = rtrim($line);
    if ($line === '' || substr($line, -1) !== ';') {
        return false;
    }

    $inQuote = false;
    $length = strlen($line);
    for ($i = 0; $i < $length; $i++) {
        if ($line[$i] !== "'") {
            continue;
        }

        if ($inQuote && $i + 1 < $length && $line[$i + 1] === "'") {
            $i++;
            continue;
        }

        $inQuote = !$inQuote;
    }

    return !$inQuote;
}

function stripSqlTerminator(string $statement): string
{
    $statement = rtrim($statement);

    return substr($statement, -1) === ';'
        ? rtrim(substr($statement, 0, -1))
        : $statement;
}
