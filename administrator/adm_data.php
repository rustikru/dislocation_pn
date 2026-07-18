<?php
session_start(); //Запускаем сессии
if (file_exists(__DIR__ . '/../db_config.local.php')) {
    require_once __DIR__ . '/../db_config.local.php';
} else {
    require_once __DIR__ . '/../db_config.php';
}
global $user;
global $pwd;
global $db;

include('../login.php');
$auth = new AuthClass();

require_once __DIR__ . '/../lib/Logger/ErrorLogger.php';
require_once __DIR__ . '/../lib/OracleDB/OracleDatabase.php';

$ajaxAction = $_POST['ajax_action'] ?? '';
$logger = new ErrorLogger();
$database = new OracleDatabase($user, $pwd, $db);

function executeOracleAction(
    string $action,
    array $parameters,
    callable $oracleCall,
    bool $jsonResponse,
    OracleDatabase $database,
    ErrorLogger $logger
): void {
    try {
        $result = $oracleCall();
        echo $jsonResponse ? json_encode($result, JSON_UNESCAPED_UNICODE) : $result;
    } catch (Throwable $exception) {
        $logger->error($action, $exception->getMessage(), $exception->getCode(), ['parameters' => $parameters]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'railway_add_info') {
    $oracleParams = [
        'railway_id' => $_POST['railway_id'] ?? null,
    ];

    try {
        if ($oracleParams['railway_id'] === null || $oracleParams['railway_id'] === '') {
            throw new Exception('Не заполнен параметр: railway_id');
        }

        $result = $database->fetchAll(
            'select * from table(xx_dislocation.get_railway_add_info(:railway_id))',
            $oracleParams
        );

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error(
            $ajaxAction,
            $exception->getMessage(),
            $exception->getCode(),
            ['parameters' => $oracleParams]
        );
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'change_parent_for_railway') {
    $oracleParams = [
        'id' => $_POST['id'] ?? null,
        'type' => $_POST['type'] ?? null,
        'new_parent_id' => $_POST['new_parent_id'] ?? null,
        'new_parent_type' => $_POST['new_parent_type'] ?? null,
    ];

    try {
        $requiredParams = ['id', 'type', 'new_parent_id', 'new_parent_type'];
        foreach ($requiredParams as $paramName) {
            if ($oracleParams[$paramName] === null || $oracleParams[$paramName] === '') {
                throw new Exception('Не заполнен параметр: ' . $paramName);
            }
        }

        $result = $database->callFunction(
            'begin :result := xx_dislocation.change_parent_for_railway('
                . ':id, :type, :new_parent_id, :new_parent_type); end;',
            $oracleParams,
            ['length' => 1000000]
        );

        echo $result;
    } catch (Throwable $exception) {
        $logger->error(
            $ajaxAction,
            $exception->getMessage(),
            $exception->getCode(),
            ['parameters' => $oracleParams]
        );
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'add_user') {
    $oracleParams = [
        'login' => $_POST['login'] ?? null,
        'full_name' => $_POST['full_name'] ?? null,
        'enterprise' => $_POST['enterprise'] ?? null,
        'division' => $_POST['division'] ?? null,
        'change_pwd' => $_POST['change_pwd'] ?? null,
        'open' => $_POST['open'] ?? null,
        'phone_num' => $_POST['phone_num'] ?? null,
        'default_station' => $_POST['default_station'] ?? null,
        'stations' => $_POST['stations'] ?? null,
        'credentials' => $_POST['credentials'] ?? null,
        'user_email' => $_POST['user_email'] ?? null,
    ];

    try {
        $result = $database->callFunction(
            'begin :result := xx_dislocation.add_user('
                . ':login, :full_name, :enterprise, :division, :change_pwd, :open, '
                . ':phone_num, :default_station, :stations, :credentials, :user_email); end;',
            $oracleParams,
            ['length' => 1000000]
        );

        echo $result;
    } catch (Throwable $exception) {
        $logger->error(
            $ajaxAction,
            $exception->getMessage(),
            $exception->getCode(),
            ['parameters' => $oracleParams]
        );
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'change_user') {
    $oracleParams = [
        'user_id' => $_POST['user_id'] ?? null,
        'login' => $_POST['login'] ?? null,
        'full_name' => $_POST['full_name'] ?? null,
        'enterprise' => $_POST['enterprise'] ?? null,
        'division' => $_POST['division'] ?? null,
        'change_pwd' => $_POST['change_pwd'] ?? null,
        'open' => $_POST['open'] ?? null,
        'phone_num' => $_POST['phone_num'] ?? null,
        'default_station' => $_POST['default_station'] ?? null,
        'stations' => $_POST['stations'] ?? null,
        'credentials' => $_POST['credentials'] ?? null,
        'user_email' => $_POST['user_email'] ?? null,
    ];

    try {
        $result = $database->callFunction(
            'begin :result := xx_dislocation.change_user('
                . ':user_id, :login, :full_name, :enterprise, :division, :change_pwd, :open, '
                . ':phone_num, :default_station, :stations, :credentials, :user_email); end;',
            $oracleParams,
            ['length' => 1000000]
        );

        echo $result;
    } catch (Throwable $exception) {
        $logger->error(
            $ajaxAction,
            $exception->getMessage(),
            $exception->getCode(),
            ['parameters' => $oracleParams]
        );
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'add_railway') {
    $oracleParams = [];
    foreach (['parent_id', 'parent_type', 'number', 'purpose', 'pointer_from', 'pointer_to', 'length_limit', 'length_useful', 'capacity', 'add_field1', 'add_field2', 'add_field3', 'disabled', 'type'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.add_railway(:parent_id, :parent_type, :number, :purpose, :pointer_from, :pointer_to, :length_limit, :length_useful, :capacity, :add_field1, :add_field2, :add_field3, :disabled, :type); end;',
            $oracleParams
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'change_railway_attr') {
    $oracleParams = [];
    foreach (['railway_id', 'number', 'purpose', 'pointer_from', 'pointer_to', 'length_limit', 'length_useful', 'capacity', 'add_field1', 'add_field2', 'add_field3', 'disabled', 'type'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.change_railway_attr(:railway_id, :number, :purpose, :pointer_from, :pointer_to, :length_limit, :length_useful, :capacity, :add_field1, :add_field2, :add_field3, :disabled, :type); end;',
            $oracleParams
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_stations') {
    $oracleParams = [];
    try {
        echo json_encode($database->fetchAll('select * from table(xx_dislocation.getStations)'), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'add_point') {
    $oracleParams = [];
    foreach (['parent_id', 'parent_type', 'name', 'descr'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.add_point(:parent_id, :parent_type, :name, :descr); end;',
            $oracleParams
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'change_order_for_railway') {
    $oracleParams = [];
    foreach (['id', 'type', 'action'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.change_order_for_railway(:id, :type, :action); end;',
            $oracleParams,
            ['length' => 100]
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_credentials') {
    $oracleParams = [];
    try {
        echo json_encode($database->fetchAll('select * from table(xx_dislocation.get_credentials)'), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}
if ($ajaxAction === 'get_credential_descr') {
    $oracleParams = ['credential_id' => $_POST['credential_id'] ?? null];
    try {
        echo json_encode($database->fetchAll(
            'select * from table(xx_dislocation.get_credential_descr_new(:credential_id))',
            $oracleParams
        ), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'save_new_credential') {
    $oracleParams = [
        'user_id' => $auth->getUserId(),
        'params' => $_POST['params'] ?? null,
    ];
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.save_new_credential_new(:user_id, :params); end;',
            $oracleParams,
            ['length' => 100]
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}


if ($ajaxAction === 'old_save_new_credential') {
    $oracleParams = [
        'bind2' => $_POST['credential_name'] ?? null,
        'bind3' => $_POST['moving_inside_railway'] ?? null,
        'bind4' => $_POST['moving_inside_shop'] ?? null,
        'bind5' => $_POST['moving_inside_station'] ?? null,
        'bind6' => $_POST['moving_between_station'] ?? null,
        'bind7' => $_POST['change_attribute'] ?? null,
        'bind8' => $_POST['change_weight'] ?? null,
        'bind9' => $_POST['enter_inspection'] ?? null,
        'bind10' => $_POST['enter_inspection_add'] ?? null,
        'bind11' => $_POST['register_notification'] ?? null,
        'bind12' => $_POST['entry_foreign_car'] ?? null,
        'bind13' => $_POST['administrator'] ?? null,
        'bind14' => $_POST['receive_to_station'] ?? null,
        'bind15' => $_POST['work_with_groups'] ?? null,
        'bind16' => $_POST['out_from_ugl'] ?? null,
        'bind17' => $_POST['add_attribute'] ?? null,
        'bind18' => $_POST['create_request'] ?? null,
        'bind19' => $_POST['change_request'] ?? null,
        'bind20' => $_POST['view_request'] ?? null,
        'bind21' => $_POST['complete_request'] ?? null,
        'bind22' => $_POST['del_ins_doc'] ?? null,
        'bind23' => $_POST['return_from_psp'] ?? null,
        'bind24' => $_POST['autocreate_request_v'] ?? null,
        'bind25' => $_POST['autocreate_request_o'] ?? null,
        'bind26' => $_POST['autocreate_request_t'] ?? null,
        'bind27' => $_POST['weigh_import'] ?? null,
        'bind28' => $_POST['weigh_import_corr'] ?? null,
        'bind29' => $_POST['weigh_delete'] ?? null,
        'bind30' => $_POST['export_shop_info'] ?? null,
        'bind31' => $_POST['create_invoice_out'] ?? null,
        'bind32' => $_POST['send_invoice_to_etran'] ?? null,
        'bind33' => $_POST['register_notification_gu'] ?? null,
        'bind34' => $_POST['route_add'] ?? null,
        'bind35' => $_POST['route_processing'] ?? null,
        'bind36' => $_POST['route_closing'] ?? null,
        'bind37' => $_POST['output_defective_cars'] ?? null,
        'bind38' => $_POST['export_notification_gu'] ?? null,
        'bind39' => $_POST['fix_dev_rule'] ?? null,
        'bind40' => $_POST['fix_dev_place'] ?? null,
        'bind41' => $_POST['enter_dev_inspection'] ?? null,
        'bind42' => $_POST['fix_dev_add'] ?? null,
        'bind43' => $_POST['fix_dev_undock'] ?? null,
        'bind44' => $_POST['fix_dev_update'] ?? null,
        'bind45' => $_POST['shift_update'] ?? null,
        'bind46' => $_POST['control_cars'] ?? null,
        'bind47' => $_POST['weighing_dispatcher'] ?? null,
        'bind48' => $_POST['process_of_wagons'] ?? null,
        'bind49' => $_POST['update_of_nsi'] ?? null,
        'bind50' => $_POST['export_samples'] ?? null,
        'bind51' => $_POST['entry_foreign_cont'] ?? null,
        'bind52' => $_POST['scale_type_1831_manual'] ?? null,
    ];
    $sql = '
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
			
			
			
			
			:result:=xx_dislocation.save_new_credential(l_add_data);

		end;';
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams, $sql) {
        return $database->callFunction($sql, $oracleParams, ['length' => 100]);
    }, false, $database, $logger);
}

if ($ajaxAction === 'change_credential') {
    $oracleParams = [
        'bind2' => $_POST['credential_id'] ?? null,
        'bind3' => $_POST['credential_name'] ?? null,
        'bind4' => $_POST['moving_inside_railway'] ?? null,
        'bind5' => $_POST['moving_inside_shop'] ?? null,
        'bind6' => $_POST['moving_inside_station'] ?? null,
        'bind7' => $_POST['moving_between_station'] ?? null,
        'bind8' => $_POST['change_attribute'] ?? null,
        'bind9' => $_POST['change_weight'] ?? null,
        'bind10' => $_POST['enter_inspection'] ?? null,
        'bind11' => $_POST['enter_inspection_add'] ?? null,
        'bind12' => $_POST['register_notification'] ?? null,
        'bind13' => $_POST['entry_foreign_car'] ?? null,
        'bind14' => $_POST['administrator'] ?? null,
        'bind15' => $_POST['receive_to_station'] ?? null,
        'bind16' => $_POST['work_with_groups'] ?? null,
        'bind17' => $_POST['out_from_ugl'] ?? null,
        'bind18' => $_POST['add_attribute'] ?? null,
        'bind19' => $_POST['create_request'] ?? null,
        'bind20' => $_POST['change_request'] ?? null,
        'bind21' => $_POST['view_request'] ?? null,
        'bind22' => $_POST['complete_request'] ?? null,
        'bind23' => $_POST['del_ins_doc'] ?? null,
        'bind24' => $_POST['return_from_psp'] ?? null,
        'bind25' => $_POST['autocreate_request_v'] ?? null,
        'bind26' => $_POST['autocreate_request_o'] ?? null,
        'bind27' => $_POST['autocreate_request_t'] ?? null,
        'bind28' => $_POST['weigh_import'] ?? null,
        'bind29' => $_POST['weigh_import_corr'] ?? null,
        'bind30' => $_POST['weigh_delete'] ?? null,
        'bind31' => $_POST['export_shop_info'] ?? null,
        'bind32' => $_POST['create_invoice_out'] ?? null,
        'bind33' => $_POST['send_invoice_to_etran'] ?? null,
        'bind34' => $_POST['register_notification_gu'] ?? null,
        'bind35' => $_POST['route_add'] ?? null,
        'bind36' => $_POST['route_processing'] ?? null,
        'bind37' => $_POST['route_closing'] ?? null,
        'bind38' => $_POST['output_defective_cars'] ?? null,
        'bind39' => $_POST['export_notification_gu'] ?? null,
        'bind40' => $_POST['fix_dev_rule'] ?? null,
        'bind41' => $_POST['fix_dev_place'] ?? null,
        'bind42' => $_POST['enter_dev_inspection'] ?? null,
        'bind43' => $_POST['fix_dev_add'] ?? null,
        'bind44' => $_POST['fix_dev_undock'] ?? null,
        'bind45' => $_POST['fix_dev_update'] ?? null,
        'bind46' => $_POST['shift_update'] ?? null,
        'bind47' => $_POST['control_cars'] ?? null,
        'bind48' => $_POST['weighing_dispatcher'] ?? null,
        'bind49' => $_POST['process_of_wagons'] ?? null,
        'bind50' => $_POST['update_of_nsi'] ?? null,
        'bind51' => $_POST['export_samples'] ?? null,
        'bind52' => $_POST['entry_foreign_cont'] ?? null,
        'bind53' => $_POST['scale_type_1831_manual'] ?? null,
    ];
    $sql = '
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
			
			
			
			
		   
			:result:=xx_dislocation.change_credential(:bind2,l_add_data);

		end;';
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams, $sql) {
        return $database->callFunction($sql, $oracleParams, ['length' => 1000]);
    }, false, $database, $logger);
}

if ($ajaxAction === 'delete_credential') {
    $oracleParams = ['credential_id' => $_POST['credential_id'] ?? null];
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.delete_credential(:credential_id); end;',
            $oracleParams,
            ['length' => 100]
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_users') {
    $oracleParams = [];
    try {
        echo json_encode($database->fetchAll('select * from table(xx_dislocation.get_users)'), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_user_descr') {
    $oracleParams = ['user_id' => $_POST['user_id'] ?? null];
    try {
        echo json_encode($database->fetchAll(
            'select * from table(xx_dislocation.get_user_descr(:user_id))',
            $oracleParams
        ), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_ins_doc_types') {
    $oracleParams = [];
    try {
        echo json_encode($database->fetchAll('select * from table(xx_dislocation.get_ins_doc_types)'), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'change_ins_doc_type') {
    $oracleParams = [];
    foreach (['type_id', 'name', 'descr', 'storage_life'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.change_ins_doc_type(:type_id, :name, :descr, :storage_life); end;',
            $oracleParams
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'create_new_ins_doc_type') {
    $oracleParams = [];
    try {
        echo $database->callFunction('begin :result := xx_dislocation.create_new_ins_doc_type(); end;');
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'del_ins_doc_type') {
    $oracleParams = ['type_id' => $_POST['type_id'] ?? null];
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.del_ins_doc_type(:type_id); end;',
            $oracleParams
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_rail_services_rgd') {
    $oracleParams = [];
    try {
        echo json_encode($database->fetchAll('select * from table(xx_dislocation.get_rail_services_rgd)'), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'save_rail_service_rgd') {
    $oracleParams = ['user_id' => $auth->getUserId()];
    foreach (['id', 'code', 'category', 'beg_date', 'end_date'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.save_rail_service_rgd(:user_id, :id, :code, :category, :beg_date, :end_date); end;',
            $oracleParams
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'del_rail_service_rgd') {
    $oracleParams = ['id' => $_POST['id'] ?? null];
    try {
        echo $database->callFunction('begin :result := xx_dislocation.del_rail_service_rgd(:id); end;', $oracleParams);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_rail_services') {
    $oracleParams = [];
    try {
        echo json_encode($database->fetchAll('select * from table(xx_dislocation.get_rail_services)'), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'save_rail_service') {
    $oracleParams = ['user_id' => $auth->getUserId()];
    foreach (['id', 'code', 'descr', 'descr_full', 'beg_date', 'end_date', 'service_rgd_id', 'request_tasks'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    try {
        echo $database->callFunction(
            'begin :result := xx_dislocation.save_rail_service(:user_id, :id, :code, :descr, :descr_full, :beg_date, :end_date, :service_rgd_id, :request_tasks); end;',
            $oracleParams
        );
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'del_rail_service') {
    $oracleParams = ['id' => $_POST['id'] ?? null];
    try {
        echo $database->callFunction('begin :result := xx_dislocation.del_rail_service(:id); end;', $oracleParams);
    } catch (Throwable $exception) {
        $logger->error($ajaxAction, $exception->getMessage(), $exception->getCode(), ['parameters' => $oracleParams]);
        http_response_code(500);
        echo 'Ошибка выполнения операции';
    } finally {
        $database->close();
    }
    exit;
}

if ($ajaxAction === 'get_rail_contracts') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        return $database->fetchAll('select * from table(xx_dislocation.get_rail_contracts)');
    }, true, $database, $logger);
}

if ($ajaxAction === 'save_rail_contract') {
    $oracleParams = ['user_id' => $auth->getUserId()];
    foreach (['id', 'num', 'descr', 'owner', 'freight_owner', 'freight_owner_short', 'beg_date', 'end_date'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction(
            'begin :result := xx_dislocation.save_rail_contract(:user_id, :id, :num, :descr, :owner, :freight_owner, :freight_owner_short, :beg_date, :end_date); end;',
            $oracleParams
        );
    }, false, $database, $logger);
}

if ($ajaxAction === 'del_rail_contract') {
    $oracleParams = ['id' => $_POST['id'] ?? null];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction('begin :result := xx_dislocation.del_rail_contract(:id); end;', $oracleParams);
    }, false, $database, $logger);
}

if ($ajaxAction === 'get_rail_contract_dop') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        return $database->fetchAll('select * from table(xx_dislocation.get_rail_contract_dop)');
    }, true, $database, $logger);
}

if ($ajaxAction === 'save_rail_contract_dop') {
    $oracleParams = ['user_id' => $auth->getUserId()];
    foreach (['id', 'num', 'descr', 'beg_date', 'end_date', 'contract_id'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction(
            'begin :result := xx_dislocation.save_rail_contract_dop(:user_id, :id, :num, :descr, :beg_date, :end_date, :contract_id); end;',
            $oracleParams
        );
    }, false, $database, $logger);
}

if ($ajaxAction === 'del_rail_contract_dop') {
    $oracleParams = ['id' => $_POST['id'] ?? null];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction('begin :result := xx_dislocation.del_rail_contract_dop(:id); end;', $oracleParams);
    }, false, $database, $logger);
}

if ($ajaxAction === 'get_rail_contract_change') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        return $database->fetchAll('select * from table(xx_dislocation.get_rail_contract_change)');
    }, true, $database, $logger);
}

if ($ajaxAction === 'get_rail_parent_contracts') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        return $database->fetchAll('select * from table(xx_dislocation.get_rail_parent_contracts)');
    }, true, $database, $logger);
}

if ($ajaxAction === 'save_rail_contract_change') {
    $oracleParams = ['user_id' => $auth->getUserId()];
    foreach (['id', 'num', 'descr', 'beg_date', 'end_date', 'contract_id'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction(
            'begin :result := xx_dislocation.save_rail_contract_change(:user_id, :id, :num, :descr, :beg_date, :end_date, :contract_id); end;',
            $oracleParams
        );
    }, false, $database, $logger);
}

if ($ajaxAction === 'del_rail_contract_change') {
    $oracleParams = ['id' => $_POST['id'] ?? null];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction('begin :result := xx_dislocation.del_rail_contract_change(:id); end;', $oracleParams);
    }, false, $database, $logger);
}

if ($ajaxAction === 'get_rail_contract_services') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        return $database->fetchAll('select * from table(xx_dislocation.get_rail_contract_services)');
    }, true, $database, $logger);
}

if ($ajaxAction === 'get_rail_parent_contracts_add') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        return $database->fetchAll('select * from table(xx_dislocation.get_rail_parent_contracts_add)');
    }, true, $database, $logger);
}

if ($ajaxAction === 'save_rail_contract_services') {
    $oracleParams = ['user_id' => $auth->getUserId()];
    foreach (['id', 'contract_id', 'service_id', 'ei', 'ei_descr', 'cost', 'cost_nds'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction(
            'begin :result := xx_dislocation.save_rail_contract_services(:user_id, :id, :contract_id, :service_id, :ei, :ei_descr, :cost, :cost_nds); end;',
            $oracleParams
        );
    }, false, $database, $logger);
}

if ($ajaxAction === 'del_rail_contract_services') {
    $oracleParams = ['id' => $_POST['id'] ?? null];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction('begin :result := xx_dislocation.del_rail_contract_services(:id); end;', $oracleParams);
    }, false, $database, $logger);
}

if ($ajaxAction === 'add_area') {
    $oracleParams = [];
    foreach (['parent_id', 'parent_type', 'name', 'descr'] as $name) {
        $oracleParams[$name] = $_POST[$name] ?? null;
    }
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction(
            'begin :result := xx_dislocation.add_area(:parent_id, :parent_type, :name, :descr); end;',
            $oracleParams
        );
    }, false, $database, $logger);
}

if ($ajaxAction === 'get_periods') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        $rows = $database->fetchAll('select * from table(xx_dislocation.get_periods)');
        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'PER_ID' => $row['PER_ID'],
                'PERIOD' => $row['PERIOD'],
                'PER_MONTH' => $row['PER_MONTH'],
                'PER_YEAR' => $row['PER_YEAR'],
                'PER_FROM' => $row['PER_FROM'],
                'PER_TO' => $row['PER_TO'],
                'PERIOD_CLOSING' => $row['PERIOD_CLOSING'],
            ];
        }
        return $result;
    }, true, $database, $logger);
}

if ($ajaxAction === 'get_period_closing') {
    $oracleParams = ['period_id' => $_POST['period_id'] ?? null];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->fetchAll(
            'select * from table(xx_dislocation.get_period_closing(:period_id))',
            $oracleParams
        );
    }, true, $database, $logger);
}

if ($ajaxAction === 'get_period_status') {
    $oracleParams = [];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database) {
        return $database->fetchAll('select * from table(xx_dislocation.get_period_status)');
    }, true, $database, $logger);
}

if ($ajaxAction === 'save_period_status') {
    $oracleParams = [
        'period_id' => $_POST['period_id'] ?? null,
        'oper_id' => $_POST['oper_id'] ?? null,
        'status_id' => $_POST['status_id'] ?? null,
        'user_id' => $auth->getUserId(),
    ];
    executeOracleAction($ajaxAction, $oracleParams, function () use ($database, $oracleParams) {
        return $database->callFunction(
            'begin :result := xx_dislocation.save_period_status(:period_id, :oper_id, :status_id, :user_id); end;',
            $oracleParams
        );
    }, false, $database, $logger);
}
