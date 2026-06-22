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
    

];