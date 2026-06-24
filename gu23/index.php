<?php
session_start();
include('../login.php');
include('../connection.php');
$auth = new AuthClass();

if (isset($_POST["logout"])) {
    $auth->out();
}

if ($auth->isAuth()) {
    // доступ: администратор или право на модуль ГУ-23 
    $allowed = $auth->isAuthAdmin()
        || (isset($_SESSION['gu23_add']) && $_SESSION['gu23_add'] === 'Y')
        || (isset($_SESSION['gu23_view']) && $_SESSION['gu23_view'] === 'Y');
    if ($allowed) {
        ?>
        <!DOCTYPE html>
        <html lang="ru">

        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>ГУ-23 · Акты общей формы</title>
            <link rel="stylesheet" href="../css/site_layout.css" type="text/css">
            <link rel="stylesheet" href="../css/context_menu.css" type="text/css">
            <link rel="stylesheet" href="gu23.css" type="text/css">
            <!-- jQuery 3.7.1 (+migrate)  -->
            <script src="../jquery/jquery-3.7.1.js" type="text/javascript"></script>
            <script src="../jquery/jquery-migrate-3.4.1.js" type="text/javascript"></script>

            <script src="../js/general_function.js" type="text/javascript"></script>
            <!-- <script src="gu23.js?ver=1" type="text/javascript"></script> -->
            <script type="module" src="app.js"></script>
            <script src="js.php?v=3" type="text/javascript"></script>
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
        header("location: /index.php");
        exit();
    }
} else {
    header("location: /index.php");
    exit();
}
