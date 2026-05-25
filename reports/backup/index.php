<?php
session_start(); //Запускаем сессии
include('../login.php');
include('../connection.php');
$auth = new AuthClass();
$rights;

if (isset($_POST["logout"])) {
    $auth->out();
}

if (!$auth->isAuth()){
    //header("location: enter.php");
	 
    exit();
}else{
	$rights = $auth->getRights();
?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
		<link type="image/x-icon" href="../img/ico/ico-road.ico" rel="shortcut icon">
		<link type="Image/x-icon" href="../img/ico/ico-road.ico" rel="icon">
        <title>Внутренняя дислокация(отчёты)</title>
        <link rel="stylesheet" href="../css/site_layout.css" type="text/css">
        <link rel="stylesheet" href="../css/context_menu.css" type="text/css">
        <link rel="stylesheet" href="reports.css" type="text/css">
        <link type="text/css" href="../jquery/jquery-ui.min.css" rel="Stylesheet" />
        <link rel="stylesheet" href="../css/tree.css" type="text/css">
        <script src="../jquery/jquery-1.11.3.min.js" type="text/javascript"></script>
        <script src="../jquery/jquery-ui.min.js" type="text/javascript"></script>
        <script src="../js/general_function.js" type="text/javascript"></script>
        <script src="reports.js" type="text/javascript"></script>
    </head>
    <body>
        <div class="wrapper">
            <header>
                <header>
					<?php include('../modules/site/main-top.php'); ?>
				</header>
            </header>
            <div id="tabs" class="tabs">
                <ul>
                    <li><a href="#tabs-1">Вагоны</a></li>
                    <li><a href="#tabs-2">Вагоны на увод/постановку</a></li>
					<li><a href="#tabs-3">Вагоны ПВПП</a></li>
                    <!--<li><a href="#tabs-3">Пути</a></li>-->
                </ul>
                <div id="tabs-1">
                    <input class="refresh_report_btn" type="button" size="30" value="Обновить отчет" onclick="build_report_1_ajax()">
                    <table class="report_table report_1_table">
                        <thead>
                            <tr>
                                <th>№ вагона</th>
                                <th>Станция</th>
                                <th>Расположение</th>
                                <th>Путь</th>
                                <th>Статус</th>
                                <th>Сост.</th>
                                <th>Наим. груза</th>
                                <th>Пред.</th>
                                <th>Дата прибытия (Угл)</th>
                                <th>Дата убытия (Угл)</th>
                            </tr>
                        </thead>
                    </table>
                </div>
                <div id="tabs-2">
                    <input class="refresh_report_btn" type="button" size="30" value="Обновить отчет" onclick="build_report_2_ajax()">
                    <table class="report_table report_2_table">
                        <thead>
                            <tr>
                                <th>Ошибка</th>
                                <th>№ вагона</th>
                                <th>Станция</th>
                                <th>Расположение</th>
                                <th>Путь</th>
                                <th>Статус</th>
                                <th>Сост.</th>
                                <th>Наим. груза</th>
                                <th>Дата увода/ постановки</th>
                                <th>Время простоя</th>
                            </tr>
                        </thead>
                    </table>
                </div>
				<div id="tabs-3">
                    <input class="refresh_report_btn" type="button" size="30" value="Обновить отчет" onclick="build_report_3_ajax()">
                    <table class="report_table report_3_table">
                        <thead>
                            <tr>
                                <th>№ вагона</th>
                                <th>Станция</th>
                                <th>Расположение</th>
                                <th>Путь</th>
                                <th>Статус</th>
                                <th>Сост.</th>
                                <th>Наим. груза</th>
                                <th>Пред.</th>
                                <th>Дата прибытия (Угл)</th>
                                <th>Дата убытия (Угл)</th>
                            </tr>
                        </thead>
                    </table>
                </div>
                <!--<div id="tabs-3">

                </div>-->
            </div>
            <script type="text/javascript">
                $('#tabs').tabs();
            </script>
            <div class="loadImg">
                <img src="../img/ajax-loader.gif" />
            </div>
        </div>
        <footer></footer>
    </body>
</html>
<?php
}
?>