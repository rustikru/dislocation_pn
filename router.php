<?php
/**
 * router.php — карта ajax_action → репозиторий
 *
 * Формат каждой записи:
 *   'ajax_action' => ['путь/до/файла.php', 'ИмяКласса']
 *
 */
return [

    // ------------------------------------------------------------------
    // Контроль вагонов
    // ------------------------------------------------------------------
    'get_car_color_select' => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'get_control_code_cause' => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'get_control_standart' => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'save_control_car' => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'delete_control_car' => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],

    // ------------------------------------------------------------------
    // Контроль простоев
    // ------------------------------------------------------------------
    'get_idle_control_list' => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],
    'get_idle_reason_list' => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],
    'save_idle_control' => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],
    'delete_idle_control' => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],

    // ------------------------------------------------------------------
    // ГУ-23 · Акты общей формы
    // ------------------------------------------------------------------
    'gu23_get_refs' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_get_acts' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_get_act' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_get_open_starts' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_get_by_wagon' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_get_wagon_info' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_save_act' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_del_act' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_annul_act' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_upload_file' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_del_file' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_search_station' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_send_approval' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_approve_in_app' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_close_act' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],

    // ------------------------------------------------------------------
    // ГУ-23 · Справочники (администрирование)
    // ------------------------------------------------------------------
    'gu23_resend_approval' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_refs_get_all' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_ref_signer_save' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_ref_signer_toggle' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_ref_reason_save' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_ref_reason_toggle' => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    // ------------------------------------------------------------------
    // ГУ-23 · Роли и полномочия (администрирование)
    // ------------------------------------------------------------------
    'gu23_roles_users'  => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_role_assign'  => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_role_revoke'  => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_role_perms'   => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_perm_assign'  => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
    'gu23_perm_revoke'  => ['gu23/classes/GuActRepository.php', 'GuActRepository'],
];
