<?php
session_start(); //Запускаем сессии
include('../connection.php');
global $user;
global $pwd;
global $db;

include('../login.php');
$auth = new AuthClass();

if ($_POST['ajax_action']==='railway_add_info') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_railway_add_info(:bind1))');
    OCIBindByName($oci_child, ":bind1", $_POST['railway_id']);
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='change_parent_for_railway') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.change_parent_for_railway(:bind2,:bind3,:bind4,:bind5); end;');
    $id = filter_input(INPUT_POST,'id');
    $type = filter_input(INPUT_POST,'type');
    $new_parent_id = filter_input(INPUT_POST,'new_parent_id');
    $new_parent_type = filter_input(INPUT_POST,'new_parent_type');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $id);
    OCIBindByName($oci_request, ":bind3", $type);
    OCIBindByName($oci_request, ":bind4", $new_parent_id);
    OCIBindByName($oci_request, ":bind5", $new_parent_type);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='add_railway') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.add_railway(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8,:bind9,:bind10,:bind11,:bind12,:bind13,:bind14,:bind15); end;');
    $parent_id = filter_input(INPUT_POST,'parent_id');
    $parent_type = filter_input(INPUT_POST,'parent_type');
    $number = filter_input(INPUT_POST,'number');
    $purpose = filter_input(INPUT_POST,'purpose');
    $pointer_from = filter_input(INPUT_POST,'pointer_from');
    $pointer_to = filter_input(INPUT_POST,'pointer_to');
    $length_limit = filter_input(INPUT_POST,'length_limit');
    $length_useful = filter_input(INPUT_POST,'length_useful');
    $capacity = filter_input(INPUT_POST,'capacity');
    $add_field1 = filter_input(INPUT_POST,'add_field1');
    $add_field2 = filter_input(INPUT_POST,'add_field2');
    $add_field3 = filter_input(INPUT_POST,'add_field3');
    $disabled = filter_input(INPUT_POST,'disabled');
    $type = filter_input(INPUT_POST,'type');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $parent_id);
    OCIBindByName($oci_request, ":bind3", $parent_type);
    OCIBindByName($oci_request, ":bind4", $number);
    OCIBindByName($oci_request, ":bind5", $purpose);
    OCIBindByName($oci_request, ":bind6", $pointer_from);
    OCIBindByName($oci_request, ":bind7", $pointer_to);
    OCIBindByName($oci_request, ":bind8", $length_limit);
    OCIBindByName($oci_request, ":bind9", $length_useful);
    OCIBindByName($oci_request, ":bind10", $capacity);
    OCIBindByName($oci_request, ":bind11", $add_field1);
    OCIBindByName($oci_request, ":bind12", $add_field2);
    OCIBindByName($oci_request, ":bind13", $add_field3);
    OCIBindByName($oci_request, ":bind14", $disabled);
    OCIBindByName($oci_request, ":bind15", $type);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='change_railway_attr') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.change_railway_attr(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8,:bind9,:bind10,:bind11,:bind12,:bind13,:bind14); end;');
    $railway_id = filter_input(INPUT_POST,'railway_id');
    $number = filter_input(INPUT_POST,'number');
    $purpose = filter_input(INPUT_POST,'purpose');
    $pointer_from = filter_input(INPUT_POST,'pointer_from');
    $pointer_to = filter_input(INPUT_POST,'pointer_to');
    $length_limit = filter_input(INPUT_POST,'length_limit');
    $length_useful = filter_input(INPUT_POST,'length_useful');
    $capacity = filter_input(INPUT_POST,'capacity');
    $add_field1 = filter_input(INPUT_POST,'add_field1');
    $add_field2 = filter_input(INPUT_POST,'add_field2');
    $add_field3 = filter_input(INPUT_POST,'add_field3');
    $disabled = filter_input(INPUT_POST,'disabled');
    $type = filter_input(INPUT_POST,'type');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $railway_id);
    OCIBindByName($oci_request, ":bind3", $number);
    OCIBindByName($oci_request, ":bind4", $purpose);
    OCIBindByName($oci_request, ":bind5", $pointer_from);
    OCIBindByName($oci_request, ":bind6", $pointer_to);
    OCIBindByName($oci_request, ":bind7", $length_limit);
    OCIBindByName($oci_request, ":bind8", $length_useful);
    OCIBindByName($oci_request, ":bind9", $capacity);
    OCIBindByName($oci_request, ":bind10", $add_field1);
    OCIBindByName($oci_request, ":bind11", $add_field2);
    OCIBindByName($oci_request, ":bind12", $add_field3);
    OCIBindByName($oci_request, ":bind13", $disabled);
    OCIBindByName($oci_request, ":bind14", $type);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_stations') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'select * from table(xx_dislocation.getStations)');
    oci_execute($oci_request);

    $arrResult = array();
    while ($tmp = oci_fetch_array($oci_request, OCI_ASSOC+OCI_RETURN_NULLS)) {
            array_push($arrResult, $tmp);
    }

    oci_close($conn);

    echo json_encode($arrResult);
}

if ($_POST['ajax_action']==='add_point') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.add_point(:bind2,:bind3,:bind4,:bind5); end;');
    $parent_id = filter_input(INPUT_POST,'parent_id');
    $parent_type = filter_input(INPUT_POST,'parent_type');
    $name = filter_input(INPUT_POST,'name');
    $descr = filter_input(INPUT_POST,'descr');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $parent_id);
    OCIBindByName($oci_request, ":bind3", $parent_type);
    OCIBindByName($oci_request, ":bind4", $name);
    OCIBindByName($oci_request, ":bind5", $descr);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='change_order_for_railway') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.change_order_for_railway(:bind2,:bind3,:bind4); end;');
    $id = filter_input(INPUT_POST,'id');
    $type = filter_input(INPUT_POST,'type');
    $action = filter_input(INPUT_POST,'action');

    OCIBindByName($oci_request, ":bind1", $result,100);
    OCIBindByName($oci_request, ":bind2", $id);
    OCIBindByName($oci_request, ":bind3", $type);
    OCIBindByName($oci_request, ":bind4", $action);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_credentials') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'select * from table(xx_dislocation.get_credentials)');
    oci_execute($oci_request);

    $arrResult = array();
    while ($tmp = oci_fetch_array($oci_request, OCI_ASSOC+OCI_RETURN_NULLS)) {
            array_push($arrResult, $tmp);
    }

    oci_close($conn);

    echo json_encode($arrResult);
}
//Не используется
if ($_POST['ajax_action']==='old_get_credential_descr') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_credential_descr(:bind1))');
    $credential_id = filter_input(INPUT_POST,'credential_id');

    OCIBindByName($oci_child, ":bind1", $credential_id);
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='get_credential_descr') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_credential_descr_new(:bind1))');
    $credential_id = filter_input(INPUT_POST,'credential_id');

    OCIBindByName($oci_child, ":bind1", $credential_id);
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='save_new_credential') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    $oci_request = oci_parse($conn, '
		declare	
		begin
            :bind1:=xx_dislocation.save_new_credential_new(:bind2, :bind3);

		end;');
        $params = filter_input(INPUT_POST,'params');
        $userID = $auth->getUserId();

        OCIBindByName($oci_request, ":bind1", $result,100);
        OCIBindByName($oci_request, ":bind2", $userID);
        OCIBindByName($oci_request, ":bind3", $params);
        oci_execute($oci_request);
        oci_close($conn);
        echo $result;
}


if ($_POST['ajax_action']==='old_save_new_credential') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, '
		declare
			l_add_data  xx_etw.xx_dislocation.t_xx_user_credential_row;
		begin
			l_add_data.p_credential_name  :=:bind2;
			l_add_data.p_moving_inside_railway  :=:bind3;
			l_add_data.p_moving_inside_shop  :=:bind4;
			l_add_data.p_moving_inside_station  :=:bind5;
			l_add_data.p_moving_between_station  :=:bind6;
			l_add_data.p_change_attribute  :=:bind7;
			l_add_data.p_change_weight  :=:bind8;
			l_add_data.p_enter_inspection  :=:bind9;
			l_add_data.p_enter_inspection_add  :=:bind10;
			l_add_data.p_register_notification  :=:bind11;
			l_add_data.p_entry_foreign_car  :=:bind12;
			l_add_data.p_administrator  :=:bind13;
			l_add_data.p_receive_to_station  :=:bind14;
			l_add_data.p_work_with_groups  :=:bind15;
			l_add_data.p_out_from_ugl  :=:bind16;
			l_add_data.p_add_attribute  :=:bind17;
			l_add_data.p_create_request  :=:bind18;
			l_add_data.p_change_request  :=:bind19;
			l_add_data.p_view_request  :=:bind20;
			l_add_data.p_complete_request  :=:bind21;
			l_add_data.p_del_ins_doc  :=:bind22;
			l_add_data.p_return_from_psp  :=:bind23;
			l_add_data.p_autocreate_request_v  :=:bind24;
			l_add_data.p_autocreate_request_o  :=:bind25;
			l_add_data.p_autocreate_request_t  :=:bind26;
			l_add_data.p_weigh_import  :=:bind27;
			l_add_data.p_weigh_import_corr  :=:bind28;
			l_add_data.p_weigh_delete  :=:bind29;
			l_add_data.p_export_shop_info  :=:bind30;
			l_add_data.p_create_invoice_out  :=:bind31;
			l_add_data.p_send_invoice_to_etran  :=:bind32;
			l_add_data.p_register_notification_gu  :=:bind33;
			l_add_data.p_route_add  :=:bind34;
			l_add_data.p_route_processing  :=:bind35;
			l_add_data.p_route_closing  :=:bind36;
			l_add_data.p_output_defective_cars  :=:bind37;
			l_add_data.p_export_notification_gu  :=:bind38;
			l_add_data.p_fix_dev_rule  :=:bind39;
			l_add_data.p_fix_dev_place  :=:bind40;
			l_add_data.p_enter_dev_inspection  :=:bind41;
			l_add_data.p_fix_dev_add  :=:bind42;
			l_add_data.p_fix_dev_undock  :=:bind43;
			l_add_data.p_fix_dev_update  :=:bind44;
			l_add_data.p_shift_update  :=:bind45;
			l_add_data.p_control_cars  :=:bind46;
			l_add_data.p_weighing_dispatcher  :=:bind47;
			l_add_data.p_process_of_wagons  :=:bind48;
			l_add_data.p_update_of_nsi  :=:bind49;
			l_add_data.p_export_samples  :=:bind50;
			l_add_data.p_entry_foreign_cont  :=:bind51;
			l_add_data.p_scale_type_1831_manual  :=:bind52;
			
			
			
			
			:bind1:=xx_dislocation.save_new_credential(l_add_data);

		end;');
    $credential_name = filter_input(INPUT_POST,'credential_name');
    $moving_inside_railway = filter_input(INPUT_POST,'moving_inside_railway');
    $moving_inside_shop = filter_input(INPUT_POST,'moving_inside_shop');
    $moving_inside_station = filter_input(INPUT_POST,'moving_inside_station');
    $moving_between_station = filter_input(INPUT_POST,'moving_between_station');
    $change_attribute = filter_input(INPUT_POST,'change_attribute');
    $change_weight = filter_input(INPUT_POST,'change_weight');
    $enter_inspection = filter_input(INPUT_POST,'enter_inspection');
    $enter_inspection_add = filter_input(INPUT_POST,'enter_inspection_add');
    $register_notification = filter_input(INPUT_POST,'register_notification');
    $entry_foreign_car = filter_input(INPUT_POST,'entry_foreign_car');
    $administrator = filter_input(INPUT_POST,'administrator');
    $receive_to_station = filter_input(INPUT_POST,'receive_to_station');
    $work_with_groups = filter_input(INPUT_POST,'work_with_groups');
    $out_from_ugl = filter_input(INPUT_POST,'out_from_ugl');
    $add_attribute = filter_input(INPUT_POST,'add_attribute');
    $create_request = filter_input(INPUT_POST,'create_request');
    $change_request = filter_input(INPUT_POST,'change_request');
    $view_request = filter_input(INPUT_POST,'view_request');
    $complete_request = filter_input(INPUT_POST,'complete_request');
    $del_ins_doc = filter_input(INPUT_POST,'del_ins_doc');
    $return_from_psp = filter_input(INPUT_POST,'return_from_psp');
    $autocreate_request_v = filter_input(INPUT_POST,'autocreate_request_v');
    $autocreate_request_o = filter_input(INPUT_POST,'autocreate_request_o');
    $autocreate_request_t = filter_input(INPUT_POST,'autocreate_request_t');
    $weigh_import = filter_input(INPUT_POST,'weigh_import');
    $weigh_import_corr = filter_input(INPUT_POST,'weigh_import_corr');
    $weigh_delete = filter_input(INPUT_POST,'weigh_delete');
    $export_shop_info = filter_input(INPUT_POST,'export_shop_info');
    $create_invoice_out = filter_input(INPUT_POST,'create_invoice_out');
    $send_invoice_to_etran = filter_input(INPUT_POST,'send_invoice_to_etran');
    $register_notification_gu = filter_input(INPUT_POST,'register_notification_gu');
    $route_add = filter_input(INPUT_POST,'route_add');
    $route_processing = filter_input(INPUT_POST,'route_processing');
    $route_closing = filter_input(INPUT_POST,'route_closing');
    $output_defective_cars = filter_input(INPUT_POST,'output_defective_cars');
    $export_notification_gu = filter_input(INPUT_POST,'export_notification_gu');
    $fix_dev_rule = filter_input(INPUT_POST,'fix_dev_rule');
    $fix_dev_place = filter_input(INPUT_POST,'fix_dev_place');
	$enter_dev_inspection = filter_input(INPUT_POST,'enter_dev_inspection');
	$fix_dev_add = filter_input(INPUT_POST,'fix_dev_add');
	$fix_dev_undock = filter_input(INPUT_POST,'fix_dev_undock');
	$fix_dev_update = filter_input(INPUT_POST,'fix_dev_update');
	$shift_update = filter_input(INPUT_POST,'shift_update');
	$control_cars = filter_input(INPUT_POST,'control_cars');
	$weighing_dispatcher = filter_input(INPUT_POST,'weighing_dispatcher');
	$process_of_wagons = filter_input(INPUT_POST,'process_of_wagons');
	$update_of_nsi = filter_input(INPUT_POST,'update_of_nsi');
	$export_samples = filter_input(INPUT_POST,'export_samples');
	$entry_foreign_cont = filter_input(INPUT_POST,'entry_foreign_cont');
	$scale_type_1831_manual = filter_input(INPUT_POST,'scale_type_1831_manual');

    OCIBindByName($oci_request, ":bind1", $result,100);
    OCIBindByName($oci_request, ":bind2", $credential_name);
    OCIBindByName($oci_request, ":bind3", $moving_inside_railway);
    OCIBindByName($oci_request, ":bind4", $moving_inside_shop);
    OCIBindByName($oci_request, ":bind5", $moving_inside_station);
    OCIBindByName($oci_request, ":bind6", $moving_between_station);
    OCIBindByName($oci_request, ":bind7", $change_attribute);
    OCIBindByName($oci_request, ":bind8", $change_weight);
    OCIBindByName($oci_request, ":bind9", $enter_inspection);
    OCIBindByName($oci_request, ":bind10", $enter_inspection_add);
    OCIBindByName($oci_request, ":bind11", $register_notification);
    OCIBindByName($oci_request, ":bind12", $entry_foreign_car);
    OCIBindByName($oci_request, ":bind13", $administrator);
    OCIBindByName($oci_request, ":bind14", $receive_to_station);
    OCIBindByName($oci_request, ":bind15", $work_with_groups);
    OCIBindByName($oci_request, ":bind16", $out_from_ugl);
    OCIBindByName($oci_request, ":bind17", $add_attribute);
    OCIBindByName($oci_request, ":bind18", $create_request);
    OCIBindByName($oci_request, ":bind19", $change_request);
    OCIBindByName($oci_request, ":bind20", $view_request);
    OCIBindByName($oci_request, ":bind21", $complete_request);
    OCIBindByName($oci_request, ":bind22", $del_ins_doc);
    OCIBindByName($oci_request, ":bind23", $return_from_psp);
    OCIBindByName($oci_request, ":bind24", $autocreate_request_v);
    OCIBindByName($oci_request, ":bind25", $autocreate_request_o);
    OCIBindByName($oci_request, ":bind26", $autocreate_request_t);
    OCIBindByName($oci_request, ":bind27", $weigh_import);
    OCIBindByName($oci_request, ":bind28", $weigh_import_corr);
    OCIBindByName($oci_request, ":bind29", $weigh_delete);
    OCIBindByName($oci_request, ":bind30", $export_shop_info);
    OCIBindByName($oci_request, ":bind31", $create_invoice_out);
    OCIBindByName($oci_request, ":bind32", $send_invoice_to_etran);
    OCIBindByName($oci_request, ":bind33", $register_notification_gu);
    
    
    OCIBindByName($oci_request, ":bind34", $route_add);
    OCIBindByName($oci_request, ":bind35", $route_processing);
    OCIBindByName($oci_request, ":bind36", $route_closing);
    
    
    OCIBindByName($oci_request, ":bind37", $output_defective_cars);
    OCIBindByName($oci_request, ":bind38", $export_notification_gu);
    OCIBindByName($oci_request, ":bind39", $fix_dev_rule);
    OCIBindByName($oci_request, ":bind40", $fix_dev_place);
	
	
	OCIBindByName($oci_request, ":bind41", $enter_dev_inspection);
	OCIBindByName($oci_request, ":bind42", $fix_dev_add);
	OCIBindByName($oci_request, ":bind43", $fix_dev_undock);
	OCIBindByName($oci_request, ":bind44", $fix_dev_update);
	
	
	OCIBindByName($oci_request, ":bind45", $shift_update);
	OCIBindByName($oci_request, ":bind46", $control_cars);
	OCIBindByName($oci_request, ":bind47", $weighing_dispatcher);
	OCIBindByName($oci_request, ":bind48", $process_of_wagons);
	OCIBindByName($oci_request, ":bind49", $update_of_nsi);
	OCIBindByName($oci_request, ":bind50", $export_samples);
	OCIBindByName($oci_request, ":bind51", $entry_foreign_cont);
	OCIBindByName($oci_request, ":bind52", $scale_type_1831_manual);
	
	
	
	
	
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='change_credential') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, '
		declare
			l_add_data  xx_etw.xx_dislocation.t_xx_user_credential_row;
		begin
			l_add_data.p_credential_name  :=:bind3;
			l_add_data.p_moving_inside_railway  :=:bind4;
			l_add_data.p_moving_inside_shop  :=:bind5;
			l_add_data.p_moving_inside_station  :=:bind6;
			l_add_data.p_moving_between_station  :=:bind7;
			l_add_data.p_change_attribute  :=:bind8;
			l_add_data.p_change_weight  :=:bind9;
			l_add_data.p_enter_inspection  :=:bind10;
			
			l_add_data.p_enter_inspection_add  :=:bind11;
			l_add_data.p_register_notification  :=:bind12;
			l_add_data.p_entry_foreign_car  :=:bind13;
			l_add_data.p_administrator  :=:bind14;
			l_add_data.p_receive_to_station  :=:bind15;
			l_add_data.p_work_with_groups  :=:bind16;
			l_add_data.p_out_from_ugl  :=:bind17;
			l_add_data.p_add_attribute  :=:bind18;
			l_add_data.p_create_request  :=:bind19;
			l_add_data.p_change_request  :=:bind20;
			l_add_data.p_view_request  :=:bind21;
			l_add_data.p_complete_request  :=:bind22;
			l_add_data.p_del_ins_doc  :=:bind23;
			l_add_data.p_return_from_psp  :=:bind24;
			l_add_data.p_autocreate_request_v  :=:bind25;
			l_add_data.p_autocreate_request_o  :=:bind26;
			l_add_data.p_autocreate_request_t  :=:bind27;
			l_add_data.p_weigh_import  :=:bind28;
			l_add_data.p_weigh_import_corr  :=:bind29;
			l_add_data.p_weigh_delete  :=:bind30;
			l_add_data.p_export_shop_info  :=:bind31;
			l_add_data.p_create_invoice_out  :=:bind32;
			l_add_data.p_send_invoice_to_etran  :=:bind33;
			l_add_data.p_register_notification_gu  :=:bind34;
			l_add_data.p_route_add  :=:bind35;
			l_add_data.p_route_processing  :=:bind36;
			l_add_data.p_route_closing  :=:bind37;
			l_add_data.p_output_defective_cars  :=:bind38;
			l_add_data.p_export_notification_gu  :=:bind39;
			l_add_data.p_fix_dev_rule  :=:bind40;
			l_add_data.p_fix_dev_place  :=:bind41;
			l_add_data.p_enter_dev_inspection  :=:bind42;
			l_add_data.p_fix_dev_add  :=:bind43;
			l_add_data.p_fix_dev_undock  :=:bind44;
			l_add_data.p_fix_dev_update  :=:bind45;
			l_add_data.p_shift_update  :=:bind46;
			l_add_data.p_control_cars  :=:bind47;
			l_add_data.p_weighing_dispatcher  :=:bind48;
			l_add_data.p_process_of_wagons  :=:bind49;
			l_add_data.p_update_of_nsi  :=:bind50;
			l_add_data.p_export_samples  :=:bind51;
			l_add_data.p_entry_foreign_cont  :=:bind52;
			l_add_data.p_scale_type_1831_manual  :=:bind53;
			
			
			
			
		   
			:bind1:=xx_dislocation.change_credential(:bind2,l_add_data);

		end;');
    $credential_id = filter_input(INPUT_POST,'credential_id');
    $credential_name = filter_input(INPUT_POST,'credential_name');
    $moving_inside_railway = filter_input(INPUT_POST,'moving_inside_railway');
    $moving_inside_shop = filter_input(INPUT_POST,'moving_inside_shop');
    $moving_inside_station = filter_input(INPUT_POST,'moving_inside_station');
    $moving_between_station = filter_input(INPUT_POST,'moving_between_station');
    $change_attribute = filter_input(INPUT_POST,'change_attribute');
    $change_weight = filter_input(INPUT_POST,'change_weight');
    $enter_inspection = filter_input(INPUT_POST,'enter_inspection');
    $enter_inspection_add = filter_input(INPUT_POST,'enter_inspection_add');
    $register_notification = filter_input(INPUT_POST,'register_notification');
    $entry_foreign_car = filter_input(INPUT_POST,'entry_foreign_car');
    $administrator = filter_input(INPUT_POST,'administrator');
    $receive_to_station = filter_input(INPUT_POST,'receive_to_station');
    $work_with_groups = filter_input(INPUT_POST,'work_with_groups');
    $out_from_ugl = filter_input(INPUT_POST,'out_from_ugl');
    $add_attribute = filter_input(INPUT_POST,'add_attribute');
    $create_request = filter_input(INPUT_POST,'create_request');
    $change_request = filter_input(INPUT_POST,'change_request');
    $view_request = filter_input(INPUT_POST,'view_request');
    $complete_request = filter_input(INPUT_POST,'complete_request');
    $del_ins_doc = filter_input(INPUT_POST,'del_ins_doc');
    $return_from_psp = filter_input(INPUT_POST,'return_from_psp');
    $autocreate_request_v = filter_input(INPUT_POST,'autocreate_request_v');
    $autocreate_request_o = filter_input(INPUT_POST,'autocreate_request_o');
    $autocreate_request_t = filter_input(INPUT_POST,'autocreate_request_t');
    $weigh_import = filter_input(INPUT_POST,'weigh_import');
    $weigh_import_corr = filter_input(INPUT_POST,'weigh_import_corr');
    $weigh_delete = filter_input(INPUT_POST,'weigh_delete');
    $export_shop_info = filter_input(INPUT_POST,'export_shop_info');
    $create_invoice_out = filter_input(INPUT_POST,'create_invoice_out');
    $send_invoice_to_etran = filter_input(INPUT_POST,'send_invoice_to_etran');
    $register_notification_gu = filter_input(INPUT_POST,'register_notification_gu');
    $route_add = filter_input(INPUT_POST,'route_add');
    $route_processing = filter_input(INPUT_POST,'route_processing');
    $route_closing = filter_input(INPUT_POST,'route_closing');
    $output_defective_cars = filter_input(INPUT_POST,'output_defective_cars');
    $export_notification_gu = filter_input(INPUT_POST,'export_notification_gu');
    $fix_dev_rule = filter_input(INPUT_POST,'fix_dev_rule');
    $fix_dev_place = filter_input(INPUT_POST,'fix_dev_place');
	$enter_dev_inspection = filter_input(INPUT_POST,'enter_dev_inspection');
	$fix_dev_add = filter_input(INPUT_POST,'fix_dev_add');
	$fix_dev_undock = filter_input(INPUT_POST,'fix_dev_undock');
	$fix_dev_update = filter_input(INPUT_POST,'fix_dev_update');
	$shift_update = filter_input(INPUT_POST,'shift_update');
	$control_cars = filter_input(INPUT_POST,'control_cars');
	$weighing_dispatcher = filter_input(INPUT_POST,'weighing_dispatcher');
	$process_of_wagons = filter_input(INPUT_POST,'process_of_wagons');
	$update_of_nsi = filter_input(INPUT_POST,'update_of_nsi');
	$export_samples = filter_input(INPUT_POST,'export_samples');
	$entry_foreign_cont = filter_input(INPUT_POST,'entry_foreign_cont');
	$scale_type_1831_manual = filter_input(INPUT_POST,'scale_type_1831_manual');

    OCIBindByName($oci_request, ":bind1", $result,1000);
    OCIBindByName($oci_request, ":bind2", $credential_id);
    OCIBindByName($oci_request, ":bind3", $credential_name);
    OCIBindByName($oci_request, ":bind4", $moving_inside_railway);
    OCIBindByName($oci_request, ":bind5", $moving_inside_shop);
    OCIBindByName($oci_request, ":bind6", $moving_inside_station);
    OCIBindByName($oci_request, ":bind7", $moving_between_station);
    OCIBindByName($oci_request, ":bind8", $change_attribute);
    OCIBindByName($oci_request, ":bind9", $change_weight);
    OCIBindByName($oci_request, ":bind10", $enter_inspection);
    OCIBindByName($oci_request, ":bind11", $enter_inspection_add);
    OCIBindByName($oci_request, ":bind12", $register_notification);
    OCIBindByName($oci_request, ":bind13", $entry_foreign_car);
    OCIBindByName($oci_request, ":bind14", $administrator);
    OCIBindByName($oci_request, ":bind15", $receive_to_station);
    OCIBindByName($oci_request, ":bind16", $work_with_groups);
    OCIBindByName($oci_request, ":bind17", $out_from_ugl);
    OCIBindByName($oci_request, ":bind18", $add_attribute);
    OCIBindByName($oci_request, ":bind19", $create_request);
    OCIBindByName($oci_request, ":bind20", $change_request);
    OCIBindByName($oci_request, ":bind21", $view_request);
    OCIBindByName($oci_request, ":bind22", $complete_request);
    OCIBindByName($oci_request, ":bind23", $del_ins_doc);
    OCIBindByName($oci_request, ":bind24", $return_from_psp);
    OCIBindByName($oci_request, ":bind25", $autocreate_request_v);
    OCIBindByName($oci_request, ":bind26", $autocreate_request_o);
    OCIBindByName($oci_request, ":bind27", $autocreate_request_t);
    OCIBindByName($oci_request, ":bind28", $weigh_import);
    OCIBindByName($oci_request, ":bind29", $weigh_import_corr);
    OCIBindByName($oci_request, ":bind30", $weigh_delete);
    OCIBindByName($oci_request, ":bind31", $export_shop_info);
    OCIBindByName($oci_request, ":bind32", $create_invoice_out);
    OCIBindByName($oci_request, ":bind33", $send_invoice_to_etran);
    OCIBindByName($oci_request, ":bind34", $register_notification_gu);
    
    
    OCIBindByName($oci_request, ":bind35", $route_add);
    OCIBindByName($oci_request, ":bind36", $route_processing);
    OCIBindByName($oci_request, ":bind37", $route_closing);
    
    
    OCIBindByName($oci_request, ":bind38", $output_defective_cars);
    OCIBindByName($oci_request, ":bind39", $export_notification_gu);
    OCIBindByName($oci_request, ":bind40", $fix_dev_rule);
    OCIBindByName($oci_request, ":bind41", $fix_dev_place);
	
	
	OCIBindByName($oci_request, ":bind42", $enter_dev_inspection);
	OCIBindByName($oci_request, ":bind43", $fix_dev_add);
	OCIBindByName($oci_request, ":bind44", $fix_dev_undock);
	OCIBindByName($oci_request, ":bind45", $fix_dev_update);
    
    
	OCIBindByName($oci_request, ":bind46", $shift_update);
	OCIBindByName($oci_request, ":bind47", $control_cars);
	
	
	OCIBindByName($oci_request, ":bind48", $weighing_dispatcher);
	OCIBindByName($oci_request, ":bind49", $process_of_wagons);
	OCIBindByName($oci_request, ":bind50", $update_of_nsi);
	OCIBindByName($oci_request, ":bind51", $export_samples);
	OCIBindByName($oci_request, ":bind52", $entry_foreign_cont);
	OCIBindByName($oci_request, ":bind53", $scale_type_1831_manual);
	
	
	
	
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='delete_credential') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.delete_credential(:bind2); end;');
    $credential_id = filter_input(INPUT_POST,'credential_id');

    OCIBindByName($oci_request, ":bind1", $result,100);
    OCIBindByName($oci_request, ":bind2", $credential_id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_users') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'select * from table(xx_dislocation.get_users)');
    oci_execute($oci_request);

    $arrResult = array();
    while ($tmp = oci_fetch_array($oci_request, OCI_ASSOC+OCI_RETURN_NULLS)) {
            array_push($arrResult, $tmp);
    }

    oci_close($conn);

    echo json_encode($arrResult);
}

if ($_POST['ajax_action']==='get_user_descr') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_user_descr(:bind1))');
    $user_id = filter_input(INPUT_POST,'user_id');

    OCIBindByName($oci_child, ":bind1", $user_id);
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='add_user') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.add_user(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8,:bind9,:bind10,:bind11); end;');
    $login = filter_input(INPUT_POST,'login');
    $full_name = filter_input(INPUT_POST,'full_name');
    $enterprise = filter_input(INPUT_POST,'enterprise');
    $division = filter_input(INPUT_POST,'division');
    $change_pwd = filter_input(INPUT_POST,'change_pwd');
    $open = filter_input(INPUT_POST,'open');
    $phone_num = filter_input(INPUT_POST,'phone_num');
    $default_station = filter_input(INPUT_POST,'default_station');
    $stations = filter_input(INPUT_POST,'stations');
    $credentials = filter_input(INPUT_POST,'credentials');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $login);
    OCIBindByName($oci_request, ":bind3", $full_name);
    OCIBindByName($oci_request, ":bind4", $enterprise);
    OCIBindByName($oci_request, ":bind5", $division);
    OCIBindByName($oci_request, ":bind6", $change_pwd);
    OCIBindByName($oci_request, ":bind7", $open);
    OCIBindByName($oci_request, ":bind8", $phone_num);
    OCIBindByName($oci_request, ":bind9", $default_station);
    OCIBindByName($oci_request, ":bind10", $stations);
    OCIBindByName($oci_request, ":bind11", $credentials);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='change_user') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.change_user(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8,:bind9,:bind10,:bind11,:bind12); end;');
    $user_id = filter_input(INPUT_POST,'user_id');
    $login = filter_input(INPUT_POST,'login');
    $full_name = filter_input(INPUT_POST,'full_name');
    $enterprise = filter_input(INPUT_POST,'enterprise');
    $division = filter_input(INPUT_POST,'division');
    $change_pwd = filter_input(INPUT_POST,'change_pwd');
    $open = filter_input(INPUT_POST,'open');
    $phone_num = filter_input(INPUT_POST,'phone_num');
    $default_station = filter_input(INPUT_POST,'default_station');
    $stations = filter_input(INPUT_POST,'stations');
    $credentials = filter_input(INPUT_POST,'credentials');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $user_id);
    OCIBindByName($oci_request, ":bind3", $login);
    OCIBindByName($oci_request, ":bind4", $full_name);
    OCIBindByName($oci_request, ":bind5", $enterprise);
    OCIBindByName($oci_request, ":bind6", $division);
    OCIBindByName($oci_request, ":bind7", $change_pwd);
    OCIBindByName($oci_request, ":bind8", $open);
    OCIBindByName($oci_request, ":bind9", $phone_num);
    OCIBindByName($oci_request, ":bind10", $default_station);
    OCIBindByName($oci_request, ":bind11", $stations);
    OCIBindByName($oci_request, ":bind12", $credentials);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_ins_doc_types') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_ins_doc_types)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='change_ins_doc_type') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.change_ins_doc_type(:bind2,:bind3,:bind4,:bind5); end;');
    $type_id = filter_input(INPUT_POST,'type_id');
    $name = filter_input(INPUT_POST,'name');
    $descr = filter_input(INPUT_POST,'descr');
    $storage_life = filter_input(INPUT_POST,'storage_life');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $type_id);
    OCIBindByName($oci_request, ":bind3", $name);
    OCIBindByName($oci_request, ":bind4", $descr);
    OCIBindByName($oci_request, ":bind5", $storage_life);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='create_new_ins_doc_type') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.create_new_ins_doc_type(); end;');
    OCIBindByName($oci_request, ":bind1", $result,1000000);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='del_ins_doc_type') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.del_ins_doc_type(:bind2); end;');
    $type_id = filter_input(INPUT_POST,'type_id');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $type_id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_rail_services_rgd') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_services_rgd)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='save_rail_service_rgd') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.save_rail_service_rgd(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7); end;');
    $id = filter_input(INPUT_POST,'id');
    $code = filter_input(INPUT_POST,'code');
    $category = filter_input(INPUT_POST,'category');
    $beg_date = filter_input(INPUT_POST,'beg_date');
    $end_date = filter_input(INPUT_POST,'end_date');
    $userID = $auth->getUserId();

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $userID);        
    OCIBindByName($oci_request, ":bind3", $id);
    OCIBindByName($oci_request, ":bind4", $code);
    OCIBindByName($oci_request, ":bind5", $category);
    OCIBindByName($oci_request, ":bind6", $beg_date);
    OCIBindByName($oci_request, ":bind7", $end_date);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='del_rail_service_rgd') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.del_rail_service_rgd(:bind2); end;');
    $id = filter_input(INPUT_POST,'id');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_rail_services') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_services)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='save_rail_service') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.save_rail_service(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8,:bind9,:bind10); end;');
    $id = filter_input(INPUT_POST,'id');
    $code = filter_input(INPUT_POST,'code');
    $descr = filter_input(INPUT_POST,'descr');
    $descr_full = filter_input(INPUT_POST,'descr_full');
    $beg_date = filter_input(INPUT_POST,'beg_date');
    $end_date = filter_input(INPUT_POST,'end_date');
    $service_rgd_id = filter_input(INPUT_POST,'service_rgd_id');
    $request_tasks = filter_input(INPUT_POST,'request_tasks');
    $userID = $auth->getUserId();

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $userID);   
    OCIBindByName($oci_request, ":bind3", $id);
    OCIBindByName($oci_request, ":bind4", $code);
    OCIBindByName($oci_request, ":bind5", $descr);
    OCIBindByName($oci_request, ":bind6", $descr_full);
    OCIBindByName($oci_request, ":bind7", $beg_date);
    OCIBindByName($oci_request, ":bind8", $end_date);
    OCIBindByName($oci_request, ":bind9", $service_rgd_id);
    OCIBindByName($oci_request, ":bind10", $request_tasks);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='del_rail_service') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.del_rail_service(:bind2); end;');
    $id = filter_input(INPUT_POST,'id');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_rail_contracts') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_contracts)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='save_rail_contract') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.save_rail_contract(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8,:bind9,:bind10); end;');
    $id = filter_input(INPUT_POST,'id');
    $num = filter_input(INPUT_POST,'num');
    $descr = filter_input(INPUT_POST,'descr');
    $owner = filter_input(INPUT_POST,'owner');
    $freight_owner = filter_input(INPUT_POST,'freight_owner');
    $freight_owner_short = filter_input(INPUT_POST,'freight_owner_short');
    $beg_date = filter_input(INPUT_POST,'beg_date');
    $end_date = filter_input(INPUT_POST,'end_date');
    $userID = $auth->getUserId();

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $userID);  
    OCIBindByName($oci_request, ":bind3", $id);
    OCIBindByName($oci_request, ":bind4", $num);
    OCIBindByName($oci_request, ":bind5", $descr);
    OCIBindByName($oci_request, ":bind6", $owner);
    OCIBindByName($oci_request, ":bind7", $freight_owner);
    OCIBindByName($oci_request, ":bind8", $freight_owner_short);
    OCIBindByName($oci_request, ":bind9", $beg_date);
    OCIBindByName($oci_request, ":bind10", $end_date);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='del_rail_contract') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.del_rail_contract(:bind2); end;');
    $id = filter_input(INPUT_POST,'id');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_rail_contract_dop') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_contract_dop)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='save_rail_contract_dop') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.save_rail_contract_dop(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8); end;');
    $id = filter_input(INPUT_POST,'id');
    $num = filter_input(INPUT_POST,'num');
    $descr = filter_input(INPUT_POST,'descr');
    $beg_date = filter_input(INPUT_POST,'beg_date');
    $end_date = filter_input(INPUT_POST,'end_date');
    $contract_id = filter_input(INPUT_POST,'contract_id');
    $userID = $auth->getUserId();

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $userID);  
    OCIBindByName($oci_request, ":bind3", $id);
    OCIBindByName($oci_request, ":bind4", $num);
    OCIBindByName($oci_request, ":bind5", $descr);
    OCIBindByName($oci_request, ":bind6", $beg_date);
    OCIBindByName($oci_request, ":bind7", $end_date);
    OCIBindByName($oci_request, ":bind8", $contract_id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='del_rail_contract_dop') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.del_rail_contract_dop(:bind2); end;');
    $id = filter_input(INPUT_POST,'id');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_rail_contract_change') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_contract_change)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='get_rail_parent_contracts') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_parent_contracts)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='save_rail_contract_change') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.save_rail_contract_change(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8); end;');
    $id = filter_input(INPUT_POST,'id');
    $num = filter_input(INPUT_POST,'num');
    $descr = filter_input(INPUT_POST,'descr');
    $beg_date = filter_input(INPUT_POST,'beg_date');
    $end_date = filter_input(INPUT_POST,'end_date');
    $contract_id = filter_input(INPUT_POST,'contract_id');
    $userID = $auth->getUserId();

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $userID);  
    OCIBindByName($oci_request, ":bind3", $id);
    OCIBindByName($oci_request, ":bind4", $num);
    OCIBindByName($oci_request, ":bind5", $descr);
    OCIBindByName($oci_request, ":bind6", $beg_date);
    OCIBindByName($oci_request, ":bind7", $end_date);
    OCIBindByName($oci_request, ":bind8", $contract_id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='del_rail_contract_change') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.del_rail_contract_change(:bind2); end;');
    $id = filter_input(INPUT_POST,'id');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_rail_contract_services') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_contract_services)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='get_rail_parent_contracts_add') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_rail_parent_contracts_add)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        array_push($arrChild, $tmp);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='save_rail_contract_services') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.save_rail_contract_services(:bind2,:bind3,:bind4,:bind5,:bind6,:bind7,:bind8,:bind9); end;');
    $id = filter_input(INPUT_POST,'id');
    $contract_id = filter_input(INPUT_POST,'contract_id');
    $service_id = filter_input(INPUT_POST,'service_id');
    $ei = filter_input(INPUT_POST,'ei');
    $ei_descr = filter_input(INPUT_POST,'ei_descr');
    $cost = filter_input(INPUT_POST,'cost');
    $cost_nds = filter_input(INPUT_POST,'cost_nds');
    $userID = $auth->getUserId();

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $userID);
    OCIBindByName($oci_request, ":bind3", $id);
    OCIBindByName($oci_request, ":bind4", $contract_id);
    OCIBindByName($oci_request, ":bind5", $service_id);
    OCIBindByName($oci_request, ":bind6", $ei);
    OCIBindByName($oci_request, ":bind7", $ei_descr);
    OCIBindByName($oci_request, ":bind8", $cost);
    OCIBindByName($oci_request, ":bind9", $cost_nds);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='del_rail_contract_services') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
        $e = oci_error();
        trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.del_rail_contract_services(:bind2); end;');
    $id = filter_input(INPUT_POST,'id');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $id);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='add_area') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.add_area(:bind2,:bind3,:bind4,:bind5); end;');
    $parent_id = filter_input(INPUT_POST,'parent_id');
    $parent_type = filter_input(INPUT_POST,'parent_type');
    $name = filter_input(INPUT_POST,'name');
    $descr = filter_input(INPUT_POST,'descr');

    OCIBindByName($oci_request, ":bind1", $result,1000000);
    OCIBindByName($oci_request, ":bind2", $parent_id);
    OCIBindByName($oci_request, ":bind3", $parent_type);
    OCIBindByName($oci_request, ":bind4", $name);
    OCIBindByName($oci_request, ":bind5", $descr);
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}

if ($_POST['ajax_action']==='get_periods') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }
    
    $arrChild = array();
    $oci_child = oci_parse($conn, 'select * from table(xx_dislocation.get_periods)');
    oci_execute($oci_child);
    while ($tmp = oci_fetch_array($oci_child, OCI_ASSOC+OCI_RETURN_NULLS)) {
        //array_push($arrChild, $tmp);
		array_push($arrChild,['PER_ID' => $tmp['PER_ID']
							 ,'PERIOD' => $tmp['PERIOD']
							 ,'PER_MONTH' => $tmp['PER_MONTH']
							 ,'PER_YEAR' => $tmp['PER_YEAR']
							 ,'PER_FROM' => $tmp['PER_FROM']
							 ,'PER_TO' => $tmp['PER_TO']
							 ,'PERIOD_CLOSING' => $tmp['PERIOD_CLOSING']->load()
		]);
    }
    oci_close($conn);

    echo json_encode($arrChild);
}

if ($_POST['ajax_action']==='get_period_closing') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'select * from table(xx_dislocation.get_period_closing(:bind1))');
    $period_id = filter_input(INPUT_POST,'period_id');

    OCIBindByName($oci_request, ":bind1", $period_id);
    oci_execute($oci_request);

    $arrResult = array();
    while ($tmp = oci_fetch_array($oci_request, OCI_ASSOC+OCI_RETURN_NULLS)) {
            array_push($arrResult, $tmp);
    }

    oci_close($conn);

    echo json_encode($arrResult);
}

if ($_POST['ajax_action']==='get_period_status') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'select * from table(xx_dislocation.get_period_status)');
    oci_execute($oci_request);

    $arrResult = array();
    while ($tmp = oci_fetch_array($oci_request, OCI_ASSOC+OCI_RETURN_NULLS)) {
            array_push($arrResult, $tmp);
    }

    oci_close($conn);

    echo json_encode($arrResult);
}

if ($_POST['ajax_action']==='save_period_status') {
    $conn = oci_connect($user,$pwd,$db,"AL32UTF8");
    if (!$conn) {
            $e = oci_error();
            trigger_error(htmlentities($e['message'], ENT_QUOTES), E_USER_ERROR);
    }

    $oci_request = oci_parse($conn, 'begin  :bind1 := xx_dislocation.save_period_status(:bind2,:bind3,:bind4,:bind5); end;');
    $period_id = filter_input(INPUT_POST,'period_id');
    $oper_id = filter_input(INPUT_POST,'oper_id');
    $status_id = filter_input(INPUT_POST,'status_id');
    $userID = $auth->getUserId();

    OCIBindByName($oci_request, ":bind1", $result,1000000);   
    OCIBindByName($oci_request, ":bind2", $period_id);
    OCIBindByName($oci_request, ":bind3", $oper_id);
    OCIBindByName($oci_request, ":bind4", $status_id);
    OCIBindByName($oci_request, ":bind5", $userID);   
    oci_execute($oci_request);

    oci_close($conn);

    echo $result;
}
