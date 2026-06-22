<?php
    // Локальный (dev) конфиг имеет приоритет, если присутствует.
    // db_config.local.php в .gitignore и на прод не попадает.
    if (file_exists(__DIR__ . '/db_config.local.php')) {
        require_once __DIR__ . '/db_config.local.php';
    } else {
        require_once __DIR__ . '/db_config.php';
    }
	
	$conn1 = oci_connect($user,$pwd,$db,"AL32UTF8");
	if (!$conn1) {
		$e = oci_error();
		$error = "Не удалось установить сетевое соединение с базой данных.";
		header("location: /error_page.php?msg=".$error);
	}

