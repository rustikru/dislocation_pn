create or replace package body xx_dislocation is

/******************************************************************************************************************************
   name: XX_ETW.XX_DISLOCATION
   purpose: Дислокация ПН

   revisions:
   ver        date        author           description
   ---------  ----------  ---------------  ------------------------------------
   1.0        18.10.2015  KuchukbaevRF     1. created this package.
   2.0        26.09.2024  BekmansurovRR    1. По наряду 0000064852 в процедуре return_child_add_info_bef 
                                                добавил расчет "Условная длина поезда"
******************************************************************************************************************************/

   procedure log_new (
      p_log_id       number,
      p_log_function varchar2,
      p_descr        varchar2
   ) is
      pragma autonomous_transaction;
   begin
      if g_debug then 
        --dbms_output.put_line(to_char(sysdate,'dd.mm.yyyy hh24:mi:ss') || ' ' || p_log_function || ': ' ||p_descr);
         insert into xx_etw.xx_disl_log_new values
            ( p_log_id,
              xx_etw.xx_disl_log_order_seq.nextval,
              sysdate,
              p_log_function,
              p_descr );
         commit;
      end if;
   end log_new;

   function user_profile (
      p_login in varchar2
   ) return sys_refcursor is
      l_cur sys_refcursor;
   begin
      open l_cur for select u.login,
                            u.full_name,
                            u.enterprise,
                            u.division_id,
                            u.phone_num,
                            u.email_address,
                            null as default_station,
                            u.flag_change_pwd,
                            u.open open_flag
                                      from xx_disl_users u
                      where upper(trim(u.login)) = upper(trim(p_login))
                        and rownum = 1;

      return l_cur;
   end user_profile;

   function change_pwd (
      p_login   in varchar2,
      p_new_pwd in varchar2
   ) return varchar2 is
   begin
      update xx_disl_users u
         set u.password = p_new_pwd,
             u.flag_change_pwd = 'N'
       where upper(trim(u.login)) = upper(trim(p_login));

      if sql%rowcount = 0 then
         raise_application_error(
            -20001,
            'Пользователь не найден'
         );
      end if;

      return 'done';
   end change_pwd;

   procedure user_profile_save (
      p_login           in varchar2,
      p_full_name       in varchar2,
      p_phone_num       in varchar2,
      p_email_address   in varchar2,
      p_default_station in varchar2
   ) is
   begin
      update xx_disl_users u
         set u.full_name = p_full_name,
             u.phone_num = p_phone_num,
             u.email_address = p_email_address
             --,u.user_default_station = p_default_station
       where upper(trim(u.login)) = upper(trim(p_login));

      if sql%rowcount = 0 then
         raise_application_error(
            -20001,
            'Пользователь не найден'
         );
      end if;
   end user_profile_save;


end;
