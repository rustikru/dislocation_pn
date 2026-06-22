<?php
session_start();
include('../login.php');
include('../connection.php');
$auth = new AuthClass();

if (isset($_POST["logout"])) {
    $auth->out();
}

if ($auth->isAuth()) {
    // доступ: администратор или право на модуль ГУ-23 (читаем из сессии,
    // без обращения к пакету — чтобы работать и в локальном dev-режиме)
    $allowed = $auth->isAuthAdmin()
        || (isset($_SESSION['gu23_add'])  && $_SESSION['gu23_add']  === 'Y')
        || (isset($_SESSION['gu23_view']) && $_SESSION['gu23_view'] === 'Y');
    if ($allowed) {
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ГУ-23 · Акты общей формы</title>
    <link rel="stylesheet" href="gu23.css" type="text/css">

    <!-- jQuery 3.7.1 (+migrate) — подключается только на этой странице -->
    <script src="../jquery/jquery-3.7.1.js" type="text/javascript"></script>
    <script src="../jquery/jquery-migrate-3.4.1.js" type="text/javascript"></script>
    <script src="gu23.js?ver=1" type="text/javascript"></script>
</head>
<body>
    <div class="app">
        <div class="topbar">
            <div class="brand">
                <div class="mark">23</div>
                <div>ГУ-23 · Акты общей формы<small>Учёт простоя вагонов</small></div>
            </div>
            <div class="spacer"></div>
            <div class="station-chip"><i></i> Станция операции: Углеуральская</div>
            <div class="rolebox">
                <span class="u" id="userline"><?php echo htmlspecialchars($auth->getFullName() ?? ''); ?></span>
            </div>
        </div>

        <nav class="side" id="nav"></nav>

        <main class="main"><div class="view" id="view"></div></main>
    </div>

    <div id="modalRoot"></div>
    <div id="printroot"></div>
    <div class="loadImg" style="display:none"><img src="../img/ajax-loader.gif" /></div>
</body>
</html>
<?php
    } else {
        header("location: /index.php");
        exit();
    }
} else {
    header("location: /index.php");
    exit();
}
