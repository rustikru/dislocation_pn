create or replace package body xx_etw.xx_disl_gu23_pkg as
    /***************************************************************************************************************************
     NAME:  xx_etw.xx_disl_gu23_pkg
     PURPOSE:   Акты: составление актов (форма ГУ-23)
     REVISIONS:
     Ver        Date        Author           Description
     ---------  ----------  ---------------  ------------------------------------
     1.0        23.06.2026  BekmansurovRR    1. Created this package.
     1.1        23.06.2026  BekmansurovRR    2. Новые поля акта: st_from, st_to,
                                               waybill_no, cargo_ref;
                                               раздельные справочники станций и подписантов;
                                               справочник грузов.
     1.2        25.06.2026   BekmansurovRR   1. Добавлена рассылка писем и уведомлений подписантам.
  **********************************************************************************************************************************/
   c_package       constant varchar2(30) := 'xx_disl_gu23_pkg';
   c_dtf           constant varchar2(30) := 'YYYY-MM-DD HH24:MI:SS';
   c_us            constant char(1) := chr(31);      -- разделитель полей
   c_rs            constant char(1) := chr(30);    -- разделитель записей
   g_client_ip     varchar2(64) := null; -- IP клиента текущего запроса
   g_server_host   varchar2(240) := sys_context(
      'USERENV',
      'SERVER_HOST'
   );
   g_email_subject constant varchar2(240) := 'Дислокация.Уведомление "ГУ-23"';
   

    -- add 24.07.2026 BekmansurovRR
    -- закрытие акта начала простоя
   procedure close_start_if_complete (
      p_start_id in number,
      p_user_id  in number default null
   );

   procedure gu23_set_client_ip (
      p_ip in varchar2
   ) is
   begin
      g_client_ip := p_ip;
   end;

    -- add 10.07.2026 BekmansurovRR
   procedure log_act_history (
      p_act_id  in number,
      p_user_id in number,
      p_text    in varchar2,
      p_ip      in varchar2 default null
   ) is
   begin
      insert into xx_disl_gu23_hist (
         id,
         act_id,
         ts,
         usr,
         txt,
         ip
      ) values
         ( xx_disl_gu23_hist_seq.nextval,
           p_act_id,
           sysdate,
           p_user_id,
           p_text,
           nvl(
              p_ip,
              g_client_ip
           ) );
   end;

    -- Возврат ответа для php или другим системам
   function format_error (
      p_msg in varchar2 default null
   ) return varchar2 is
   begin
        -- Если передали свой текст, отдаем его, иначе отдаем системный sqlerrm
      return 'ERR'
             || c_us
             || nvl(
         p_msg,
         sqlerrm
      );
   end format_error;

   procedure log_new (
      p_log_id        in number,
      p_function_name in varchar2,
      p_text          in varchar2
   ) is
      pragma autonomous_transaction;
   begin
      xx_dislocation.log_new(
         p_log_id,
         c_package
         || '->'
         || p_function_name,
         p_text
      );
        --insert into xx_disl_log_new (log_function, descr)
        --     values (c_package || '->' || p_function_name, p_text);

      commit;
   end;

   function g_user_name (
      p_user_id in number
   ) return varchar2 is
      v varchar2(256);
   begin
      if p_user_id is null then
         return null;
      end if;
      select full_name
        into v
        from xx_disl_users
       where id = p_user_id;

      return v;
   exception
      when no_data_found then
         return null;
   end;

   function fnc_boolean_num (
      p_bool in boolean
   ) return number is
   begin
      if p_bool then
         return 1;
      else
         return 0;
      end if;
      return 0;
   end;

   function get_last_bracket_text (
      p_string in varchar2
   ) return varchar2 is
      v_start_pos number;
      v_end_pos   number;
      v_result    varchar2(1000);
   begin
        -- Находим позицию последней открывающей скобки
      v_start_pos := instr(
         p_string,
         '(',
         -1
      );

        -- Если скобки не найдены, возвращаем NULL
      if v_start_pos = 0 then
         return null;
      end if;

        -- Находим позицию соответствующей закрывающей скобки после последней открывающей
      v_end_pos := instr(
         p_string,
         ')',
         v_start_pos
      );

        -- Если закрывающая скобка не найдена, возвращаем NULL
      if v_end_pos = 0 then
         return null;
      end if;

        -- Извлекаем текст между скобками (исключая сами скобки)
      v_result := substr(
         p_string,
         v_start_pos + 1,
         v_end_pos - v_start_pos - 1
      );

        -- Удаляем лишние пробелы в начале и конце
      v_result := trim(v_result);
      return v_result;
   end get_last_bracket_text;

   function fnc_mapping_dept (
      p_dept_name in varchar2
   ) return varchar2 is
      l_value      varchar2(240);
      l_text_brack varchar2(240);
   begin
      l_value := p_dept_name;
      l_text_brack := get_last_bracket_text(l_value);
      if lower(l_value) like '%акм%' then
         l_value := 'АКМ';
      elsif lower(l_value) like '%метанол%' then
         l_value := 'Метанол';
      elsif lower(l_value) like '%формалин%' then
         l_value := 'Формалин';
      elsif lower(l_value) like '%помс%' then
         l_value := 'Помс';
      else
         l_value := ( nvl(
            l_text_brack,
            l_value
         ) );
      end if;

      return upper(l_value);
   end;

    -- n-е поле строки, разделители CHR(31)
   function g_field (
      p_line in varchar2,
      p_idx  in pls_integer
   ) return varchar2 is
      v_from pls_integer := 1;
      v_to   pls_integer;
      v_i    pls_integer := 1;
   begin
      loop
         v_to := instr(
            p_line,
            c_us,
            1,
            v_i
         );
         if v_i = p_idx then
            if v_to = 0 then
               return substr(
                  p_line,
                  v_from
               );
            else
               return substr(
                  p_line,
                  v_from,
                  v_to - v_from
               );
            end if;
         end if;

         exit when v_to = 0;
         v_from := v_to + 1;
         v_i := v_i + 1;
      end loop;

      return null;
   end;

   function g_to_date (
      p_str in varchar2
   ) return date is
   begin
      if p_str is null
      or trim(p_str) is null then
         return null;
      end if;
      return to_date ( substr(
         replace(
            p_str,
            'T',
            ' '
         ),
         1,
         16
      ),
      'YYYY-MM-DD HH24:MI' );
   end;

    -- Разбирает CLOB в таблицу строк вагонов
   function parse_wagon_clob (
      p_clob in clob
   ) return t_wagon_clob_tab
      pipelined
   is
      v_len  pls_integer := nvl(
         dbms_lob.getlength(p_clob),
         0
      );
      v_from pls_integer := 1;
      v_to   pls_integer;
      v_rec  varchar2(32767);
      l_row  t_wagon_clob_row;
   begin
      while v_from <= v_len loop
         v_to := instr(
            p_clob,
            c_rs,
            v_from
         );
         if v_to = 0 then
            v_to := v_len + 1;
         end if;
         v_rec := dbms_lob.substr(
            p_clob,
            v_to - v_from,
            v_from
         );
         v_from := v_to + 1;
         l_row.wagon_no := trim(g_field(
            v_rec,
            1
         ));
         if l_row.wagon_no is not null then
            l_row.owner := g_field(
               v_rec,
               2
            );
            l_row.kind := g_field(
               v_rec,
               3
            );
            l_row.st_from := g_field(
               v_rec,
               4
            );
            l_row.st_to := g_field(
               v_rec,
               5
            );
            l_row.cargo := g_field(
               v_rec,
               6
            );
            l_row.weight := g_field(
               v_rec,
               7
            );
            l_row.waybill_no := g_field(
               v_rec,
               8
            );
            pipe row ( l_row );
         end if;
      end loop;

      return;
   end parse_wagon_clob;

    --rem 06.07.2026 BekmansurovRR следующий уникальный номер акта ГУ23-ЦЕХ-ГОД-000001
    --add 06.07.2026 BekmansurovRR следующий уникальный номер акта ГУ23-ГОД-000001
   function g_next_number (
      p_dept_id in number
   ) return varchar2 is
      v_yr        number := to_number ( to_char(
         sysdate,
         'YYYY'
      ) );
      v_cnt       number;
      v_dept_code varchar2(32);
      v_dept_id   number;
   begin
        --v_dept_id := p_dept_id; --rem 06.07.2026 BekmansurovRR Номер акта не в разрезе цеха
        /*
        select code
          into v_dept_code
          from xx_disl_dept_v
         where id = p_dept_id;*/

      v_dept_id := 0;                         --add 06.07.2026 BekmansurovRR

      update xx_disl_gu23_counter
         set
         cnt = cnt + 1
       where dept_id = v_dept_id
         and yr = v_yr returning cnt into v_cnt;

      if sql%rowcount = 0 then
         v_cnt := 1;
         insert into xx_disl_gu23_counter (
            id,
            dept_id,
            yr,
            cnt
         ) values
            ( xx_disl_gu23_counter_seq.nextval,
              v_dept_id,
              v_yr,
              v_cnt );
      end if;

      return 'ГУ23-' --|| v_dept_code || '-'  --rem 06.07.2026 BekmansurovRR
             || v_yr
             || '-'
             || lpad(
         v_cnt,
         6,
         '0'
      );
   end;

    -- строка акта в RECORD
   function g_act_row (
      a in xx_disl_gu23_act_v%rowtype
   ) return t_gu23_act_row is
      o t_gu23_act_row;
   begin
      o.id := a.id;
      o.act_start_number := a.act_start_number;
      o.act_number := a.act_number;
      o.act_type := a.act_type;
      o.status := a.status;
      o.dept_id := a.dept_id;
      o.dept := a.dept_code;
      o.station_id := a.station_id;
      o.station := a.station;
      o.st_from_id := a.st_from_id;
      o.st_from := a.st_from;
      o.st_to_id := a.st_to_id;
      o.st_to := a.st_to;
      o.cargo_ref := a.cargo_ref;
      o.reason_id := a.reason_id;
      o.reason_name := a.reason_name;
      o.categ_name := a.categ_name;
      o.circumstances := a.circumstances;
      o.start_at := to_char(
         a.start_at,
         c_dtf
      );
      o.end_at := to_char(
         a.end_at,
         c_dtf
      );
      o.dur_days := a.dur_days;
      o.dur_hours := a.dur_hours;
      o.dur_total_h := a.dur_total_h;
      o.cal_days := a.cal_days;
      o.linked_start_id := a.linked_start_id;
      o.linked_start_number := a.linked_start_number;
      o.wagon_cnt := a.wagon_cnt;
      o.file_cnt := a.file_cnt;
      o.annul_reason := a.annul_reason;
      o.created_at := to_char(
         a.created_at,
         c_dtf
      );
      o.created_by := g_user_name(a.created_by);
      o.modified_at := to_char(
         a.modified_at,
         c_dtf
      );
      o.content_version := nvl(
         a.content_version,
         1
      );
      return o;
   end;


    -- ----------------------------------------------------------------
    -- сохранение данных в таблицы (общий API)
    -- ----------------------------------------------------------------
   procedure insert_act (
      p_row in xx_disl_gu23_act%rowtype
   ) is
   begin
      insert into xx_disl_gu23_act (
         id,
         act_number,
         act_type,
         status,
         dept_id,
         station_id,
         st_from_id,
         st_to_id,
         cargo_ref,
         reason,
         circumstances,
         start_at,
         end_at,
         dur_days,
         dur_hours,
         dur_total_h,
         cal_days,
         linked_start_id,
         created_at,
         created_by,
         modified_at,
         modified_by
      ) values
         ( p_row.id,
           p_row.act_number,
           p_row.act_type,
           p_row.status,
           p_row.dept_id,
           p_row.station_id,
           p_row.st_from_id,
           p_row.st_to_id,
           p_row.cargo_ref,
           p_row.reason,
           p_row.circumstances,
           p_row.start_at,
           p_row.end_at,
           p_row.dur_days,
           p_row.dur_hours,
           p_row.dur_total_h,
           p_row.cal_days,
           p_row.linked_start_id,
           p_row.created_at,
           p_row.created_by,
           p_row.modified_at,
           p_row.modified_by );
   end insert_act;

    -- Обновление акта
   procedure update_act (
      p_row in xx_disl_gu23_act%rowtype
   ) is
   begin
      update xx_disl_gu23_act
         set act_number = p_row.act_number,
             act_type = p_row.act_type,
             status = p_row.status,
             dept_id = p_row.dept_id,
             station_id = p_row.station_id,
             st_from_id = p_row.st_from_id,
             st_to_id = p_row.st_to_id,
             cargo_ref = p_row.cargo_ref,
             reason = p_row.reason,
             circumstances = p_row.circumstances,
             start_at = p_row.start_at,
             end_at = p_row.end_at,
             dur_days = p_row.dur_days,
             dur_hours = p_row.dur_hours,
             dur_total_h = p_row.dur_total_h,
             cal_days = p_row.cal_days,
             linked_start_id = p_row.linked_start_id,
             modified_at = p_row.modified_at,
             modified_by = p_row.modified_by
       where id = p_row.id;
   end update_act;

    -- Строки акта
   procedure insert_act_row (
      p_row in xx_disl_gu23_act_row%rowtype
   ) is
   begin
      insert into xx_disl_gu23_act_row (
         id,
         act_id,
         wagon_no,
         owner,
         kind,
         st_from,
         st_to,
         cargo,
         weight,
         waybill_no
      ) values
         ( p_row.id,
           p_row.act_id,
           p_row.wagon_no,
           p_row.owner,
           p_row.kind,
           p_row.st_from,
           p_row.st_to,
           p_row.cargo,
           p_row.weight,
           p_row.waybill_no );
   end insert_act_row;

    -- Подписанты акта
   procedure insert_signer (
      p_row in xx_disl_gu23_signer%rowtype
   ) is
   begin
      insert into xx_disl_gu23_signer (
         id,
         act_id,
         signer_ref_id,
         fio,
         post,
         org,
         ord_no,
         stype         -- 'own' / 'rzd' / NULL
      ) values
         ( p_row.id,
           p_row.act_id,
           p_row.signer_ref_id,
           p_row.fio,
           p_row.post,
           p_row.org,
           p_row.ord_no,
           p_row.stype );
   end insert_signer;

    -- ----------------------------------------------------------------
    -- справочники
    -- ----------------------------------------------------------------
    -- Цеха
   function gu23_get_ref_cex return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
   begin
      for r in (
         select id,
                code,
                name
           from xx_disl_dept_v
          order by name
      ) loop
         l_row.id := r.id;
         l_row.code := r.code;
         l_row.name := r.name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- Причины
   function gu23_get_ref_reason (
      p_kind in varchar2 default null
   ) return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
   begin
      for r in (
         select rr.id,
                rr.name,
                rr.categ_name -- add 21.07.2026 BekmansurovRR
           from xx_disl_gu23_ref_reason_v rr
          where rr.active = 'Y'
            and ( p_kind is null
             or rr.act_kind in ( 'any',
                                 p_kind ) )
          order by name
      ) loop
         l_row.id := ( r.id );
         l_row.code := to_char(r.id);
         l_row.name := r.name;
         l_row.categ_name := r.categ_name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- add 15.06.2026
    -- Общий справочник (построен по аналогии, как коды поиска)
   function gu23_get_general_ref (
      p_ref_code in varchar2
   ) return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
   begin
      for r in (
         select id,
                code,
                name
           from xx_disl_general_ref
          where ref_code = p_ref_code
            and sysdate between start_effect_date and end_effect_date
          order by name
      ) loop
         l_row.id := r.id;
         l_row.code := nvl(
            r.code,
            to_char(r.id)
         );
         l_row.name := r.name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- ст. составления
   function gu23_get_ref_station_compile return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
   begin
      for r in (
         select station_id,
                name
           from xx_disl_stations
          order by name
      ) loop
         l_row.code := r.station_id;
         l_row.name := r.name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- ст. отправления
   function gu23_get_ref_st_from return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
   begin
      for r in (
         select e_st_code as st_code,
                st_name as name
           from xx_etw.xx_nsi_station_v
          where st_name like 'УГЛЕУ%'
          order by name
      ) loop
         l_row.code := r.st_code;
         l_row.name := r.name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- ст. назначения
   function gu23_get_ref_st_to return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
   begin
      for r in (
         select e_st_code as st_code,
                st_name as name
           from xx_etw.xx_nsi_station_v
          order by name
      ) loop
         l_row.code := r.st_code;
         l_row.name := r.name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- Груз
   function gu23_get_ref_cargo return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
   begin
      for r in (
         select fr_code_etsng as code,
                fr_name as name
           from etw_nsi_freight
          where trunc(sysdate) between recdatebegin and recdateend
      ) loop
         l_row.code := r.name;
         l_row.name := r.name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- подписанты - работники предприятия
   function gu23_get_ref_signer_own (
      p_dept_id in varchar2 default null
   ) return xx_disl_gu23_signer_tab
      pipelined
   is
      l_row xx_disl_gu23_signer_row;
   begin
      for r in (
         select du.*
           from xx_disl_users_emp_v du
          where 1 = 1
            and du.open = 'Y'
                  --and  prv.THEME like '%'||p_dept||'%'
                  --and prv.THEME like '%ЖДЦ%'
          order by fio
      ) loop
         l_row.id := r.id;
         l_row.fio := r.fio;
         l_row.post := r.post;
         l_row.org := r.org;
         l_row.unit := r.unit;
         l_row.stype := r.stype;
         l_row.ord_no := null;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- подписанты - работники станции ОАО РЖД и другие, которые подписывают "ручками", а не через форму
   function gu23_get_ref_signer_rzd return xx_disl_gu23_signer_tab
      pipelined
   is
      l_row xx_disl_gu23_signer_row;
   begin
      for r in (
         select id,
                fio,
                post,
                org,
                unit,
                stype
           from xx_disl_gu23_ref_signer
          where active = 'Y'
            and stype = 'Работник станции ОАО РЖД'
          order by fio
      ) loop
         l_row.id := r.id;
         l_row.fio := r.fio;
         l_row.post := r.post;
         l_row.org := r.org;
         l_row.unit := r.unit;
         l_row.stype := r.stype;
         l_row.ord_no := null;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- Ранее введённые ВРУЧНУЮ подписанты (signer_ref_id is null)
    -- уникальные ФИО/должность/организация из истории актов.
    -- Чтобы заново не вводить
   function gu23_get_ref_signer_manual return xx_disl_gu23_signer_tab
      pipelined
   is
      l_row xx_disl_gu23_signer_row;
   begin
      for r in (
         select fio,
                post,
                org
           from xx_disl_gu23_signer
          where signer_ref_id is null
            and fio is not null
          group by fio,
                   post,
                   org
          order by fio
      ) loop
         l_row.id := null;
         l_row.signer_ref_id := null;
         l_row.fio := r.fio;
         l_row.post := r.post;
         l_row.org := r.org;
         l_row.unit := null;
         l_row.stype := null;
         l_row.ord_no := null;
         l_row.user_id := null;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- ----------------------------------------------------------------
    -- акты
    -- ----------------------------------------------------------------
   function gu23_get_acts (
      p_q            in varchar2,
      p_type         in varchar2,
      p_status       in varchar2,
      p_dept_id      in varchar2,
      p_date_from    in varchar2,
      p_date_to      in varchar2,
      p_has_signed   in varchar2,
      p_reason_categ in varchar2,
      p_page         in number,
      p_page_size    in number
   ) return xx_disl_gu23_act_tab
      pipelined
   is
      l_cur  sys_refcursor;
      l_row  t_gu23_act_row;
      v_q    varchar2(4000) := lower(p_q);
      v_from date :=
         case
            when p_date_from is not null then
               to_date(p_date_from,
                       'DD.MM.YYYY')
         end;
      v_to   date :=
         case
            when p_date_to is not null then
               to_date(p_date_to,
                       'DD.MM.YYYY') + 1
         end;
      v_size number := nvl(
         p_page_size,
         1000000
      );
      v_off  number := ( nvl(
         p_page,
         1
      ) - 1 ) * v_size;
      v_end  number := v_off + v_size;
   begin
      open l_cur for select a.id,
                            a.act_number,
                            a.act_start_number,
                            a.act_type,
                            a.status,
                            a.dept_id,
                            a.dept_code dept,
                            a.station_id,
                            a.station,
                            a.st_from_id,
                            a.st_from,
                            a.st_to_id,
                            a.st_to,
                            a.cargo_ref,
                            a.reason_id,
                            a.reason_name,
                            a.categ_name,
                            a.circumstances,
                            to_char(
                                       a.start_at,
                                       c_dtf
                                    ) start_at,
                            to_char(
                                       a.end_at,
                                       c_dtf
                                    ) end_at,
                            a.dur_days,
                            a.dur_hours,
                            a.dur_total_h,
                            a.cal_days,
                            a.linked_start_id,
                            a.linked_start_number,
                            a.wagon_cnt,
                            a.file_cnt,
                            a.annul_reason,
                            to_char(
                                       a.created_at,
                                       c_dtf
                                    ) created_at,
                            du.full_name created_by,
                            to_char(
                                       a.modified_at,
                                       c_dtf
                                    ) modified_at,
                            nvl(
                                       a.content_version,
                                       1
                                    ) content_version,
                            a.rn
                                      from (
                                       select a.*,
                                              rownum rn
                                         from (
                                          select *
                                            from xx_disl_gu23_act_v a
                                           where ( p_type is null
                                              or instr(
                                             ','
                                             || p_type
                                             || ',',
                                             ','
                                             || a.act_type
                                             || ','
                                          ) > 0 )
                                             and ( p_status is null
                                              or instr(
                                             ','
                                             || p_status
                                             || ',',
                                             ','
                                             || a.status
                                             || ','
                                          ) > 0 )
                                             and ( p_dept_id is null
                                              or instr(
                                             ','
                                             || p_dept_id
                                             || ',',
                                             ','
                                             || a.dept_id
                                             || ','
                                          ) > 0 )
                                       -- add 24.07.2026 BekmansurovRR: при поиске (v_q) период игнорируем
                                             and ( v_q is not null
                                              or ( ( v_from is null
                                             and v_to is null )
                                              or ( a.start_at is not null
                                             and ( v_from is null
                                              or nvl(
                                             a.start_at,
                                             v_from
                                          ) >= v_from )
                                             and ( v_to is null
                                              or nvl(
                                             a.start_at,
                                             v_to
                                          ) < v_to ) )
                                              or ( a.end_at is not null
                                             and ( v_from is null
                                              or nvl(
                                             a.end_at,
                                             v_from
                                          ) >= v_from )
                                             and ( v_to is null
                                              or nvl(
                                             a.end_at,
                                             v_to
                                          ) < v_to ) )
                                              or ( a.start_at is null
                                             and a.end_at is null ) ) )
                                             and ( p_reason_categ is null
                                              or instr(
                                             ','
                                             || p_reason_categ
                                             || ',',
                                             ','
                                             || nvl(
                                                         a.categ_id,
                                                         0
                                                      )
                                             || ','
                                          ) > 0 )
                                             and ( nvl(
                                             p_has_signed,
                                             'N'
                                          ) <> 'Y'
                                              or exists (
                                             select 1
                                               from xx_disl_gu23_file f
                                              where f.act_id = a.id
                                                and f.file_category = 'signed'
                                          ) )
                                             and ( v_q is null
                                          or lower(a.act_number) like '%'
                                                   || v_q
                                                   || '%'
                                          or lower(a.act_start_number) like '%'
                                                   || v_q
                                                   || '%'
                                          or lower(a.reason_name) like '%'
                                                                       || v_q
                                                                       || '%'
                                              or exists (
                                             select 1
                                               from xx_disl_gu23_act_row r
                                              where r.act_id = a.id
                                                and r.wagon_no like '%'
                                                                    || v_q
                                                                    || '%'
                                          ) )
                                           order by a.created_at desc
                                       ) a
                                        where rownum <= v_end
                                    ) a
                                      left join xx_disl_users du
                                    on du.id = a.created_by
                      where a.rn > v_off
                      order by a.created_at desc;

      loop
         fetch l_cur into l_row;
         exit when l_cur%notfound;
         pipe row ( l_row );
      end loop;

      close l_cur;
      return;
   end;

    -- количество актов
   function gu23_count_acts (
      p_q            in varchar2,
      p_type         in varchar2,
      p_status       in varchar2,
      p_dept_id      in varchar2,
      p_date_from    in varchar2,
      p_date_to      in varchar2,
      p_has_signed   in varchar2,
      p_reason_categ in varchar2
   ) return number is
      v_q    varchar2(4000) := lower(p_q);
      v_from date :=
         case
            when p_date_from is not null then
               to_date(p_date_from,
                       'DD.MM.YYYY')
         end;
      v_to   date :=
         case
            when p_date_to is not null then
               to_date(p_date_to,
                       'DD.MM.YYYY') + 1
         end;
      v_cnt  number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_act_v a
       where ( p_type is null
          or instr(
         ','
         || p_type
         || ',',
         ','
         || a.act_type
         || ','
      ) > 0 )
         and ( p_status is null
          or instr(
         ','
         || p_status
         || ',',
         ','
         || a.status
         || ','
      ) > 0 )
         and ( p_reason_categ is null
          or instr(
         ','
         || p_reason_categ
         || ',',
         ','
         || a.categ_name
         || ','
      ) > 0 )
         and ( p_dept_id is null
          or instr(
         ','
         || p_dept_id
         || ',',
         ','
         || a.dept_id
         || ','
      ) > 0 )
               -- add 24.07.2026 BekmansurovRR: при поиске (v_q) период игнорируем
         and ( v_q is not null
          or ( ( v_from is null
         and v_to is null )
          or ( a.start_at is not null
         and ( v_from is null
          or a.start_at >= v_from )
         and ( v_to is null
          or a.start_at < v_to ) )
          or ( a.end_at is not null
         and ( v_from is null
          or a.end_at >= v_from )
         and ( v_to is null
          or a.end_at < v_to ) ) ) )
         and ( nvl(
         p_has_signed,
         'N'
      ) <> 'Y'
          or exists (
         select 1
           from xx_disl_gu23_file f
          where f.act_id = a.id
            and f.file_category = 'signed'
      ) )
         and ( v_q is null
      or lower(a.act_number) like '%'
               || v_q
               || '%'
      or lower(a.act_start_number) like '%'
               || v_q
               || '%'
      or lower(a.reason_name) like '%'
                                   || v_q
                                   || '%'
          or exists (
         select 1
           from xx_disl_gu23_act_row r
          where r.act_id = a.id
            and r.wagon_no like '%'
                                || v_q
                                || '%'
      ) );

      return v_cnt;
   end;

    -- Акт
   function gu23_get_act (
      p_id in number
   ) return xx_disl_gu23_act_tab
      pipelined
   is
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where a.id = p_id
          order by a.created_at desc,
                   a.id desc
      ) loop
         pipe row ( g_act_row(a) );
      end loop;

      return;
   end;

    -- Строки акта (вагоны)
   function gu23_get_rows (
      p_act_id in number
   ) return xx_disl_gu23_row_tab
      pipelined
   is
      l_row xx_disl_gu23_row;
   begin
      for r in (
         select *
           from xx_disl_gu23_act_row
          where act_id = p_act_id
          order by id
      ) loop
         l_row.id := r.id;
         l_row.act_id := r.act_id;
         l_row.wagon_no := r.wagon_no;
         l_row.owner := r.owner;
         l_row.kind := r.kind;
         l_row.st_from := r.st_from;
         l_row.st_to := r.st_to;
         l_row.cargo := r.cargo;
         l_row.weight := r.weight;
         l_row.waybill_no := r.waybill_no;
         begin
            select act_start_number,
                   dur_total_h
              into
               l_row.act_start_num,
               l_row.dur_total_h
              from xx_disl_gu23_act_v
             where id = p_act_id;
         exception
            when others then
               l_row.act_start_num := '-';
         end;

         pipe row ( l_row );
      end loop;

      return;
   end;

    -- Файлы
   function gu23_get_files (
      p_act_id in number
   ) return xx_disl_gu23_file_tab
      pipelined
   is
      l_row xx_disl_gu23_file_row;
   begin
      for f in (
         select *
           from xx_disl_gu23_file
          where act_id = p_act_id
          order by id
      ) loop
         l_row.id := f.id;
         l_row.act_id := f.act_id;
         l_row.file_name := f.file_name;
         l_row.file_ext := f.file_ext;
         l_row.mime_type := f.mime_type;
         l_row.real_path := f.real_path;
         l_row.created_at := to_char(
            f.created_at,
            c_dtf
         );
         l_row.created_by := g_user_name(f.created_by);
         l_row.file_category := nvl(
            f.file_category,
            'general'
         );
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- Информация по файлу
   function gu23_file_info (
      p_file_id in number
   ) return varchar2 is
      v_act_id   number;
      v_path     varchar2(1024);
      v_category varchar2(16);
      v_name     varchar2(512);
      v_mime     varchar2(128);
   begin
      select act_id,
             real_path,
             nvl(
                file_category,
                'general'
             ),
             file_name,
             mime_type
        into
         v_act_id,
         v_path,
         v_category,
         v_name,
         v_mime
        from xx_disl_gu23_file
       where id = p_file_id;

      return v_act_id
             || c_us
             || v_path
             || c_us
             || v_category
             || c_us
             || v_name
             || c_us
             || v_mime;
   exception
      when no_data_found then
         return null;
   end;

    -- Подписанты
   function gu23_get_signers (
      p_act_id in number
   ) return xx_disl_gu23_signer_tab
      pipelined
   is
      l_row xx_disl_gu23_signer_row;
   begin
      for s in (
         select s.*,
                case
                   when s.stype = 'own' then
                      s.signer_ref_id
                   else
                      null
                end as ref_user_id,
                nvl(
                   du.full_name,
                   s.fio
                ) as fio_new
           from xx_disl_gu23_signer s
           left join xx_disl_users_emp_v du
         on du.id = signer_ref_id
            and s.stype = 'own'
          where s.act_id = p_act_id
          order by s.ord_no,
                   s.id
      ) loop
         l_row.id := s.id;
         l_row.signer_ref_id := s.signer_ref_id;
         l_row.fio := s.fio_new;
         l_row.post := s.post;
         l_row.org := s.org;
         l_row.unit := null;
         l_row.stype := s.stype;
         l_row.ord_no := s.ord_no;
         l_row.user_id := s.ref_user_id;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- История изменений по акту
   function gu23_get_hist (
      p_act_id in number
   ) return xx_disl_gu23_hist_tab
      pipelined
   is
      l_row xx_disl_gu23_hist_row;
   begin
      for h in (
         select *
           from xx_disl_gu23_hist
          where act_id = p_act_id
          order by ts desc,
                   id desc
      ) loop
         l_row.id := h.id;
         l_row.act_id := h.act_id;
         l_row.ts := to_char(
            h.ts,
            c_dtf
         );
         l_row.usr := g_user_name(h.usr);
         l_row.txt := h.txt;
         l_row.ip := h.ip;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- Открытые акты (акт на начало)
   function gu23_get_open_starts return xx_disl_gu23_act_tab
      pipelined
   is
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where a.act_type = 'start'
            and a.status in (                         --'active',
             'signed' )
                         -- остался хотя бы один незакрытый вагон
            and exists (
            select 1
              from xx_disl_gu23_act_row sr
             where sr.act_id = a.id
               and not exists (
               select 1
                 from xx_disl_gu23_act e,
                      xx_disl_gu23_act_row er
                where er.act_id = e.id
                  and e.act_type = 'end' -- Тип акта "Окончание простоя"
                  and e.status in ( 'active', -- Активный
                                    'signed', -- Подписан
                                    'closed' -- Закрыт
                                     )
                                                         -- Дочерний акт(связанный акт)
                  and e.linked_start_id = a.id
                  and er.wagon_no = sr.wagon_no
            )
         )
          order by a.start_at
      ) loop
         pipe row ( g_act_row(a) );
      end loop;

      return;
   end;

    -- открытые вагоны акта начала (не закрытые действующим актом окончания)
   function gu23_get_open_rows (
      p_start_id in number
   ) return xx_disl_gu23_row_tab
      pipelined
   is
      l_row xx_disl_gu23_row;
   begin
      for r in (
         select *
           from xx_disl_gu23_act_row sr
          where sr.act_id = p_start_id
            and not exists (
            select 1
              from xx_disl_gu23_act e,
                   xx_disl_gu23_act_row er
             where er.act_id = e.id
               and e.act_type = 'end'
               and e.status in ( 'active',
                                 'signed',
                                 'closed' ) -- занят; rejected/annulled/draft ? свободен
               and e.linked_start_id = p_start_id
               and er.wagon_no = sr.wagon_no
         )
          order by sr.id
      ) loop
         l_row.id := r.id;
         l_row.act_id := r.act_id;
         l_row.wagon_no := r.wagon_no;
         l_row.owner := r.owner;
         l_row.kind := r.kind;
         l_row.st_from := r.st_from;
         l_row.st_to := r.st_to;
         l_row.cargo := r.cargo;
         l_row.weight := r.weight;
         l_row.waybill_no := r.waybill_no;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- поиск по вагону (в каких актах)
   function gu23_get_by_wagon (
      p_wagon in varchar2
   ) return xx_disl_gu23_act_tab
      pipelined
   is
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where exists (
            select 1
              from xx_disl_gu23_act_row r
             where r.act_id = a.id
               and r.wagon_no = p_wagon
         )
          order by a.created_at desc,
                   a.id desc
      ) loop
         pipe row ( g_act_row(a) );
      end loop;

      return;
   end;

    -- ----------------------------------------------------------------
    -- Данные из дислокации (внешняя дислокация или по накладные из ЭТРАНа)
    -- ----------------------------------------------------------------
   function gu23_get_wagon_info (
      p_wagons       in clob,
      p_waybill_no   in varchar2 default null,
      p_dest_station in varchar2 default null,
      p_cargo_name   in varchar2 default null,
      p_act_type     in varchar2 default null
   ) return xx_disl_gu23_wagon_tab
      pipelined
   is
      l_function varchar2(150) := 'gu23_get_wagon_info';
      v_len      pls_integer := nvl(
         dbms_lob.getlength(p_wagons),
         0
      );
      v_from     pls_integer := 1;
      v_to       pls_integer;
      v_no       varchar2(32);
      l_row      xx_disl_gu23_wagon_row;

        -- Курсор данных
      cursor c_dislocation (
         v_w_no         varchar2,              -- вагон
         v_waybill_no   varchar2,          -- накладная
         v_dest_station varchar2, -- станция назначения
         v_cargo_name   varchar2                -- груз
      ) is
      select nvl(
         ecar.car_number,
         regexp_replace(
                 eis.spc_custom_text,
                 '[^[[:digit:]]]*'
              )
      ) as wagon_no,                                   -- вагон
             (
                select sum(ef.car_weight_net)
                  from xx_etw.etw_inv_car ef
                 where ef.front_end_id = ei.front_end_id
                   and ef.car_number = nvl(
                   ecar.car_number,
                   regexp_replace(
                              eis.spc_custom_text,
                              '[^[[:digit:]]]*'
                           )
                )
             ) as weight,
             ecar.car_type_name as wagon_type_code,
             ei.inv_number as waybill_no,                             -- накладная
             eif.freight_name as cargo_name,                                  -- груз
             ( ecar.car_owner_name ) as owner,                                 -- собственнк
             inv_from_station_code as st_from_code,
             inv_to_station_code as st_to_code,
             upper(trim(inv_to_station_name)) as dest_station,                  -- станция назначения
             upper(trim(inv_from_station_name)) as depart_station                -- станция отправления
        from xx_etw.etw_invoice ei,
             xx_etw.etw_inv_car ecar,
             xx_etw.etw_clm_otpr eco,
             xx_etw.etw_clm_otpr_graph_pod gr,
             xx_etw.etw_invoice_source src,
             etw_inv_freight eif,
             (
                select front_end_id,
                       spc_custom_text
                  from etw_inv_spc
                 where spc_transp_clause_id = 975
                    or ( spc_transp_clause_id = 993
                   and upper(spc_custom_text) like '%ПЛАТФОРМА%' )
             ) eis
       where ei.inv_claim_id = eco.claim_id (+)
         and ei.inv_otpr_num = eco.otpr_nom (+)
         and ei.inv_claim_id = gr.claim_id (+)
         and ei.inv_otpr_num = gr.otpr_nom (+)
         and ei.inv_pod_num = gr.gp_pod_num (+)
         and nvl(
         ecar.car_number,
         regexp_replace(
                 eis.spc_custom_text,
                 '[^[[:digit:]]]*'
              )
      ) = nvl(
         v_w_no,
         nvl(
                 ecar.car_number,
                 regexp_replace(
                        eis.spc_custom_text,
                        '[^[[:digit:]]]*'
                     )
              )
      )
         and upper(inv_to_station_name) like '%'
                                             || upper(v_dest_station)
                                             || '%'
         and ei.inv_number = nvl(
         v_waybill_no,
         ei.inv_number
      )
         and ei.front_end_id = ecar.front_end_id (+)
         and ei.front_end_id = eis.front_end_id (+)
         and ei.front_end_id = src.front_end_id (+)
         and ei.front_end_id = eif.front_end_id (+)
         and ei.invoice_state_id in ( 31,     --Накладная предъявлена
                                      44, --Работа с документом окончена (44)
                                      439, -- Согласование уведомления
                                      1116 -- Приемосдатчиком принято
                                       )
         and ei.inv_date_create > to_date('01.01.2026','dd.mm.rrrr')
         and ei.inv_recip_name <> 'ОАО "Метафракс"';

        -- Проставляет l_row.dup_act/dup_by, если по вагону (в пределах месяца)
        -- или накладной (в пределах 3 месяцев) уже есть занятый акт начала.
      procedure set_dup_flag is
      begin
         l_row.dup_act := null;
         l_row.dup_by := null;
         if l_row.found <> 1
         or nvl(
            p_act_type,
            'start'
         ) <> 'start' then
            return;
         end if;

            -- по вагону в пределах текущего месяца
         begin
            select a.act_number
              into l_row.dup_act
              from xx_disl_gu23_act a,
                   xx_disl_gu23_act_row r
             where r.act_id = a.id
               and a.act_type = 'start'
               and a.status in ( 'active',
                                 'signed',
                                 'closed' )
               and r.wagon_no = l_row.wagon_no
               and trunc(
               a.start_at,
               'MM'
            ) = trunc(
               sysdate,
               'MM'
            )
               and rownum = 1;

            l_row.dup_by := 'wagon';
         exception
            when no_data_found then
               l_row.dup_act := null;
         end;

            -- по накладной в пределах 3 месяцев
         if
            l_row.dup_act is null
            and l_row.waybill_no is not null
         then
            begin
               select a.act_number
                 into l_row.dup_act
                 from xx_disl_gu23_act a,
                      xx_disl_gu23_act_row r
                where r.act_id = a.id
                  and a.act_type = 'start'
                  and a.status in ( 'active',
                                    'signed',
                                    'closed' )
                  and r.waybill_no = l_row.waybill_no
                  and a.start_at >= add_months(
                  sysdate,
                  -3
               )
                  and a.start_at <= add_months(
                  sysdate,
                  3
               )
                  and rownum = 1;

               l_row.dup_by := 'waybill';
            exception
               when no_data_found then
                  l_row.dup_act := null;
            end;
         end if;
      end set_dup_flag;
   begin
      l_row.weight := null;

        --log_new(l_function,'p_waybill_no='||p_waybill_no);
        --log_new(l_function,'p_dest_station='||p_dest_station);
        --log_new(l_function,'p_act_type='||p_act_type);

        --log_new(l_function,'v_len='||v_len);
        --log_new(l_function,'v_len='||v_len);
        ---------------------------------------------------------------------
        -- Отправили Список вагонов
        ---------------------------------------------------------------------
        /*log_new(l_function,'p_waybill_no='||p_waybill_no);
        log_new(l_function,'p_dest_station='||p_dest_station);
        log_new(l_function,'p_wagons='||p_wagons);
        log_new(l_function,'v_len='||v_len);
        log_new(l_function,'length(p_wagons)'||length(p_wagons));
        */
      if
         v_len > 0
         and length(p_wagons) > 1
      then
         while v_from <= v_len loop
            v_to := instr(
               p_wagons,
               c_rs,
               v_from
            );
            if v_to = 0 then
               v_to := v_len + 1;
            end if;
            v_no := trim(dbms_lob.substr(
               p_wagons,
               v_to - v_from,
               v_from
            ));
            v_from := v_to + 1;
            if v_no is null then
               continue;
            end if;

                -- log_new(l_function,'v_no='||v_no);
                -- Инициализируем дефолтные значения для текущего вагона
            l_row.wagon_no := v_no;
            l_row.found := 0;
            l_row.owner := null;
            l_row.kind := null;
            l_row.st_from := null;
            l_row.st_from_code := null;
            l_row.st_to := null;
            l_row.cargo := null;
            l_row.weight := null;
            l_row.st_to_code := null;
            l_row.dup_act := null;
            l_row.dup_by := null;


                --log_new (l_function, 'p_waybill_no=' || p_waybill_no);
                --log_new (l_function, 'p_dest_station=' || p_dest_station);
                --log_new (l_function, 'v_no=' || v_no);

                -- Ищем данные по конкретному вагону
            for d in c_dislocation(
               v_no,
               p_waybill_no,
               p_dest_station,
               null
            ) loop
               l_row.owner := d.owner;
               l_row.kind := d.wagon_type_code;
               l_row.st_from := d.depart_station;
               l_row.st_from_code := d.st_from_code;
               l_row.st_to := d.dest_station;
               l_row.cargo := d.cargo_name;
               l_row.weight := d.weight;
               l_row.waybill_no := d.waybill_no;
               l_row.st_to_code := d.st_to_code;
               l_row.found := 1;
            end loop;

            set_dup_flag;
            pipe row ( l_row );
         end loop;
        ---------------------------------------------------------------------
        -- Список вагонов ПУСТОЙ (ищем только по станции/накладной/грузу)
        ---------------------------------------------------------------------
      elsif p_dest_station is not null
      or p_waybill_no is not null then
            --log_new(l_function,'Список вагонов ПУСТОЙ (ищем только по станции/накладной)');
         for d in c_dislocation(
            null,
            p_waybill_no,
            p_dest_station,
            null
         ) loop
            l_row.wagon_no := d.wagon_no;
            l_row.owner := d.owner;
            l_row.kind := d.wagon_type_code;
            l_row.st_from := d.depart_station;
            l_row.st_from_code := d.st_from_code;
            l_row.st_to := d.dest_station;
            l_row.cargo := d.cargo_name;
            l_row.weight := d.weight;
            l_row.waybill_no := d.waybill_no;
            l_row.st_to_code := d.st_to_code;
            l_row.found := 1;
            l_row.dup_act := null;
            l_row.dup_by := null;
            set_dup_flag;
            pipe row ( l_row );
         end loop;
      end if;

      return;
   end;

    -- ----------------------------------------------------------------
    -- файлы (id)
    -- ----------------------------------------------------------------
   function gu23_new_file_id return number is
      v number;
   begin
      select xx_disl_gu23_file_seq.nextval
        into v
        from dual;

      return v;
   end;

   function gu23_act_type (
      p_act_id in number
   ) return varchar2 is
      v_type varchar2(16);
   begin
      select act_type
        into v_type
        from xx_disl_gu23_act
       where id = p_act_id;

      return v_type;
   exception
      when no_data_found then
         return null;
   end;

   function gu23_can_change_files (
      p_act_id  in number,
      p_user_id in number
   ) return varchar2 is
      v_cnt number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_act
       where id = p_act_id
         and status <> 'annulled'
         and ( created_by = p_user_id
          or gu23_is_admin(p_user_id) = 'Y' );

      return
         case
            when v_cnt > 0 then
               'Y'
            else
               'N'
         end;
   exception
      when others then
         return 'N';
   end;

   function gu23_can_delete_files (
      p_act_id  in number,
      p_user_id in number
   ) return varchar2 is
      v_cnt number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_act
       where id = p_act_id
         and status <> 'annulled'
         and ( ( status in ( 'closed',
                             'signed' )
         and gu23_is_admin(p_user_id) = 'Y' )
          or ( status not in ( 'closed',
                               'signed' )
         and ( created_by = p_user_id
          or gu23_is_admin(p_user_id) = 'Y' ) ) );

      return
         case
            when v_cnt > 0 then
               'Y'
            else
               'N'
         end;
   exception
      when others then
         return 'N';
   end;

    -- Добавление файла
   function gu23_add_file (
      p_data in t_gu23_add_file
   ) return varchar2 is
   begin
      if gu23_can_change_files(
         p_data.p_act_id,
         p_data.p_user_id
      ) <> 'Y' then
         return 'ERR'
                || c_us
                || 'Нет прав на прикрепление файлов';
      end if;

      insert into xx_disl_gu23_file (
         id,
         act_id,
         file_name,
         file_ext,
         mime_type,
         real_path,
         created_at,
         created_by,
         file_category
      ) values
         ( p_data.p_file_id,
           p_data.p_act_id,
           p_data.p_name,
           p_data.p_ext,
           p_data.p_mime,
           p_data.p_path,
           sysdate,
           p_data.p_user_id,
           nvl(
              p_data.p_category,
              'general'
           ) );

      log_act_history(
         p_act_id  => p_data.p_act_id,
         p_user_id => p_data.p_user_id,
         p_text    => 'Прикреплён файл: ' || p_data.p_name
      );
      commit;
      return 'done';
   exception
      when others then
         rollback;
         return format_error();
   end;

   function gu23_del_file (
      p_data in t_gu23_del_file
   ) return varchar2 is
      v_act      number;
      v_name     varchar2(512);
      v_category varchar2(16);
   begin
      select act_id,
             file_name,
             nvl(
                file_category,
                'general'
             )
        into
         v_act,
         v_name,
         v_category
        from xx_disl_gu23_file
       where id = p_data.p_file_id;

      if gu23_can_delete_files(
         v_act,
         p_data.p_user_id
      ) <> 'Y' then
         return 'ERR'
                || c_us
                || 'Нет прав на удаление файлов';
      end if;

      if
         v_category = 'signed'
         and gu23_is_admin(p_data.p_user_id) <> 'Y'
      then
         return 'ERR'
                || c_us
                || 'Подписанные файлы может удалять только администратор';
      end if;

      delete from xx_disl_gu23_file
       where id = p_data.p_file_id;

      log_act_history(
         p_act_id  => v_act,
         p_user_id => p_data.p_user_id,
         p_text    => 'Удалён файл: ' || v_name
      );
      commit;
      return 'done';
   exception
      when others then
         rollback;
         return format_error();
   end;

    -- ----------------------------------------------------------------
    -- сохранение акта
    -- ----------------------------------------------------------------
   function gu23_save_act (
      p_data in t_gu23_save_act
   ) return varchar2 is
      l_function   varchar2(240) := 'gu23_save_act';
      l_row        xx_disl_gu23_hist%rowtype;
      v_id         number;
      v_number     varchar2(64);
      v_dept_id    number;
      v_station_id varchar2(100);
      v_st_from_id varchar2(100);
      v_st_to_id   varchar2(100);
      v_start      date;
      v_end        date;
      v_dd         number;
      v_dh         number;
      v_th         number;
      v_cd         number;
      v_isnew      boolean;
      v_ord        number := 0;
      v_wcnt       number := 0;
      vw_owner     varchar2(128);
      vw_kind      varchar2(128);
      vw_from      varchar2(128);
      vw_to        varchar2(128);
      vw_cargo     varchar2(256);
      vw_weight    varchar2(32);
      vs_ref_id    number;
      vs_fio       varchar2(256);
      vs_post      varchar2(256);
      vs_org       varchar2(256);
      vs_stype     varchar2(16);
      l_sig        xx_disl_gu23_signer%rowtype;
      l_act        xx_disl_gu23_act%rowtype;
      l_arow       xx_disl_gu23_act_row%rowtype;
      v_dupnum     varchar2(64);
      v_has_start  number;
      v_cur_status varchar2(16);
      v_created_by number;
      v_len        pls_integer;
      v_from       pls_integer;
      v_to         pls_integer;
      v_rec        varchar2(32767);
   begin
      v_id := p_data.p_id;
      v_isnew :=
         case
            when ( p_data.p_id is null
                or p_data.p_id = 0 ) then
               true
            else
               false
         end;

        --log_new (l_function, 'p_data.p_type=' || p_data.p_type);
        --log_new (l_function, 'p_data.p_start_at=' || p_data.p_start_at);
        --log_new (l_function, 'p_data.p_end_at=' || p_data.p_end_at);
      v_start := g_to_date(p_data.p_start_at);
      v_end := g_to_date(p_data.p_end_at);

        -- тип акта
      if p_data.p_type not in ( 'start',
                                'end',
                                'other' ) then
         return format_error('Неверный тип акта');
      end if;

        -- цех
      if nvl(
         p_data.p_dept,
         'X'
      ) = 'X' then
         return format_error('Не указан цех');
      end if;

        -- получаем id цеха по коду
      begin
         select id
           into v_dept_id
           from xx_disl_dept_v
          where code = p_data.p_dept;
      exception
         when no_data_found then
            return format_error('Цех не найден: ' || p_data.p_dept);
      end;

      v_station_id := nullif(
         trim(p_data.p_station),
         ''
      );
      v_st_from_id := nullif(
         trim(p_data.p_st_from),
         ''
      );
      v_st_to_id := nullif(
         trim(p_data.p_st_to),
         ''
      );

        -- проверки дат для акта "Начало простоя"
      if
         p_data.p_type = 'start'
         and p_data.p_status = 'active'
         and v_start is null
      then
         return format_error('Не указана дата начала простоя');
      end if;

        -- проверки дат и связей для акта "Окончание простоя"
      if
         p_data.p_type = 'end'
         and p_data.p_status = 'active'
      then
         if p_data.p_linked_start_id is null then
            return format_error('Не выбран открытый акт начала простоя');
         end if;
         if v_end is null then
            return format_error('Не указана дата окончания простоя');
         end if;

            -- если дата начала не передана, извлекаем из БД
         if v_start is null then
            begin
               select start_at
                 into v_start
                 from xx_disl_gu23_act
                where id = p_data.p_linked_start_id;
            exception
               when no_data_found then
                  null;
            end;
         end if;

         if
            v_start is not null
            and v_end < v_start
         then
            return format_error('Дата окончания не может быть меньше даты начала');
         end if;

         if v_end > sysdate then
            return format_error('Дата окончания не может быть больше текущей даты (в будущем)');
         end if;
      end if;

        -- расчёт длительности (только для акта окончания)
      if
         p_data.p_type = 'end'
         and v_start is not null
         and v_end is not null
      then
         v_th := round(
            (v_end - v_start) * 24,
            1
         );
         v_dd := trunc(v_end - v_start);
         v_dh := round(((v_end - v_start) - v_dd) * 24);
         v_cd := ceil(v_end - v_start);
      end if;

        -- INSERT или UPDATE шапки акта
      if v_isnew then
         v_number := g_next_number(v_dept_id);
         v_id := xx_disl_gu23_act_seq.nextval;
            -- add 24.07.2026 BekmansurovRR: вставка через процедуру insert_act
         l_act.id := v_id;
         l_act.act_number := v_number;
         l_act.act_type := p_data.p_type;
         l_act.status := p_data.p_status;
         l_act.dept_id := v_dept_id;
         l_act.station_id := v_station_id;
         l_act.st_from_id := v_st_from_id;
         l_act.st_to_id := v_st_to_id;
         l_act.cargo_ref := p_data.p_cargo_ref;
         l_act.reason := p_data.p_reason;
         l_act.circumstances := p_data.p_circumstances;
         l_act.start_at := v_start;
         l_act.end_at := v_end;
         l_act.dur_days := v_dd;
         l_act.dur_hours := v_dh;
         l_act.dur_total_h := v_th;
         l_act.cal_days := v_cd;
         l_act.linked_start_id := p_data.p_linked_start_id;
         l_act.created_at := sysdate;
         l_act.created_by := p_data.p_user_id;
         l_act.modified_at := sysdate;
         l_act.modified_by := p_data.p_user_id;
         insert_act(l_act);
      else
            -- редактировать можно ТОЛЬКО Проект
         begin
            select act_number,
                   status,
                   created_by
              into
               v_number,
               v_cur_status,
               v_created_by
              from xx_disl_gu23_act
             where id = v_id;
         exception
            when no_data_found then
               return format_error('Акт не найден');
         end;

            -- Редактировать можно ТОЛЬКО Проект.
         if v_cur_status not in ( 'draft',
                                  'on_correction' ) then
            return format_error('Действующий/закрытый акт не редактируется ? аннулируйте и заведите новый');
         end if;

         if
            nvl(
               v_created_by,
               -1
            ) <> nvl(
               p_data.p_user_id,
               -1
            )
            and gu23_is_admin(p_data.p_user_id) <> 'Y'
         then
            return format_error('Редактировать акт может только создатель или администратор');
         end if;

            -- если у Проекта ещё нет номера - присваиваем
         if v_number is null then
            v_number := g_next_number(v_dept_id);
         end if;
         update xx_disl_gu23_act
            set act_number = v_number,
                act_type = p_data.p_type,
                status = p_data.p_status,
                dept_id = v_dept_id,
                station_id = v_station_id,
                st_from_id = v_st_from_id,
                st_to_id = v_st_to_id,
                cargo_ref = p_data.p_cargo_ref,
                reason = p_data.p_reason,
                circumstances = p_data.p_circumstances,
                start_at = v_start,
                end_at = v_end,
                dur_days = v_dd,
                dur_hours = v_dh,
                dur_total_h = v_th,
                cal_days = v_cd,
                linked_start_id = p_data.p_linked_start_id,
                modified_at = sysdate,
                modified_by = p_data.p_user_id,
                   -- правка акта "на подписании" админом - новая версия
                content_version = nvl(
                   content_version,
                   1
                ) +
                                  case
                                     when v_cur_status = 'on_correction'
                                        and p_data.p_status = 'active' then
                                        1
                                     else
                                        0
                                  end
          where id = v_id;

         delete from xx_disl_gu23_act_row
          where act_id = v_id;

         delete from xx_disl_gu23_signer
          where act_id = v_id;

         if
            v_cur_status = 'on_correction'
            and p_data.p_status = 'active'
         then
            delete from xx_disl_gu23_approval
             where act_id = v_id;
         end if;
      end if;

        -- разбираем вагоны
      for w in (
         select *
           from table ( parse_wagon_clob(p_data.p_wagons) )
      ) loop
         if p_data.p_type in ( 'start',
                               'other' ) then
                -- данные по вагону из дислокации
            begin
               select owner,
                      kind,
                      st_from,
                      st_to,
                      cargo,
                      weight
                 into
                  vw_owner,
                  vw_kind,
                  vw_from,
                  vw_to,
                  vw_cargo,
                  vw_weight
                 from table ( xx_disl_gu23_pkg.gu23_get_wagon_info(
                  w.wagon_no,
                  p_data.p_waybill_no
               ) )
                where rownum = 1;
            exception
               when others then
                  vw_owner := null;
                  vw_kind := null;
                  vw_from := null;
                  vw_to := null;
                  vw_cargo := null;
                  vw_weight := null;
            end;
         else
                -- для окончания берём данные из акта начала
            vw_owner := w.owner;
            vw_kind := w.kind;
            vw_from := w.st_from;
            vw_to := w.st_to;
            vw_cargo := w.cargo;
            vw_weight := w.weight;
         end if;

            -- запрет дубля открытого простоя
         if
            p_data.p_type = 'start'
            and p_data.p_status = 'active'
            and nvl(
               p_data.p_force,
               'N'
            ) <> 'Y'
         then
                -- дубль по вагону в пределах одного месяца
                -- занятые циклы: active/signed/closed; annulled/rejected/draft - свободны
            v_dupnum := null;
            begin
               select a.act_number
                 into v_dupnum
                 from xx_disl_gu23_act a,
                      xx_disl_gu23_act_row r
                where r.act_id = a.id
                  and a.act_type = 'start'
                  and a.status in ( 'active',
                                    'signed',
                                    'closed' )
                  and a.id <> v_id
                  and r.wagon_no = w.wagon_no
                  and trunc(
                  a.start_at,
                  'MM'
               ) = trunc(
                  v_start,
                  'MM'
               )
                  and rownum = 1;
            exception
               when no_data_found then
                  v_dupnum := null;
            end;

            if v_dupnum is not null then
               rollback;
               return format_error('Нельзя создать акт "Начало простоя": по вагону '
                                   || w.wagon_no
                                   || ' уже есть акт '
                                   || v_dupnum || ' за этот месяц');
            end if;

                -- дубль по накладной в пределах 3 месяцев
            if w.waybill_no is not null then
               v_dupnum := null;
               begin
                  select a.act_number
                    into v_dupnum
                    from xx_disl_gu23_act a,
                         xx_disl_gu23_act_row r
                   where r.act_id = a.id
                     and a.act_type = 'start'
                     and a.status in ( 'active',
                                       'signed',
                                       'closed' )
                     and a.id <> v_id
                     and r.waybill_no = w.waybill_no
                     and a.start_at >= add_months(
                     v_start,
                     -3
                  )
                     and a.start_at <= add_months(
                     v_start,
                     3
                  )
                     and rownum = 1;
               exception
                  when no_data_found then
                     v_dupnum := null;
               end;

               if v_dupnum is not null then
                  rollback;
                  return format_error('Нельзя создать акт "Начало простоя": по накладной '
                                      || w.waybill_no
                                      || ' уже есть акт '
                                      || v_dupnum || ' (в пределах 3 месяцев)');
               end if;
            end if;
         end if;

            -- проверки для акта окончания
         if
            p_data.p_type = 'end'
            and p_data.p_status = 'active'
         then
            select count(*)
              into v_has_start
              from xx_disl_gu23_act_row r
             where r.act_id = p_data.p_linked_start_id
               and r.wagon_no = w.wagon_no;

            if v_has_start = 0 then
               rollback;
               return format_error('Вагон '
                                   || w.wagon_no || ' не относится к выбранному акту начала');
            end if;

            select count(*)
              into v_has_start
              from xx_disl_gu23_act e,
                   xx_disl_gu23_act_row er
             where er.act_id = e.id
               and e.act_type = 'end'
               and e.status in ( 'active',
                                 'signed',
                                 'closed' ) -- занят; rejected/annulled/draft - свободен
               and e.linked_start_id = p_data.p_linked_start_id
               and e.id <> v_id
               and er.wagon_no = w.wagon_no;

            if v_has_start > 0 then
               rollback;
               return format_error('Вагон '
                                   || w.wagon_no || ' уже закрыт другим актом окончания');
            end if;
         end if;

            -- add 24.07.2026 BekmansurovRR: вставка через процедуру insert_act_row
         l_arow.id := xx_disl_gu23_act_row_seq.nextval;
         l_arow.act_id := v_id;
         l_arow.wagon_no := w.wagon_no;
         l_arow.owner := vw_owner;
         l_arow.kind := vw_kind;
         l_arow.st_from := vw_from;
         l_arow.st_to := vw_to;
         l_arow.cargo := vw_cargo;
         l_arow.weight := vw_weight;
         l_arow.waybill_no := w.waybill_no;
         insert_act_row(l_arow);
         v_wcnt := v_wcnt + 1;
      end loop;

        -- при отправке на подписание обязательны и вагоны, и груз (для типа start/other)
      if p_data.p_status = 'active' then
         if v_wcnt = 0 then
            rollback;
            return format_error('Добавьте хотя бы один вагон');
         end if;
         if
            p_data.p_type in ( 'start',
                               'other' )
            and p_data.p_cargo_ref is null
         then
            rollback;
            return format_error('Не указан груз');
         end if;
      end if;

        -- разбираем подписантов: поля ref_id|fio|post|org
      v_len := nvl(
         dbms_lob.getlength(p_data.p_signers),
         0
      );
      v_from := 1;
      while v_from <= v_len loop
         v_to := instr(
            p_data.p_signers,
            c_rs,
            v_from
         );
         if v_to = 0 then
            v_to := v_len + 1;
         end if;
         v_rec := dbms_lob.substr(
            p_data.p_signers,
            v_to - v_from,
            v_from
         );
         v_from := v_to + 1;
         vs_ref_id := to_number ( nullif(
            trim(g_field(
               v_rec,
               1
            )),
            ''
         ) );
         vs_fio := g_field(
            v_rec,
            2
         );
         vs_post := g_field(
            v_rec,
            3
         );
         vs_org := g_field(
            v_rec,
            4
         );
         vs_stype := trim(g_field(
            v_rec,
            5
         )); -- 'own' или 'rzd'; null = вручную

         if trim(vs_fio) is null then
            continue;
         end if;
         v_ord := v_ord + 1;
         l_sig.id := xx_disl_gu23_signer_seq.nextval;
         l_sig.act_id := v_id;
         l_sig.signer_ref_id := vs_ref_id;
         l_sig.fio := vs_fio;
         l_sig.post := vs_post;
         l_sig.org := vs_org;
         l_sig.ord_no := v_ord;
         l_sig.stype := nullif(
            vs_stype,
            ''
         );
         insert_signer(l_sig);
      end loop;

        -- add 24.07.2026 BekmansurovRR
        -- закрытие цикла вынесено в close_start_if_complete (единая логика):
        -- акт начала закроется, когда по всем его вагонам подписаны акты
        -- окончания. Здесь только вызываем.
      if
         p_data.p_type = 'end'
         and p_data.p_status in ( 'active',
                                  'closed' )
         and p_data.p_linked_start_id is not null
      then
         close_start_if_complete(
            p_data.p_linked_start_id,
            p_data.p_user_id
         );
      end if;

      l_row.id := xx_disl_gu23_hist_seq.nextval;
      l_row.act_id := v_id;
      l_row.ts := sysdate;
      l_row.usr := p_data.p_user_id;
      l_row.txt :=
         case
            when xx_disl_gu23_pkg.fnc_boolean_num(v_isnew) = 1 then
                  case
                     when p_data.p_status = 'draft' then
                        'Акт создан (Проект)'
                     else
                        'Акт создан'
                  end
            else
               case
                  when p_data.p_status = 'draft' then
                        'Проект изменён'
                  else
                     'Акт изменён'
               end
         end;

      log_act_history(
         p_act_id  => l_row.act_id,
         p_user_id => l_row.usr,
         p_text    => l_row.txt
      );

      commit;
      return 'OK'
             || c_us
             || v_id
             || c_us
             || v_number;
   exception
      when others then
         rollback;
         return format_error();
   end;

   function gu23_del_act (
      p_data in t_gu23_del_act
   ) return varchar2 is
      v_status varchar2(16);
   begin
      select status
        into v_status
        from xx_disl_gu23_act
       where id = p_data.p_id;

      if v_status <> 'draft' then
         return format_error('Удалять можно только Проект. Действующий акт аннулируется.');
      end if;
      delete from xx_disl_gu23_act
       where id = p_data.p_id;

      commit;
      return 'done';
   exception
      when no_data_found then
         return format_error('Акт не найден');
      when others then
         rollback;
         return format_error();
   end;

    -- Закрытие акта
   function gu23_close_act (
      p_id      in number,
      p_user_id in number
   ) return varchar2 is
      v_status varchar2(16);
      v_type   varchar2(16);
      v_link   number;
   begin
      select status,
             act_type,
             linked_start_id
        into
         v_status,
         v_type,
         v_link
        from xx_disl_gu23_act
       where id = p_id;

      if v_type not in ( 'end',
                         'other' ) then
         return 'ERR'
                || c_us
                || 'Закрыть можно только акт окончания простоя или прочий акт';
      end if;

      if v_status not in ( 'active',
                           'signed' ) then
         return 'ERR'
                || c_us
                || 'Акт должен быть в статусе "Открыт" или "Подписан"';
      end if;

      update xx_disl_gu23_act
         set status = 'closed',
             modified_at = sysdate,
             modified_by = p_user_id
       where id = p_id;

      log_act_history(
         p_act_id  => p_id,
         p_user_id => p_user_id,
         p_text    => 'Акт закрыт'
      );

        -- add 24.07.2026 BekmansurovRR
        -- при ручном закрытии акта окончания пробуем закрыть акт начала
      if v_type = 'end' then
         close_start_if_complete(
            v_link,
            p_user_id
         );
      end if;
      commit;
      return 'OK';
   exception
      when no_data_found then
         return 'ERR'
                || c_us
                || 'Акт не найден';
      when others then
         rollback;
         return 'ERR'
                || c_us
                || sqlerrm;
   end;

   function gu23_annul_act (
      p_data in t_gu23_annul_act
   ) return varchar2 is
      v_type   varchar2(16);
      v_linked number;
   begin
      select act_type,
             linked_start_id
        into
         v_type,
         v_linked
        from xx_disl_gu23_act
       where id = p_data.p_id;

      update xx_disl_gu23_act
         set status = 'annulled',
             annul_reason = p_data.p_reason,
             modified_at = sysdate,
             modified_by = p_data.p_user_id
       where id = p_data.p_id;

        -- при аннулировании акта окончания - снова открываем связанный акт начала
      if
         v_type = 'end'
         and v_linked is not null
      then
         update xx_disl_gu23_act
            set status = 'signed',
                modified_at = sysdate,
                modified_by = p_data.p_user_id
          where id = v_linked
            and status = 'closed';
      end if;

        -- при аннулировании акта начала - каскадно аннулируем связанные акты окончания
      if v_type = 'start' then
         for r in (
            select id,
                   act_number
              from xx_disl_gu23_act
             where linked_start_id = p_data.p_id
               and status not in ( 'annulled',
                                   'draft' )
         ) loop
            update xx_disl_gu23_act
               set status = 'annulled',
                   annul_reason = 'Каскадное аннулирование: аннулирован акт начала '
                                  || (
                      select act_number
                        from xx_disl_gu23_act
                       where id = p_data.p_id
                   ),
                   modified_at = sysdate,
                   modified_by = p_data.p_user_id
             where id = r.id;

            log_act_history(
               p_act_id  => r.id,
               p_user_id => p_data.p_user_id,
               p_text    => 'Акт аннулирован каскадно (аннулирован акт начала): ' || p_data.p_reason
            );
         end loop;
      end if;

      log_act_history(
         p_act_id  => p_data.p_id,
         p_user_id => p_data.p_user_id,
         p_text    => 'Акт аннулирован: ' || p_data.p_reason
      );

      commit;
      return 'done';
   exception
      when no_data_found then
         return format_error('Акт не найден');
      when others then
         rollback;
         return format_error();
   end;

    -- ----------------------------------------------------------------
    -- поиск станций
    -- ----------------------------------------------------------------
   function gu23_search_station (
      p_q in varchar2
   ) return xx_disl_gu23_ref_tab
      pipelined
   is
      l_row xx_disl_gu23_ref_row;
      v_q   varchar2(512) := lower(p_q);
   begin
      if length(trim(p_q)) < 3 then
         return;
      end if;
      for r in (
         select e_st_code as st_code,
                upper(st_name) st_name,
                st_id
           from xx_nsi_station_v
          where upper(st_name) like '%'
                                    || upper(v_q)
                                    || '%'
            and rownum <= 50
          order by st_name
      ) loop
         l_row.code := to_char(r.st_code);
         l_row.name := r.st_name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- ----------------------------------------------------------------
    -- согласование актов
    -- ----------------------------------------------------------------

   function gu23_approval_get_signers (
      p_act_id in number
   ) return t_gu23_approval_signer_tab
      pipelined
   is
      l_row t_gu23_approval_signer_row;
   begin
      for r in (                       -- подписанты предприятия (stype='own')
         select u.id as approver_id,
                u.full_name,
                lower(u.email_address) as email
           from xx_disl_gu23_signer s
           join xx_disl_users_emp_v u
         on u.id = s.signer_ref_id
          where s.act_id = p_act_id
            and s.stype = 'own'
          order by s.id
      ) loop
         l_row.approver_id := r.approver_id;
         l_row.full_name := r.full_name;
         l_row.email := r.email;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- Следущий подписант в маршруте,кто ождидает
   function gu23_approval_next_signer (
      p_act_id in number
   ) return t_gu23_approval_signer_tab
      pipelined
   is
      l_row      t_gu23_approval_signer_row;
      l_rejected number;
   begin
      select count(*)
        into l_rejected
        from xx_disl_gu23_approval
       where act_id = p_act_id
         and status in ( 'rejected',
                         'on_correction' );

      if l_rejected > 0 then
         return;
      end if;
      for r in (
         select approver_id,
                full_name,
                email
           from (
            select u.id as approver_id,
                   nvl(
                      u.full_name,
                      u.fio
                   ) as full_name,
                   lower(u.email_address) as email
              from xx_disl_gu23_signer s
              join xx_disl_users_emp_v u
            on u.id = s.signer_ref_id
              left join xx_disl_gu23_approval a
            on a.act_id = s.act_id
               and a.approver_id = u.id
             where s.act_id = p_act_id
               and s.stype = 'own'        -- только МТФ люди
               and nvl(
               a.status,
               'pending'
            ) <> 'approved'
             order by s.id
         )
          where rownum = 1
      ) loop
         l_row.approver_id := r.approver_id;
         l_row.full_name := r.full_name;
         l_row.email := r.email;
         pipe row ( l_row );
      end loop;

      return;
   end;

   function gu23_approval_init (
      p_act_id       in number,
      p_requested_by in number
   ) return varchar2 is
      v_cnt number := 0;
   begin
      for r in (
         select approver_id
           from table ( gu23_approval_get_signers(p_act_id) )
      ) loop
         merge into xx_disl_gu23_approval t
         using (
            select p_act_id as act_id,
                   r.approver_id as approver_id
              from dual
         ) s on ( t.act_id = s.act_id
            and t.approver_id = s.approver_id )
         when not matched then
         insert (
            id,
            act_id,
            approver_id,
            status,
            requested_at,
            requested_by,
            token_sig )
         values
            ( xx_disl_gu23_approval_seq.nextval,
              s.act_id,
              s.approver_id,
              'pending',
              sysdate,
              p_requested_by,
              null );

         v_cnt := v_cnt + sql%rowcount;
      end loop;

      commit;
      return to_char(v_cnt);
   exception
      when others then
         return format_error();
   end;

    -- данные подписаиня по токкену
   function gu23_approval_by_token (
      p_token in varchar2
   ) return varchar2 is
      v_act_id      number;
      v_approver_id number;
      v_status      varchar2(16);
      v_decided     varchar2(20);
   begin
      select act_id,
             approver_id,
             status,
             to_char(
                decided_at,
                'DD.MM.YYYY HH24:MI'
             )
        into
         v_act_id,
         v_approver_id,
         v_status,
         v_decided
        from xx_disl_gu23_approval
       where token_sig = p_token;

      return v_act_id
             || c_us
             || v_approver_id
             || c_us
             || v_status
             || c_us
             || nvl(
         v_decided,
         ''
      );
   exception
      when no_data_found then
         return null;
   end;

   function gu23_approval_request (
      p_act_id       in number,
      p_approver_id  in number,
      p_requested_by in number,
      p_token_sig    in varchar2
   ) return varchar2 is
   begin
      insert into xx_disl_gu23_approval (
         id,
         act_id,
         approver_id,
         status,
         requested_at,
         requested_by,
         token_sig
      ) values
         ( xx_disl_gu23_approval_seq.nextval,
           p_act_id,
           p_approver_id,
           'pending',
           sysdate,
           p_requested_by,
           p_token_sig );

      commit;
      return 'OK';
   exception
      when others then
         return format_error();
   end;

    -- add 24.07.2026 BekmansurovRR
    -- Закрытие акта начала простоя. Акт начала закрывается, когда по каждому
    -- его вагону есть подписанный (status = 'closed') акт окончания.
   procedure close_start_if_complete (
      p_start_id in number,
      p_user_id  in number default null
   ) is
      v_cnt  number;    -- всего вагонов в акте начала (защита от пустого)
      v_open number; -- вагоны акта начала без подписанного акта окончания
   begin
      if p_start_id is null then
         return;
      end if;

        -- у пустого акта начала закрывать нечего
      select count(*)
        into v_cnt
        from xx_disl_gu23_act_row
       where act_id = p_start_id;

      if v_cnt = 0 then
         return;
      end if;

        -- вагоны акта начала, по которым НЕТ подписанного (closed) акта окончания
      select count(*)
        into v_open
        from xx_disl_gu23_act_row sr
       where sr.act_id = p_start_id
         and not exists (
         select 1
           from xx_disl_gu23_act e
           join xx_disl_gu23_act_row er
         on er.act_id = e.id
          where e.act_type = 'end'
            and e.status = 'closed'
            and e.linked_start_id = p_start_id
            and er.wagon_no = sr.wagon_no
      );

        -- закрываем акт начала, только если не осталось незакрытых вагонов
      if v_open = 0 then
         update xx_disl_gu23_act
            set status = 'closed',
                modified_at = sysdate,
                modified_by = nvl(
                   p_user_id,
                   modified_by
                )
          where id = p_start_id
            and status in ( 'active',
                            'signed' );

         if sql%rowcount > 0 then
            log_act_history(
               p_act_id  => p_start_id,
               p_user_id => p_user_id,
               p_text    => 'Цикл простоя полностью закрыт: по всем вагонам подписаны акты окончания'
            );
         end if;
      end if;
   end close_start_if_complete;

    -- Автоматически обновить статус акта на основе подписантов.
    -- Вызывается после каждого сохранения решения.
   procedure sync_act_status (
      p_act_id in number
   ) is
      v_rejected number;
      v_total    number;
      v_approved number;
   begin
        -- есть хоть одно отклонение - акт отклонён
      select count(*)
        into v_rejected
        from xx_disl_gu23_approval
       where act_id = p_act_id
         and status = 'rejected';

      if v_rejected > 0 then
         update xx_disl_gu23_act
            set status = 'rejected',
                modified_at = sysdate
          where id = p_act_id
            and status = 'active';

         return;
      end if;

        -- подписанты предприятия (stype='own'): signer_ref_id = xx_disl_users.id - сами подписыввают
      select count(*)
        into v_total
        from xx_disl_gu23_signer
       where act_id = p_act_id
         and stype = 'own'
         and signer_ref_id is not null;

      if v_total = 0 then
         return;
      end if;

        -- число тех, кто уже подписал
      select count(*)
        into v_approved
        from xx_disl_gu23_approval a
        join xx_disl_gu23_signer s
      on s.signer_ref_id = a.approver_id
         and s.act_id = a.act_id
       where a.act_id = p_act_id
         and a.status = 'approved'
         and s.stype = 'own';

      if v_approved >= v_total then
         update xx_disl_gu23_act
            set status = 'signed',
                modified_at = sysdate
          where id = p_act_id
            and act_type = 'start' -- add 23.07.2026 BekmansurovRR акт на начало не закрывается, если подписали
            and status = 'active';

         update xx_disl_gu23_act
            set status = 'closed',
                modified_at = sysdate
          where id = p_act_id
            and act_type != 'start' -- add 23.07.2026 BekmansurovRR акт на начало не закрывается, если подписали
            and status = 'active';
      end if;

        -- add 24.07.2026 BekmansurovRR
        -- после синхронизации статуса: если это подписанный (закрытый) акт
        -- окончания - пробуем закрыть связанный акт начала простоя
      for r in (
         select linked_start_id
           from xx_disl_gu23_act
          where id = p_act_id
            and act_type = 'end'
            and status = 'closed'
            and linked_start_id is not null
      ) loop
         close_start_if_complete(r.linked_start_id);
      end loop;
   end sync_act_status;

    -- подписание/отклонение/корректировка по ссылке из письма.
   function gu23_approval_save_decision (
      p_act_id      in number,
      p_approver_id in number,
      p_status      in varchar2,
      p_comment     in varchar2,
      p_token_sig   in varchar2,
      p_signer_ip   in varchar2 default null,
      p_base_url    in varchar2 default null
   ) return varchar2 is
      v_cnt      number;
      v_hist_txt varchar2(1000);
      v_ver      number;
      v_next     number;
   begin
        -- фиксируем IP
      gu23_set_client_ip(p_signer_ip);

        -- текущая версия акта
      select nvl(
         content_version,
         1
      )
        into v_ver
        from xx_disl_gu23_act
       where id = p_act_id;

      if p_status in ( 'approved',
                       'rejected',
                       'on_correction' ) then
         for r in (
            select approver_id
              from table ( gu23_approval_next_signer(p_act_id) )
             where rownum = 1
         ) loop
            v_next := r.approver_id;
         end loop;

         if v_next is null then
            return 'ERR'
                   || c_us
                   || 'Нет подписанта, ожидающего решения';
         elsif v_next <> p_approver_id then
            return 'ERR'
                   || c_us
                   || 'Сейчас ожидается решение другого подписанта';
         end if;
      end if;

        -- Ищем по (act_id, approver_id)
      select count(*)
        into v_cnt
        from xx_disl_gu23_approval
       where act_id = p_act_id
         and approver_id = p_approver_id;

      if v_cnt > 0 then
         update xx_disl_gu23_approval
            set status = p_status,
                comment_txt = p_comment,
                decided_at = sysdate,
                token_sig = p_token_sig,
                signed_version = v_ver,
                signer_ip = p_signer_ip
          where act_id = p_act_id
            and approver_id = p_approver_id;
      else
         insert into xx_disl_gu23_approval (
            id,
            act_id,
            approver_id,
            status,
            comment_txt,
            requested_at,
            requested_by,
            decided_at,
            token_sig,
            signed_version,
            signer_ip
         ) values
            ( xx_disl_gu23_approval_seq.nextval,
              p_act_id,
              p_approver_id,
              p_status,
              p_comment,
              sysdate,
              p_approver_id,
              sysdate,
              p_token_sig,
              v_ver,
              p_signer_ip );
      end if;

        -- Запись в историю акта
      if p_status = 'approved' then
         v_hist_txt := 'Акт подписан: ' || g_user_name(p_approver_id);
      elsif p_status = 'rejected' then
         v_hist_txt := 'Акт отклонён: '
                       || g_user_name(p_approver_id)
                       ||
            case
               when p_comment is not null then
                  ' - ' || p_comment
               else
                  ''
            end;
      elsif p_status = 'on_correction' then
         v_hist_txt := 'Отправлен на корректировку: '
                       || g_user_name(p_approver_id)
                       ||
            case
               when p_comment is not null then
                  ' - ' || p_comment
               else
                  ''
            end;
      end if;

      if v_hist_txt is not null then
            -- add 10.07.2026 BekmansurovRR
         log_act_history(
            p_act_id  => p_act_id,
            p_user_id => p_approver_id,
            p_text    => v_hist_txt,
            p_ip      => p_signer_ip
         );
      end if;

        -- add 15.07.2026 BekmansurovRR
      if p_status = 'on_correction' then
         update xx_disl_gu23_act
            set status = 'on_correction',
                modified_at = sysdate
          where id = p_act_id
            and status = 'active';

         declare
            v_email     varchar2(256);
            v_user_name varchar2(256);
            v_body      clob;
         begin
            v_user_name := g_user_name(p_approver_id);
            select lower(du.email_address)
              into v_email
              from xx_disl_gu23_act a
              left join xx_disl_users_emp_v du
            on du.id = a.created_by
             where a.id = p_act_id;

            if v_email is not null then
               v_body := gu23_correction_mail_html(
                  p_act_id,
                  v_user_name,
                  p_comment,
                  p_base_url
               );
                    -- Отправка письма на корректировку
               gu23_send_mail(
                  p_to      => v_email,
                  p_subject => g_email_subject || ' (Корректировка)',
                  p_body    => v_body
               );
            end if;
         exception
            when others then
               null;
         end;

         commit;
         return 'OK';
      end if;

        -- Автоматически обновить статус акта
      sync_act_status(p_act_id);
      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end;

   function gu23_approval_get_status (
      p_act_id      in number,
      p_approver_id in number
   ) return varchar2 is
      v_status  varchar2(16);
      v_decided varchar2(20);
   begin
      select status,
             to_char(
                decided_at,
                'DD.MM.YYYY HH24:MI'
             )
        into
         v_status,
         v_decided
        from xx_disl_gu23_approval
       where act_id = p_act_id
         and approver_id = p_approver_id
         and rownum = 1;

      return v_status
             || c_us
             || nvl(
         v_decided,
         ''
      );
   exception
      when no_data_found then
         return null;
   end;

   function gu23_approval_my_status (
      p_act_id  in number,
      p_user_id in number
   ) return varchar2 is
      v_status varchar2(16);
   begin
      select status
        into v_status
        from xx_disl_gu23_approval
       where act_id = p_act_id
         and approver_id = p_user_id
         and rownum = 1;

      return v_status;
   exception
      when no_data_found then
         return 'none';
   end;

   function gu23_get_approvals (
      p_act_id in number
   ) return t_gu23_approval_tab
      pipelined
   is
      l_row t_gu23_approval_row;
   begin
      for r in (
         select a.approver_id,
                nvl(
                   u.full_name,
                   u.fio
                ) as full_name,
                a.status,
                to_char(
                   a.decided_at,
                   'DD.MM.YYYY HH24:MI'
                ) as decided_at,
                a.comment_txt,
                a.signed_version,
                a.signer_ip
           from xx_disl_gu23_approval a
           join xx_disl_users_emp_v u
         on u.id = a.approver_id
          where a.act_id = p_act_id
          order by a.id
      ) loop
         l_row.approver_id := r.approver_id;
         l_row.full_name := r.full_name;
         l_row.status := r.status;
         l_row.decided_at := r.decided_at;
         l_row.comment_txt := r.comment_txt;
         l_row.signed_version := r.signed_version;
         l_row.signer_ip := r.signer_ip;
         pipe row ( l_row );
      end loop;

      return;
   end;

   function gu23_is_act_signer (
      p_act_id  in number,
      p_user_id in number
   ) return varchar2 is
      v_cnt number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_signer s
       where s.act_id = p_act_id
         and s.signer_ref_id = p_user_id
         and s.stype = 'own';

      return
         case
            when v_cnt > 0 then
               'Y'
            else
               'N'
         end;
   exception
      when others then
         return 'N';
   end;

   function gu23_can_edit_draft (
      p_act_id  in number,
      p_user_id in number
   ) return varchar2 is
      v_cnt number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_act
       where id = p_act_id
         and status in ( 'draft',
                         'on_correction' )
         and ( created_by = p_user_id
          or gu23_is_admin(p_user_id) = 'Y' );

      return
         case
            when v_cnt > 0 then
               'Y'
            else
               'N'
         end;
   exception
      when others then
         return 'N';
   end;

   function gu23_set_approval_token (
      p_act_id      in number,
      p_approver_id in number,
      p_token_sig   in varchar2
   ) return varchar2 is
   begin
      update xx_disl_gu23_approval
         set
         token_sig = p_token_sig
       where act_id = p_act_id
         and approver_id = p_approver_id;

      if sql%rowcount = 0 then
         rollback;
         return 'ERR'
                || c_us
                || 'Подписант не найден';
      end if;

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end;

   function gu23_direct_decision (
      p_act_id    in number,
      p_user_id   in number,
      p_status    in varchar2,
      p_comment   in varchar2,
      p_signer_ip in varchar2 default null,
      p_base_url  in varchar2 default null
   ) return varchar2 is
      v_ver  number;
      v_next number;
   begin
        -- текущая версия акта
      select nvl(
         content_version,
         1
      )
        into v_ver
        from xx_disl_gu23_act
       where id = p_act_id;

      if p_status in ( 'approved',
                       'rejected',
                       'on_correction' ) then
         for r in (
            select approver_id
              from table ( gu23_approval_next_signer(p_act_id) )
             where rownum = 1
         ) loop
            v_next := r.approver_id;
         end loop;

         if v_next is null then
            return 'ERR'
                   || c_us
                   || 'Нет подписанта, ожидающего решения';
         elsif v_next <> p_user_id then
            return 'ERR'
                   || c_us
                   || 'Сейчас ожидается решение другого подписанта';
         end if;
      end if;

        -- Создаём запись если нет, иначе обновляем
      merge into xx_disl_gu23_approval t
      using (
         select p_act_id as act_id,
                p_user_id as approver_id
           from dual
      ) s on ( t.act_id = s.act_id
         and t.approver_id = s.approver_id )
      when matched then update
      set status = p_status,
          comment_txt = p_comment,
          decided_at = sysdate,
          signed_version = v_ver,
          signer_ip = p_signer_ip
       where t.status = 'pending'
      when not matched then
      insert (
         id,
         act_id,
         approver_id,
         status,
         comment_txt,
         requested_at,
         requested_by,
         decided_at,
         token_sig,
         signed_version,
         signer_ip )
      values
         ( xx_disl_gu23_approval_seq.nextval,
           p_act_id,
           p_user_id,
           p_status,
           p_comment,
           sysdate,
           p_user_id,
           sysdate,
           null,
           v_ver,
           p_signer_ip );

      if sql%rowcount = 0 then
         return 'ERR'
                || c_us
                || 'Решение уже было принято ранее';
      end if;

        -- Запись в историю
      declare
         v_txt varchar2(1000);
      begin
         v_txt :=
            case p_status
               when 'approved'      then
                  'Подписано'
               when 'rejected'      then
                  'Отклонено: ' || p_comment
               when 'on_correction' then
                  'Отправлен на корректировку: ' || p_comment
               else
                  p_status
            end;

            -- add 10.07.2026 BekmansurovRR
         log_act_history(
            p_act_id  => p_act_id,
            p_user_id => p_user_id,
            p_text    => v_txt,
            p_ip      => p_signer_ip
         );
      end;

      if p_status = 'on_correction' then
         update xx_disl_gu23_act
            set status = 'on_correction',
                modified_at = sysdate
          where id = p_act_id
            and status = 'active';

         declare
            v_email     varchar2(256);
            v_user_name varchar2(256);
            v_body      clob;
         begin
            v_user_name := g_user_name(p_user_id);
            select lower(du.email_address)
              into v_email
              from xx_disl_gu23_act a
              left join xx_disl_users_emp_v du
            on du.id = a.created_by
             where a.id = p_act_id;

            if v_email is not null then
               v_body := gu23_correction_mail_html(
                  p_act_id,
                  v_user_name,
                  p_comment,
                  p_base_url
               );
               gu23_send_mail(
                  p_to      => v_email,
                  p_subject => g_email_subject || ' (Корректировка)',
                  p_body    => v_body
               );
            end if;
         exception
            when others then
               null;
         end;

         commit;
         return 'OK';
      end if;

        -- Автоматически обновить статус акта
      sync_act_status(p_act_id);
      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end;

    -- ----------------------------------------------------------------
    -- Роли и доступ
    -- ----------------------------------------------------------------

   function gu23_can_access (
      p_user_id in number
   ) return varchar2 is
      v_cnt number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_user_roles
       where user_id = p_user_id
         and rownum = 1;

      return
         case
            when v_cnt > 0 then
               'Y'
            else
               'N'
         end;
   exception
      when others then
         return 'N';
   end gu23_can_access;

   function gu23_is_admin (
      p_user_id in number
   ) return varchar2 is
      v_cnt number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_user_roles ur
        join xx_disl_gu23_roles r
      on r.role_id = ur.role_id
       where ur.user_id = p_user_id
         and r.role_code = 'GU23_ADMIN'
         and rownum = 1;

      return
         case
            when v_cnt > 0 then
               'Y'
            else
               'N'
         end;
   exception
      when others then
         return 'N';
   end gu23_is_admin;

   function gu23_roles_get_all return t_gu23_role_tab
      pipelined
   is
      l_row t_gu23_role_row;
   begin
      for r in (
         select role_id,
                role_code,
                role_name
           from xx_disl_gu23_roles
          order by role_name
      ) loop
         l_row.role_id := r.role_id;
         l_row.role_code := r.role_code;
         l_row.role_name := r.role_name;
         pipe row ( l_row );
      end loop;

      return;
   end gu23_roles_get_all;

   function gu23_users_roles_get (
      p_search in varchar2 default null
   ) return t_gu23_user_role_tab
      pipelined
   is
      l_row  t_gu23_user_role_row;
      v_srch varchar2(512) := '%'
                              || upper(nvl(
         p_search,
         ''
      ))
                              || '%';
   begin
      for r in (
         select u.id as user_id,
                u.login,
                u.full_name,
                ro.role_id,
                ro.role_code,
                ro.role_name
           from xx_disl_users u
           left join xx_disl_gu23_user_roles ur
         on ur.user_id = u.id
           left join xx_disl_gu23_roles ro
         on ro.role_id = ur.role_id
          where ( upper(u.full_name) like v_srch
             or upper(u.login) like v_srch )
            and u.open = 'Y'
          order by u.full_name,
                   ro.role_name
      ) loop
         l_row.user_id := r.user_id;
         l_row.login := r.login;
         l_row.full_name := r.full_name;
         l_row.role_id := r.role_id;
         l_row.role_code := r.role_code;
         l_row.role_name := r.role_name;
         pipe row ( l_row );
      end loop;

      return;
   end gu23_users_roles_get;

   function gu23_role_assign (
      p_user_id in number,
      p_role_id in number
   ) return varchar2 is
   begin
      insert into xx_disl_gu23_user_roles (
         user_id,
         role_id
      ) values
         ( p_user_id,
           p_role_id );

      commit;
      return 'OK';
   exception
      when dup_val_on_index then
            -- роль уже назначена
         return 'OK';
      when others then
         rollback;
         return format_error();
   end gu23_role_assign;

   function gu23_role_revoke (
      p_user_id in number,
      p_role_id in number
   ) return varchar2 is
   begin
      delete from xx_disl_gu23_user_roles
       where user_id = p_user_id
         and role_id = p_role_id;

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end gu23_role_revoke;

   function gu23_user_perms_get (
      p_user_id in number
   ) return t_gu23_perm_code_tab
      pipelined
   is
   begin
      if gu23_is_admin(p_user_id) = 'Y' then
            -- администратор получает все права
         for r in (
            select perm_code
              from xx_disl_gu23_permissions
             order by perm_code
         ) loop
            pipe row ( r.perm_code );
         end loop;
      else
         for r in (
            select distinct p.perm_code
              from xx_disl_gu23_user_roles ur
              join xx_disl_gu23_role_permissions rp
            on rp.role_id = ur.role_id
              join xx_disl_gu23_permissions p
            on p.perm_id = rp.perm_id
             where ur.user_id = p_user_id
             order by p.perm_code
         ) loop
            pipe row ( r.perm_code );
         end loop;
      end if;

      return;
   exception
      when others then
         return;
   end gu23_user_perms_get;

   function gu23_has_perm (
      p_user_id   in number,
      p_perm_code in varchar2
   ) return varchar2 is
      v_cnt number;
   begin
      select count(*)
        into v_cnt
        from xx_disl_gu23_user_roles ur
        join xx_disl_gu23_role_permissions rp
      on rp.role_id = ur.role_id
        join xx_disl_gu23_permissions p
      on p.perm_id = rp.perm_id
       where ur.user_id = p_user_id
         and p.perm_code = p_perm_code
         and rownum = 1;

      return
         case
            when v_cnt > 0 then
               'Y'
            else
               'N'
         end;
   exception
      when others then
         return 'N';
   end gu23_has_perm;

   function gu23_role_perms_get return t_gu23_role_perm_tab
      pipelined
   is
      l_row t_gu23_role_perm_row;
   begin
      for r in (
         select p.perm_id,
                p.perm_code,
                p.description as descr,
                ro.role_id,
                ro.role_code,
                ro.role_name,
                case
                   when rp.perm_id is not null then
                      'Y'
                   else
                      'N'
                end as has_perm
           from xx_disl_gu23_permissions p
          cross join xx_disl_gu23_roles ro
           left join xx_disl_gu23_role_permissions rp
         on rp.role_id = ro.role_id
            and rp.perm_id = p.perm_id
          order by p.perm_id,
                   ro.role_id
      ) loop
         l_row.perm_id := r.perm_id;
         l_row.perm_code := r.perm_code;
         l_row.descr := r.descr;
         l_row.role_id := r.role_id;
         l_row.role_code := r.role_code;
         l_row.role_name := r.role_name;
         l_row.has_perm := r.has_perm;
         pipe row ( l_row );
      end loop;

      return;
   end gu23_role_perms_get;

   function gu23_perm_assign (
      p_role_id in number,
      p_perm_id in number
   ) return varchar2 is
   begin
      insert into xx_disl_gu23_role_permissions (
         role_id,
         perm_id
      ) values
         ( p_role_id,
           p_perm_id );

      commit;
      return 'OK';
   exception
      when dup_val_on_index then
         return 'OK';
      when others then
         rollback;
         return format_error();
   end gu23_perm_assign;

   function gu23_perm_revoke (
      p_role_id in number,
      p_perm_id in number
   ) return varchar2 is
   begin
      delete from xx_disl_gu23_role_permissions
       where role_id = p_role_id
         and perm_id = p_perm_id;

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end gu23_perm_revoke;

    -- ----------------------------------------------------------------
    -- add 22.07.2026 BekmansurovRR
    -- Уведомления
    -- ----------------------------------------------------------------
   -- Список актов для уведомления, которые требуется подписать в текущий момент.
   function gu23_notices_virtual (
      p_user_id in number
   ) return t_gu23_notice_tab is
      l_result t_gu23_notice_tab := t_gu23_notice_tab();
   begin
      for r in (
         select gu.*
           from xx_disl_gu23_act gu
          where gu.status = 'active'
            and exists (
            select 1
              from xx_disl_gu23_approval gua
             where gua.act_id = gu.id
               and gua.approver_id = p_user_id
               and gua.status = 'pending'
         )
      ) loop
         l_result.extend;
         l_result(l_result.last).title := 'Подписание акта ' || r.act_number;
         l_result(l_result.last).body := 'Требуется подписать акт. Перейдите в раздел "Акты" для просмотра и подписания.';
         l_result(l_result.last).notice_type := 'on_signed';
         l_result(l_result.last).notice_type_name := 'На подписание';
         l_result(l_result.last).section_notif := 'virtual';
      end loop;

      return l_result;
   end gu23_notices_virtual;

   function gu23_notices (
      p_user_id in number,
      -- add 24.07.2026 BekmansurovRR: p_all='Y' — управленческий список (всё:
      -- отключённые, вне срока, без учёта адресности)
      p_all     in varchar2 default 'N'
   ) return t_gu23_notice_tab
      pipelined
   is
      l_row             t_gu23_notice_row;
      l_virtual_notices t_gu23_notice_tab;
      l_idx             pls_integer;
   begin
      
      -- add 24.07.2026 BekmansurovRR
      -- формируем временные уведомления
      l_virtual_notices := gu23_notices_virtual(p_user_id);
      if l_virtual_notices is not null then
         l_idx := l_virtual_notices.first;
         while l_idx is not null loop
            l_row := l_virtual_notices(l_idx);
            pipe row ( l_row );
            l_idx := l_virtual_notices.next(l_idx);
         end loop;
      end if;

      for r in (
         select n.id,
                n.title,
                n.body,
                n.notice_type,
                nvl(
                   nt.name,
                   n.notice_type
                ) notice_type_name,
                n.image_path,
                to_char(
                   n.created_at,
                   c_dtf
                ) created_at,
                         -- add 23.07.2026 BekmansurovRR
                         -- прочитано определяем по дате прочтения
                case
                   when nr.read_at is null then
                      'N'
                   else
                      'Y'
                end is_read,
                         -- add 23.07.2026 BekmansurovRR
                         -- признак "избранное" для пользователя
                nvl(
                   nr.is_favorite,
                   'N'
                ) is_favorite,
                n.active
           from xx_disl_module_notif n
           left join xx_disl_general_ref nt
         on nt.ref_code = 'GU23_NOTICE_TYPE'
            and sysdate between nt.start_effect_date and nt.end_effect_date
            and ( nt.code = n.notice_type
             or to_char(nt.id) = n.notice_type )
           left join xx_disl_module_notif_read nr
         on nr.notification_id = n.id
            and nr.user_id = p_user_id
          where n.module_code = 'GU23'
            -- add 24.07.2026 BekmansurovRR: при p_all='Y' фильтры видимости
            -- (активность / срок показа / адресность) не применяются
            and ( p_all = 'Y'
             or n.active = 'Y' )
            and ( p_all = 'Y'
             or sysdate between n.start_date and n.end_date )
            and ( p_all = 'Y'
             or not exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
         )
             or exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
               and nu.user_id = p_user_id
         ) )
          order by n.created_at desc,
                   n.id desc
      ) loop
         l_row.id := r.id;
         l_row.title := r.title;
         l_row.body := r.body;
         l_row.notice_type := r.notice_type;
         l_row.notice_type_name := r.notice_type_name;
         l_row.image_path := r.image_path;
         l_row.created_at := r.created_at;
         l_row.is_read := r.is_read;
            -- add 23.07.2026 BekmansurovRR
            -- отдаём признак избранного в результат
         l_row.is_favorite := r.is_favorite;
         l_row.active := r.active;
         l_row.section_notif := 'table';
         pipe row ( l_row );
      end loop;



      return;
   end gu23_notices;

   function gu23_notice_count (
      p_user_id in number
   ) return number is
      l_count number;
   begin
      select count(*)
        into l_count
        from xx_disl_module_notif n
       where n.active = 'Y'
         and n.module_code = 'GU23'
         and sysdate between n.start_date and n.end_date
         and ( not exists (
         select 1
           from xx_disl_module_notif_user nu
          where nu.notification_id = n.id
      )
          or exists (
         select 1
           from xx_disl_module_notif_user nu
          where nu.notification_id = n.id
            and nu.user_id = p_user_id
      ) )
         and not exists (
         select 1
           from xx_disl_module_notif_read nr
          where nr.notification_id = n.id
            and nr.user_id = p_user_id
                               -- add 23.07.2026 BekmansurovRR
            and nr.read_at is not null
      );

      return l_count;
   end gu23_notice_count;

   function gu23_notice_read (
      p_user_id   in number,
      p_notice_id in number
   ) return varchar2 is
   begin
        -- add 23.07.2026 BekmansurovRR
        -- MERGE вместо INSERT
      merge into xx_disl_module_notif_read t
      using (
         select n.id as notification_id
           from xx_disl_module_notif n
          where n.id = p_notice_id
            and n.module_code = 'GU23'
            and ( not exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
         )
             or exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
               and nu.user_id = p_user_id
         ) )
      ) s on ( t.notification_id = s.notification_id
         and t.user_id = p_user_id )
      when matched then update
      set t.read_at = sysdate
       where t.read_at is null
      when not matched then
      insert (
         notification_id,
         user_id,
         read_at,
         is_favorite )
      values
         ( s.notification_id,
           p_user_id,
           sysdate,
           'N' );

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end gu23_notice_read;

   function gu23_notice_read_all (
      p_user_id in number
   ) return varchar2 is
   begin
        -- add 23.07.2026 BekmansurovRR
        -- MERGE: помечаем прочитанными все видимые уведомления
      merge into xx_disl_module_notif_read t
      using (
         select n.id as notification_id
           from xx_disl_module_notif n
          where n.active = 'Y'
            and n.module_code = 'GU23'
            and sysdate between n.start_date and n.end_date
            and ( not exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
         )
             or exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
               and nu.user_id = p_user_id
         ) )
      ) s on ( t.notification_id = s.notification_id
         and t.user_id = p_user_id )
      when matched then update
      set t.read_at = sysdate
       where t.read_at is null
      when not matched then
      insert (
         notification_id,
         user_id,
         read_at,
         is_favorite )
      values
         ( s.notification_id,
           p_user_id,
           sysdate,
           'N' );

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end gu23_notice_read_all;

    -- add 24.07.2026 BekmansurovRR
    -- gu23_notices_all удалён — используется единая gu23_notices(p_user_id, p_all => 'Y')

    -- add 22.07.2026 BekmansurovRR
    -- Сохраняем уведомление
   function gu23_notice_save (
      p_id          in number,
      p_title       in varchar2,
      p_body        in varchar2,
      p_notice_type in varchar2,
      p_image_path  in varchar2,
      p_user_id     in number
   ) return varchar2 is
      l_id          number;
      l_notice_type varchar2(30);
   begin
      if trim(p_title) is null then
         return 'ERR'
                || c_us
                || 'Укажите заголовок';
      end if;

      select nvl(
         max(nvl(
            code,
            to_char(id)
         )) keep(dense_rank first order by name),
         'notice'
      )
        into l_notice_type
        from xx_disl_general_ref
       where ref_code = 'GU23_NOTICE_TYPE'
         and sysdate between start_effect_date and end_effect_date;

      l_notice_type := nvl(
         trim(p_notice_type),
         l_notice_type
      );
      if nvl(
         p_id,
         0
      ) = 0 then
         l_id := xx_disl_module_notif_seq.nextval;
         insert into xx_disl_module_notif (
            id,
            module_code,
            title,
            body,
            notice_type,
            image_path,
            active,
            created_by,
            created_at
         ) values
            ( l_id,
              'GU23',
              trim(p_title),
              p_body,
              l_notice_type,
              trim(p_image_path),
              'Y',
              p_user_id,
              sysdate );
      else
         l_id := p_id;
         update xx_disl_module_notif
            set title = trim(p_title),
                body = p_body,
                notice_type = l_notice_type,
                image_path = trim(p_image_path)
          where id = p_id
            and module_code = 'GU23';
      end if;

      commit;
      return 'OK'
             || c_us
             || l_id;
   exception
      when others then
         rollback;
         return format_error();
   end gu23_notice_save;

   function gu23_notice_toggle (
      p_notice_id in number
   ) return varchar2 is
   begin
      update xx_disl_module_notif
         set
         active =
            case
               when active = 'Y' then
                  'N'
               else
                  'Y'
            end
       where id = p_notice_id
         and module_code = 'GU23';

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end gu23_notice_toggle;

    -- add 23.07.2026 BekmansurovRR
    -- Переключение признака "избранное" уведомления для пользователя.
    -- Возвращает 'OK' || us || новое_состояние ('Y'/'N').
   function gu23_notice_favorite (
      p_user_id   in number,
      p_notice_id in number
   ) return varchar2 is
      l_state varchar2(1);
   begin
      merge into xx_disl_module_notif_read t
      using (
         select n.id as notification_id
           from xx_disl_module_notif n
          where n.id = p_notice_id
            and n.module_code = 'GU23'
            and ( not exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
         )
             or exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
               and nu.user_id = p_user_id
         ) )
      ) s on ( t.notification_id = s.notification_id
         and t.user_id = p_user_id )
      when matched then update
      set t.is_favorite =
         case
            when t.is_favorite = 'Y' then
               'N'
            else
               'Y'
         end
      when not matched then
      insert (
         notification_id,
         user_id,
         read_at,
         is_favorite )
      values
         ( s.notification_id,
           p_user_id,
           null,
           'Y' );

      select nvl(
         max(is_favorite),
         'N'
      )
        into l_state
        from xx_disl_module_notif_read
       where notification_id = p_notice_id
         and user_id = p_user_id;

      commit;
      return 'OK'
             || c_us
             || l_state;
   exception
      when others then
         rollback;
         return format_error();
   end gu23_notice_favorite;

    -- add 23.07.2026 BekmansurovRR
    -- Ручная установка признака прочтения (иконка-конверт).
    -- p_read = 'Y' ? прочитано, иначе ? не прочитано.
   function gu23_notice_read_set (
      p_user_id   in number,
      p_notice_id in number,
      p_read      in varchar2
   ) return varchar2 is
      l_read_at date :=
         case
            when p_read = 'Y' then
               sysdate
            else
               null
         end;
   begin
      merge into xx_disl_module_notif_read t
      using (
         select n.id as notification_id
           from xx_disl_module_notif n
          where n.id = p_notice_id
            and n.module_code = 'GU23'
            and ( not exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
         )
             or exists (
            select 1
              from xx_disl_module_notif_user nu
             where nu.notification_id = n.id
               and nu.user_id = p_user_id
         ) )
      ) s on ( t.notification_id = s.notification_id
         and t.user_id = p_user_id )
      when matched then update
      set t.read_at = l_read_at
      when not matched then
      insert (
         notification_id,
         user_id,
         read_at,
         is_favorite )
      values
         ( s.notification_id,
           p_user_id,
           l_read_at,
           'N' );

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end gu23_notice_read_set;

    -- ----------------------------------------------------------------
    -- Администрирование справочников
    -- ----------------------------------------------------------------

   function gu23_ref_signers_all return t_gu23_ref_signer_tab
      pipelined
   is
      l_row t_gu23_ref_signer_row;
   begin
      for r in (
         select id,
                fio,
                post,
                org,
                unit,
                active
           from xx_disl_gu23_ref_signer
          order by active desc,
                   fio
      ) loop
         l_row.id := r.id;
         l_row.fio := r.fio;
         l_row.post := r.post;
         l_row.org := r.org;
         l_row.unit := r.unit;
         l_row.active := r.active;
         pipe row ( l_row );
      end loop;

      return;
   end;

   function gu23_ref_reasons_all return t_gu23_ref_reason_tab
      pipelined
   is
      l_row t_gu23_ref_reason_row;
   begin
      for r in (
         select rr.id,
                rr.name,
                rr.act_kind,
                rr.categ,
                rr.categ_name,
                rr.active
           from xx_disl_gu23_ref_reason_v rr
          order by active desc,
                   name
      ) loop
         l_row.id := r.id;
         l_row.name := r.name;
         l_row.act_kind := r.act_kind;
         l_row.categ := r.categ;
         l_row.categ_name := r.categ_name;
         l_row.active := r.active;
         pipe row ( l_row );
      end loop;

      return;
   end;

   function gu23_ref_signer_save (
      p_id   in number,
      p_fio  in varchar2,
      p_post in varchar2,
      p_org  in varchar2,
      p_unit in varchar2
   ) return varchar2 is
   begin
      if p_id > 0 then
         update xx_disl_gu23_ref_signer
            set fio = p_fio,
                post = p_post,
                org = p_org,
                unit = p_unit
          where id = p_id;
      else
         insert into xx_disl_gu23_ref_signer (
            id,
            fio,
            post,
            org,
            unit,
            stype,
            active
         ) values
            ( xx_disl_gu23_ref_signer_seq.nextval,
              p_fio,
              p_post,
              p_org,
              p_unit,
              'Работник станции ОАО РЖД',
              'Y' );
      end if;

      commit;
      return 'OK';
   exception
      when others then
         rollback;
         return format_error();
   end;

   function gu23_ref_signer_toggle (
      p_id in number
   ) return varchar2 is
   begin
      update xx_disl_gu23_ref_signer
         set
         active =
            case
               when active = 'Y' then
                  'N'
               else
                  'Y'
            end
       where id = p_id;

      commit;
      return 'OK';
   exception
      when others then
         return format_error();
   end;

   function gu23_ref_reason_save (
      p_id       in number,
      p_name     in varchar2,
      p_act_kind in varchar2,
      p_categ    in number
   ) return varchar2 is
   begin
      if p_id > 0 then
         update xx_disl_gu23_ref_reason
            set name = p_name,
                act_kind = p_act_kind,
                categ = p_categ
          where id = p_id;
      else
         insert into xx_disl_gu23_ref_reason (
            id,
            name,
            act_kind,
            categ,
            active
         ) values
            ( xx_disl_gu23_ref_reason_seq.nextval,
              p_name,
              p_act_kind,
              p_categ,
              'Y' );
      end if;

      commit;
      return 'OK';
   exception
      when dup_val_on_index then
            -- причин уже назначена
         rollback;
         return format_error('Причина уже добавлена в справочник!');
      when others then
         rollback;
         return format_error();
   end;

   function gu23_ref_reason_toggle (
      p_id in number
   ) return varchar2 is
   begin
      update xx_disl_gu23_ref_reason
         set
         active =
            case
               when active = 'Y' then
                  'N'
               else
                  'Y'
            end
       where id = p_id;

      commit;
      return 'OK';
   exception
      when others then
         return format_error();
   end;

   function html_escape (
      p_text in varchar2
   ) return varchar2 is
   begin
      return replace(
         replace(
            replace(
               replace(
                  replace(
                     nvl(
                        p_text,
                        ''
                     ),
                     '&',
                     '&amp;'
                  ),
                  '<',
                  '&lt;'
               ),
               '>',
               '&gt;'
            ),
            '"',
            '&quot;'
         ),
         '''',
         '&#39;'
      );
   end;

    -- токкен для подписания через письмо (пока не отключили такую возможность, только через сайт)
   function gu23_new_approval_token return varchar2 is
   begin
      return lower(rawtohex(sys_guid()) || rawtohex(sys_guid()));
   end;

   function gu23_act_link (
      p_base_url in varchar2,
      p_path     in varchar2
   ) return varchar2 is
      v_base varchar2(500);
   begin
      v_base := rtrim(
         nvl(
            p_base_url,
            'http://' || g_server_host
         ),
         '/'
      );
      return v_base || p_path;
   end;

   function gu23_correction_mail_html (
      p_act_id    in number,
      p_user_name in varchar2,
      p_comment   in varchar2,
      p_base_url  in varchar2
   ) return clob is
      v_act_number varchar2(64);
      v_card_url   varchar2(1000);
   begin
      select act_number
        into v_act_number
        from xx_disl_gu23_act
       where id = p_act_id;

      v_card_url := gu23_act_link(
         p_base_url,
         '/gu23/card.php?id=' || p_act_id
      );
      return '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Акт ГУ-23 отправлен на корректировку</title></head>'
             || '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#222">'
             || '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0"><tr><td align="center">'
             || '<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">'
             || '<tr><td style="background:#471364;padding:24px 32px">'
             || '<div style="font-size:20px;font-weight:700;color:#fff">Акт ГУ-23 отправлен на корректировку</div>'
             || '<div style="margin-top:8px;color:#d8c7e8;font-size:14px">Акт '
             || html_escape(v_act_number)
             || '</div></td></tr>'
             || '<tr><td style="padding:28px 32px">'
             || '<p style="margin:0 0 18px;color:#666;font-size:13px;line-height:1.5">Документ возвращен для исправления замечаний. Ссылка на акт: '
             || '<a href="'
             || html_escape(v_card_url)
             || '" style="color:#471364;font-weight:700;text-decoration:none;">'
             || html_escape(v_act_number)
             || '</a></p>'
             || '<div style="border:1px solid #e0e4ea;border-radius:6px;background:#f8f9fb;padding:16px 18px">'
             || '<table cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;line-height:1.7">'
             || '<tr><td style="color:#777;width:150px;vertical-align:top">Кто вернул:</td>'
             || '<td style="color:#222"><b>'
             || html_escape(p_user_name)
             || '</b></td></tr>'
             || '<tr><td style="color:#777;vertical-align:top;padding-top:8px">Причина возврата:</td>'
             || '<td style="color:#222;font-weight:700;padding-top:8px;line-height:1.4">'
             || html_escape(p_comment)
             || '</td></tr></table></div></td></tr>'
             || '<tr><td style="background:#f4f5f7;padding:16px 32px;color:#999;font-size:12px">Это автоматическое сообщение - не отвечайте на него.</td></tr>'
             || '</table></td></tr></table></body></html>';
   end;

    -- Html письмо
   function gu23_approval_mail_html (
      p_act_id         in number,
      p_approver_id    in number,
      p_token          in varchar2,
      p_base_url       in varchar2,
      p_recipient_name in varchar2
   ) return clob is
      v_html          clob;
      v_act_number    varchar2(64);
      v_dept          varchar2(32);
      v_station       varchar2(128);
      v_st_from       varchar2(128);
      v_st_to         varchar2(128);
      v_cargo         varchar2(256);
      v_reason        varchar2(1000);
      v_start_at      varchar2(30);
      v_created_at    varchar2(30);
      v_created_by    varchar2(256);
      v_created_by_id number;
      v_wagon_cnt     number;
      v_circ          varchar2(4000);
      v_approve_url   varchar2(1000);
      v_reject_url    varchar2(1000);
      v_card_url      varchar2(1000);
      v_status_html   varchar2(1000);
      v_row_no        number := 0;
      v_version       number;              -- add 17.07.2026 BekmansurovRR
   begin
      select act_number,
             dept_code,
             station,
             st_from,
             st_to,
             cargo_ref,
             reason_name,
             to_char(
                start_at,
                'DD.MM.YYYY HH24:MI:SS'
             ),
             wagon_cnt,
             circumstances,
             to_char(
                created_at,
                'DD.MM.YYYY HH24:MI:SS'
             ),
             created_by,
             nvl(
                content_version,
                1
             )        -- add 13.07.2026 BekmansurovRR
        into
         v_act_number,
         v_dept,
         v_station,
         v_st_from,
         v_st_to,
         v_cargo,
         v_reason,
         v_start_at,
         v_wagon_cnt,
         v_circ,
         v_created_at,
         v_created_by_id,
         v_version
        from xx_disl_gu23_act_v
       where id = p_act_id;

      v_created_by := g_user_name(v_created_by_id);
      v_approve_url := gu23_act_link(
         p_base_url,
         '/gu23/approve.php?token='
         || p_token
         || '&action=approve'
      );
      v_reject_url := gu23_act_link(
         p_base_url,
         '/gu23/approve.php?token='
         || p_token
         || '&action=reject'
      );
      v_card_url := gu23_act_link(
         p_base_url,
         '/gu23/card.php?id=' || p_act_id
      );
      v_html := '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Подписание акта ГУ-23</title></head>'
                || '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#222">'
                || '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0"><tr><td align="center">'
                || '<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">'
                || '<tr><td style="background:#471364;padding:24px 32px"><div style="font-size:20px;font-weight:700;color:#fff">Требуется подписание акта ГУ-23</div>'
                || '<div style="margin-top:8px;color:#d8c7e8;font-size:14px">Акт '
                || html_escape(v_act_number)
                || '</div></td></tr><tr><td style="padding:28px 32px">'
                || '<p style="margin:0 0 18px;color:#666;font-size:13px;line-height:1.5">Подробная информация по акту доступна по ссылке: <a href="'
                || v_card_url
                || '">'
                || html_escape(v_act_number)
                || '</a></p>'
                || '<div style="border:1px solid #e0e4ea;border-radius:6px;background:#f8f9fb;padding:14px 18px;margin-bottom:22px">'
                || '<table cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;line-height:1.7">'
                || '<tr><td style="color:#777;width:170px">Версия документа: </td><td><b>'
                || html_escape(v_version)
                || '</b></td></tr><tr><td style="color:#777;width:170px">Номер акта</td><td><b>'
                || html_escape(v_act_number)
                || '</td></tr><tr><td style="color:#777">Дата создания</td><td>'
                || html_escape(v_created_at)
                || '</td></tr><tr><td style="color:#777">Создал</td><td>'
                || html_escape(v_created_by)
                || '</b></td></tr><tr><td style="color:#777">Цех</td><td>'
                || html_escape(v_dept)
                || '</td></tr><tr><td style="color:#777">Ст. составления</td><td>'
                || html_escape(v_station)
                || '</td></tr><tr><td style="color:#777">Ст. отправления</td><td>'
                || html_escape(v_st_from)
                || '</td></tr><tr><td style="color:#777">Ст. назначения</td><td>'
                || html_escape(v_st_to)
                || '</td></tr><tr><td style="color:#777">Груз</td><td>'
                || html_escape(v_cargo)
                || '</td></tr><tr><td style="color:#777">Причина</td><td>'
                || html_escape(v_reason)
                || '</td></tr><tr><td style="color:#777">Начало простоя</td><td>'
                || html_escape(v_start_at)
                || '</td></tr><tr><td style="color:#777">Вагонов</td><td><b>'
                || nvl(
         to_char(v_wagon_cnt),
         '0'
      )
                || '</b></td></tr><tr><td style="color:#777">Обстоятельства</td><td><b>'
                || html_escape(v_circ)
                || '</b></td></tr></table></div>'
            -- rem 15.07.2026 (пока не отключили такую возможность, только через сайт)
                ||
         case
            when upper(g_server_host) != 'M5000' then
               '<p style="margin:0 0 22px"><a href="'
               || v_approve_url
               || '" style="display:inline-block;background:#1e8e3e;color:#fff;text-decoration:none;padding:12px 26px;border-radius:5px;font-weight:700;margin-right:8px">Подписать</a>'
               || '<a href="'
               || v_reject_url
               || '" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:12px 26px;border-radius:5px;font-weight:700">Отклонить</a></p>'
         end
                || '<div style="font-size:12px;font-weight:700;color:#666;letter-spacing:.4px;margin-bottom:10px">ПОДПИСАНТЫ</div>'
                || '<table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e0e4ea;border-collapse:collapse">'
                || '<thead><tr style="background:#f0f4f8"><th style="padding:8px 10px;font-size:12px;color:#666;text-align:center;width:32px">#</th>'
                || '<th style="padding:8px 10px;font-size:12px;color:#666;text-align:left">ФИО / Должность</th>'
                || '<th style="padding:8px 10px;font-size:12px;color:#666;text-align:center;width:140px">Статус</th></tr></thead><tbody>'
                ;

      for s in (
         select s.*,
                nvl(
                   du.full_name,
                   s.fio
                ) as fio_new,
                a.status,
                to_char(
                   a.decided_at,
                   'DD.MM.YYYY HH24:MI'
                ) as decided_at,
                a.comment_txt
           from xx_disl_gu23_signer s
           left join xx_disl_users_emp_v du
         on du.id = s.signer_ref_id
            and s.stype = 'own'
           left join xx_disl_gu23_approval a
         on a.act_id = s.act_id
            and a.approver_id = du.id
          where s.act_id = p_act_id
          order by s.ord_no,
                   s.id
      ) loop
         v_row_no := v_row_no + 1;
         v_status_html := '';
         if s.stype = 'own' then
            if s.status = 'approved' then
               v_status_html := '<span style="background:#e6f4ea;color:#137333;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">Подписано</span>'
               ;
            elsif s.status = 'rejected' then
               v_status_html := '<span style="background:#fce8e6;color:#c5221f;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">Отклонено</span>'
               ;
            elsif s.signer_ref_id = p_approver_id then
               v_status_html := '<span style="background:#fef9e7;color:#b7770a;padding:2px 8px;border-radius:4px;font-size:11px">В процессе</span>'
               ;
            end if;
         end if;

         v_html := v_html
                   || '<tr style="background:'
                   ||
            case
               when mod(
                  v_row_no,
                  2
               ) = 0 then
                  '#f8f9fb'
               else
                  '#ffffff'
            end
                   || '"><td style="padding:8px 10px;font-size:13px;color:#888;text-align:center">'
                   || v_row_no
                   || '</td><td style="padding:8px 10px;font-size:13px"><b>'
                   || html_escape(s.fio_new)
                   || '</b><br><span style="color:#666;font-size:12px">'
                   || html_escape(s.post)
                   || '</span> '
                   || html_escape(s.org)
                   || '</td><td style="padding:8px 10px;font-size:13px;text-align:center">'
                   || v_status_html
                   || '</td></tr>';
      end loop;

      v_html := v_html
                || '</tbody></table></td></tr><tr><td style="background:#f4f5f7;padding:16px 32px;color:#999;font-size:12px">Это автоматическое сообщение - не отвечайте на него.</td></tr>'
                || '</table></td></tr></table></body></html>';
      return v_html;
   end;

    -- Отправка писем подписантам
   function gu23_send_approval_mail (
      p_act_id      in number,
      p_approver_id in number,
      p_base_url    in varchar2 default null
   ) return varchar2 is
      v_token varchar2(128);
      v_email varchar2(256);
      v_name  varchar2(256);
      v_body  clob;
      v_res   varchar2(4000);
   begin
      select full_name,
             email
        into
         v_name,
         v_email
        from (
         select approver_id,
                full_name,
                email
           from table ( gu23_approval_next_signer(p_act_id) )
      )
       where approver_id = p_approver_id
         and rownum = 1;

      if v_email is null then
         return 'ERR'
                || c_us
                || 'У подписанта не указан email';
      end if;
      v_token := gu23_new_approval_token();
      v_res := gu23_set_approval_token(
         p_act_id,
         p_approver_id,
         v_token
      );
      if substr(
         v_res,
         1,
         2
      ) <> 'OK' then
         return v_res;
      end if;

      v_body := gu23_approval_mail_html(
         p_act_id,
         p_approver_id,
         v_token,
         p_base_url,
         v_name
      );
      gu23_send_mail(
         p_to      => v_email,
         p_subject => g_email_subject,
         p_body    => v_body
      );
      return 'OK' || c_us;            --|| 'Ссылка отправлена: ' || v_email;
   exception
      when no_data_found then
         return 'ERR'
                || c_us
                || 'Подписант не найден';
      when others then
         return format_error();
   end;

   function gu23_send_next_approval_mail (
      p_act_id   in number,
      p_base_url in varchar2 default null
   ) return varchar2 is
      v_approver_id number;
   begin
      for r in (
         select approver_id
           from table ( gu23_approval_next_signer(p_act_id) )
          where rownum = 1
      ) loop
         v_approver_id := r.approver_id;
      end loop;

      if v_approver_id is null then
         return 'OK'
                || c_us
                || 'Следующих подписантов нет';
      end if;
      return gu23_send_approval_mail(
         p_act_id,
         v_approver_id,
         p_base_url
      );
   end;

    /* ------------------------------------------------------------------ */
    -- отправка письма
   procedure gu23_send_mail (
      p_to      in varchar2,
      p_subject in varchar2,
      p_body    in clob,
      p_from    in varchar2 default 'noreply@test.ru'
   ) is
      l_log_in   number := xx_etw.xx_disl_log_order_seq.nextval;
      l_function varchar2(100) := 'gu23_send_mail';
      x_sender   varchar2(240);
      x_to_email varchar2(240);
      x_subject  varchar2(240);
      x_msg      clob;
   begin
      x_sender := 'noreply@metafrax.ru';
      x_to_email := p_to;
      x_subject := p_subject;
      x_msg := p_body;
      log_new(
         l_log_in,
         l_function,
         'g_server_host=>' || g_server_host
      );
      log_new(
         l_log_in,
         l_function,
         'x_to_email=>' || x_to_email
      );
      /*
      if
         upper(g_server_host) = 'M5000'
         and x_to_email is not null
      then
         if trunc(sysdate) <= to_date ( '30.07.2026',
         'DD.MM.YYYY' ) then
            insert into xx_disl_gu23_mail_test (
               p_to,
               p_subject,
               p_body,
               p_from
            ) values
               ( x_to_email,
                 x_subject,
                 x_msg,
                 x_sender );
         end if;

         apps.xx_mtf_send_mail_pkg.send_mail(
            p_sender    => x_sender, --отправитель
            p_recipient => x_to_email, --'rustam.bekmansurov@ruschem.ru',       --получатель
            p_subject   => x_subject,
            p_text_clob => x_msg
         );
      else
         apps.xx_mtf_send_mail_pkg.send_mail(
            p_sender    => x_sender,                       --отправитель
            p_recipient => 'rustam.bekmansurov@ruschem.ru', --получатель
            p_subject   => x_subject
                         || ' -> '
                         || x_to_email,
            p_text_clob => x_msg
         );
      end if;*/

      commit;
   end gu23_send_mail;
end xx_disl_gu23_pkg;
/