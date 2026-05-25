<?php
echo "Server IP: " . $_SERVER['SERVER_ADDR'] . "<br>";
echo "Software: " . $_SERVER['SERVER_SOFTWARE'] . "<br>";
echo "Loaded ini: " . php_ini_loaded_file() . "<br>";
echo "Timezone: " . date_default_timezone_get();