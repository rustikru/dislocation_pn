create or replace package xx_etw.xx_dislocation authid current_user is
    /******************************************************************************
       name:
       purpose:

       revisions:
       ver        date        author           description
       ---------  ----------  ---------------  ------------------------------------
       1.0        18.10.2015  KuchukbaevRF     1. created this package.
    ******************************************************************************/
   g_debug boolean := true;
   g_create_work_request boolean := true;
   g_create_work_dev_request boolean := true;
   g_del_req_1_d varchar2(50) := '$';
   g_del_req_2_d varchar2(50) := '@';
   g_del_req_3_d varchar2(50) := '|';
   g_del_req_4_d varchar2(50) := '#';
   g_del_req_1 varchar2(50) := '[^'
                               || g_del_req_1_d
                               || ']+';
   g_del_req_2 varchar2(50) := '[^'
                               || g_del_req_2_d
                               || ']+';
   g_del_req_3 varchar2(50) := '[^'
                               || g_del_req_3_d
                               || ']+';
   g_del_req_4 varchar2(50) := '[^'
                               || g_del_req_4_d
                               || ']+';
   procedure log_new (
      p_log_id       number,
      p_log_function varchar2,
      p_descr        varchar2
   );

   function boolean_to_char (
      status in boolean
   ) return varchar2;

   function get_user_cred_rights_val (
      p_user_id     in number,
      p_rights_code in varchar2
   ) return varchar2;

   function get_railways_name (
      p_railway_id number
   ) return varchar2;

   function returndate_arrive (
      p_round_id number
   ) return date;

   function get_railcar_type (
      p_round_id number
   ) return number;                                /*0-�����, 1-���������*/

    /*���������� ��������� � ������. ���� ��� ���� ����� ������ "_" ��������� null*/
   function get_substr (
      p_str varchar2,
      p_del varchar2,
      p_num number
   ) return varchar2;

   type t_xx_result is record (
         done  boolean,
         descr varchar2(4000)
   );
   type t_cars_table is
      table of varchar2(100);
   type t_nums is
      table of number;

    /***************/
   type t_xx_credential_descr_table is
      table of xx_disl_credential%rowtype;

    /***************/
   type t_xx_user_descr_row is record (
         id                   xx_disl_users.id%type,
         login                xx_disl_users.login%type,
         password             xx_disl_users.password%type,
         full_name            xx_disl_users.full_name%type,
         flag_change_pwd      xx_disl_users.flag_change_pwd%type,
         enterprise           xx_disl_users.enterprise%type,
         division_id          xx_disl_users.division_id%type,
         open                 xx_disl_users.open%type,
         phone_num            xx_disl_users.phone_num%type,
         user_default_station number,
         user_stations        varchar2(200),
         user_credentials     varchar2(200)
   );
   type t_xx_user_descr_table is
      table of t_xx_user_descr_row;

    /***************/
   type t_xx_inv_row is record (
         invoice_id  number,
         inv_number  varchar2(20),
         cont_number varchar2(200),
         owner       varchar2(50)
   );
   type t_xx_inv_table is
      table of t_xx_inv_row;

    /***************/
   type t_xx_tree_row is record (
         id                    xx_disl_relations.id%type,
         type                  xx_disl_relations.type%type,
         parent_id             xx_disl_relations.parent_id%type,
         parent_type           xx_disl_relations.parent_type%type,
         r_order               xx_disl_relations.r_order%type,
         name                  xx_disl_union_name_v.name%type,
         count_railcars        number,
         free_length           number,              /*��������� ����� ����*/
         from_station          xx_disl_stations.short_name%type,
         from_station_id       xx_disl_stations.station_id%type,
         need_fill_attr        varchar(1),
         notification          varchar(1),
         disabled              varchar(1),
         like_railway          varchar(1),
         not_info_from_shop    varchar2(1),
         lvl                   number,
         notification_gu       varchar(20),
         true_number           varchar2(1),
         count_fix_dev_even    number,
         count_fix_dev_odd     number,
         car_type_control      varchar2(1),
         car_control_note      varchar2(2400),
         car_control_color     varchar2(240),
         car_control_kw        varchar2(50),
         output_defective_cars varchar2(1),
         movement_un_loading   varchar2(1)
   );
   type t_xx_tree_table is
      table of t_xx_tree_row;

    /***************/
   type t_xx_railway_for_request_row is record (
         id       xx_disl_relations.id%type,
         type     xx_disl_relations.type%type,
         name     xx_disl_union_name_v.name%type,
         disabled varchar(1),
         lvl      number
   );
   type t_xx_railway_for_request_table is
      table of t_xx_railway_for_request_row;

    /***************/
   type t_xx_child_row_add_info is record (
         id                        varchar2(100),
         obj_type                  varchar2(20),
         name                      varchar2(200),
         foreign_car               varchar2(1),
         r_order                   number,
         inv_number                varchar2(200),
         status                    varchar2(200),
         state                     varchar2(200),
         car_type                  varchar2(200),
         freight_name              varchar2(200),
         weight_net                number,
         arrive_weight_net         number,
         weight_dep                number,
         weight_gross              number,
         cont                      varchar2(200),
         cont_count                number,
         owner                     varchar2(200),
         date_arrive               varchar2(20),
         date_last_oper            varchar2(20),
         date_loading              xx_etw.xx_disl_obj_add_info_tmp.date_loading%type,
         car_length                number,
         cont_with_ins             varchar2(500),
         scale_weight_dep          number,
         scale_weight_gross        number,
         scale_weight_dep_add      varchar2(1),
         scale_weight_gross_add    varchar2(1),
         can_create_return_invoice xx_etw.xx_disl_obj_add_info_tmp.can_create_return_invoice%type,
         railcar_type              number,
         round_id                  number,
         scale_type_id             number,
         un_loading_subs           varchar2(10), -- ��������/��������� ��� ����������� �� ���������� �����
         inv_from_ugl              varchar2(50), -- ��� ������� �����������
         cond_length_train         xx_etw.xx_disl_obj_add_info_tmp.cond_length_train%type -- add 26.09.2024 �� ������ 0000064852 "�������� ����� ������"
   );
   type t_xx_child_table_add_info is
      table of t_xx_child_row_add_info;

    /***************/
   type t_xx_child_row_add_info_gu is record (
         id                varchar2(100),
         obj_type          varchar2(20),
         name              varchar2(200),
         freight_name      varchar2(200),
         weight_net        number,
         weight_dep        number,
         weight_gross      number,
         cont              varchar2(200),
         cont_from_inv     varchar2(200),
         car_length        number,
         cond_length_train xx_etw.xx_disl_obj_add_info_tmp.cond_length_train%type, -- add 26.09.2024 �� ������ 0000064852 "�������� ����� ������"
         csl               varchar2(4000)
   );
   type t_xx_child_table_add_info_gu is
      table of t_xx_child_row_add_info_gu;

    /***************/
   type t_xx_car_cont_add_info_row is record (
         car_number        varchar2(10),
         cont_number       varchar2(20),
         freight_name      varchar2(200),
         weight_net        number,
         arrive_weight_net number,
         weight_dep        number,
         weight_gross      number,
         refusal           varchar2(200),
         exists_post       varchar2(1),
         car_tonnage       number,
         refusal_akm       xx_etw.xx_disl_car_cont_add_info_tmp.refusal_akm%type,
         accepted_weight   xx_etw.xx_disl_car_cont_add_info_tmp.accepted_weight%type
   );
   type t_xx_car_cont_add_info_table is
      table of t_xx_car_cont_add_info_row;

    /***************/

   type t_xx_invoices is
      table of number;

    /***************/
   type t_xx_coming_car_row is record (
         id   number,
         name varchar2(200),
         type varchar2(15)
   );
   type t_xx_coming_car_table is
      table of t_xx_coming_car_row;

    /***************/
   type t_xx_user_row is record (
         user_id                  number,
         full_name                varchar2(100),
         password                 varchar2(32),
         flag_change_pwd          varchar2(1),
         enterprise               number,
         shunting_operation       number,
         enter_enemy_railcars     number,
         change_add_info          number,
         administrator            varchar2(1),
         moving_inside_railway    varchar2(1),
         moving_inside_shop       varchar2(1),
         moving_inside_station    varchar2(1),
         moving_between_station   varchar2(1),
         change_attribute         varchar2(1),
         change_weight            varchar2(1),
         enter_inspection         varchar2(1),
         enter_inspection_add     varchar2(1),
         enter_dev_inspection     varchar2(1),
         register_notification    varchar2(1),
         entry_foreign_car        varchar2(1),
         receive_to_station       varchar2(1),
         work_with_groups         varchar2(1),
         out_from_ugl             varchar2(1),
         add_attribute            varchar2(1),
         create_request           varchar2(1),
         change_request           varchar2(1),
         view_request             varchar2(1),
         complete_request         varchar2(1),
         del_ins_doc              varchar2(1),
         return_from_psp          varchar2(1),
         autocreate_request_v     varchar2(1),
         autocreate_request_o     varchar2(1),
         autocreate_request_t     varchar2(1),
         weigh_import             varchar2(1),
         weigh_import_corr        varchar2(1),
         weigh_delete             varchar2(1),
         export_shop_info         varchar2(1),
         create_invoice_out       varchar2(1),
         send_invoice_to_etran    varchar2(1),
         register_notification_gu varchar2(1),
         route_add                varchar2(1),
         route_processing         varchar2(1),
         route_closing            varchar2(1),
         output_defective_cars    varchar2(1),
         export_notification_gu   varchar2(1),
         fix_dev_rule             varchar2(1),
         fix_dev_place            varchar2(1),
         fix_dev_add              varchar2(1),
         fix_dev_undock           varchar2(1),
         fix_dev_update           varchar2(1),
         shift_update             varchar2(1),
         control_cars             varchar2(1),
         weighing_dispatcher      varchar2(1),
         process_of_wagons        varchar2(1),
         update_of_nsi            varchar2(1),
         scale_type_1831_manual   varchar2(1),
         export_samples           varchar2(1),      -- �������� ���� � OeBS
         entry_foreign_cont       varchar2(1)    -- ������ ���� �����������
   );
   type t_xx_user_table is
      table of t_xx_user_row;

    /***************/
   type t_xx_station_row is record (
         id   number,
         name varchar2(100),
         def  varchar2(1)
   );
   type t_xx_station_table is
      table of t_xx_station_row;

    /***************/
   type t_xx_id_name_row is record (
         id   number,
         name varchar2(100)
   );
   type t_xx_id_name_table is
      table of t_xx_id_name_row;

    /***************/
    /***************/
   type t_xx_id_name_addition_row is record (
         id      number,
         name    varchar2(100),
         section varchar2(2400)
   );
   type t_xx_id_name_addition_table is
      table of t_xx_id_name_addition_row;

    /***************/
   type t_xx_railway_info_table is
      table of xx_disl_railways%rowtype;

    /***************/
   type t_xx_freight_list_table is
      table of xx_disl_freight_list_v%rowtype;

    /***************/
   type t_xx_scales_type_list_table is
      table of xx_disl_scales_type_v%rowtype;

    /***************/
   type t_xx_car_type_list_table is
      table of xx_disl_car_type_list%rowtype;

    /***************/
   type t_xx_train_drivers is
      table of xx_disl_train_drivers%rowtype;

    /***************/
   type t_xx_conductors is
      table of xx_disl_conductors%rowtype;

    /***************/
   type t_xx_locomotives is
      table of xx_disl_locomotives%rowtype;

    /***************/
   type t_xx_car_numbers is
      table of xx_disl_round.railcar_id%type;

    /***************/
   type t_xx_org_list_table is
      table of xx_disl_organisation%rowtype;

    /***************/

   type t_xx_location_of_car_row is record (
         car_number   xx_disl_relations.id%type,
         station      xx_disl_stations.name%type,
         location     varchar2(20),
         railway      varchar2(1000), --xx_disl_railways.railway_number%type
         status       varchar2(200),
         state        varchar2(200),
         freight_name varchar2(200),
         owner        varchar2(200)
   );
   type t_xx_location_of_car_table is
      table of t_xx_location_of_car_row;

    /***************/
   type t_xx_report_1_row is record (
         car_number   xx_disl_relations.id%type,
         station      xx_disl_stations.name%type,
         location     varchar2(20),
         railway      varchar2(1000), --xx_disl_railways.railway_number%type
         status       varchar2(200),
         state        varchar2(200),
         freight_name varchar2(200),
         owner        varchar2(200),
         date_arrive  varchar2(20),
         date_accept  varchar2(20)
   );
   type t_xx_report_1_table is
      table of t_xx_report_1_row;

    /***************/
   type t_xx_report_2_row is record (
         car_number   xx_disl_relations.id%type,
         station      xx_disl_stations.name%type,
         location     varchar2(20),
         railway      varchar2(1000), --xx_disl_railways.railway_number%type
         status       varchar2(200),
         state        varchar2(200),
         freight_name varchar2(200),
         owner        varchar2(200),
         date_oper    varchar2(20),
         err_type     varchar2(50),
         downtime     varchar2(20)
   );
   type t_xx_report_2_table is
      table of t_xx_report_2_row;

    /***************/

   type t_xx_report_3_row is record (
         car_number   xx_disl_relations.id%type,
         station      xx_disl_stations.name%type,
         location     varchar2(20),
         railway      varchar2(1000), --xx_disl_railways.railway_number%type
         status       varchar2(200),
         state        varchar2(200),
         freight_name varchar2(200),
         owner        varchar2(200),
         date_arrive  varchar2(20),
         date_accept  varchar2(20)
   );
   type t_xx_report_3_table is
      table of t_xx_report_3_row;
   type t_xx_report_4_row is record (
         car_number         xx_etw.xx_disl_relations.id%type,
         status             xx_etw.xx_disl_railcar_add_info.status%type,
         car_type           xx_etw.xx_disl_railcar_add_info.car_type%type,
         freight_name       xx_etw.xx_disl_railcar_add_info.freight_name%type,
         car_type_name      xx_etw.etw_car_nsi.car_type_name%type,
         car_owner_name     xx_etw.etw_car_nsi.car_owner_name%type,
         car_arendator_name xx_etw.etw_car_nsi.car_arendator_name%type
   );
   type t_xx_report_4_table is
      table of t_xx_report_4_row;
   function get_report_4_data (
      p_add_data in varchar2
   ) return t_xx_report_4_table
      pipelined;

   type t_xx_notification_table is
      table of xx_disl_notification_save%rowtype;

    /***************/
   type t_xx_car_from_shop_row is record (
         id                   number,
         date_post            varchar2(20),
         date_start           varchar2(20),
         date_end             varchar2(20),
         date_zayavka_uvod    varchar2(20),
         date_uvod            varchar2(20),
         who_looked           number,
         who_start            number,
         who_end              number,
         who_zayavka          number,
         who_looked_add       xx_etw.xx_disl_shop_info.who_looked%type,
         who_start_add        xx_etw.xx_disl_shop_info.who_start%type,
         who_end_add          xx_etw.xx_disl_shop_info.who_end%type,
         who_zayavka_add      xx_etw.xx_disl_shop_info.who_zayavka%type,
         refusal              varchar2(200),
         created_by           xx_disl_users.full_name%type,
         car_number           xx_disl_round.railcar_id%type,
         cont_number          xx_disl_cont_round.cont_number%type,
         freight_name         xx_disl_obj_add_info_tmp.freight_name%type,
         weight_net           xx_disl_obj_add_info_tmp.weight_net%type,
         arrive_weight_net    xx_disl_obj_add_info_tmp.weight_net%type,
         weight_dep           xx_disl_obj_add_info_tmp.weight_dep%type,
         weight_gross         xx_disl_obj_add_info_tmp.weight_gross%type,
         car_length           xx_disl_obj_add_info_tmp.car_length%type,
         batch_no             xx_etw.xx_disl_shop_info.batch_no%type,
         shop_info_id         number,
         cont_count           number,
         product              varchar2(200),
         car_tonnage          number,
         un_loading_from_subs xx_etw.xx_disl_shop_info.un_loading_from_subs%type,
         accepted_weight      xx_etw.xx_disl_shop_info.accepted_weight%type,
         define_task          xx_etw.xx_disl_shop_info.define_task%type,
         define_comment       xx_etw.xx_disl_shop_info.define_comment%type,
         round_id             xx_etw.xx_disl_shop_info.round_id%type,
         creation_date        xx_etw.xx_disl_shop_info.creation_date%type,
         last_update_by       xx_etw.xx_disl_shop_info.last_update_by%type,
         last_update_date     xx_etw.xx_disl_shop_info.last_update_date%type,
         who_looked_fio       xx_disl_users.full_name%type,
         who_start_fio        xx_disl_users.full_name%type,
         who_end_fio          xx_disl_users.full_name%type,
         who_zayavka_fio      xx_disl_users.full_name%type,
         otgruzka_1c_id       xx_etw.xx_disl_shop_info.otgruzka_1c_id%type
   );
   type t_xx_car_from_shop_table is
      table of t_xx_car_from_shop_row;

    /***************/

   type t_xx_cont_row is record (
         cont_number   xx_disl_cont_round.cont_number%type,
         cont_round_id xx_disl_cont_round.cont_round_id%type,
         status        xx_disl_cont_add_info.status%type,
         state         varchar2(10),
         freight_name  xx_disl_cont_add_info.freight_name%type,
         weight_net    xx_disl_cont_add_info.weight_net%type,
         weight_dep    xx_disl_cont_add_info.weight_dep%type,
         weight_gross  xx_disl_cont_add_info.weight_dep%type
   );
   type t_xx_cont_table is
      table of t_xx_cont_row;

    /***************/
    /******** beg ������ �������*******/
    /*beg ����� ������� �������*/
   type t_xx_place_row is record (
         flex_value         varchar2(2000),-- .flex_value%type,
         flex_value_meaning varchar2(2000),-- .flex_value_meaning%type,
         description        varchar2(2000)-- .description%type
   );
   type t_xx_place_table is
      table of t_xx_place_row;
   function get_place_inspection_cars return t_xx_place_table
      pipelined;

    /*end ����� ������� �������*/

    /*beg ������ �������� ���*/
   type t_xx_person_row is record (
         emp_id       xx_disl_users.id%type,  --hr_prod.prv_emp.emp_id%type,
         full_name    xx_disl_users.full_name%type, --hr_prod.prv_emp.full_name%type,
         dept_name    varchar2(1000),     --hr_prod.prv_emp.dept_name%type,
         appoint_name varchar2(1000)    --hr_prod.prv_emp.appoint_name%type
   );
   type t_xx_person_table is
      table of t_xx_person_row;
   function get_inspection_persons return t_xx_person_table
      pipelined;

    /*end ����� ������� �������*/

    /*beg ������ ����� ���*/
   type t_xx_master_row is record (
         emp_id       xx_disl_users.id%type,  --hr_prod.prv_emp.emp_id%type,
         full_name    xx_disl_users.full_name%type, --hr_prod.prv_emp.full_name%type,
         tab_num      varchar2(1000),       --hr_prod.prv_emp.tab_num%type,
         dept_name    varchar2(1000),     --hr_prod.prv_emp.dept_name%type,
         appoint_name varchar2(1000)    --hr_prod.prv_emp.appoint_name%type
   );
   type t_xx_master_table is
      table of t_xx_master_row;
   function get_masters return t_xx_master_table
      pipelined;

    /*end ������ ����� ���*/

    /*beg ������ ������*/
   type t_xx_asset_info_row is record (
         instance_id    number,
         asset_group_id number,
         asset_group    varchar2(2000), --inv.mtl_system_items_b.segment1%type,
         asset_number   varchar2(2000)  --csi.csi_item_instances.serial_number%type
   );
   type t_xx_asset_info_table is
      table of t_xx_asset_info_row;
   function get_asset_info (
      p_car_number varchar2
   ) return t_xx_asset_info_table
      pipelined;

    /*end ������ ������*/

    /*beg ���������*/
   type t_xx_priority_row is record (
         code  varchar2(100),
         descr varchar2(200)
   );
   type t_xx_priority_table is
      table of t_xx_priority_row;
   function get_priority return t_xx_priority_table
      pipelined;

    /*end ���������*/

    /*beg ��������� �������*/
   type t_xx_ins_result_row is record (
         code  varchar2(100),
         descr varchar2(200)
   );
   type t_xx_ins_result_table is
      table of t_xx_ins_result_row;
   function get_ins_results return t_xx_ins_result_table
      pipelined;

    /*end ��������� �������*/

    /*beg ������ ������������*/
   type t_xx_status_kurs_row is record (
         code  varchar2(100),
         descr varchar2(200)
   );
   type t_xx_status_kurs_table is
      table of t_xx_status_kurs_row;
   function get_status_kurs return t_xx_status_kurs_table
      pipelined;

    /*end ������ ������������*/
    /*beg �������������*/
   type t_xx_defect_row is record (
         code  varchar2(100),
         descr varchar2(200)
   );
   type t_xx_defect_table is
      table of t_xx_defect_row;
   function get_defects return t_xx_defect_table
      pipelined;

    /*end �������������*/
    /*beg ��������*/
   type t_xx_document_types_row is record (
         code  varchar2(100),
         descr varchar2(200)
   );
   type t_xx_document_types_table is
      table of t_xx_document_types_row;
   function get_document_types return t_xx_document_types_table
      pipelined;

    /*end ��������*/

    /********* beg ������� *********/
   type t_xx_period_row is record (
         per_id         number,
         period         varchar2(200),
         per_month      number,
         per_year       number,
         per_from       varchar2(100),
         per_to         varchar2(100),
         period_closing clob
   );
   type t_xx_period_table is
      table of t_xx_period_row;
   type t_xx_period_closing_row is record (
         operation_id     number,
         operation_desc   varchar2(200),
         status_id        number,
         status_descr     varchar2(200),
         last_update_by   varchar2(200),
         last_update_date varchar2(200)
   );
   type t_xx_period_closing_table is
      table of t_xx_period_closing_row;

    /*
        ��� ������ ��������� ������������ ��� ������.����.������� � �����
    */
   type t_xx_msg_to_user_row is record (
         type         xx_etw.xx_disl_message_to_users.type%type,
         text         xx_etw.xx_disl_message_to_users.text%type,
         created_by   xx_etw.xx_disl_message_to_users.created_by%type,
         created_date xx_etw.xx_disl_message_to_users.created_date%type
   );
   type t_xx_msg_to_user_table is
      table of t_xx_msg_to_user_row;

    --  ��� ������ ��������� ������������ ��� ������.����.������� � �����
   function get_msg_to_users return t_xx_msg_to_user_table
      pipelined;

   function get_period_status return t_xx_id_name_table
      pipelined;

   function get_periods return t_xx_period_table
      pipelined;

   function get_obj_owner (
      p_obj_id   number,
      p_obj_type varchar2
   ) return varchar2;

   function get_period_closing (
      p_period_id number
   ) return t_xx_period_closing_table
      pipelined;

   function get_user_full_name (
      p_user_id number
   ) return varchar2;

   function get_define_task (
      p_define_task_id number
   ) return varchar2;

   function save_period_status (
      p_period_id number,
      p_oper_id   number,
      p_status_id number,
      p_user_id   number
   ) return varchar2;

   function check_open_period (
      p_oper_id number,
      p_date    varchar2
   ) return varchar2;

    /********* end ������� *********/
    -- �������� ���� (� �������� ������� ��� ���)
   function openperiodcheck (
      p_org_id number,
      p_date   date
   ) return varchar;

   type t_xx_ins_doc_types_table is
      table of xx_disl_ins_doc_types%rowtype;
   function get_ins_doc_types return t_xx_ins_doc_types_table
      pipelined;

   function create_new_ins_doc_type return number;

   function change_ins_doc_type (
      p_type_id      number,
      p_name         varchar2,
      p_descr        varchar2,
      p_storage_life number
   ) return varchar2;

   function del_ins_doc_type (
      p_type_id number
   ) return varchar2;

   type t_xx_rail_services_rgd_row is record (
         id                xx_disl_rail_services_rgd.id%type,
         code              xx_disl_rail_services_rgd.code%type,
         category          xx_disl_rail_services_rgd.category%type,
         beg_date          varchar2(50),
         end_date          varchar2(50),
         created_by        varchar2(200),
         created_date      varchar2(50),
         last_updated_by   varchar2(200),
         last_updated_date varchar2(50),
         opened            varchar2(1)
   );
   type t_xx_rail_services_rgd_table is
      table of t_xx_rail_services_rgd_row;
   function get_rail_services_rgd return t_xx_rail_services_rgd_table
      pipelined;

   function save_rail_service_rgd (
      p_user_id  number,
      p_id       number,
      p_code     varchar2,
      p_category varchar2,
      p_beg_date varchar2,
      p_end_date varchar2
   ) return varchar2;

   function del_rail_service_rgd (
      p_id number
   ) return varchar2;

   type t_xx_rail_services_row is record (
         id                xx_disl_rail_services.id%type,
         code              xx_disl_rail_services.code%type,
         descr             xx_disl_rail_services.descr%type,
         descr_full        xx_disl_rail_services.descr_full%type,
         service_rgd_id    xx_disl_rail_services.service_rgd_id%type,
         service_rgd       xx_disl_rail_services_rgd.code%type,
         request_tasks_id  varchar2(2000),
         request_tasks     varchar2(4000),
         beg_date          varchar2(50),
         end_date          varchar2(50),
         created_by        varchar2(200),
         created_date      varchar2(50),
         last_updated_by   varchar2(200),
         last_updated_date varchar2(50),
         opened            varchar2(50)
   );
   type t_xx_rail_services_table is
      table of t_xx_rail_services_row;
   function get_rail_services return t_xx_rail_services_table
      pipelined;

   function save_rail_service (
      p_user_id        number,
      p_id             number,
      p_code           varchar2,
      p_descr          varchar2,
      p_descr_full     varchar2,
      p_beg_date       date,
      p_end_date       date,
      p_service_rgd_id number,
      p_request_tasks  varchar2
   ) return varchar2;

   function del_rail_service (
      p_id number
   ) return varchar2;

   type t_xx_rail_contracts_row is record (
         id                  xx_disl_rail_contracts.id%type,
         num                 xx_disl_rail_contracts.num%type,
         descr               xx_disl_rail_contracts.descr%type,
         owner               xx_disl_rail_contracts.owner%type,
         freight_owner       xx_disl_rail_contracts.freight_owner%type,
         freight_owner_short xx_disl_rail_contracts.freight_owner_short%type,
         beg_date            varchar2(100),
         end_date            varchar2(100),
         created_by          varchar2(200),
         created_date        varchar2(50),
         last_updated_by     varchar2(200),
         last_updated_date   varchar2(50)
   );
   type t_xx_rail_contracts_table is
      table of t_xx_rail_contracts_row;
   function get_rail_contracts return t_xx_rail_contracts_table
      pipelined;

   function save_rail_contract (
      p_user_id             number,
      p_id                  number,
      p_num                 varchar2,
      p_descr               varchar2,
      p_owner               varchar2,
      p_freight_owner       varchar2,
      p_freight_owner_short varchar2,
      p_beg_date            varchar2,
      p_end_date            varchar2
   ) return varchar2;

   function del_rail_contract (
      p_id number
   ) return varchar2;

   type t_xx_rail_contract_dop_row is record (
         id                xx_disl_rail_contract_dop.id%type,
         num               xx_disl_rail_contract_dop.num%type,
         descr             xx_disl_rail_contract_dop.descr%type,
         beg_date          varchar2(100),
         end_date          varchar2(100),
         contract_id       number,
         contract_num      varchar2(500),
         created_by        varchar2(200),
         created_date      varchar2(50),
         last_updated_by   varchar2(200),
         last_updated_date varchar2(50)
   );
   type t_xx_rail_contract_dop_table is
      table of t_xx_rail_contract_dop_row;
   function get_rail_contract_dop return t_xx_rail_contract_dop_table
      pipelined;

   function save_rail_contract_dop (
      p_user_id     number,
      p_id          number,
      p_num         varchar2,
      p_descr       varchar2,
      p_beg_date    varchar2,
      p_end_date    varchar2,
      p_contract_id number
   ) return varchar2;

   function del_rail_contract_dop (
      p_id number
   ) return varchar2;

   function get_rail_contract_change return t_xx_rail_contract_dop_table
      pipelined;

   type t_xx_parent_contracts_row is record (
         id       xx_disl_rail_contracts.id%type,
         num      xx_disl_rail_contracts.num%type,
         beg_date varchar2(100),
         descr    varchar2(500),
         lvl      number
   );
   type t_xx_parent_contracts_table is
      table of t_xx_parent_contracts_row;
   function get_rail_parent_contracts return t_xx_parent_contracts_table
      pipelined;

   function save_rail_contract_change (
      p_user_id     number,
      p_id          number,
      p_num         varchar2,
      p_descr       varchar2,
      p_beg_date    varchar2,
      p_end_date    varchar2,
      p_contract_id number
   ) return varchar2;

   function del_rail_contract_change (
      p_id number
   ) return varchar2;

   type t_xx_rail_contract_service_row is record (
         id                xx_disl_rail_contract_services.id%type,
         contract_id       xx_disl_rail_contract_services.contract_id%type,
         contract          xx_disl_rail_contracts.num%type,
         service_id        xx_disl_rail_contract_services.service_id%type,
         service           xx_disl_rail_services.code%type,
         ei                xx_disl_rail_contract_services.ei%type,
         ei_descr          xx_disl_rail_contract_services.ei_descr%type,
         cost              xx_disl_rail_contract_services.cost%type,
         cost_nds          xx_disl_rail_contract_services.cost_nds%type,
         created_by        varchar2(200),
         created_date      varchar2(50),
         last_updated_by   varchar2(200),
         last_updated_date varchar2(50)
   );
   type t_xx_rail_contract_serv_table is
      table of t_xx_rail_contract_service_row;
   function get_rail_contract_services return t_xx_rail_contract_serv_table
      pipelined;

   function get_rail_parent_contracts_add return t_xx_parent_contracts_table
      pipelined;

   function save_rail_contract_services (
      p_user_id     number,
      p_id          number,
      p_contract_id number,
      p_service_id  number,
      p_ei          varchar2,
      p_ei_descr    varchar2,
      p_cost        number,
      p_cost_nds    number
   ) return varchar2;

   function del_rail_contract_services (
      p_id number
   ) return varchar2;

   procedure send_mail (
      p_to        in varchar2,
      p_subject   in varchar2,
      p_html_msg  in varchar2 default null,
      p_smtp_host in varchar2 default '172.16.0.191',
      p_smtp_port in number default 25
   );



   procedure fill_railcar_date_arrive (
      p_round_id number
   );

   function md5 (
      input_string in varchar2
   ) return varchar2;

   function get_users_for_naliv return t_xx_id_name_table
      pipelined;

   function return_child (
      p_parent_id   number,
      p_parent_type varchar2,
      p_flagcome    varchar2
   ) return t_xx_tree_table
      pipelined;

   function get_tree_station (
      p_station_id varchar2,
      p_flag_come  varchar2,
      p_user_id    number default -1
   ) return t_xx_tree_table
      pipelined;

   function change_order (
      p_id     varchar2,
      p_type   varchar2,
      p_action varchar2
   ) return varchar2;

   function change_order_for_railway (
      p_id     number,
      p_type   varchar2,
      p_action varchar2
   ) return varchar2;

   function get_all_station_child (
      p_station_id number
   ) return t_xx_tree_table
      pipelined;

   function move_inside_station (
      p_user_id         number,
      p_car             varchar2,
      p_new_parent_id   number,
      p_new_parent_type varchar2,
      p_operation_date  varchar2,
      p_comment         varchar2
   ) return varchar2;

   function move_inside_station_few_child (
      p_user_id        number,
      p_cars           varchar2,
      p_parent_id      number,
      p_parent_type    varchar2,
      p_operation_date varchar2,
      p_comment        varchar2
   ) return varchar2;

   function addbandwagon (
      p_name       varchar2,
      p_parentid   number,
      p_parenttype varchar2
   ) return number;

   function deletebandwagon (
      p_id   number,
      p_type varchar2
   ) return varchar2;

   function get_car_add_info_with_conts (
      p_round_id number
   ) return t_xx_child_row_add_info;

   function return_child_add_info return t_xx_child_table_add_info
      pipelined;

   function return_child_add_info_for_gu return t_xx_child_table_add_info_gu
      pipelined;

   procedure add_cars_for_add_info_tbl (
      p_id         varchar2,
      p_type       varchar2,
      p_station_id number
   );

   procedure add_cars_for_add_info_tbl (
      p_car_numbers varchar2
   );

   procedure add_cars_for_add_info_tbl_r (
      p_car_numbers varchar2
   ); /*������ ������� � round_id*/

   procedure add_car_for_add_info_tbl (
      p_car_number varchar2
   );

   procedure add_cont_for_add_info_tbl (
      p_cont_number varchar2
   );

   procedure return_child_add_info_bef (
      p_info_type number default 0
   );

   function get_shop_not_end_flag (
      p_shop_info_id number,
      p_round_id     number,
      p_round_type   varchar2,
      p_user_id      number default null
   ) return varchar2;

   procedure add_objects_for_car_cont_tbl (
      p_obj_numbers varchar2
   );

   procedure populate_car_cont_tbl (
      p_only_cars number default 0,
      p_user_id   number default null
   );

   function get_car_cont_add_info return t_xx_car_cont_add_info_table
      pipelined;

   function return_user_data (
      p_login varchar2
   ) return t_xx_user_table
      pipelined;

   function receive_into_station (
      p_user_id          number,
      p_car              varchar2,
      p_new_parent_id    number,
      p_new_parent_type  varchar2,
      p_before_elem_id   number,
      p_before_elem_type varchar2,
      p_datefact         varchar2,
      p_comment          varchar2,
      p_wagon_list_id    number
   ) return varchar2;

   function receive_into_station_few_child (
      p_user_id         number,
      p_cars            varchar2,
      p_new_parent_id   number,
      p_new_parent_type varchar2,
      p_bef_aft         varchar2,
      p_after_elem_id   number,
      p_after_elem_type varchar2,
      p_operation_date  varchar2,
      p_comment         varchar2,
      p_send_date       varchar2,
      p_train_num       varchar2,
      p_loco1_num       number,
      p_loco1_driver1   number,
      p_loco1_driver2   number,
      p_loco1_conductor number,
      p_loco2_num       number,
      p_loco2_driver1   number,
      p_loco2_driver2   number,
      p_loco2_conductor number
   ) return varchar2;

   function get_coming_cars (
      p_station_id number
   ) return t_xx_car_numbers
      pipelined;

   function getnextstations (
      p_stationid number
   ) return t_xx_station_table
      pipelined;

   function send_to_station (
      p_user_id         number,
      p_car_id          varchar2,
      p_dest_station_id number,
      p_wagon_list_id   number,
      p_send_date       date,
      p_reason          varchar2
   ) return varchar2;

   function send_to_station_few_cars (
      p_user_id         number,
      p_cars            varchar2,
      p_send_stat_id    number,
      p_dest_stat_id    number,
      p_send_date       varchar2,
      p_arrival_date    varchar2,
      p_reason          varchar2,
      p_train_num       varchar2,
      p_loco1_num       number,
      p_loco1_driver1   number,
      p_loco1_driver2   number,
      p_loco1_conductor number,
      p_loco2_num       number,
      p_loco2_driver1   number,
      p_loco2_driver2   number,
      p_loco2_conductor number,
      p_save_name       varchar2 default null
   ) return varchar2;

   function returnstations return t_xx_station_table
      pipelined;

   procedure update_cars_for_ugl (
      p_errbuf  out nocopy varchar2,
      p_retcode out nocopy varchar2
   );

   function returnmaxorder (
      p_id       varchar2,
      p_type     varchar2,
      p_flagcome varchar2
   ) return number;

   procedure deletefromrelations (
      p_id        varchar2,
      p_type      varchar2,
      p_flag_come varchar2
   );

   function returnlastround (
      p_railcar_id varchar2
   ) return number;

   function send_from_ugl (
      p_user_id number,
      p_id      varchar2,
      p_date    varchar2,
      p_comment varchar2
   ) return varchar2;

   function send_cars_from_ugl (
      p_user_id  number,
      p_id_types varchar2,
      p_date     varchar2,
      p_comment  varchar2
   ) return varchar2;

   function entry_foreign_railcar (
      p_user_id   number,
      p_railcars  varchar2,
      p_date_fact varchar2
   ) return varchar2;

    -- add 26.09.2023 ���� ����������� (�������)
   function entry_foreign_container (
      p_user_id   number,
      p_add_data  varchar2,
      p_date_fact varchar2
   ) return varchar2;

   function fill_railcar_attr (
      p_car_number   varchar2,
      p_car_type     varchar2,
      p_freight_name varchar2
   ) return varchar2;

   function fill_railcar_for_invoice (
      p_user_id    number,
      p_invoice_id number,
      p_car_number varchar2
   ) return varchar2;

   function returnbadinvoices return t_xx_inv_table
      pipelined;

   function returncountbadinvoices return number;

   function add_railway (
      p_parent_id     number,
      p_parent_type   varchar2,
      p_number        varchar2,
      p_purpose       varchar2,
      p_pointer_from  varchar2,
      p_pointer_to    varchar2,
      p_length_limit  varchar2,
      p_length_useful varchar2,
      p_capacity      varchar2,
      p_add_field1    varchar2,
      p_add_field2    varchar2,
      p_add_field3    varchar2,
      p_disabled      varchar2,
      p_type          number
   ) return number;

   function change_railway_attr (
      p_railway_id    number,
      p_number        varchar2,
      p_purpose       varchar2,
      p_pointer_from  varchar2,
      p_pointer_to    varchar2,
      p_length_limit  varchar2,
      p_length_useful varchar2,
      p_capacity      varchar2,
      p_add_field1    varchar2,
      p_add_field2    varchar2,
      p_add_field3    varchar2,
      p_disabled      varchar2,
      p_type          number
   ) return varchar2;

   function change_parent_for_railway (
      p_id              varchar2,
      p_type            varchar2,
      p_new_parent_id   varchar2,
      p_new_parent_type varchar2
   ) return varchar2;

   function getstations return t_xx_station_table
      pipelined;

   function get_divisions return t_xx_id_name_table
      pipelined;

   function get_enterprise return t_xx_id_name_table
      pipelined;

   function getuserstations (
      p_login varchar2
   ) return t_xx_station_table
      pipelined;

   function getcartype (
      p_code_etsng  varchar2,
      p_cont_number varchar2,
      p_type        varchar2 default null
   ) return varchar2;

   function getcarfreight (
      p_code_etsng  varchar2,
      p_cont_number varchar2,
      p_freight     varchar2 default null
   ) return varchar2;

   procedure nrb_stop_update_prc (
      p_errbuf  out nocopy varchar2,
      p_retcode out nocopy varchar2
   );

   function get_stations_with_railways return t_xx_tree_table
      pipelined;

   function get_railway_add_info (
      p_railway_id number
   ) return t_xx_railway_info_table
      pipelined;

   function change_pwd (
      p_login   varchar2,
      p_new_pwd varchar2
   ) return varchar2;

   function get_local_freight_name (
      p_freight_name in varchar2
   ) return varchar2;

   procedure fill_railcar_add_info (
      p_round_id      number,
      p_add_info_type varchar2
   );

   procedure update_railcars_add_info (
      p_errbuf  out nocopy varchar2,
      p_retcode out nocopy varchar2
   );

   function get_freight_list return t_xx_freight_list_table
      pipelined;

   function get_org_name_list return t_xx_org_list_table
      pipelined;

   function get_car_type_list return t_xx_car_type_list_table
      pipelined;

   function change_railcar_add_info (
      p_user_id      number,
      p_car_number   varchar2,
      p_car_type     varchar2,
      p_freight_name varchar2,
      p_weight_dep   varchar2,
      p_owner        varchar2
   ) return varchar2;

   function change_cont_add_info (
      p_user_id      number,
      p_cont_number  varchar2,
      p_freight_name varchar2,
      p_weight_dep   varchar2,
      p_owner        varchar2
   ) return varchar2;

   function get_current_time return varchar2;

   function get_train_drivers return t_xx_train_drivers
      pipelined;

   function get_conductors return t_xx_conductors
      pipelined;

   function get_locomotives return t_xx_locomotives
      pipelined;

   function get_cars_in_ugl return t_xx_car_numbers
      pipelined;

   function register_notification (
      p_user_id                     number,
      p_cars                        varchar2,
      p_notification_time_from      varchar2,
      p_notification_person_from    varchar2,
      p_notification_railway_number varchar2,
      p_notification_time_to        varchar2,
      p_notification_person_to      number,
      p_notification_name           varchar2
   ) return varchar2;

   function get_saved_notifications return t_xx_id_name_table
      pipelined;

   function save_notification (
      p_user_id                     number,
      p_notification_name           varchar2,
      p_cars                        varchar2,
      p_notification_time_from      varchar2,
      p_notification_person_from    varchar2,
      p_notification_railway_number varchar2,
      p_notification_time_to        varchar2,
      p_notification_person_to      number
   ) return varchar2;

   function load_notification (
      p_notification_name varchar2
   ) return t_xx_notification_table
      pipelined;

   function del_notification (
      p_notification_name varchar2
   ) return varchar2;

   type t_xx_notification_gu_row is record (
         notification_id  xx_etw.xx_disl_notifications_gu.notification_id%type,
         not_number       xx_etw.xx_disl_notifications_gu.not_number%type,
         not_number_etran varchar2(2000),
         not_state_etran  varchar2(2000),
         not_time         varchar2(100),
         not_person_from  xx_etw.xx_disl_notifications_gu.not_person_from%type,
         not_comment      xx_etw.xx_disl_notifications_gu.not_comment%type,
         not_time_fact    varchar2(100),
         not_person_to    xx_etw.xx_disl_notifications_gu.not_person_to%type,
         cars             varchar2(4000),
         crg_pcalid       xx_etw.xx_disl_notifications_gu.crg_pcalid%type
   );
   type t_xx_notification_gu_table is
      table of t_xx_notification_gu_row;
   function get_notifications_gu (
      p_beg_date varchar2,
      p_end_date varchar2,
      p_type_gu  in varchar2 default '2b'
   ) return t_xx_id_name_table
      pipelined;

   function get_notification_gu (
      p_not_id  number,
      p_type_gu in varchar2
   ) return t_xx_notification_gu_table
      pipelined;

   type t_regit_row is record (
         user_id                  number,
         not_id                   number,
         cars                     varchar2(4000),
         not_number               varchar2(4000),
         notification_time        varchar2(150),
         notification_person_from number,
         pcomment                 varchar2(4000),
         notification_time_fact   varchar2(150),
         notification_person_to   varchar2(150),
         crg_pcalid               number,
         gu_type                  varchar2(50)
   );
   function register_notification_gu (
      p_data in t_regit_row
   ) return varchar2;

   type t_xx_contract_gu_row is record (
         id       number,
         name     varchar2(240),
         selected varchar2(240)
   );
   type t_xx_contract_gu_table is
      table of t_xx_contract_gu_row;

    -- ����� �������� �� ������������ ����� ��� ����� 2��
   function get_contract_default_for_gu return t_xx_contract_gu_table
      pipelined;
    
    -- �������� ����������� �� (2� ��� 2�) � �����
   function export_gu_to_etran (
      p_user_id in number,
      p_not_id  in varchar2,
      p_pcalid  in number default null,
      p_type_gu in varchar2
   ) return varchar2;
    -- �������� ����������� �� (2�) � �����
   function export_notif_etran (
      p_user_id in number,
      p_not_id  in varchar2,
      p_pcalid  in number default null
   ) return varchar2;
    -- �������� ����������� �� (2�) � �����
   function export_gu2d_etran (
      p_user_id in number,
      p_not_id  in varchar2,
      p_pcalid  in number default null
   ) return varchar2;
   procedure remove_empty_bandwagons (
      p_errbuf  out nocopy varchar2,
      p_retcode out nocopy varchar2
   );

   function get_location_of_cars (
      p_find_car varchar2
   ) return t_xx_location_of_car_table
      pipelined;

   function get_report_1_data return t_xx_report_1_table
      pipelined;

   function get_report_2_data return t_xx_report_2_table
      pipelined;

    -- add 18.03.2024
   function get_report_3_data return t_xx_report_3_table
      pipelined;

   function get_users_for_notification (
      p_credential_id number default null
   ) return t_xx_id_name_table
      pipelined;

   function get_users_for_route (
      p_credential_id number default null
   ) return t_xx_id_name_addition_table
      pipelined;

   function get_users return t_xx_id_name_table
      pipelined;

   function get_open_users return t_xx_id_name_table
      pipelined;

   function add_point (
      p_parent_id   number,
      p_parent_type varchar2,
      p_name        varchar2,
      p_descr       varchar2
   ) return number;

   function add_area (
      p_parent_id   number,
      p_parent_type varchar2,
      p_name        varchar2,
      p_descr       varchar2
   ) return number;

   procedure update_cont_status (
      p_add_info_id number default null
   );

   procedure update_railcar_status (
      p_errbuf      out nocopy varchar2,
      p_retcode     out nocopy varchar2,
      p_add_info_id number default null
   );

   procedure update_shop_info (
      p_errbuf  out nocopy varchar2,
      p_retcode out nocopy varchar2
   );

   function toggle_like_railway (
      p_user_id  number,
      p_obj_id   number,
      p_obj_type varchar
   ) return varchar2;

   procedure updatecars (
      p_errbuf  out nocopy varchar2,
      p_retcode out nocopy varchar2,
      p_section in varchar2 default null
   );

   type t_loadnig_rec is record (
         shop_info_id   number,
         car_number     varchar2(240),
         cont_number    varchar2(240),
         otgruzka_1c_id varchar2(240)
   );
   type t_loading_table is
      table of t_loadnig_rec;
   type t_change_cars_weight_rec is record (
         user_id           number,
         cars_with_weight  varchar2(4000),
         date_post         varchar2(30),
         date_start        varchar2(30),
         date_end          varchar2(30),
         date_zayavka_uvod varchar2(30),
         date_uvod         varchar2(30)
        -- "���" ? ���� id/���
         ,
         who_looked_id     number,
         who_looked        varchar2(200),
         who_start_id      number,
         who_start         varchar2(200),
         who_end_id        number,
         who_end           varchar2(200),
         who_zayavka_id    number,
         who_zayavka       varchar2(200),
         otgruzka_1c_id    varchar2(150)
   );
   function change_cars_weight_net (
      p_changes      in t_change_cars_weight_rec,
      p_out_load_rec in out t_loading_table
   ) return varchar2;
    
    /*function change_cars_weight_net (
        p_user_id             in     number,
        p_cars_with_weight    in     varchar2,
        p_date_post           in     varchar2,
        p_date_start          in     varchar2,
        p_date_end            in     varchar2,
        p_date_zayavka_uvod   in     varchar2,
        p_date_uvod           in     varchar2,
        p_who_looked_id       in     number,
        p_who_looked          in     varchar2,
        p_who_start_id        in     number,
        p_who_start           in     varchar2,
        p_who_end_id          in     number,
        p_who_end             in     varchar2,
        p_who_zayavka_id      in     number,
        p_who_zayavka         in     varchar2,
        p_out_load_rec        in out t_loading_table)
        return varchar2;*/

   function get_cont_out_date (
      p_cont varchar2
   ) return varchar2;

   function get_railcar_in_date (
      p_cars varchar2
   ) return varchar2;

   function get_move_cont_to_pl (
      p_cars varchar2
   ) return varchar2;

   function get_car_arrive_weight_net (
      p_round_id number
   ) return number;

    --function flag_closed_loading_in_shop(p_shop_info_id number)
    --return varchar2;

   function get_cars_from_shop (
      p_user_id      number,
      p_return_type  number, /*0 - ���������� �������� � ����������, 1 - ������ ���������*/
      p_loading_subs varchar2 default ''
   ) return t_xx_car_from_shop_table
      pipelined;

   function get_cars_from_shop_for_oebs (
      p_user_id   number,
      p_freight   varchar2,
      p_date_from varchar2,
      p_date_to   varchar2,
      p_status    varchar2,
      p_type      varchar2
   ) return t_xx_car_from_shop_table
      pipelined;

   function create_output_in_oebs (
      p_user_id   number,
      p_shop_info varchar2
   ) return varchar2;

    /*�������� ��������� ������ ��� ��������*/
    /*��� ��������� ������� �� ������� ���������� �������*/
   procedure mark_last_record_for_ins (
      p_asset_instance_number varchar2
   );

   function enter_inspection (
      p_user_id                   number,
      p_car_number                varchar2,
      p_cont                      varchar2,
      p_inspection_id             number,
      p_inspection_date           varchar2,
      p_inspection_place          varchar2,
      p_inspection_person         varchar2,
      p_inspection_person_appoint varchar2,
      p_master                    varchar2,
      p_priority                  varchar2,
      p_result                    varchar2,
      p_status_kurs               varchar2,
      p_comment                   varchar2,
      p_defects                   varchar2,
      p_need_commit               varchar2 default 'Y'
   ) return varchar2;

   type t_xx_car_inspection_row is record (
         inspection_id             number,
         asset_instance_number     xx_disl_inspections.asset_instance_number%type,
         asset_instance_id         xx_disl_inspections.asset_instance_id%type,
         asset_group_id            xx_disl_inspections.asset_group_id%type,
         asset_group               varchar2(100),
         asset_number              xx_disl_inspections.asset_instance_number%type,
         inspection_date           varchar2(30),
         inspection_place          xx_disl_inspections.inspection_place%type,
         inspection_person         xx_disl_inspections.inspection_person%type,
         inspection_person_appoint xx_disl_inspections.inspection_person_appoint%type,
         master                    xx_disl_inspections.master%type,
         priority                  xx_disl_inspections.priority%type,
         result                    xx_disl_inspections.result%type,
         status_kurs               xx_disl_inspections.status_kurs%type,
         description               xx_disl_inspections.description%type,
         defect_id                 xx_disl_inspection_defects.defect_id%type,
         defect_code               xx_disl_inspection_defects.defect_code%type,
         defect_descr              xx_disl_inspection_defects.defect_descr%type,
         doc_type                  xx_disl_inspection_defects.doc_type%type,
         doc_num                   xx_disl_inspection_defects.doc_num%type,
         defect_date               varchar2(30),
         created_request_status    varchar2(100),
         refusal_to_repair         xx_disl_inspections.refusal_to_repair%type,
         created_by                number
   );
   type t_xx_car_inspection_table is
      table of t_xx_car_inspection_row;
   function get_car_containers (
      p_car_number varchar2
   ) return t_xx_cont_table
      pipelined;

   function get_car_inspections (
      p_obj_number varchar2,
      p_obj_type   varchar2
   ) return t_xx_car_inspection_table
      pipelined;

   function enter_inspection_for_few_cars (
      p_user_id                   number,
      p_obj_numbers               varchar2,
      p_obj_type                  varchar2,
      p_inspection_date           varchar2,
      p_inspection_place          varchar2,
      p_inspection_person         varchar2,
      p_inspection_person_appoint varchar2,
      p_master                    varchar2,
      p_priority                  varchar2,
      p_result                    varchar2,
      p_status_kurs               varchar2,
      p_comment                   varchar2,
      p_cars_nsi                  varchar2 -- add 26/10/2022 BekmansurovRR
   ) return varchar2;

   function delete_inspection (
      p_inspection_id number
   ) return varchar2;

   procedure create_work_request (
      p_user_id       number,
      p_inspection_id number,
      p_result        out varchar2,
      p_error_log     out varchar2
   );

   procedure create_work_dev_request (
      p_user_id       number,
      p_inspection_id number,
      p_result        out varchar2,
      p_error_log     out varchar2
   );

   function refusal_to_repair (
      p_user_id       number,
      p_inspection_id number,
      p_person        varchar2
   ) return varchar2;

    /***************/
   type t_xx_credential_table is
      table of xx_disl_credential%rowtype;
   function get_credentials return t_xx_id_name_table
      pipelined;

   function get_credential_descr (
      p_credential_id number
   ) return t_xx_credential_descr_table
      pipelined;



   type t_xx_creden_descr_new_row is record (
         credential_id   xx_etw.xx_disl_credential.credential_id%type,
         credential_name xx_etw.xx_disl_credential.credential_name%type,
         rigth_id        xx_etw.xx_disl_credential_rights.rigth_id%type,
         rigth_val       xx_etw.xx_disl_credential_rights.val%type
   );
   type t_xx_creden_descr_new_table is
      table of t_xx_creden_descr_new_row;
   function get_credential_descr_new (
      p_credential_id number
   ) return t_xx_creden_descr_new_table
      pipelined;

    /*
        �����: ����������

    */
   type t_xx_user_credential_row is record (
         p_credential_name          varchar2(240),
         p_moving_inside_railway    varchar2(240),
         p_moving_inside_shop       varchar2(240),
         p_moving_inside_station    varchar2(240),
         p_moving_between_station   varchar2(240),
         p_change_attribute         varchar2(240),
         p_change_weight            varchar2(240),
         p_enter_inspection         varchar2(240),
         p_enter_inspection_add     varchar2(240),
         p_register_notification    varchar2(240),
         p_entry_foreign_car        varchar2(240),
         p_administrator            varchar2(240),
         p_receive_to_station       varchar2(240),
         p_work_with_groups         varchar2(240),
         p_out_from_ugl             varchar2(240),
         p_add_attribute            varchar2(240),
         p_create_request           varchar2(240),
         p_change_request           varchar2(240),
         p_view_request             varchar2(240),
         p_complete_request         varchar2(240),
         p_del_ins_doc              varchar2(240),
         p_return_from_psp          varchar2(240),
         p_autocreate_request_v     varchar2(240),
         p_autocreate_request_o     varchar2(240),
         p_autocreate_request_t     varchar2(240),
         p_weigh_import             varchar2(240),
         p_weigh_import_corr        varchar2(240),
         p_weigh_delete             varchar2(240),
         p_export_shop_info         varchar2(240),
         p_create_invoice_out       varchar2(240),
         p_send_invoice_to_etran    varchar2(240),
         p_register_notification_gu varchar2(240),
         p_route_add                varchar2(240),
         p_route_processing         varchar2(240),
         p_route_closing            varchar2(240),
         p_output_defective_cars    varchar2(240),
         p_export_notification_gu   varchar2(240),
         p_fix_dev_rule             varchar2(240),
         p_fix_dev_place            varchar2(240),
         p_enter_dev_inspection     varchar2(240),
         p_fix_dev_add              varchar2(240),
         p_fix_dev_undock           varchar2(240),
         p_fix_dev_update           varchar2(240),
         p_shift_update             varchar2(240),
         p_control_cars             varchar2(240),
         p_weighing_dispatcher      varchar2(240),
         p_process_of_wagons        varchar2(240),
         p_update_of_nsi            varchar2(240),
         p_scale_type_1831_manual   varchar2(240),
         p_export_samples           varchar2(240)   -- �������� ���� � OeBS
         ,
         p_entry_foreign_cont       varchar2(240) -- ������ ���� �����������
   );
   function save_new_credential (
      p_add_data in t_xx_user_credential_row
   ) return number;

   function change_credential (
      p_credential_id number,
      p_add_data      in t_xx_user_credential_row
   ) return varchar2;

   function delete_credential (
      p_credential_id number
   ) return varchar2;

    /***************/
   function get_user_descr (
      p_user_id number
   ) return t_xx_user_descr_table
      pipelined;

   function add_user (
      p_login           varchar2,
      p_full_name       varchar2,
      p_enterprise      number,
      p_division        number,
      p_change_pwd      varchar2,
      p_open            varchar2,
      p_phone_num       varchar2,
      p_default_station number,
      p_stations        varchar2,
      p_credentials     varchar2
   ) return number;

   function change_user (
      p_user_id         number,
      p_login           varchar2,
      p_full_name       varchar2,
      p_enterprise      number,
      p_division        number,
      p_change_pwd      varchar2,
      p_open            varchar2,
      p_phone_num       varchar2,
      p_default_station number,
      p_stations        varchar2,
      p_credentials     varchar2
   ) return varchar2;

    /***************/
   type t_xx_request_row is record (
         request_id        number,
         task_id           number,
         task_descr        xx_disl_request_tasks.descr%type,
         deadline_date_in  varchar2(20),
         deadline_date_out varchar2(20),
         status            varchar2(20),
         status_descr      varchar2(1000),
         created_by        varchar2(100),
         created_by_id     number,
         created_date      varchar2(20),
         division          varchar2(100),
         cars_count        number,
         done_cars_count   number,
         criticality_id    number,
         part_complete     varchar2(1),
         complete          varchar2(1),
         part_closed       varchar2(1),
         check_railways    varchar2(1)
   );
   type t_xx_request_table is
      table of t_xx_request_row;
   function get_railways_for_request (
      p_station_id number
   ) return t_xx_railway_for_request_table
      pipelined;

   function get_fixing_person_for_request return t_xx_id_name_table
      pipelined;

   function get_control_person_for_request return t_xx_id_name_table
      pipelined;

   function get_respon_person_for_request return t_xx_id_name_table
      pipelined;

   function get_tasks_for_request return t_xx_id_name_table
      pipelined;

   function get_criteria_tasks_for_request return t_xx_id_name_table
      pipelined;

   function get_criticality_for_request return t_xx_id_name_table
      pipelined;

    --function get_new_request_id
    --return number;
   function get_info_for_car_request (
      p_car_number varchar2,
      p_info_type  number
   ) return varchar2;

   function create_request (
      p_user_id      number,
      p_request_task number,
      p_crit_task    varchar2,
      p_cars_mas     t_cars_table
   ) return number;

   function save_request (
      p_user_id           number,
      p_request_id        number,
      p_deadline_date_in  varchar2,
      p_deadline_date_out varchar2,
      p_task_id           number,
      p_criticality_id    number,
      p_cars              varchar2
   ) return varchar2;

   function close_request (
      p_user_id    number,
      p_car_number varchar2,
      p_task_id    number,
      p_comment    varchar2,
      p_date       varchar2
   ) return boolean;

   function get_requests (
      p_user_id number
   ) return t_xx_request_table
      pipelined;

   function get_request (
      p_request_id number
   ) return t_xx_request_table
      pipelined;

   function get_request_criterias (
      p_request_id number
   ) return varchar2;

   function get_request_criteria_cars (
      p_criteria_id number
   ) return varchar2;

   type t_xx_request_car is record (
         car_number    varchar2(20),
         owner         varchar2(100),
         station       varchar2(100),
         railway       varchar2(100),
         status        varchar2(100),
         state         varchar2(100),
         freight       varchar2(100),
         info_date     varchar2(100),
         complete      varchar2(10),
         complete_date varchar2(100),
         com_full_name varchar2(100),
         v             varchar2(1),
         o             varchar2(1),
         t             varchar2(1),
         close         varchar2(100),
         close_date    varchar2(100),
         cl_full_name  varchar2(100),
         close_comment varchar2(1000),
         exist_req     varchar2(1000)
   );
   type t_xx_request_car_table is
      table of t_xx_request_car;
   function get_request_criteria_cars_new (
      p_criteria_id number
   ) return t_xx_request_car_table
      pipelined;

   function save_request_status (
      p_user_id      number,
      p_request_id   number,
      p_status       varchar2,
      p_status_descr varchar2
   ) return varchar2;

   function save_processing_status (
      p_user_id    number,
      p_request_id number
   ) return varchar2;

   function save_car_complete_for_request (
      p_user_id     number,
      p_criteria_id number,
      p_car_number  number,
      p_complete    number
   ) return varchar2;

   function save_crit_complete_for_request (
      p_user_id     number,
      p_criteria_id number,
      p_complete    number
   ) return varchar2;

   function save_car_close_for_request (
      p_user_id     number,
      p_criteria_id number,
      p_car_number  number,
      p_close       number,
      p_comment     varchar2
   ) return varchar2;

   function save_crit_close_for_request (
      p_user_id     number,
      p_criteria_id number,
      p_close       number,
      p_comment     varchar2
   ) return varchar2;

   function get_railway_for_car (
      p_car_number varchar2,
      p_name       number default 0
   ) return varchar2;

   function get_stations_for_railway (
      p_railway varchar2,
      p_name    number default 0
   ) return varchar2;

   function get_cars_with_railways (
      p_cars         varchar2,
      p_need_railway varchar2 default 'Y'
   ) return varchar2;

   function save_send_to_station_form (
      p_user_id         number,
      p_name            varchar2,
      p_sending_time    varchar2,
      p_arrival_time    varchar2,
      p_reason          varchar2,
      p_train_num       varchar2,
      p_loco1_num       number,
      p_loco1_driver1   number,
      p_loco1_driver2   number,
      p_loco1_conductor number,
      p_loco2_num       number,
      p_loco2_driver1   number,
      p_loco2_driver2   number,
      p_loco2_conductor number,
      p_cars            varchar2
   ) return varchar2;

   function get_saved_elems return t_xx_id_name_table
      pipelined;

   type t_xx_saved_elem_table is
      table of send_to_station_form_save%rowtype;
   function load_send_to_station_form (
      p_name varchar2
   ) return t_xx_saved_elem_table
      pipelined;

   function del_send_to_station_form (
      p_user_id number,
      p_name    varchar2
   ) return varchar2;

   function get_all_cars return t_xx_id_name_table
      pipelined;

   function get_suitable_cars (
      p_enter_text varchar2
   ) return t_xx_id_name_table
      pipelined;

    /***************/
   function get_request_data (
      p_request_id number,
      p_type       varchar2 default 'pdf'
   ) return blob;

   function get_reasons_for_return return t_xx_id_name_table
      pipelined;

   function get_last_cars_train_time (
      p_car_numbers varchar2,
      p_reason      varchar2
   ) return varchar2;

   function return_from_psp (
      p_user_id                  number,
      p_car_numbers              varchar2,
      p_return_time              varchar2,
      p_return_reason            varchar2,
      p_return_comment           varchar2,
      p_return_correction_reason varchar2,
      p_station_operator         varchar2
   ) return varchar2;

   procedure car_scale_get_data;

   type t_xx_car_scale_weight_row is record (
         train_id   number,
         train_date varchar2(50),
         id         number,
         car_number varchar2(50),
         wag_number number,
         date_w     varchar2(50),
         weight     number,
         speed      number,
         napr_sys   varchar2(10)
   );
   type t_xx_car_scale_weight_table is
      table of t_xx_car_scale_weight_row;
   function get_car_scale_weights return t_xx_car_scale_weight_table
      pipelined;

   function load_car_scale_weights (
      p_user_id     number,
      p_train_id    number,
      p_general_com varchar2,
      p_cars        varchar2
   ) return varchar2;

   type t_xx_car_scale_weight_row_add is record (
         id              number,
         train_id        number,
         date_w          varchar2(50),
         speed           number,
         weight          number,
         weight_cor      number,
         descr           varchar2(1000),
         prev_max_date_w varchar2(1),
         for_akt         varchar2(50),
         pk_id           xx_etw.xx_disl_car_scale.pk_id%type,
         scale_type      varchar2(50),
         weighing_type   xx_etw.xx_disl_car_scale.type%type
   );
   type t_xx_car_scale_weight_tbl_add is
      table of t_xx_car_scale_weight_row_add;
   function get_car_scale_weights_add (
      p_car_number varchar2
   ) return t_xx_car_scale_weight_tbl_add
      pipelined;

    -- add 01.02.2021 BekmansurovRR
    -- ���������� "���������� �����������"
   function save_change_weight_car (
      p_user_id  number,
      p_add_data varchar2
   ) return varchar2;

    /***************/
    --procedure update_car_nsi(p_errbuf out nocopy varchar2,  p_retcode out nocopy varchar2);

   function return_last_cont_round (
      p_cont_number varchar2
   ) return number;

   function get_places_for_cont (
      p_station_id number,
      p_area_type  varchar2
   ) return t_xx_tree_table
      pipelined;

   procedure add_conts_for_add_info_tbl (
      p_cont_numbers varchar2
   );

   function move_conts (
      p_user_id    number,
      p_conts      varchar2,
      p_place_id   number,
      p_place_type varchar2,
      p_oper_date  varchar2,
      p_comment    varchar2
   ) return varchar2;

   function move_cont (
      p_user_id           number,
      p_cont_number       varchar2,
      p_place_id          number,
      p_place_type        varchar2,
      p_oper_date         date,
      p_cont_move_list_id number
   ) return varchar2;

    /***************/
   type t_xx_graph_pod_row is record (
         row_id    varchar2(1000),
         descr     varchar2(200),
         add_descr varchar2(200)
   );
   type t_xx_graph_pod_table is
      table of t_xx_graph_pod_row;
   type t_xx_claim_otpr_row is record (
         otpr_nom       number,
         descr          varchar2(200),
         telefon        varchar2(200),
         free_car_count number
   );
   type t_xx_claim_otpr_table is
      table of t_xx_claim_otpr_row;
   type t_xx_recip_address_row is record (
         address_id number,
         address    varchar2(300)
   );
   type t_xx_recip_address_table is
      table of t_xx_recip_address_row;
   type t_xx_claim_info_row is record (
         graph            xx_etw.xx_disl_round_claim_info.graph%type,
         recip_address_id xx_etw.xx_disl_round_claim_info.recip_address_id%type,
         recip_telefon    xx_etw.xx_disl_round_claim_info.recip_telefon%type,
         depl_person      xx_etw.xx_disl_round_claim_info.depl_person%type,
         otpr_nom         xx_etw.xx_disl_round_claim_info.otpr_nom%type,
         graph_add        xx_etw.xx_disl_round_claim_info.graph_add%type
   );
   type t_xx_claim_info_table is
      table of t_xx_claim_info_row;
   type t_xx_cont_csl_row is record (
         cont_number        varchar2(2000),
         seal_type_id       varchar2(2000),
         seal_marks         varchar2(2000),
         seal_quantity      varchar2(2000),
         seal_year          varchar2(2000),
         seal_owner_type_id varchar2(2000)
   );
   type t_xx_cont_csl_table is
      table of t_xx_cont_csl_row;
   function create_return_invoice_adapter (
      p_user_id          number,
      p_car_number       varchar2,
      p_otpr_nom         number,
      p_graph            varchar2,
      p_recip_address_id number,
      p_recip_telefon    varchar2,
      p_depl_person      number,
      p_cont_csl         varchar2
   ) return varchar2;

   function close_return_invoice (
      p_user_id    number,
      p_car_number varchar2
   ) return varchar2;

   function create_return_invoice (
      p_user_id          number,
      p_round_id         number,
      p_otpr_nom         number,
      p_graph            varchar2,
      p_recip_address_id number,
      p_recip_telefon    varchar2,
      p_depl_person      number,
      p_cont_csl         varchar2
   ) return varchar2;

   function send_invoice_to_etran (
      p_user_id    number,
      p_car_number varchar2
   ) return varchar2;

   function get_claim (
      p_car_number varchar2
   ) return varchar2;

   function get_claim_info (
      p_car_number varchar2
   ) return t_xx_claim_info_table
      pipelined;

   function get_inv_cont_csl (
      p_front_end_id varchar2
   ) return t_xx_cont_csl_table
      pipelined;

   function get_suitable_claims (
      p_enter_text varchar2
   ) return t_xx_id_name_table
      pipelined;

   function enter_claim (
      p_user_id      number,
      p_car_number   varchar2,
      p_claim_number varchar2
   ) return varchar2;

   function get_depl_person return t_xx_id_name_table
      pipelined;

   function get_seal_types return t_xx_id_name_table
      pipelined;

   function get_seal_owner_types return t_xx_id_name_table
      pipelined;

   function get_graph_pod (
      p_claim_number varchar2
   ) return t_xx_graph_pod_table
      pipelined;

   function get_claim_otpr (
      p_claim_number varchar2
   ) return t_xx_claim_otpr_table
      pipelined;

   function get_recip_telefon (
      p_claim_id number,
      p_otpr_nom number
   ) return varchar2;

   function get_recip_address (
      p_claim_number varchar2
   ) return t_xx_recip_address_table
      pipelined;

   function get_front_end_id (
      p_car_number varchar2
   ) return number;

   function get_send_inv_number (
      p_car_number varchar2
   ) return number;

   function get_arrive_weight_net (
      p_round_id number
   ) return number;

   function get_send_weight_net (
      p_round_id number
   ) return number;

   type t_xx_route_table is
      table of xx_disl_loco_routes_v%rowtype;
   function get_route_statuses return t_xx_id_name_table
      pipelined;

   function get_route_smena return t_xx_id_name_table
      pipelined;

   type t_xx_locomotives_row is record (
         id                number,
         name              varchar2(100),
         enabled_flag      varchar2(100),
         maintainable_flag varchar2(100)
   );
   type t_xx_locomotives_table is
      table of t_xx_locomotives_row;
   function get_locomotives_from_oebs return t_xx_locomotives_table
      pipelined;

   function save_route (
      p_user_id         number,
      p_route_id        number,
      p_date_from       varchar2,
      p_date_to         varchar2,
      p_status          number,
      p_smena           number,
      p_station         number,
      p_station_officer number,
      p_route_gave      number,
      p_loco            number,
      p_driver1         number,
      p_driver2         number,
      p_conductor       number,
      p_com             varchar2
   ) return varchar2;

   function save_route_status (
      p_user_id      number,
      p_route_id     number,
      p_status       number,
      p_status_descr varchar2
   ) return varchar2;

   function get_flag_route_closed (
      p_route_id number
   ) return varchar2;

   function get_routes (
      p_date_from varchar2,
      p_date_to   varchar2,
      p_smena     number,
      p_station   number,
      p_loco      number
   ) return t_xx_route_table
      pipelined;

   type t_xx_route_action_row is record (
         operation_id      number,
         operation_descr   xx_etw.xx_disl_route_operations.oper_descr%type,
         action_id         number,
         date_oper_custom  varchar2(100),
         date_oper         varchar2(100),
         action_desc       xx_etw.xx_disl_route_other_actions.descr%type,
         obj_round_id      number,
         obj_number        varchar2(100),
         station_id        number,
         station           varchar2(100),
         freight           varchar2(100),
         route_desc        varchar2(500),
         route_time        varchar2(500),
         date_from         varchar2(100),
         date_to           varchar2(100),
         general_date_from varchar2(100),
         general_date_to   varchar2(100),
         route1_id         number,
         route1_desc       varchar2(500),
         route2_id         number,
         route2_desc       varchar2(500)
   );
   type t_xx_route_action_table is
      table of t_xx_route_action_row;
   function get_route_operations return t_xx_id_name_table
      pipelined;

   function get_other_route_operations return t_xx_id_name_table
      pipelined;

   function get_other_operation_descr return t_xx_id_name_table
      pipelined;

   function get_route_actions (
      p_date_from    varchar2,
      p_date_to      varchar2,
      p_station_id   number,
      p_operation    number,
      p_exists_route number
   ) return t_xx_route_action_table
      pipelined;

   function get_obj_freight (
      p_obj_id   number,
      p_obj_type varchar2,
      p_date     date
   ) return varchar2;

   function get_suitable_routes (
      p_date       varchar2,
      p_enter_text varchar2
   ) return t_xx_id_name_table
      pipelined;

   function save_route_links (
      p_user_id   number,
      p_actions   varchar2,
      p_routes    varchar2,
      p_date_from varchar2,
      p_date_to   varchar2
   ) return varchar2;

   function del_route_links (
      p_user_id number,
      p_actions varchar2
   ) return varchar2;

   function get_other_actions (
      p_date_from  varchar2,
      p_date_to    varchar2,
      p_station_id number,
      p_operation  number,
      p_route      number,
      p_action_id  number
   ) return t_xx_route_action_table
      pipelined;

   function save_other_actions (
      p_user_id         number,
      p_action_id       number,
      p_date_from       varchar2,
      p_date_to         varchar2,
      p_routes          varchar2,
      p_station         number,
      p_oper            number,
      p_operation_descr number,
      p_descr           varchar2,
      p_cars            varchar2
   ) return varchar2;

   function del_other_actions (
      p_user_id number,
      p_actions varchar2
   ) return varchar2;

   type t_xx_route_total_row is record (
         route_id               number,
         route_num              xx_etw.xx_disl_loco_routes_v.route_num%type,
         status                 xx_etw.xx_disl_loco_routes_v.status%type,
         status_desc            xx_etw.xx_disl_loco_routes_v.status_desc%type,
         last_update_date       varchar2(100),
         total_last_update_date varchar2(100),
         fuel_in                varchar2(100),
         fuel_out               varchar2(100),
         consumption_fact       varchar2(100),
         consumption_fact_kg    varchar2(100),
         consumption_norm       varchar2(100),
         consumption_plus       varchar2(100),
         consumption_minus      varchar2(100),
         waiting                varchar2(100),
         waiting_hr             varchar2(100),
         waiting_hot            varchar2(100),
         waiting_hot_hr         varchar2(100),
         waiting_cold           varchar2(100),
         waiting_cold_hr        varchar2(100),
         shunting_work          varchar2(100),
         shunting_work_hr       varchar2(100),
         freight_work           varchar2(100),
         freight_work_hr        varchar2(100),
         total_work             varchar2(100),
         total_work_hr          varchar2(100),
         excess_work            varchar2(100),
         excess_work_hr         varchar2(100),
         refill                 varchar2(100),
         fuel_in_who            varchar2(100),
         refill_who             varchar2(100),
         fuel_out_who           varchar2(100)
   );
   type t_xx_route_total_table is
      table of t_xx_route_total_row;
   function get_route_work_time (
      p_route_id  number,
      p_oper_type number
   ) return number;

   function get_routes_totals (
      p_date_from varchar2,
      p_date_to   varchar2,
      p_smena     number,
      p_station   number,
      p_loco      number
   ) return t_xx_route_total_table
      pipelined;

   type t_xx_route_operation_row is record (
         general_date_from varchar2(100),
         general_date_to   varchar2(100),
         diff_time         varchar2(100),
         oper_descr        varchar2(500),
         oper_type         varchar2(100)
   );
   type t_xx_route_operation_table is
      table of t_xx_route_operation_row;
   function get_route_operation_details (
      p_route_id number
   ) return t_xx_route_operation_table
      pipelined;

   function save_route_add (
      p_user_id      number,
      p_route_id     number,
      p_fuel_in      varchar2,
      p_fuel_out     varchar2,
      p_waiting      number,
      p_waiting_hot  number,
      p_waiting_cold number,
      p_excess_work  number,
      p_refill       varchar2,
      p_fuel_in_who  varchar2,
      p_refill_who   varchar2,
      p_fuel_out_who varchar2
   ) return varchar2;

   function output_car (
      p_user_id number,
      p_id      varchar2,
      p_date    varchar2,
      p_comment varchar2
   ) return varchar2;

   function output_cars (
      p_user_id  number,
      p_id_types varchar2,
      p_date     varchar2,
      p_comment  varchar2
   ) return varchar2;

   type t_xx_car_passport_row is record (
         car_number             varchar2(1000),
         status                 varchar2(1000),
         car_last_repair        varchar2(1000),
         car_norma              varchar2(1000),
         car_type_name          varchar2(1000),
         car_model              varchar2(1000),
         car_year               varchar2(1000),
         car_axles              varchar2(1000),
         car_owner_country_name varchar2(1000),
         car_owner_type_name    varchar2(1000),
         car_owner_okpo         varchar2(1000),
         car_owner_name         varchar2(1000),
         car_tonnage            varchar2(1000),
         car_weight_dep         varchar2(1000),
         car_volume             varchar2(1000),
         car_arendator_okpo     varchar2(1000),
         car_arendator_name     varchar2(1000),
         car_end_arenda_date    varchar2(1000),
         car_length             varchar2(1000),
         car_nsi_date           varchar2(1000),
         xx_last_update_date    varchar2(1000),
         xx_last_updated_by     varchar2(1000),
         ugl_date               varchar2(1000),
         gvc_date               varchar2(1000),
         text_teleg             varchar2(1000)
   );
   type t_xx_car_passport_table is
      table of t_xx_car_passport_row;
   function get_cars_passport (
      p_user_id number,
      p_cars    varchar2
   ) return t_xx_car_passport_table
      pipelined;

   procedure update_cars_nsi (
      p_errbuf  out nocopy varchar2,
      p_retcode out nocopy varchar2
   );

    /*beg***************  ��������� ����� ���  ******************/
   type t_fuel_loco_table is
      table of xx_etw.xx_disl_loco_add_from_oebs_v%rowtype;
   type t_fuel_standart_spr_table is
      table of xx_etw.xx_disl_fuel_standart_spr%rowtype;
   function get_fuel_loco return t_fuel_loco_table
      pipelined;

   function get_fuel_standart_spr return t_fuel_standart_spr_table
      pipelined;

   function save_fuel_standart (
      p_user_id  number,
      p_row_id   number,
      p_add_data varchar2
   ) return varchar2;

   type t_xx_fuel_standart_table is
      table of xx_disl_fuel_standart_v%rowtype;
   function get_fuel_standart (
      p_params varchar2
   ) return t_xx_fuel_standart_table
      pipelined;

    /*end***************  ��������� ����� ���  ******************/

    /*beg***************  ����� �����������  ******************/
   function get_fixing_side (
      p_user_id number
   ) return t_xx_id_name_table
      pipelined;

   function get_railway_part (
      p_user_id    number,
      p_railway_id number
   ) return t_xx_id_name_table
      pipelined;

   function save_railway_part (
      p_user_id  number,
      p_part_id  number,
      p_add_data varchar2
   ) return varchar2;

   type t_xx_fixing_device_rule_row is record (
         railway_id       number,
         railway_number   varchar2(100),
         part_id          number,
         part_descr       varchar2(100),
         rule_id          number,
         side             number,
         side_descr       varchar2(100),
         cnt_skid         number,
         cnt_axis_1       number,
         cnt_axis_2       number,
         descr            varchar2(200),
         last_update_date varchar2(100)
   );
   type t_xx_fixing_device_rule_table is
      table of t_xx_fixing_device_rule_row;
   function save_fixing_device_rule (
      p_user_id  number,
      p_add_data varchar2
   ) return varchar2;

   function get_fixing_device_rule (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_fixing_device_rule_table
      pipelined;

   function get_fixing_device (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_id_name_table
      pipelined;

   function get_parent_storage_place (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_id_name_table
      pipelined;

   function save_storage_place (
      p_user_id  number,
      p_add_data varchar2
   ) return varchar2;

   type t_xx_storage_place_row is record (
         place_id               number,
         place_name             varchar2(100),
         control_count          number,
         top_level              varchar2(1),
         parent_id              number,
         parent_name            varchar2(100),
         fixing_person_1        number,
         fixing_person_1_descr  varchar2(100),
         fixing_person_2        number,
         fixing_person_2_descr  varchar2(100),
         remove_person_1        number,
         remove_person_1_descr  varchar2(100),
         remove_person_2        number,
         remove_person_2_descr  varchar2(100),
         control_person_1       number,
         control_person_1_descr varchar2(100),
         control_person_2       number,
         control_person_2_descr varchar2(100),
         descr                  varchar2(200),
         railway_mas            clob,                      --varchar2(4000),
         device_mas             clob,                      --varchar2(4000),
         con_person_mas         clob, --varchar2(4000), -- ��� �������� ������/�����������
         con_person_str         varchar2(4000),
         rep_person_mas         clob, --varchar2(4000), -- ��� ����������� ������/�����������
         rep_person_str         varchar2(4000),
         res_person_mas         clob, --varchar2(4000), -- ������������� �� �����/����� �����
         res_person_str         varchar2(4000),
         device_str             clob,                      --varchar2(4000),
         last_update_date       varchar2(100)
   );
   type t_xx_storage_place_table is
      table of t_xx_storage_place_row;
   function get_storage_place (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_storage_place_table
      pipelined;

   function get_cond_train_dr return t_xx_id_name_table
      pipelined;

   type t_xx_car_info_fd_row is record (
         car_number     varchar2(50),
         round_id       number,
         add_info_id    number,
         weight_net     number,
         count_of_axles number
   );
   type t_xx_car_info_fd_table is
      table of t_xx_car_info_fd_row;
   function get_railway_parts (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_id_name_table
      pipelined;

   function get_railway_cars (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_car_info_fd_table
      pipelined;

   function get_suitable_device_rules (
      p_user_id number,
      p_params  varchar2
   ) return varchar2;

   type t_xx_car_info_fd_upd_row is record (
         car_number           varchar2(50),
         round_id             number,
         add_info_id          number,
         weight_net           number,
         count_of_axles       number,
         transactions_cars_id number
   );
   type t_xx_car_info_fd_upd_table is
      table of t_xx_car_info_fd_upd_row;
   function get_railway_cars_for_upd (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_car_info_fd_upd_table
      pipelined;

    /*end***************  ����� �����������  ******************/


    /*******************  ���������� ��      ******************/

    /*��� �������� (select)*/
   function get_users_for_cond_train (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_id_name_table
      pipelined;

    -- �������
   type t_xx_device_for_assignment_row is record (
         id           number,
         name         varchar2(500),
         railway_name varchar2(500)
   );
   type t_xx_device_for_table is
      table of t_xx_device_for_assignment_row;
   type t_xx_users_for_cond_row is record (
         id       number,
         name     varchar2(500),
         selected varchar2(50)
   );
   type t_xx_users_for_cond_table is
      table of t_xx_users_for_cond_row;

    /*��� �������� (select)*/
   function set_users_for_cond_train (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_users_for_cond_table
      pipelined;

   function get_device_for_assignment (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_device_for_table
      pipelined;

    -- �������
   type t_xx_device_for_update_row is record (
         id                    number,
         name                  varchar2(500),
         railway_name          varchar2(500),
         selected              varchar2(50),
         transactions_lines_id number
   );
   type t_xx_device_update_table is
      table of t_xx_device_for_update_row;
   function get_device_for_update (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_device_update_table
      pipelined;

    -- ****** ������ ������ ******* --
   type t_xx_car_color_row is record (
         id          number,
         name        varchar2(50),
         description varchar2(240),
         code        varchar2(240)
   );
   type t_xx_car_color_table is
      table of t_xx_car_color_row;
   function get_car_color_select (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_car_color_table
      pipelined;

    -- ****** ********************** --
    /*���������� ����������� ��*/
   function save_transaction_fix_device (
      p_user_id  number,
      p_add_data varchar2
   ) return varchar2;

    /* ������ ������ ��� ���� */

    -- ������� �����������
   type t_xx_side_row is record (
         side_id number,
         name    varchar2(200),
         rwn     number
   );
   type t_xx_side_table is
      table of t_xx_side_row;
   function get_side_for_device (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_side_table
      pipelined;

    -- ��������� ���-�� ������������ �������� �� ����
   function get_count_fix_dev (
      p_railway_id number,
      p_side_type  varchar2
   ) return number;

    -- �������� ���������� ��������.���� ������� ���������� �� ����� -> ������� ������ �����
   function validation_dev_trans (
      p_railway_id  number default null,
      p_part_id     number default null,
      p_instance_id number,
      p_not         varchar2 default 'N'
   ) return varchar2;

   function validation_ondock (
      p_user_id number,
      p_params  varchar2
   ) return varchar2;

   function validation_fix (
      p_user_id number,
      p_params  varchar2
   ) return varchar2;

    -- ������� �����������
   type t_xx_dev_ondock_row is record (
         id              number,
         transactions_id number,
         name            varchar2(240)
   );
   type t_xx_dev_ondock_table is
      table of t_xx_dev_ondock_row;
   function get_device_for_ondock (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_dev_ondock_table
      pipelined;


    /*���������� ����������� ��*/
   function save_transaction_ondock (
      p_user_id  number,
      p_add_data varchar2
   ) return varchar2;

    /* ������� (��������) ��.*/
   function delete_fix (
      p_user_id  number,
      p_add_data varchar2
   ) return varchar2;

    -- �������� Header �����������
   type t_xx_header_value_fix_row is record (
         id                number,
         date_fix_even     varchar2(50 byte),
         user_fix_even     number,
         user_fix_rep_even number,
         date_fix_odd      varchar2(50 byte),
         user_fix_odd      number,
         user_fix_rep_odd  number,
         note_fix          varchar2(2400 byte),
         calculation_type  varchar2(50 byte),
         norma_even        number,
         norma_odd         number,
         requir_even       varchar2(1),
         requir_odd        varchar2(1)
   );
   type t_xx_header_value_fix_table is
      table of t_xx_header_value_fix_row;
   function set_header_value_fix (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_header_value_fix_table
      pipelined;

   function get_all_fix_dev return t_xx_id_name_table
      pipelined;

    /*���������� ����������� ��*/
   function update_transaction_fix_device (
      p_user_id  number,
      p_add_data varchar2
   ) return varchar2;

    /***********************************************************/
    /*********** ������� �� ************************************/
   function get_device_id (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_id_name_table
      pipelined;

    /*beg �������������*/
   type t_xx_defect_dev_row is record (
         code  varchar2(100),
         descr varchar2(200)
   );
   type t_xx_defect_dev_table is
      table of t_xx_defect_dev_row;
   function get_device_defects return t_xx_defect_dev_table
      pipelined;

    /*end �������������*/

   function enter_dev_inspection (
      p_user_id     number,
      p_add_data    varchar2,
      p_need_commit varchar2 default 'Y'
   ) return varchar2;

   type t_xx_car_dev_inspection_row is record (
         inspection_id             number,
         asset_instance_number     xx_disl_dev_inspections.asset_instance_number%type,
         asset_instance_id         xx_disl_dev_inspections.asset_instance_id%type,
         asset_group_id            xx_disl_dev_inspections.asset_group_id%type,
         asset_group               varchar2(100),
         asset_number              xx_disl_dev_inspections.asset_instance_number%type,
         inspection_date           varchar2(30),
         inspection_place          xx_disl_dev_inspections.inspection_place%type,
         inspection_person         xx_disl_dev_inspections.inspection_person%type,
         inspection_person_appoint xx_disl_dev_inspections.inspection_person_appoint%type,
         master                    xx_disl_dev_inspections.master%type,
         priority                  xx_disl_dev_inspections.priority%type,
         result                    xx_disl_dev_inspections.result%type,
         status_kurs               xx_disl_dev_inspections.status_kurs%type,
         description               xx_disl_dev_inspections.description%type,
         defect_id                 xx_disl_dev_inspection_defects.defect_id%type,
         defect_code               xx_disl_dev_inspection_defects.defect_code%type,
         defect_descr              xx_disl_dev_inspection_defects.defect_descr%type,
         doc_type                  xx_disl_dev_inspection_defects.doc_type%type,
         doc_num                   xx_disl_dev_inspection_defects.doc_num%type,
         defect_date               varchar2(30),
         created_request_status    varchar2(100),
         refusal_to_repair         xx_disl_dev_inspections.refusal_to_repair%type,
         created_by                number
   );
   type t_xx_car_dev_inspection_table is
      table of t_xx_car_dev_inspection_row;
   function get_car_dev_inspections (
      p_obj_number varchar2,
      p_obj_type   varchar2
   ) return t_xx_car_dev_inspection_table
      pipelined;

   function refusal_dev_to_repair (
      p_user_id       number,
      p_inspection_id number,
      p_person        varchar2
   ) return varchar2;

   function delete_dev_inspection (
      p_inspection_id number
   ) return varchar2;

    /**********************************************************/
    /******************�����-����� �����************************/

   type t_xx_snapshot_wagon_row is record (
         snapshot_short    clob,
         snapshot_detailed clob
   );
   type t_xx_snapshot_wagon_table is
      table of t_xx_snapshot_wagon_row;
   function get_snapshot_wagon (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_snapshot_wagon_table
      pipelined;


   function get_status_shift (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_id_name_table
      pipelined;

    -- ��������� ������ � �����-������ �����
   function save_shift_change (
      p_user_id  number,
      p_add_data clob
   ) return varchar2;

   type t_xx_smena_change_table is
      table of xx_disl_smena_change_v%rowtype;
   function get_smena_change (
      p_user_id number,
      p_params  varchar2
   ) return t_xx_smena_change_table
      pipelined;

   function get_users_for_change (
      p_credential_id number default null
   ) return t_xx_id_name_table
      pipelined;

   function save_shift_status (
      p_user_id  number,
      p_add_data clob
   ) return varchar2;

   type t_xx_route_smena_change_row is record (
         id        number,
         name      varchar2(240),
         from_time varchar2(240)
   );
   type t_xx_route_smena_change_table is
      table of t_xx_route_smena_change_row;
   function get_route_smena_change return t_xx_route_smena_change_table
      pipelined;

    /**********************************************************/

    /***************** �������� *******************************/

   type t_xx_control_row is record (
         id_control       number,
         car_number       varchar2(240),
         cause_code       varchar2(240),
         cause_desc       varchar2(240),
         start_date       varchar2(50),
         end_date         varchar2(50),
         last_update_date varchar2(50),
         creation_date    varchar2(50),
         created_name     varchar2(100),
         cause_id         number,
         color_id         number,
         color_name       varchar2(240),
         note             varchar2(240)
   );
   type t_xx_control_table is
      table of t_xx_control_row;

    -- ������ ������� �� ��������
   function get_control_standart (
      p_params varchar2
   ) return t_xx_control_table
      pipelined;

   type t_xx_control_code_cause_row is record (
         id          number,
         code        varchar2(240),
         description varchar2(240)
   );
   type t_xx_control_code_cause_table is
      table of t_xx_control_code_cause_row;

    -- ��������.������ ������
   function get_control_code_cause (
      p_params varchar2
   ) return t_xx_control_code_cause_table
      pipelined;

   function save_control_car (
      p_user_id  number,
      p_row_id   number,
      p_add_data varchar2
   ) return varchar2;

   function delete_control_car (
      p_user_id  number,
      p_row_id   number,
      p_add_data varchar2
   ) return varchar2;

    /*********************************************************/

    -- *** �������� ������ ������
   function xx_is_number (
      p_number varchar
   ) return boolean;

   function xx_is_date (
      p_value       in varchar2,
      p_date_format in varchar2
   ) return boolean;

   function get_sum (
      p_car_number number
   ) return number;

   function check_car_number (
      p_car_number varchar
   ) return number;

    /*********************************************************/


    /***************** ��������� ������� *********************/

   type t_xx_disl_opm_trx_header_table is
      table of xx_etw.xx_disl_opm_trx_header_v%rowtype;
   type t_xx_disl_freight_oebs_table is
      table of xx_etw.xx_disl_freight_oebs_v%rowtype;
   type t_xx_process_of_wagons_row is record (
         disl_hdr_id         number,
         created_by          xx_etw.xx_disl_opm_trx_header_v.created_by%type,
         created_fio         xx_etw.xx_disl_opm_trx_header_v.created_fio%type,
         creation_date       xx_etw.xx_disl_opm_trx_header_v.creation_date%type,
         last_updated_fio    xx_etw.xx_disl_opm_trx_header_v.last_updated_fio%type,
         last_updated_by     xx_etw.xx_disl_opm_trx_header_v.last_updated_by%type,
         last_update_date    xx_etw.xx_disl_opm_trx_header_v.last_update_date%type,
         trx_date_begin      xx_etw.xx_disl_opm_trx_lines.trx_date_begin%type,
         trx_date_end        xx_etw.xx_disl_opm_trx_lines.trx_date_end%type,
         trx_date_begin_text varchar2(240),
         trx_date_end_text   varchar2(240),
         batch_id            number, --xx_etw.xx_disl_opm_trx_header_v.batch_id%type,
         batch_num           xx_etw.xx_disl_opm_trx_lines.batch_num%type,
         hdr_opm_id          number, --xx_etw.xx_disl_opm_trx_header_v.hdr_opm_id%type,
         interface_status    varchar2(50),
         disl_lines_id       xx_etw.xx_disl_opm_trx_lines.disl_lines_id%type,
         round_id            xx_etw.xx_disl_opm_trx_lines.round_id%type,
         car_number          xx_etw.xx_disl_opm_trx_lines.car_number%type,
         cont_round_id       xx_etw.xx_disl_opm_trx_lines.cont_round_id%type,
         cont_number         xx_etw.xx_disl_opm_trx_lines.cont_number%type,
         freight_name        xx_etw.xx_disl_opm_trx_lines.freight_name%type,
         inventory_item_id   xx_etw.xx_disl_opm_trx_lines.inventory_item_id%type,
         code_base           xx_etw.xx_disl_freight_oebs_v.code_base%type
   );
   type t_xx_process_of_wagons_table is
      table of t_xx_process_of_wagons_row;
   type t_xx_process_of_wag_hist_row is record (
         product                varchar2(240),
         lot_number             varchar2(240),
         begin_transaction_date varchar2(240),
         end_transaction_date   varchar2(240),
         qty_production         number,
         qty_write_off          number
   );
   type t_xx_process_of_wag_hist_table is
      table of t_xx_process_of_wag_hist_row;
   function get_opm_trx_header_id (
      p_line_id number
   ) return number;

   function get_opm_trx_line_id (
      p_rec in xx_etw.xx_disl_opm_trx_lines%rowtype
   ) return number;

    /*******************************************************************************
    ������� ���������� ������ ������ �� ������ ��� ����� "��������� �������"
    ���������:
      * p_params - ������ ������ � ������ JSON
    *******************************************************************************/
   function get_process_of_wagons (
      p_params varchar2
   ) return t_xx_process_of_wagons_table
      pipelined;

    /*******************************************************************************
    ������� ���������� ������ ������ �� ������ ��� ����� "��������� ������� (������������)"
    ���������:
      * p_params - ������ ������ � ������ JSON
    *******************************************************************************/
   function get_process_of_wagons_history (
      p_params varchar2
   ) return t_xx_process_of_wag_hist_table
      pipelined;


    /*******************************************************************************
    ��������� ��������� ������ �� ����� "��������� �������"
    ���������:
      * p_user_id - ������������
      * p_add_data - ������ ������ � ������ JSON
      * p_result - ��������� ���������� (������): done - �������
                                        fail$MessageError - ������$�����_������
    *******************************************************************************/
   procedure save_process_of_wagons (
      p_user_id  in number,
      p_add_data in clob,
      p_result   out varchar2
   );

   procedure update_info_for_proc_of_wagons (
      p_car_number varchar2
   );

    /*******************************************************************************
    ��������� ���������/��������� ������ � ������� xx_disl_opm_trx_header
    ���������:
      * p_trx_header_row - ������
      * p_status - ������ ���������: S - �������, E - ������
      * p_message - ���������
    *******************************************************************************/
   procedure api_disl_opm_trx (
      p_trx_header_row in out xx_etw.xx_disl_opm_trx_header%rowtype,
      p_disl_hdr_id    out nocopy number,
      p_status         out nocopy varchar2,
      p_message        out nocopy varchar2
   );

    /*******************************************************************************
    ��������� ���������/��������� ������ � ������� xx_disl_opm_trx_lines
    ���������:
      * p_trx_row - ������
      * p_status - ������ ���������: S - �������, E - ������
      * p_message - ���������
    *******************************************************************************/
   procedure api_disl_opm_trx_lines (
      p_trx_row in xx_etw.xx_disl_opm_trx_lines%rowtype,
      p_status  out nocopy varchar2,
      p_message out nocopy varchar2
   );

    /*******************************************************************************
    ������� ���������� ������ ������� ��������� ������� OeBS � ����.�����
    ���������:
      *
    /*******************************************************************************/
   function get_disl_freight_oebs (
      p_add_data varchar2
   ) return t_xx_disl_freight_oebs_table
      pipelined;

    /*******************************************************************************
    ��������� ��������� ������������ ������� xx_mtf.xx_opm_trx_hdr_interface.
              � ������� ��������� �������
    ���������:
      * p_user_id - ������������
      * p_add_data - ������ ������ � ������ JSON
      * p_result - ��������� ���������� (������): done - �������
                                        fail$MessageError - ������$�����_������
    *******************************************************************************/
   procedure run_process_of_wagons (
      p_user_id  in number,
      p_add_data in clob,
      p_result   out varchar2
   );

    /*******************************************************************************
    ������� ���������� �����/��������� ��� ����� "��������� �������"
    ���������:
      * p_params - ������ ������ � ������ JSON
    *******************************************************************************/
   function add_car_for_process_of_wagons (
      p_car_number in varchar2
   ) return t_xx_process_of_wagons_table
      pipelined;

    /*********************************************************/

   function check_carnumber_in_db (
      p_car_number varchar2
   ) return varchar2;

   function get_scales_type_list return t_xx_scales_type_list_table
      pipelined;

   procedure save_merge_disl_car_scale (
      p_scale_rec in xx_etw.xx_disl_car_scale%rowtype,
      p_status    out varchar2,
      p_msg       out varchar2
   );

   function get_un_loading_type (
      p_type varchar2
   ) return number;

   function get_define_task_list return t_xx_id_name_table
      pipelined;


   type t_xx_main_menu_row is record (
         id        number,
         parent_id number,
         menu_name xx_etw.xx_disl_menu.name%type,
         menu_type varchar2(240),
         paths_url xx_etw.xx_disl_menu.paths_url%type,
         menu_code xx_etw.xx_disl_menu.menu_code%type
   );
   type t_xx_main_menu_table is
      table of t_xx_main_menu_row;
   function get_main_menu (
      p_user_id    varchar2,
      p_station_id varchar2,
      p_part_site  varchar2 default 'main'
   ) return t_xx_main_menu_table
      pipelined;

   function xx_disl_last_railcar_info (
      p_round_id             number,
      p_un_loading_from_subs number,
      p_info                 varchar2
   ) return varchar2;


    /*
        �������� �������� �� ���������
            ��������:
                1) �����
                2) ����������� �����

    */

   type t_xx_car_from_samples_row is record (
         id              number,
         freight_name    xx_disl_obj_add_info_tmp.freight_name%type,
         product         varchar2(240),
         date_post       varchar2(20),
         car_number      xx_disl_round.railcar_id%type,
         cont_number     xx_disl_cont_round.cont_number%type,
         cont_count      number,
         batch_no        xx_etw.xx_disl_shop_info.batch_no%type,
         sample_no       varchar2(240),
         batch_id        number,
         lot_number      varchar2(240),
         locator_id      number,
         spec_id         number,
         owner           varchar2(10),
         shop_info_id    number,
         gr_count        number,
         weight_net_tonn number,
         samples         clob
   );
   type t_xx_car_from_samples_table is
      table of t_xx_car_from_samples_row;
   type t_xx_product_row is record (
         code        varchar2(240),
         name        varchar2(240),
         description varchar2(500)
   );
   type t_xx_product_table is
      table of t_xx_product_row;
   function get_product_for_freight (
      p_add_data varchar2,
      p_user_id  varchar2
   ) return t_xx_product_table
      pipelined;

   function get_specid_for_product (
      p_product varchar2
   ) return number;

    /*

        ������� ������ �� ����� "������� �����"

    */

   function get_disl_samples_info (
      p_add_data varchar2,
      p_user_id  varchar2
   ) return t_xx_car_from_samples_table
      pipelined;


   type t_xx_sample_tbl_header_row is record (
         test_id           number,
         sample_code       varchar2(240),
         title             varchar2(240),
         required_t        varchar2(240),
         data_type         varchar2(240),
         min_value_num     varchar2(50),
         max_value_num     varchar2(50),
         disabled          varchar2(1),
         target_value_char varchar2(240),
         qc_test_values    clob
   );
   type t_xx_sample_tbl_header_table is
      table of t_xx_sample_tbl_header_row;

    -- ������� ���������� ����� ������� ��� ����� "Export ����� � OeBS"
   function get_sample_tbl_header (
      p_add_data varchar2,
      p_user_id  varchar2
   ) return t_xx_sample_tbl_header_table
      pipelined;


   type t_import_samples_rwn is record (
         shop_info_id      number,
         test_id           varchar2(240),
         sample_code       varchar2(240),
         result_value_char varchar2(240),
         result_value_num  number
   );
   type t_import_samples_tbl is
      table of t_import_samples_rwn index by binary_integer;
   procedure export_samples_info (
      p_add_data in clob,
      p_user_id  in number,
      p_result   out varchar2
   );

    -- add 20.12.2023 BekmansurovRR
    -- ����� �������� �� ��������� ���������� �� ������
    -- �� ���������: �������
   function get_deliveri_name (
      p_car_number in varchar2
   ) return varchar2;

    -- add 20.12.2023 BekmansurovRR
    -- ������� ����������, �������� �� ����� ��������� ������ ��������?
   function get_car_trailer_part (
      p_car_number   in varchar2,
      p_front_end_id in varchar2,
      p_inv_number   in varchar2
   ) return varchar2;

    -- add 20.12.2023 BekmansurovRR
   function get_trailer_part_color (
      p_trailer_part varchar2
   ) return varchar2;

   type t_xx_product_list_table is
      table of xx_etw.xx_disl_product_name%rowtype;
   function get_product_name_list (
      p_section in varchar2 default null
   ) return t_xx_product_list_table
      pipelined;

   type t_xx_loadind_status_oebs_table is
      table of xx_etw.xx_disl_loadind_status_oebs%rowtype;
   function get_loadind_status_oebs_list (
      p_section in varchar2 default null
   ) return t_xx_loadind_status_oebs_table
      pipelined;

   type t_xx_loadind_type_oebs_table is
      table of xx_etw.xx_disl_loadind_type_oebs%rowtype;
   function get_loadind_type_oebs_list (
      p_section in varchar2 default null
   ) return t_xx_loadind_type_oebs_table
      pipelined;

   type t_xx_rights_list_table is
      table of xx_etw.xx_disl_rights%rowtype;
   function get_rights_list return t_xx_rights_list_table
      pipelined;

   function save_new_credential_new (
      p_user_id  in number,
      p_add_data in varchar2
   ) return varchar2;

   type t_xx_user_new_row is record (
         user_id              number,
         full_name            varchar2(100),
         password             varchar2(32),
         flag_change_pwd      varchar2(1),
         enterprise           number,
         shunting_operation   number,
         enter_enemy_railcars number,
         change_add_info      number,
         rights_code          xx_etw.xx_disl_rights.rights_code%type,
         rights_val           xx_etw.xx_disl_credential_rights.val%type,
         rights_id            xx_etw.xx_disl_credential_rights.rigth_id%type
   );
   type t_xx_user_new_table is
      table of t_xx_user_new_row;
   function return_user_data_new (
      p_login varchar2
   ) return t_xx_user_new_table
      pipelined;

    /******************************************************************/
    /*               ������������� -> �����������                     */
    /******************************************************************/

   type t_list_catalog_table is
      table of xx_etw.xx_disl_mdt_objects%rowtype;

    -- ������ ��������� (������������)
   function get_list_catalog return t_list_catalog_table
      pipelined;

   type t_list_attribute_table is
      table of xx_etw.xx_disl_mdt_object_attributes%rowtype;

    -- ������ ��������� ��� ��������(�����������)
   function get_attribute_for_catalog (
      p_object_id in number
   ) return t_list_attribute_table
      pipelined;

    -- ���������� ������
   procedure prc_save_catalog (
      p_user_id    in varchar2,
      p_param_data in clob,
      p_out_result in out varchar2
   );

   type t_source_for_column_row is record (
         id   varchar2(250),
         name varchar2(500)
   );
   type t_source_for_column_table is
      table of t_source_for_column_row;

    -- ������ �������� ��� ������� � ������� ����������
   function get_source_for_column (
      p_param_data in varchar2
   ) return t_source_for_column_table
      pipelined;

    -- ���������� ������ �������
   function get_combined_data (
      p_object_id in number
   ) return sys_refcursor;

   function get_categ_freight (
      p_categ_name   in varchar2,
      p_freight_name in varchar2,
      p_owner        in varchar2
   ) return varchar2;

    /******************************************************************/

   procedure pr_car_round_hist_out (
      p_railcar_id in varchar2
   );


    /****************************** ***********************************/
    /*                  ��������� � 1� "�������������" ���������
    /****************************** ***********************************/

   function get_request_id (
      p_request_id in number
   ) return number;

   function get_request_status_d (
      p_request_id in number
   ) return varchar2;

   function get_request_status_code (
      p_request_id in number
   ) return varchar2;

   function get_users_id (
      p_login in varchar2
   ) return number;

   function get_railway_id (
      p_railway_name in varchar2
   ) return number;

   function get_request_tasks_name (
      p_task_id number
   ) return varchar2;

   function get_criteria_tasks_name (
      p_task_id number
   ) return varchar2;

    /***************** ������: �������� �������� *******************************/
   type t_xx_idle_control_row is record (
         id_control        number,
         car_number        varchar2(240),
         cause_code        varchar2(240),
         cause_desc        varchar2(240),
         start_date        varchar2(50),
         end_date          varchar2(50),
         last_update_date  varchar2(50),
         creation_date     varchar2(50),
         created_name      varchar2(100),
         note              varchar2(240),
         is_excluded       varchar2(1),
         idle_reasons_id   number,
         idle_reasons_name varchar2(240)
   );
   type t_xx_idle_control_table is
      table of t_xx_idle_control_row;
   type t_xx_idle_reasons_row is record (
         id   number,
         name varchar2(240)
   );
   type t_xx_idle_reasons_table is
      table of t_xx_idle_reasons_row;
   function get_idle_reason_list return t_xx_idle_reasons_table
      pipelined;
   function get_idle_control_list (
      p_params varchar2
   ) return t_xx_idle_control_table
      pipelined;

   function save_idle_control (
      p_user_id  number,
      p_row_id   number,
      p_add_data varchar2
   ) return varchar2;

   function delete_idle_control (
      p_user_id  number,
      p_row_id   number,
      p_add_data varchar2
   ) return varchar2;
/******************************************************************/
end xx_dislocation;
/