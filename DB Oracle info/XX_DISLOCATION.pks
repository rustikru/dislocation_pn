create or replace package xx_dislocation authid current_user is
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

   function user_profile (
      p_login in varchar2
   ) return sys_refcursor;

   function change_pwd (
      p_login   in varchar2,
      p_new_pwd in varchar2
   ) return varchar2;

   procedure user_profile_save (
      p_login           in varchar2,
      p_full_name       in varchar2,
      p_phone_num       in varchar2,
      p_email_address   in varchar2,
      p_default_station in varchar2
   );


end;
