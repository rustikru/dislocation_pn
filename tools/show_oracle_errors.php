<?php
declare(strict_types=1);

require __DIR__ . '/../db_config.local.php';

$conn = oci_connect($user, $pwd, $db, 'AL32UTF8');
if (!$conn) {
    $error = oci_error();
    fwrite(STDERR, "Connection failed: " . ($error['message'] ?? 'unknown error') . "\n");
    exit(1);
}

$objectName = strtoupper($argv[1] ?? '');

$sql = <<<'SQL'
select name, type, line, position, text
from user_errors
where (:object_name is null and name in ('TRG_XX_DISL_MANUAL_UPD_WAGON', 'TRG_XX_DISLOCATION_RJD_ESR'))
   or (:object_name is not null and name = :object_name)
order by name, sequence
SQL;

$stmt = oci_parse($conn, $sql);
oci_bind_by_name($stmt, ':object_name', $objectName);
oci_execute($stmt);

while (($row = oci_fetch_assoc($stmt)) !== false) {
    printf(
        "%s %s line %s:%s %s\n",
        $row['NAME'],
        $row['TYPE'],
        $row['LINE'],
        $row['POSITION'],
        trim($row['TEXT'])
    );
}
