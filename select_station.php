<?php
    session_start(); //Запускаем сессии
    include_once('login.php');
    include_once('connection.php');
    $auth = new AuthClass();
  
    if ($auth->isAuth()){
        if (isset($_POST["submit"])) {
            $auth->setStation(filter_input(INPUT_POST,'station_id'), filter_input(INPUT_POST,'station'));
        }
        if ($auth->getStationId() !== null){
            header("location: /main.php");
            exit();
        } else {
            $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
            if (!$conn) {
                    $e = oci_error();
                    trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
            }
			$authLogin = $auth->getLogin();
            $arrChild = array();
            $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.getUserStations(:bind1))');
            OCIBindByName($oci_child, ":bind1", $authLogin);
            oci_execute($oci_child);
            while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
                    array_push($arrChild, $tmp);
            }

            oci_close($conn);
?>
        <!DOCTYPE html>
        <html>
        <head>
            <title></title>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="css/login.css" media="screen" type="text/css" />
            <script src="jquery/jquery-1.11.3.min.js" type="text/javascript"></script>
        </head>

        <body>
            <div id="login-form">
                <h1>Выбор станции</h1>
                <fieldset>
                    <form action="" method="post" name="loginForm">
                        <input disabled type="text" name="login" required value="<?php echo $auth->getLogin();?>">
                        <select id="station_id" name="station_id" onchange="$('#station').val($('#station_id option:selected').text())">
                        <?php 
                            foreach ($arrChild as $value) {
                                $selected = '';
                                if ($value['DEF']==='Y'){
                                    $selected = 'selected';
                                    $selectedText = $value['NAME']; 
                                }
                                echo '<option '.$selected.' value="'.$value['ID'].'">'.$value['NAME'].'</option>';
                            }
                        ?>
                        </select>
                        <input type="hidden" id="station" name="station" value="<?php echo $selectedText;?>">
                        <input autofocus type="submit" name="submit" value="ВОЙТИ">
                    </form>
                </fieldset>
            </div>
    <?php 
        }
    }else{
        header("location: /index.php");
        exit();
}
?>	
</body>
</html>
