/* Formatted on 26.06.2026 19:50:18 (QP5 v5.417) */
create or replace package body xx_etw.xx_disl_gu23_pkg as
    /******************************************************************************
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
  ******************************************************************************/
   c_package   constant varchar2(30) := 'xx_disl_gu23_pkg';
   c_dtf       constant varchar2(30) := 'YYYY-MM-DD HH24:MI:SS';
   c_us        constant char(1) := chr(31);            -- разделитель полей
   c_rs        constant char(1) := chr(30);          -- разделитель записей
   g_client_ip  varchar2(64)  := null;                 -- IP клиента текущего запроса
   -- Секретный ключ HMAC для ссылок согласования.
   -- На проде замените строку ниже перед компиляцией (не коммитить реальный ключ в git).
   -- Сгенерировать: SELECT dbms_random.string('x', 64) FROM dual;
   g_hmac_secret constant varchar2(128) := 'change-me-in-production';

   procedure gu23_set_client_ip (
      p_ip in varchar2
   ) is
   begin
      g_client_ip := p_ip;
   end;

   procedure log_act_history (
      p_act_id  in number,
      p_user_id in number,
      p_text    in varchar2
   ) is
   begin
      insert into xx_disl_gu23_hist (
         id,
         act_id,
         ts,
         usr,
         txt,
         ip
      ) values ( xx_disl_gu23_hist_seq.nextval,
                 p_act_id,
                 sysdate,
                 p_user_id,
                 p_text,
                 g_client_ip );
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
      p_function_name in varchar2,
      p_text          in varchar2
   ) is
      pragma autonomous_transaction;
   begin
      insert into xx_disl_log_new (
         log_function,
         descr
      ) values ( c_package
                 || '->'
                 || p_function_name,
                 p_text );

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

    -- Разбирает CLOB в формате RS/US в таблицу строк вагонов (pipe row)
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
            pipe row ( l_row );
         end if;
      end loop;

      return;
   end parse_wagon_clob;

    -- следующий уникальный номер акта ГУ23-ЦЕХ-ГОД-000001
   function g_next_number (
      p_dept_id in number
   ) return varchar2 is
      v_yr        number := to_number ( to_char(
         sysdate,
         'YYYY'
      ) );
      v_cnt       number;
      v_dept_code varchar2(32);
   begin
      select code
        into v_dept_code
        from xx_disl_dept_v
       where id = p_dept_id;

      update xx_disl_gu23_counter
         set
         cnt = cnt + 1
       where dept_id = p_dept_id
         and yr = v_yr returning cnt into v_cnt;

      if sql%rowcount = 0 then
         v_cnt := 1;
         insert into xx_disl_gu23_counter (
            id,
            dept_id,
            yr,
            cnt
         ) values ( xx_disl_gu23_counter_seq.nextval,
                    p_dept_id,
                    v_yr,
                    v_cnt );
      end if;

      return 'ГУ23-'
             || v_dept_code
             || '-'
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
      ) values ( p_row.id,
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
         weight
      ) values ( p_row.id,
                 p_row.act_id,
                 p_row.wagon_no,
                 p_row.owner,
                 p_row.kind,
                 p_row.st_from,
                 p_row.st_to,
                 p_row.cargo,
                 p_row.weight );
   end insert_act_row;

   procedure insert_signer (
      p_row in xx_disl_gu23_signer%rowtype
   ) is
   begin
      insert into xx_disl_gu23_signer (
         id,
         act_id,
         signer_ref_id,  -- для stype='own': xx_disl_users.id; для stype='rzd': xx_disl_gu23_ref_signer.id
         fio,
         post,
         org,
         ord_no,
         stype           -- 'own' / 'rzd' / NULL (вручную)
      ) values ( p_row.id,
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
          where code like '%ЖДЦ%'
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
         select id,
                name
           from xx_disl_gu23_ref_reason
          where active = 'Y'
            and ( p_kind is null
             or act_kind in ( 'any',
                              p_kind ) )
          order by name
      ) loop
         l_row.code := to_char(r.id);
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
         select st_code as st_code,
                st_name as name
           from xx_etw.xx_etw_station_bi_v
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
         select st_code as st_code,
                st_name as name
           from xx_etw.xx_etw_station_bi_v
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
            and ( fr_name like upper('%Метанол%')
             or fr_name like upper('%Карбамид%')
             or fr_name like upper('%Уротропин%')
             or fr_name like upper('%Меламин%') )
      ) loop
         l_row.code := r.name;
         l_row.name := r.name;
         pipe row ( l_row );
      end loop;

      return;
   end;

    -- подписанты ? работники предприятия
   function gu23_get_ref_signer_own (
      p_dept_id in varchar2 default null
   ) return xx_disl_gu23_signer_tab
      pipelined
   is
      l_row xx_disl_gu23_signer_row;
   begin
      for r in (
         /*select du.id,
                du.full_name as fio,
                null as post,
                null as org,
                null as unit,
                'Работник предприятия' as stype
           from xx_disl_users du*/
         select du.id,
                du.full_name as fio,
                prv.appoint_name as post,
                prv.firm_name as org,
                prv.theme as unit,
                'Работник предприятия' as stype
           from xx_disl_users du
           left join prv_emp prv
         on du.card_id = prv.card_id
            and trunc(sysdate) between d_from and d_to
            and trunc(sysdate) between d_in and d_out
           left join xx_disl_enterprise de
         on du.enterprise = de.id
          where du.open = 'Y'
            and prv.firm_name like '%Метафракс%'
            and du.full_name not like '%user%'
            and prv.appoint_name not like 'Советн%'
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

    -- подписанты ? работники станции ОАО ?РЖД?
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

    -- ----------------------------------------------------------------
    -- акты
    -- ----------------------------------------------------------------
   function gu23_get_acts (
      p_q         in varchar2 default null,
      p_type      in varchar2 default null,
      p_status    in varchar2 default null,
      p_dept_id   in varchar2 default null,
      p_date_from in varchar2 default null,
      p_date_to   in varchar2 default null
   ) return xx_disl_gu23_act_tab
      pipelined
   is
      v_q    varchar2(512) := lower(p_q);
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
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where ( p_type is null
             or a.act_type = p_type )
            and ( p_status is null
             or a.status = p_status )
            and ( p_dept_id is null
             or a.dept_id = to_number(p_dept_id) )
            and ( v_from is null
             or a.created_at >= v_from )
            and ( v_to is null
             or a.created_at < v_to )
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
                                   || p_q
                                   || '%'
         ) )
          order by a.created_at desc
      ) loop
         pipe row ( g_act_row(a) );
      end loop;

      return;
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
                end as ref_user_id
           from xx_disl_gu23_signer s
          where s.act_id = p_act_id
          order by s.ord_no,
                   s.id
      ) loop
         l_row.id := s.id;
         l_row.signer_ref_id := s.signer_ref_id;
         l_row.fio := s.fio;
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
            and a.status = 'active'
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
                                 'closed' )
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
      p_cargo_name   in varchar2 default null
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
      with max_dislocation as (
         select max(report_dt) as max_dt,
                type_reference
           from xx_dislocation_rjd
          group by type_reference
      )
      select ei.wagon_no,
             ei.cargo_name,
             ei.wagon_type_code,
             ei.owner,
             ei.depart_station,
             ei.dest_station,
             1 as weight
        from xx_dislocation_rjd ei
        join max_dislocation md
      on ei.report_dt = md.max_dt
         and ei.type_reference = md.type_reference
       where ei.wagon_no = nvl(
            v_w_no,
            ei.wagon_no
         )
         and upper(ei.dest_station) like '%'
                                         || upper(v_dest_station)
                                         || '%'
         and ei.waybill_no = nvl(
         v_waybill_no,
         ei.waybill_no
      );
            
      /*select nvl(
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
             initcap(inv_to_station_name) as dest_station,                  -- станция назначения
             initcap(inv_from_station_name) as depart_station                -- станция отправления
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
         and ei.invoice_state_id in ( 31,  --Накладная предъявлена
                                      439, -- Согласование уведомления
                                      1116 -- Приемосдатчиком принято
                                      )
         and ei.inv_date_create > to_date('01.01.2026','dd.mm.rrrr')
         and ei.inv_recip_name <> 'ОАО "Метафракс"';
         */
   begin
      l_row.weight := null;

        --log_new(l_function,'p_waybill_no='||p_waybill_no);
        --log_new(l_function,'p_dest_station='||p_dest_station);
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
            l_row.st_to := null;
            l_row.cargo := null;
            l_row.weight := null;

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
               l_row.st_to := d.dest_station;
               l_row.cargo := d.cargo_name;
               l_row.weight := d.weight;
               l_row.found := 1;
            end loop;

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
            l_row.st_to := d.dest_station;
            l_row.cargo := d.cargo_name;
            l_row.weight := d.weight;
            l_row.found := 1;
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

    -- Добавление файла
   function gu23_add_file (
      p_data in t_gu23_add_file
   ) return varchar2 is
   begin
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
      ) values ( p_data.p_file_id,
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
      v_act  number;
      v_name varchar2(512);
   begin
      select act_id,
             file_name
        into
         v_act,
         v_name
        from xx_disl_gu23_file
       where id = p_data.p_file_id;

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
      v_dupnum     varchar2(64);
      v_has_start  number;
      v_tot        number;
      v_closed     number;
      v_cur_status varchar2(16);
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

      log_new(
         l_function,
         'p_data.p_type=' || p_data.p_type
      );
      log_new(
         l_function,
         'p_data.p_start_at=' || p_data.p_start_at
      );
      log_new(
         l_function,
         'p_data.p_end_at=' || p_data.p_end_at
      );
      v_start := g_to_date(p_data.p_start_at);
      v_end := g_to_date(p_data.p_end_at);

        -- тип акта
      if p_data.p_type not in ( 'start',
                                'end',
                                'other' ) then
         return format_error('Неверный тип акта');
      end if;

        -- цех обязателен (для формирования номера акта)
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
         ) values ( v_id,
                    v_number,
                    p_data.p_type,
                    p_data.p_status,
                    v_dept_id,
                    v_station_id,
                    v_st_from_id,
                    v_st_to_id,
                    p_data.p_cargo_ref,
                    p_data.p_reason,
                    p_data.p_circumstances,
                    v_start,
                    v_end,
                    v_dd,
                    v_dh,
                    v_th,
                    v_cd,
                    p_data.p_linked_start_id,
                    sysdate,
                    p_data.p_user_id,
                    sysdate,
                    p_data.p_user_id );
      else
            -- редактировать можно ТОЛЬКО Проект
         begin
            select act_number,
                   status
              into
               v_number,
               v_cur_status
              from xx_disl_gu23_act
             where id = v_id;
         exception
            when no_data_found then
               return format_error('Акт не найден');
         end;

         if v_cur_status <> 'draft' then
            return format_error('Действующий/закрытый акт не редактируется ? аннулируйте и заведите новый');
         end if;

            -- если у Проекта ещё нет номера ? присваиваем
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
                modified_by = p_data.p_user_id
          where id = v_id;

         delete from xx_disl_gu23_act_row
          where act_id = v_id;

         delete from xx_disl_gu23_signer
          where act_id = v_id;
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
                -- для окончания берём данные из акта начала (уже в CLOB)
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
            v_dupnum := null;
            begin
               select a.act_number
                 into v_dupnum
                 from xx_disl_gu23_act a,
                      xx_disl_gu23_act_row r
                where r.act_id = a.id
                  and a.act_type = 'start'
                  and a.status = 'active'
                  and a.id <> v_id
                  and r.wagon_no = w.wagon_no
                  and rownum = 1;
            exception
               when no_data_found then
                  v_dupnum := null;
            end;

            if v_dupnum is not null then
               rollback;
               return format_error('Нельзя создать акт ?Начало простоя?: по вагону '
                                   || w.wagon_no
                                   || ' уже есть открытый цикл в акте ' || v_dupnum);
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
               and e.status = 'active'
               and e.linked_start_id = p_data.p_linked_start_id
               and e.id <> v_id
               and er.wagon_no = w.wagon_no;

            if v_has_start > 0 then
               rollback;
               return format_error('Вагон '
                                   || w.wagon_no || ' уже закрыт другим актом окончания');
            end if;
         end if;

         insert into xx_disl_gu23_act_row (
            id,
            act_id,
            wagon_no,
            owner,
            kind,
            st_from,
            st_to,
            cargo,
            weight
         ) values ( xx_disl_gu23_act_row_seq.nextval,
                    v_id,
                    w.wagon_no,
                    vw_owner,
                    vw_kind,
                    vw_from,
                    vw_to,
                    vw_cargo,
                    vw_weight );

         v_wcnt := v_wcnt + 1;
      end loop;

        -- при отправке нужен хотя бы один вагон ИЛИ указан груз
      if
         v_wcnt = 0
         and p_data.p_cargo_ref is null
         and p_data.p_status = 'active'
      then
         rollback;
         return format_error('Добавьте вагоны или укажите груз / накладную');
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

        -- закрытие циклов акта начала: частичное/полное
      if
         p_data.p_type = 'end'
         and p_data.p_status = 'active'
         and p_data.p_linked_start_id is not null
      then
         select count(*)
           into v_tot
           from xx_disl_gu23_act_row
          where act_id = p_data.p_linked_start_id;

         select count(distinct er.wagon_no)
           into v_closed
           from xx_disl_gu23_act e,
                xx_disl_gu23_act_row er
          where er.act_id = e.id
            and e.act_type = 'end'
            and e.status = 'active'
            and e.linked_start_id = p_data.p_linked_start_id;

         if v_closed >= v_tot then
            update xx_disl_gu23_act
               set status = 'closed',
                   modified_at = sysdate,
                   modified_by = p_data.p_user_id
             where id = p_data.p_linked_start_id
               and status = 'active';

            log_act_history(
               p_act_id  => p_data.p_linked_start_id,
               p_user_id => p_data.p_user_id,
               p_text    => 'Цикл простоя полностью закрыт актом окончания ' || v_number
            );
         else
            log_act_history(
               p_act_id  => p_data.p_linked_start_id,
               p_user_id => p_data.p_user_id,
               p_text    => 'Частично закрыто актом окончания '
                         || v_number
                         || ' ('
                         || v_closed
                         || ' из '
                         || v_tot
                         || ')'
            );
         end if;
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
                        'Акт создан и заведён'
                  end
            else
               case
                  when p_data.p_status = 'draft' then
                        'Проект изменён'
                  else
                     'Акт изменён / заведён'
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

   function gu23_close_act (
      p_id      in number,
      p_user_id in number
   ) return varchar2 is
      v_status varchar2(16);
      v_type   varchar2(16);
   begin
      select status,
             act_type
        into
         v_status,
         v_type
        from xx_disl_gu23_act
       where id = p_id;

      if v_type != 'end' then
         return 'ERR'
                || c_us
                || 'Закрыть можно только акт окончания простоя';
      end if;
      if v_status != 'active' then
         return 'ERR'
                || c_us
                || 'Акт должен быть в статусе ?Открыт?';
      end if;
      update xx_disl_gu23_act
         set status = 'closed',
             modified_at = sysdate,
             modified_by = p_user_id
       where id = p_id;

      insert into xx_disl_gu23_hist (
         id,
         act_id,
         ts,
         usr,
         txt
      ) values ( xx_disl_gu23_hist_seq.nextval,
                 p_id,
                 sysdate,
                 p_user_id,
                 'Акт закрыт администратором' );

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

        -- при аннулировании акта окончания ? снова открываем связанный акт начала
      if
         v_type = 'end'
         and v_linked is not null
      then
         update xx_disl_gu23_act
            set status = 'active',
                modified_at = sysdate,
                modified_by = p_data.p_user_id
          where id = v_linked
            and status = 'closed';
      end if;

        -- при аннулировании акта начала ? каскадно аннулируем связанные акты окончания
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
         select st_code,
                st_name,
                st_id
           from xx_etw_station_bi_v
          where lower(st_name) like '%'
                                    || lower(v_q)
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
      for r in (-- подписанты предприятия (stype='own'): signer_ref_id = xx_disl_users.id напрямую
         select u.id as approver_id,
                u.full_name,
                lower(u.login)
                || '@company.ru' as fake_email
           from xx_disl_gu23_signer s
           join xx_disl_users u
         on u.id = s.signer_ref_id
          where s.act_id = p_act_id
            and s.stype = 'own'
      ) loop
         l_row.approver_id := r.approver_id;
         l_row.full_name := r.full_name;
         l_row.fake_email := r.fake_email;
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


   function gu23_approval_get_name (
      p_id in number
   ) return varchar2 is
   begin
      return g_user_name(p_id);
   end;

   function gu23_approval_by_sig (
      p_sig in varchar2
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
       where token_sig = p_sig;

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
      ) values ( xx_disl_gu23_approval_seq.nextval,
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

    -- Автоматически обновить статус акта на основе решений подписантов.
    -- Вызывается после каждого сохранения решения.
   procedure sync_act_status (
      p_act_id in number
   ) is
      v_rejected number;
      v_total    number;
      v_approved number;
   begin
        -- есть хоть одно отклонение ? акт отклонён
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

        -- подписанты предприятия (stype='own'): signer_ref_id = xx_disl_users.id — обязаны подписать
      select count(*)
        into v_total
        from xx_disl_gu23_signer
       where act_id = p_act_id
         and stype = 'own'
         and signer_ref_id is not null;

      if v_total = 0 then
         return;
      end if;

        -- число тех, кто уже одобрил
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
            and status = 'active';
      end if;
   end sync_act_status;

   function gu23_approval_save_decision (
      p_act_id      in number,
      p_approver_id in number,
      p_status      in varchar2,
      p_comment     in varchar2,
      p_token_sig   in varchar2,
      p_signer_ip   in varchar2 default null
   ) return varchar2 is
      v_cnt      number;
      v_hist_txt varchar2(1000);
      v_ver      number;
   begin
        -- текущая версия акта (будет зафиксирована в подписи)
      select nvl(
         content_version,
         1
      )
        into v_ver
        from xx_disl_gu23_act
       where id = p_act_id;

        -- Ищем по (act_id, approver_id) ? надёжнее чем по token_sig,
        -- т.к. approve и reject ссылки имеют разные sig (action входит в хэш)
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
         ) values ( xx_disl_gu23_approval_seq.nextval,
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
                  ' ? ' || p_comment
               else
                  ''
            end;
      end if;

      if v_hist_txt is not null then
         log_act_history(
            p_act_id  => p_act_id,
            p_user_id => p_approver_id,
            p_text    => v_hist_txt
         );
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
                u.full_name,
                a.status,
                to_char(
                   a.decided_at,
                   'DD.MM.YYYY HH24:MI'
                ) as decided_at,
                a.comment_txt,
                a.signed_version,
                a.signer_ip
           from xx_disl_gu23_approval a
           join xx_disl_users u
         on u.id = a.approver_id
          where a.act_id = p_act_id
          order by a.requested_at
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

   function gu23_direct_decision (
      p_act_id    in number,
      p_user_id   in number,
      p_status    in varchar2,
      p_comment   in varchar2,
      p_signer_ip in varchar2 default null
   ) return varchar2 is
      v_ver number;
   begin
        -- текущая версия акта
      select nvl(
         content_version,
         1
      )
        into v_ver
        from xx_disl_gu23_act
       where id = p_act_id;

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
               when 'approved' then
                  'Подписано'
               when 'rejected' then
                  'Отклонено: ' || p_comment
               else
                  p_status
            end;

         insert into xx_disl_gu23_hist (
            id,
            act_id,
            ts,
            usr,
            txt
         ) values ( xx_disl_gu23_hist_seq.nextval,
                    p_act_id,
                    sysdate,
                    p_user_id,
                    v_txt );
      end;

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
      ) values ( p_user_id,
                 p_role_id );

      commit;
      return 'OK';
   exception
      when dup_val_on_index then
            -- роль уже назначена ? идемпотентно
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
      ) values ( p_role_id,
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
         select id,
                name,
                act_kind,
                active
           from xx_disl_gu23_ref_reason
          order by active desc,
                   name
      ) loop
         l_row.id := r.id;
         l_row.name := r.name;
         l_row.act_kind := r.act_kind;
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
         ) values ( xx_disl_gu23_ref_signer_seq.nextval,
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
      p_act_kind in varchar2
   ) return varchar2 is
   begin
      if p_id > 0 then
         update xx_disl_gu23_ref_reason
            set name = p_name,
                act_kind = p_act_kind
          where id = p_id;
      else
         insert into xx_disl_gu23_ref_reason (
            id,
            name,
            act_kind,
            active
         ) values ( xx_disl_gu23_ref_reason_seq.nextval,
                    p_name,
                    p_act_kind,
                    'Y' );
      end if;

      commit;
      return 'OK';
   exception
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
   /* ------------------------------------------------------------------ */
   function gu23_get_hmac_secret return varchar2 is
   begin
      return g_hmac_secret;
   end gu23_get_hmac_secret;

   /* ------------------------------------------------------------------ */
   procedure gu23_send_mail (
      p_to      in varchar2,
      p_subject in varchar2,
      p_body    in clob,
      p_from    in varchar2 default 'noreply@company.ru'
   ) is
   begin
      -- Вызвать корпоративный пакет отправки почты, например:
      -- corp_mail_pkg.send_html(p_to => p_to, p_subject => p_subject, p_body => p_body, p_from => p_from);
      null;
   end gu23_send_mail;

end xx_disl_gu23_pkg;
/