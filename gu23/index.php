<?php
session_start();
// Блокируем устаревшие браузеры (старый Firefox и пр.)
require_once __DIR__ . '/debug/browser_check.php';

include('../login.php');
include('../connection.php');
$auth = new AuthClass();

if (isset($_POST["logout"])) {
    $auth->out();
    // При выходе очищаем redirect_after_auth
    unset($_SESSION['redirect_after_auth']);
    header("location: /index.php");
    exit();
}

// Сохраняем текущий URL для редиректа 
if (!$auth->isAuth()) {
    if (
        strpos($_SERVER['REQUEST_URI'], '/select_station.php') === false &&
        strpos($_SERVER['REQUEST_URI'], '/gu23/') === false
    ) {
        $_SESSION['redirect_after_auth'] = $_SERVER['REQUEST_URI'];
    }
}
require_once __DIR__ . '/classes/GuActRepository.php';

if ($auth->isAuth()) {
    if (GuActRepository::canAccess($conn1, $auth)) {
        ?>
        <!DOCTYPE html>
        <html lang="ru">

        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>ГУ-23 - Акты общей формы</title>
            <link rel="stylesheet" href="../css/site_layout.css" type="text/css">
            <link rel="stylesheet" href="../css/context_menu.css" type="text/css">
            <link rel="stylesheet" href="gu23.css" type="text/css">
            <!-- jQuery 3.7.1 (+migrate)  -->
            <script src="../jquery/jquery-3.7.1.js" type="text/javascript"></script>
            <script src="../js/general_function.js" type="text/javascript"></script>
            <script type="module" src="js/app.js"></script>
            <script>
                window.GU23_SESSION = {
                    login: <?= json_encode($_SESSION['login'] ?? '') ?>,
                    full_name: <?= json_encode($_SESSION['full_name'] ?? '') ?>,
                    user_id: <?= json_encode((int) ($_SESSION['user_id'] ?? 0)) ?>,
                    is_admin: <?= json_encode(!empty($_SESSION['is_auth_admin'])) ?>
                };
            </script>
        </head>

        <body>
            <header>
                <?php
                //include('../modules/site/main-top.php');
                ?>
            </header>
            <div class="app">
                <nav class="side" id="nav"></nav>
                <main class="main">
                    <div class="view" id="view"></div>
                </main>
            </div>

            <div id="modalRoot"></div>
            <div id="printroot"></div>
            <div class="loadImg" style="display:none"><img src="../img/ajax-loader.gif" /></div>
        </body>

        </html>
        <?php
    } else {
        // Нет доступа к модулю 
        ?>
        <!DOCTYPE html>
        <html lang="ru">

        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Нет доступа ГУ-23</title>
            <link rel="stylesheet" href="gu23.css" type="text/css">
        </head>

        <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg,#f3f3f1)">
            <div class="card cardpad" style="max-width:420px;width:100%;text-align:center;padding:40px 32px">
                <div style="font-size:40px;margin-bottom:16px"></div>
                <h2 style="margin:0 0 10px;font-size:20px">Нет доступа</h2>
                <p style="color:var(--muted,#9b9da2);font-size:14px;margin:0 0 24px">
                    У пользователя <b><?= htmlspecialchars($_SESSION['login'] ?? '') ?></b>
                    нет роли в модуле ГУ-23.<br>
                    Обратитесь к администратору.
                </p>
                <!-- <a href="/index.php" style="color:var(--info,#566b86);font-size:13px">← На главную</a> -->
            </div>
        </body>

        </html>
        <?php
        exit();
    }
} else {

    $_SESSION['redirect_after_auth'] = '/gu23/index.php';
    header("location: /index.php");
    exit();
}
