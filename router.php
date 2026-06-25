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
    'get_car_color_select'   => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'get_control_code_cause' => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'get_control_standart'   => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'save_control_car'       => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],
    'delete_control_car'     => ['control/CarControl/CarControlRepository.php', 'CarControlRepository'],

    // ------------------------------------------------------------------
    // Контроль простоев
    // ------------------------------------------------------------------
    'get_idle_control_list'  => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],
    'get_idle_reason_list'   => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],
    'save_idle_control'      => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],
    'delete_idle_control'    => ['control/IdleControl/IdleControlRepository.php', 'IdleControlRepository'],

    // ------------------------------------------------------------------
    // ГУ-23 · Акты общей формы
    // ------------------------------------------------------------------
    'gu23_get_refs'        => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_get_acts'        => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_get_act'         => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_get_open_starts' => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_get_by_wagon'    => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_get_wagon_info'  => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_save_act'        => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_del_act'         => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_annul_act'       => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_upload_file'     => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_del_file'        => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_search_station'  => ['gu23/GuActRepository.php', 'GuActRepository'],
    'gu23_send_approval'   => ['gu23/GuActRepository.php', 'GuActRepository'],

];