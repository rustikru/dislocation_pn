/* Formatted on 23.06.2026 12:48:41 (QP5 v5.417) */
create or replace package body xx_disl_gu23_pkg
as
    c_dtf   constant varchar2 (30) := 'YYYY-MM-DD HH24:MI:SS';
    c_us    constant char (1) := CHR (31);                -- разделитель полей
    c_rs    constant char (1) := CHR (30);              -- разделитель записей

    -- ----------------------------------------------------------------
    -- вспомогательные
    -- ----------------------------------------------------------------
    function g_user_name (p_user_id in number)
        return varchar2
    is
        v   varchar2 (256);
    begin
        if p_user_id is null
        then
            return null;
        end if;

        select full_name
          into v
          from xx_disl_users
         where id = p_user_id;

        return v;
    exception
        when NO_DATA_FOUND
        then
            return null;
    end;

    function fnc_boolean_num (p_bool in boolean)
        return number
    is
    begin
        if p_bool
        then
            return 1;
        else
            return 0;
        end if;

        return 0;
    end;

    -- n-е поле строки, разделители CHR(31)
    function g_field (p_line in varchar2, p_idx in pls_integer)
        return varchar2
    is
        v_from   pls_integer := 1;
        v_to     pls_integer;
        v_i      pls_integer := 1;
    begin
        loop
            v_to :=
                INSTR (p_line,
                       c_us,
                       1,
                       v_i);

            if v_i = p_idx
            then
                if v_to = 0
                then
                    return SUBSTR (p_line, v_from);
                else
                    return SUBSTR (p_line, v_from, v_to - v_from);
                end if;
            end if;

            exit when v_to = 0;
            v_from := v_to + 1;
            v_i := v_i + 1;
        end loop;

        return null;
    end;

    function g_to_date (p_str in varchar2)
        return date
    is
    begin
        if p_str is null or TRIM (p_str) is null
        then
            return null;
        end if;

        -- принимаем 'YYYY-MM-DD HH24:MI' или с секундами; берём до минут
        return TO_DATE (SUBSTR (REPLACE (p_str, 'T', ' '), 1, 16),
                        'YYYY-MM-DD HH24:MI');
    end;

    -- следующий уникальный номер акта ГУ23-ЦЕХ-ГОД-000001
    function g_next_number (p_cex in varchar2)
        return varchar2
    is
        v_yr       number := TO_NUMBER (TO_CHAR (SYSDATE, 'YYYY'));
        v_cnt      number;
        v_cex_id   number;
    begin
        -- id цеха из справочника по коду (счётчик ссылается на ref_cex.id)
        select id
          into v_cex_id
          from xx_disl_gu23_ref_cex
         where code = p_cex;

           update xx_disl_gu23_counter
              set cnt = cnt + 1
            where cex_id = v_cex_id and yr = v_yr
        returning cnt
             into v_cnt;

        if sql%rowcount = 0
        then
            v_cnt := 1;

            insert into xx_disl_gu23_counter (id,
                                              cex_id,
                                              yr,
                                              cnt)
                 values (xx_disl_gu23_counter_seq.NEXTVAL,
                         v_cex_id,
                         v_yr,
                         v_cnt);
        end if;

        return 'ГУ23-' || p_cex || '-' || v_yr || '-' || LPAD (v_cnt, 6, '0');
    end;

    -- превращаем строку представления акта в RECORD
    function g_act_row (a in xx_disl_gu23_act_v%rowtype)
        return xx_disl_gu23_act_row
    is
        o   xx_disl_gu23_act_row;
    begin
        o.id := a.id;
        o.act_number := a.act_number;
        o.act_type := a.act_type;
        o.status := a.status;
        o.cex := a.cex_code;
        o.station := a.station;
        o.reason := a.reason;
        o.circumstances := a.circumstances;
        o.start_at := TO_CHAR (a.start_at, c_dtf);
        o.end_at := TO_CHAR (a.end_at, c_dtf);
        o.dur_days := a.dur_days;
        o.dur_hours := a.dur_hours;
        o.dur_total_h := a.dur_total_h;
        o.cal_days := a.cal_days;
        o.linked_start_id := a.linked_start_id;
        o.linked_start_number := a.linked_start_number;
        o.wagon_cnt := a.wagon_cnt;
        o.file_cnt := a.file_cnt;
        o.annul_reason := a.annul_reason;
        o.created_at := TO_CHAR (a.created_at, c_dtf);
        o.created_by := g_user_name (a.created_by);
        o.modified_at := TO_CHAR (a.modified_at, c_dtf);
        return o;
    end;

    -- ----------------------------------------------------------------
    -- справочники
    -- ----------------------------------------------------------------
    function gu23_get_ref_cex
        return xx_disl_gu23_ref_tab
        pipelined
    is
        l_row   xx_disl_gu23_ref_row;
    begin
        for r in (  select code, name
                      from xx_disl_gu23_ref_cex
                     where active = 'Y'
                  order by name)
        loop
            l_row.code := r.code;
            l_row.name := r.name;

            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_ref_reason (p_kind in varchar2 default null)
        return xx_disl_gu23_ref_tab
        pipelined
    is
        l_row   xx_disl_gu23_ref_row;
    begin
        for r
            in (  select name
                    from xx_disl_gu23_ref_reason
                   where     active = 'Y'
                         and (p_kind is null or act_kind in ('any', p_kind))
                order by name)
        loop
            l_row.code := r.name;
            l_row.name := r.name;
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_ref_station
        return xx_disl_gu23_ref_tab
        pipelined
    is
        l_row   xx_disl_gu23_ref_row;
    begin
        for r in (  select station_id, name
                      from xx_disl_stations
                     where SHORT_NAME = 'Угл'
                  order by name)
        loop
            l_row.id := r.station_id;
            l_row.name := r.name;
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_ref_owner
        return xx_disl_gu23_ref_tab
        pipelined
    is
        l_row   xx_disl_gu23_ref_row;
    begin
        for r in (  select name
                      from xx_disl_gu23_ref_owner
                     where active = 'Y'
                  order by name)
        loop
            l_row.code := r.name;
            l_row.name := r.name;
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_ref_wagon_kind
        return xx_disl_gu23_ref_tab
        pipelined
    is
        l_row   xx_disl_gu23_ref_row;
    begin
        for r in (  select name
                      from xx_disl_gu23_ref_wagon_kind
                     where active = 'Y'
                  order by name)
        loop
            l_row.code := r.name;
            l_row.name := r.name;
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_ref_signer
        return xx_disl_gu23_signer_tab
        pipelined
    is
        l_row   xx_disl_gu23_signer_row;
    begin
        for r in (  select id,
                           fio,
                           POST,
                           org,
                           unit,
                           stype
                      from xx_disl_gu23_ref_signer
                     where active = 'Y'
                  order by fio)
        loop
            l_row.id := r.id;
            l_row.fio := r.fio;
            l_row.POST := r.POST;
            l_row.org := r.org;
            l_row.unit := r.unit;
            l_row.stype := r.stype;
            l_row.ord_no := null;
            pipe row (l_row);
        end loop;

        return;
    end;

    -- ----------------------------------------------------------------
    -- акты (чтение)
    -- ----------------------------------------------------------------
    function gu23_get_acts (p_q        in varchar2 default null,
                            p_type     in varchar2 default null,
                            p_status   in varchar2 default null,
                            p_cex      in varchar2 default null)
        return xx_disl_gu23_act_tab
        pipelined
    is
        v_q     varchar2 (512) := LOWER (p_q);
        l_row   xx_disl_gu23_act_row;
    begin
        for a
            in (  select *
                    from xx_disl_gu23_act_v a
                   where     (p_type is null or a.act_type = p_type)
                         and (p_status is null or a.status = p_status)
                         and (p_cex is null or a.cex_code = p_cex)
                         and (   v_q is null
                              or LOWER (a.act_number) like '%' || v_q || '%'
                              or LOWER (a.reason) like '%' || v_q || '%'
                              or exists
                                     (select 1
                                        from xx_disl_gu23_act_row r
                                       where     r.act_id = a.id
                                             and r.wagon_no like
                                                     '%' || p_q || '%'))
                order by a.created_at desc, a.id desc)
        loop
            l_row.id := a.id;
            l_row.act_number := a.act_number;
            l_row.act_type := a.act_type;
            l_row.status := a.status;
            l_row.cex := a.CEX_CODE;
            l_row.station := a.station;
            l_row.reason := a.reason;
            l_row.circumstances := a.circumstances;
            l_row.start_at := TO_CHAR (a.start_at, c_dtf);
            l_row.end_at := TO_CHAR (a.end_at, c_dtf);
            l_row.dur_days := a.dur_days;
            l_row.dur_hours := a.dur_hours;
            l_row.dur_total_h := a.dur_total_h;
            l_row.cal_days := a.cal_days;
            l_row.linked_start_id := a.linked_start_id;
            l_row.linked_start_number := a.linked_start_number;
            l_row.wagon_cnt := a.wagon_cnt;
            l_row.file_cnt := a.file_cnt;
            l_row.annul_reason := a.annul_reason;
            l_row.created_at := TO_CHAR (a.created_at, c_dtf);
            l_row.created_by := g_user_name (a.created_by);
            l_row.modified_at := TO_CHAR (a.modified_at, c_dtf);
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_act (p_id in number)
        return xx_disl_gu23_act_tab
        pipelined
    is
        l_row   xx_disl_gu23_act_row;
    begin
        for a in (select *
                    from xx_disl_gu23_act_v a
                   where a.id = p_id)
        loop
            l_row.id := a.id;
            l_row.act_number := a.act_number;
            l_row.act_type := a.act_type;
            l_row.status := a.status;
            l_row.cex := a.CEX_CODE;
            l_row.station := a.station;
            l_row.reason := a.reason;
            l_row.circumstances := a.circumstances;
            l_row.start_at := TO_CHAR (a.start_at, c_dtf);
            l_row.end_at := TO_CHAR (a.end_at, c_dtf);
            l_row.dur_days := a.dur_days;
            l_row.dur_hours := a.dur_hours;
            l_row.dur_total_h := a.dur_total_h;
            l_row.cal_days := a.cal_days;
            l_row.linked_start_id := a.linked_start_id;
            l_row.linked_start_number := a.linked_start_number;
            l_row.wagon_cnt := a.wagon_cnt;
            l_row.file_cnt := a.file_cnt;
            l_row.annul_reason := a.annul_reason;
            l_row.created_at := TO_CHAR (a.created_at, c_dtf);
            l_row.created_by := g_user_name (a.created_by);
            l_row.modified_at := TO_CHAR (a.modified_at, c_dtf);
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_rows (p_act_id in number)
        return xx_disl_gu23_row_tab
        pipelined
    is
        l_row   xx_disl_gu23_row;
    begin
        for r in (  select *
                      from xx_disl_gu23_act_row
                     where act_id = p_act_id
                  order by id)
        loop
            l_row.id := r.id;
            l_row.act_id := r.act_id;
            l_row.wagon_no := r.wagon_no;
            l_row.owner := r.owner;
            l_row.kind := r.kind;
            l_row.st_from := r.st_from;
            l_row.st_to := r.st_to;
            l_row.cargo := r.cargo;
            l_row.weight := r.weight;

            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_files (p_act_id in number)
        return xx_disl_gu23_file_tab
        pipelined
    is
        l_row   xx_disl_gu23_file_row;
    begin
        for f in (  select *
                      from xx_disl_gu23_file
                     where act_id = p_act_id
                  order by id)
        loop
            l_row.id := f.id;
            l_row.act_id := f.act_id;
            l_row.file_name := f.file_name;
            l_row.file_ext := f.file_ext;
            l_row.mime_type := f.mime_type;
            l_row.real_path := f.real_path;
            l_row.created_at := TO_CHAR (f.created_at, c_dtf);
            l_row.created_by := g_user_name (f.created_by);

            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_signers (p_act_id in number)
        return xx_disl_gu23_signer_tab
        pipelined
    is
        l_row   xx_disl_gu23_signer_row;
    begin
        for s in (  select *
                      from xx_disl_gu23_signer
                     where act_id = p_act_id
                  order by ord_no, id)
        loop
            l_row.id := s.id;
            l_row.fio := s.fio;
            l_row.POST := s.POST;
            l_row.org := s.org;
            l_row.unit := null;
            l_row.stype := null;
            l_row.ord_no := s.ord_no;
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_hist (p_act_id in number)
        return xx_disl_gu23_hist_tab
        pipelined
    is
        l_row   xx_disl_gu23_hist_row;
    begin
        for h in (  select *
                      from xx_disl_gu23_hist
                     where act_id = p_act_id
                  order by ts desc, id desc)
        loop
            l_row.id := h.id;
            l_row.act_id := h.act_id;
            l_row.ts := TO_CHAR (h.ts, c_dtf);
            l_row.usr := g_user_name (h.usr);
            l_row.txt := h.txt;
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_open_starts
        return xx_disl_gu23_act_tab
        pipelined
    is
    begin
        for a in (  select *
                      from xx_disl_gu23_act_v a
                     where a.act_type = 'start' and a.status = 'active'
                  order by a.start_at)
        loop
            pipe row (g_act_row (a));
        end loop;

        return;
    end;

    -- ещё открытые вагоны акта начала (не закрытые действующим актом окончания)
    function gu23_get_open_rows (p_start_id in number)
        return xx_disl_gu23_row_tab
        pipelined
    is
        l_row   xx_disl_gu23_row;
    begin
        for r
            in (  select *
                    from xx_disl_gu23_act_row sr
                   where     sr.act_id = p_start_id
                         and not exists
                                 (select 1
                                    from xx_disl_gu23_act    e,
                                         xx_disl_gu23_act_row er
                                   where     er.act_id = e.id
                                         and e.act_type = 'end'
                                         and e.status = 'active'
                                         and e.linked_start_id = p_start_id
                                         and er.wagon_no = sr.wagon_no)
                order by sr.id)
        loop
            l_row.id := r.id;
            l_row.act_id := r.act_id;
            l_row.wagon_no := r.wagon_no;
            l_row.owner := r.owner;
            l_row.kind := r.kind;
            l_row.st_from := r.st_from;
            l_row.st_to := r.st_to;
            l_row.cargo := r.cargo;
            l_row.weight := r.weight;
            pipe row (l_row);
        end loop;

        return;
    end;

    function gu23_get_by_wagon (p_wagon in varchar2)
        return xx_disl_gu23_act_tab
        pipelined
    is
    begin
        for a
            in (  select *
                    from xx_disl_gu23_act_v a
                   where exists
                             (select 1
                                from xx_disl_gu23_act_row r
                               where r.act_id = a.id and r.wagon_no = p_wagon)
                order by a.created_at desc, a.id desc)
        loop
            pipe row (g_act_row (a));
        end loop;

        return;
    end;

    -- ----------------------------------------------------------------
    -- дислокация (заглушка через select из dual)
    -- заменить тело на реальный запрос к источнику
    -- ----------------------------------------------------------------
    function gu23_get_wagon_info (p_wagons    in clob,
                                  p_station   in varchar2 default null)
        return xx_disl_gu23_wagon_tab
        pipelined
    is
        v_len    pls_integer := NVL (DBMS_LOB.getlength (p_wagons), 0);
        v_from   pls_integer := 1;
        v_to     pls_integer;
        v_no     varchar2 (32);
        v_last   pls_integer;
        v_d2     pls_integer;
        l_row    xx_disl_gu23_wagon_row;
    begin
        -- данные подтягиваются только если станция операции — Углеуральская
        if p_station is not null and p_station <> 'Углеуральская'
        then
            return;
        end if;

        while v_from <= v_len
        loop
            v_to := INSTR (p_wagons, c_rs, v_from);

            if v_to = 0
            then
                v_to := v_len + 1;
            end if;

            v_no := TRIM (DBMS_LOB.SUBSTR (p_wagons, v_to - v_from, v_from));
            v_from := v_to + 1;

            if v_no is null
            then
                continue;
            end if;

            -- заглушка: Имитация: вагон с последней цифрой 0 считается «не найденным».
            v_last := TO_NUMBER (SUBSTR (v_no, -1));
            v_d2 := TO_NUMBER (SUBSTR (v_no, -2));

            l_row.wagon_no := v_no;

            if v_last = 0
            then
                l_row.owner := null;
                l_row.kind := null;
                l_row.st_from := null;
                l_row.st_to := null;
                l_row.cargo := null;
                l_row.weight := null;
                l_row.FOUND := 0;
                pipe row (l_row);
            else
                for d
                    in (select case MOD (v_d2, 5)
                                   when 0 then 'ПГК'
                                   when 1 then 'ФГК'
                                   when 2 then 'СУЭК'
                                   when 3 then 'Уралкалий'
                                   else 'НефтеТрансСервис'
                               end                as owner,
                               case MOD (v_d2, 4)
                                   when 0 then 'Полувагон'
                                   when 1 then 'Цистерна'
                                   when 2 then 'Хоппер'
                                   else 'Крытый'
                               end                as kind,
                               case MOD (v_d2, 3)
                                   when 0 then 'Кизел'
                                   when 1 then 'Березники'
                                   else 'Чусовская'
                               end                as st_from,
                               'Углеуральская'    as st_to,
                               case MOD (v_d2, 4)
                                   when 0 then 'Уголь каменный'
                                   when 1 then 'Удобрения минеральные'
                                   when 2 then 'Кокс'
                                   else 'Дизельное топливо'
                               end                as cargo,
                                  TO_CHAR (60 + MOD (v_d2, 12))
                               || ','
                               || TO_CHAR (v_last)
                               || ' т'            as weight
                          from DUAL)
                loop
                    l_row.owner := d.owner;
                    l_row.kind := d.kind;
                    l_row.st_from := d.st_from;
                    l_row.st_to := d.st_to;
                    l_row.cargo := d.cargo;
                    l_row.weight := d.weight;
                    l_row.FOUND := 1;
                    pipe row (l_row);
                end loop;
            end if;
        -- заглушка: конец
        end loop;

        return;
    end;

    -- ----------------------------------------------------------------
    -- файлы
    -- ----------------------------------------------------------------
    function gu23_new_file_id
        return number
    is
        v   number;
    begin
        select xx_disl_gu23_file_seq.NEXTVAL into v from DUAL;

        return v;
    end;

    function gu23_add_file (p_act_id    in number,
                            p_file_id   in number,
                            p_name      in varchar2,
                            p_ext       in varchar2,
                            p_mime      in varchar2,
                            p_path      in varchar2,
                            p_user_id   in number)
        return varchar2
    is
    begin
        insert into xx_disl_gu23_file (id,
                                       act_id,
                                       file_name,
                                       file_ext,
                                       mime_type,
                                       real_path,
                                       created_at,
                                       created_by)
             values (p_file_id,
                     p_act_id,
                     p_name,
                     p_ext,
                     p_mime,
                     p_path,
                     SYSDATE,
                     p_user_id);

        insert into xx_disl_gu23_hist (id,
                                       act_id,
                                       ts,
                                       usr,
                                       txt)
             values (xx_disl_gu23_hist_seq.NEXTVAL,
                     p_act_id,
                     SYSDATE,
                     p_user_id,
                     'Прикреплён файл: ' || p_name);

        commit;
        return 'done';
    exception
        when others
        then
            rollback;
            return 'ERR' || c_us || SQLERRM;
    end;

    function gu23_del_file (p_file_id in number, p_user_id in number)
        return varchar2
    is
        v_act    number;
        v_name   varchar2 (512);
    begin
        select act_id, file_name
          into v_act, v_name
          from xx_disl_gu23_file
         where id = p_file_id;

        delete from xx_disl_gu23_file
              where id = p_file_id;

        insert into xx_disl_gu23_hist (id,
                                       act_id,
                                       ts,
                                       usr,
                                       txt)
             values (xx_disl_gu23_hist_seq.NEXTVAL,
                     v_act,
                     SYSDATE,
                     p_user_id,
                     'Удалён файл: ' || v_name);

        commit;
        return 'done';
    exception
        when others
        then
            rollback;
            return 'ERR' || c_us || SQLERRM;
    end;

    -- ----------------------------------------------------------------
    -- сохранение акта
    -- ----------------------------------------------------------------
    function gu23_save_act (p_user_id           in number,
                            p_id                in number,
                            p_type              in varchar2,
                            p_status            in varchar2,
                            p_cex               in varchar2,
                            p_station           in varchar2,
                            p_reason            in varchar2,
                            p_circumstances     in varchar2,
                            p_start_at          in varchar2,
                            p_end_at            in varchar2,
                            p_linked_start_id   in number,
                            p_wagons            in clob,
                            p_signers           in clob,
                            p_force             in varchar2 default 'N')
        return varchar2
    is
        l_row          xx_disl_gu23_hist%rowtype;
        v_id           number := p_id;
        v_number       varchar2 (64);
        v_start        date := g_to_date (p_start_at);
        v_end          date := g_to_date (p_end_at);
        v_dd           number;
        v_dh           number;
        v_th           number;
        v_cd           number;
        v_isnew        boolean := true;
        v_len          pls_integer;
        v_from         pls_integer;
        v_to           pls_integer;
        v_rec          varchar2 (4000);
        v_ord          number := 0;
        v_wcnt         number := 0;
        vw_no          varchar2 (16);
        vw_owner       varchar2 (128);
        vw_kind        varchar2 (128);
        vw_from        varchar2 (128);
        vw_to          varchar2 (128);
        vw_cargo       varchar2 (256);
        vw_weight      varchar2 (32);
        vs_fio         varchar2 (256);
        vs_post        varchar2 (256);
        vs_org         varchar2 (256);
        v_dupnum       varchar2 (64);
        v_has_start    number;
        v_tot          number;                  -- всего вагонов в акте начала
        v_closed       number;     -- закрыто вагонов действующими окончаниями
        v_cur_status   varchar2 (16); -- текущий статус акта при редактировании
    begin
        v_id := p_id;
        v_isnew :=
            case when (p_id is null or p_id = 0) then true else false end;

        -- проверяем тип акта и обязательные поля
        if p_type not in ('start', 'end', 'other')
        then
            return 'ERR' || c_us || 'Неверный тип акта';
        end if;

        -- обязательные поля проверяем только при отправке (active); черновик — как есть
        if p_status = 'active' and NVL (p_cex, 'X') = 'X'
        then
            return 'ERR' || c_us || 'Не указан цех';
        end if;

        -- проверки дат для акта "Начало простоя"
        if p_type = 'start' and p_status = 'active' and v_start is null
        then
            return 'ERR' || c_us || 'Не указана дата начала простоя';
        end if;

        -- проверки дат и связей для акта "Окончание простоя" (только при отправке)
        if p_type = 'end' and p_status = 'active'
        then
            if p_linked_start_id is null
            then
                return    'ERR'
                       || c_us
                       || 'Не выбран открытый акт начала простоя';
            end if;

            if v_end is null
            then
                return 'ERR' || c_us || 'Не указана дата окончания простоя';
            end if;

            -- если дата начала не передана с фронтенда, извлекаем её из БД
            if v_start is null
            then
                begin
                    select start_at
                      into v_start
                      from xx_disl_gu23_act
                     where id = p_linked_start_id;
                exception
                    when NO_DATA_FOUND
                    then
                        null;
                end;
            end if;

            -- контроль: дата окончания не должна быть меньше даты начала
            if v_start is not null and v_end < v_start
            then
                return    'ERR'
                       || c_us
                       || 'Дата окончания не может быть меньше даты начала';
            end if;

            -- контроль: дата окончания не должна быть больше текущей (в будущем)
            if v_end > SYSDATE
            then
                return    'ERR'
                       || c_us
                       || 'Дата окончания не может быть больше текущей даты (в будущем)';
            end if;
        end if;

        -- расчёт длительности простоя (только для актов окончания)
        if p_type = 'end' and v_start is not null and v_end is not null
        then
            v_th := ROUND ((v_end - v_start) * 24, 1);
            v_dd := TRUNC (v_end - v_start);
            v_dh := ROUND (((v_end - v_start) - v_dd) * 24);
            v_cd := CEIL (v_end - v_start);
        end if;

        -- сохраняем или обновляем шапку акта
        if v_isnew
        then
            -- номер генерируем при наличии цеха (черновик без цеха — номер позже)
            if p_cex is not null
            then
                v_number := g_next_number (p_cex);
            end if;

            v_id := xx_disl_gu23_act_seq.NEXTVAL;

            insert into xx_disl_gu23_act (id,
                                          act_number,
                                          act_type,
                                          status,
                                          cex_code,
                                          station,
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
                                          modified_by)
                 values (v_id,
                         v_number,
                         p_type,
                         p_status,
                         p_cex,
                         p_station,
                         p_reason,
                         p_circumstances,
                         v_start,
                         v_end,
                         v_dd,
                         v_dh,
                         v_th,
                         v_cd,
                         p_linked_start_id,
                         SYSDATE,
                         p_user_id,
                         SYSDATE,
                         p_user_id);
        else
            -- защита: редактировать можно ТОЛЬКО черновик. Действующий/закрытый/
            -- аннулированный акт не изменяется (его можно только аннулировать).
            begin
                select act_number, status
                  into v_number, v_cur_status
                  from xx_disl_gu23_act
                 where id = v_id;
            exception
                when NO_DATA_FOUND
                then
                    return 'ERR' || c_us || 'Акт не найден';
            end;

            if v_cur_status <> 'draft'
            then
                return    'ERR'
                       || c_us
                       || 'Действующий/закрытый акт не редактируется — аннулируйте и заведите новый';
            end if;

            -- если у черновика ещё нет номера, а цех уже указан — присваиваем номер
            if v_number is null and p_cex is not null
            then
                v_number := g_next_number (p_cex);
            end if;

            update xx_disl_gu23_act
               set act_number = v_number,
                   act_type = p_type,
                   status = p_status,
                   cex_code = p_cex,
                   station = p_station,
                   reason = p_reason,
                   circumstances = p_circumstances,
                   start_at = v_start,
                   end_at = v_end,
                   dur_days = v_dd,
                   dur_hours = v_dh,
                   dur_total_h = v_th,
                   cal_days = v_cd,
                   linked_start_id = p_linked_start_id,
                   modified_at = SYSDATE,
                   modified_by = p_user_id
             where id = v_id;

            -- очищаем старые строки вагонов и подписантов для перезаписи
            delete from xx_disl_gu23_act_row
                  where act_id = v_id;

            delete from xx_disl_gu23_signer
                  where act_id = v_id;
        end if;

        -- разбираем вагоны: тянем данные и проверяем
        v_len := NVL (DBMS_LOB.getlength (p_wagons), 0);
        v_from := 1;

        while v_from <= v_len
        loop
            v_to := INSTR (p_wagons, c_rs, v_from);

            if v_to = 0
            then
                v_to := v_len + 1;
            end if;

            v_rec := DBMS_LOB.SUBSTR (p_wagons, v_to - v_from, v_from);
            v_from := v_to + 1;

            -- считываем номер вагона
            vw_no := TRIM (g_field (v_rec, 1));

            if vw_no is null
            then
                continue;
            end if;

            -- данные загружаются строго автоматически на бэкенде
            if p_type in ('start', 'other')
            then
                -- для нового простоя берём данные из функции дислокации
                begin
                    select owner,
                           kind,
                           st_from,
                           st_to,
                           cargo,
                           weight
                      into vw_owner,
                           vw_kind,
                           vw_from,
                           vw_to,
                           vw_cargo,
                           vw_weight
                      from table (
                               xx_disl_gu23_pkg.gu23_get_wagon_info (
                                   vw_no,
                                   p_station))
                     where ROWNUM = 1;
                exception
                    when others
                    then
                        -- если вагон не найден в BI, оставляем характеристики пустыми
                        vw_owner := null;
                        vw_kind := null;
                        vw_from := null;
                        vw_to := null;
                        vw_cargo := null;
                        vw_weight := null;
                end;
            else
                -- для окончания берём данные из акта начала (как прислал клиент)
                vw_owner := g_field (v_rec, 2);
                vw_kind := g_field (v_rec, 3);
                vw_from := g_field (v_rec, 4);
                vw_to := g_field (v_rec, 5);
                vw_cargo := g_field (v_rec, 6);
                vw_weight := g_field (v_rec, 7);
            end if;

            -- не даём создать «начало», если по вагону уже открыт простой
            if p_type = 'start' and p_status = 'active' and p_force <> 'Y'
            then
                v_dupnum := null;

                begin
                    select a.act_number
                      into v_dupnum
                      from xx_disl_gu23_act a, xx_disl_gu23_act_row r
                     where     r.act_id = a.id
                           and a.act_type = 'start'
                           and a.status = 'active'
                           and a.id <> v_id
                           and r.wagon_no = vw_no
                           and ROWNUM = 1;
                exception
                    when NO_DATA_FOUND
                    then
                        v_dupnum := null;
                end;

                if v_dupnum is not null
                then
                    rollback;
                    return    'ERR'
                           || c_us
                           || 'Нельзя создать акт «Начало простоя»: по вагону '
                           || vw_no
                           || ' уже есть открытый цикл в акте '
                           || v_dupnum;
                end if;
            end if;

            -- проверка (окончание): вагон должен быть из выбранного акта начала
            -- и быть ещё открытым (не закрыт другим действующим актом окончания).
            if p_type = 'end' and p_status = 'active'
            then
                -- (а) принадлежность выбранному акту начала
                select COUNT (*)
                  into v_has_start
                  from xx_disl_gu23_act_row r
                 where r.act_id = p_linked_start_id and r.wagon_no = vw_no;

                if v_has_start = 0
                then
                    rollback;
                    return    'ERR'
                           || c_us
                           || 'Вагон '
                           || vw_no
                           || ' не относится к выбранному акту начала';
                end if;

                -- (б) вагон ещё не закрыт другим действующим окончанием
                select COUNT (*)
                  into v_has_start
                  from xx_disl_gu23_act e, xx_disl_gu23_act_row er
                 where     er.act_id = e.id
                       and e.act_type = 'end'
                       and e.status = 'active'
                       and e.linked_start_id = p_linked_start_id
                       and e.id <> v_id
                       and er.wagon_no = vw_no;

                if v_has_start > 0
                then
                    rollback;
                    return    'ERR'
                           || c_us
                           || 'Вагон '
                           || vw_no
                           || ' уже закрыт другим актом окончания';
                end if;
            end if;

            -- сохраняем проверенную строку вагона
            insert into xx_disl_gu23_act_row (id,
                                              act_id,
                                              wagon_no,
                                              owner,
                                              kind,
                                              st_from,
                                              st_to,
                                              cargo,
                                              weight)
                 values (xx_disl_gu23_act_row_seq.NEXTVAL,
                         v_id,
                         vw_no,
                         vw_owner,
                         vw_kind,
                         vw_from,
                         vw_to,
                         vw_cargo,
                         vw_weight);

            v_wcnt := v_wcnt + 1;
        end loop;

        -- вагоны обязательны только при отправке (active); в черновике можно без них
        if v_wcnt = 0 and p_status = 'active'
        then
            rollback;
            return 'ERR' || c_us || 'Не добавлен ни один вагон';
        end if;

        -- разбираем и пишем подписантов
        v_len := NVL (DBMS_LOB.getlength (p_signers), 0);
        v_from := 1;

        while v_from <= v_len
        loop
            v_to := INSTR (p_signers, c_rs, v_from);

            if v_to = 0
            then
                v_to := v_len + 1;
            end if;

            v_rec := DBMS_LOB.SUBSTR (p_signers, v_to - v_from, v_from);
            v_from := v_to + 1;
            vs_fio := g_field (v_rec, 1);
            vs_post := g_field (v_rec, 2);
            vs_org := g_field (v_rec, 3);

            if TRIM (vs_fio) is null
            then
                continue;
            end if;

            v_ord := v_ord + 1;

            insert into xx_disl_gu23_signer (id,
                                             act_id,
                                             fio,
                                             POST,
                                             org,
                                             ord_no)
                 values (xx_disl_gu23_signer_seq.NEXTVAL,
                         v_id,
                         vs_fio,
                         vs_post,
                         vs_org,
                         v_ord);
        end loop;

        -- закрытие циклов акта начала: частичное/полное.
        -- акт начала переводится в «Закрыт» ТОЛЬКО когда закрыты ВСЕ его вагоны.
        if     p_type = 'end'
           and p_status = 'active'
           and p_linked_start_id is not null
        then
            select COUNT (*)
              into v_tot
              from xx_disl_gu23_act_row
             where act_id = p_linked_start_id;

            select COUNT (distinct er.wagon_no)
              into v_closed
              from xx_disl_gu23_act e, xx_disl_gu23_act_row er
             where     er.act_id = e.id
                   and e.act_type = 'end'
                   and e.status = 'active'
                   and e.linked_start_id = p_linked_start_id;

            if v_closed >= v_tot
            then
                update xx_disl_gu23_act
                   set status = 'closed',
                       modified_at = SYSDATE,
                       modified_by = p_user_id
                 where id = p_linked_start_id and status = 'active';

                insert into xx_disl_gu23_hist (id,
                                               act_id,
                                               ts,
                                               usr,
                                               txt)
                         values (
                                    xx_disl_gu23_hist_seq.NEXTVAL,
                                    p_linked_start_id,
                                    SYSDATE,
                                    p_user_id,
                                       'Цикл простоя полностью закрыт актом окончания '
                                    || v_number);
            else
                insert into xx_disl_gu23_hist (id,
                                               act_id,
                                               ts,
                                               usr,
                                               txt)
                         values (
                                    xx_disl_gu23_hist_seq.NEXTVAL,
                                    p_linked_start_id,
                                    SYSDATE,
                                    p_user_id,
                                       'Частично закрыто актом окончания '
                                    || v_number
                                    || ' ('
                                    || v_closed
                                    || ' из '
                                    || v_tot
                                    || ')');
            end if;
        end if;

        l_row.id := xx_disl_gu23_hist_seq.NEXTVAL;
        l_row.act_id := v_id;
        l_row.ts := SYSDATE;
        l_row.usr := p_user_id;
        l_row.txt :=
            case
                when xx_disl_gu23_pkg.fnc_boolean_num (v_isnew) = 1
                then
                    case
                        when p_status = 'draft' then 'Акт создан (черновик)'
                        else 'Акт создан и заведён'
                    end
                else
                    case
                        when p_status = 'draft' then 'Черновик изменён'
                        else 'Акт изменён / заведён'
                    end
            end;

        -- логирование операции в историю изменений
        insert into xx_disl_gu23_hist (id,
                                       act_id,
                                       ts,
                                       usr,
                                       txt)
             values (l_row.id,
                     l_row.act_id,
                     l_row.ts,
                     l_row.usr,
                     l_row.txt);

        commit;
        return 'OK' || c_us || v_id || c_us || v_number;
    exception
        when others
        then
            rollback;
            return 'ERR' || c_us || SQLERRM;
    end;

    function gu23_del_act (p_id in number, p_user_id in number)
        return varchar2
    is
        v_status   varchar2 (16);
    begin
        select status
          into v_status
          from xx_disl_gu23_act
         where id = p_id;

        if v_status <> 'draft'
        then
            return    'ERR'
                   || c_us
                   || 'Удалять можно только черновик. Действующий акт аннулируется.';
        end if;

        delete from xx_disl_gu23_act
              where id = p_id;                    -- дети по ON DELETE CASCADE

        commit;
        return 'done';
    exception
        when NO_DATA_FOUND
        then
            return 'ERR' || c_us || 'Акт не найден';
        when others
        then
            rollback;
            return 'ERR' || c_us || SQLERRM;
    end;

    function gu23_annul_act (p_id        in number,
                             p_user_id   in number,
                             p_reason    in varchar2)
        return varchar2
    is
        v_type     varchar2 (16);
        v_linked   number;
    begin
        select act_type, linked_start_id
          into v_type, v_linked
          from xx_disl_gu23_act
         where id = p_id;

        update xx_disl_gu23_act
           set status = 'annulled',
               annul_reason = p_reason,
               modified_at = SYSDATE,
               modified_by = p_user_id
         where id = p_id;

        -- при аннулировании акта окончания — снова открываем связанный акт начала
        if v_type = 'end' and v_linked is not null
        then
            update xx_disl_gu23_act
               set status = 'active',
                   modified_at = SYSDATE,
                   modified_by = p_user_id
             where id = v_linked and status = 'closed';
        end if;

        insert into xx_disl_gu23_hist (id,
                                       act_id,
                                       ts,
                                       usr,
                                       txt)
             values (xx_disl_gu23_hist_seq.NEXTVAL,
                     p_id,
                     SYSDATE,
                     p_user_id,
                     'Акт аннулирован: ' || p_reason);

        commit;
        return 'done';
    exception
        when NO_DATA_FOUND
        then
            return 'ERR' || c_us || 'Акт не найден';
        when others
        then
            rollback;
            return 'ERR' || c_us || SQLERRM;
    end;
end xx_disl_gu23_pkg;
/
