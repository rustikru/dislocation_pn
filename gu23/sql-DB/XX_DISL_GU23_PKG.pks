create or replace package xx_disl_gu23_pkg as
    /******************************************************************************
    NAME:  xx_etw.xx_disl_gu23_pkg
    PURPOSE:   Акты: составление актов (форма ГУ-23)
    REVISIONS:
    Ver        Date        Author           Description
    ---------  ----------  ---------------  ------------------------------------
    1.0        23.06.2026  BekmansurovRR    1. Created this package.
    1.1        23.06.2026  BekmansurovRR    2. Новые поля акта: st_from, st_to,
                                              waybill_no, cargo_ref; раздельные
                                              справочники станций и подписантов;
                                              справочник грузов.
 ******************************************************************************/

    /* ************* Begin Типы ************************* */

   type xx_disl_gu23_ref_row is record (
         id   number,
         code varchar2(512),
         name varchar2(512)
   );
   type xx_disl_gu23_ref_tab is
      table of xx_disl_gu23_ref_row;
   type xx_disl_gu23_signer_row is record (
         id            number,
         signer_ref_id number,                      -- ref ID из справочника
         fio           varchar2(256),
         post          varchar2(256),
         org           varchar2(256),
         unit          varchar2(256),
         stype         varchar2(128),
         ord_no        number
   );
   type xx_disl_gu23_signer_tab is
      table of xx_disl_gu23_signer_row;
   type xx_disl_gu23_act_row is record (
         id                  number,
         act_number          varchar2(64),
         act_start_number    varchar2(64),
         act_type            varchar2(16),
         status              varchar2(16),
         dept_id             number,                              -- ID цеха
         dept                varchar2(32),    -- код цеха (для отображения)
         station_id          varchar2(150),           -- ID ст. составления
         station             varchar2(128),   -- ст. составления (название)
         st_from_id          varchar2(150),           -- ID ст. отправления
         st_from             varchar2(128),   -- ст. отправления (название)
         st_to_id            varchar2(150),            -- ID ст. назначения
         st_to               varchar2(128),    -- ст. назначения (название)
         cargo_ref           varchar2(256),                         -- груз
         reason_id           varchar2(512),
         reason_name         varchar2(1000),
         circumstances       varchar2(4000),
         start_at            varchar2(20),
         end_at              varchar2(20),
         dur_days            number,
         dur_hours           number,
         dur_total_h         number,
         cal_days            number,
         linked_start_id     number,
         linked_start_number varchar2(64),
         wagon_cnt           number,
         file_cnt            number,
         annul_reason        varchar2(1000),
         created_at          varchar2(20),
         created_by          varchar2(256),
         modified_at         varchar2(20)
   );
   type xx_disl_gu23_act_tab is
      table of xx_disl_gu23_act_row;
   type xx_disl_gu23_row is record (
         id       number,
         act_id   number,
         wagon_no varchar2(16),
         owner    varchar2(128),
         kind     varchar2(128),
         st_from  varchar2(128),
         st_to    varchar2(128),
         cargo    varchar2(256),
         weight   varchar2(32)
   );
   type xx_disl_gu23_row_tab is
      table of xx_disl_gu23_row;
   type xx_disl_gu23_file_row is record (
         id         number,
         act_id     number,
         file_name  varchar2(512),
         file_ext   varchar2(32),
         mime_type  varchar2(128),
         real_path  varchar2(1024),
         created_at varchar2(20),
         created_by varchar2(256)
   );
   type xx_disl_gu23_file_tab is
      table of xx_disl_gu23_file_row;
   type xx_disl_gu23_hist_row is record (
         id     number,
         act_id number,
         ts     varchar2(20),
         usr    varchar2(256),
         txt    varchar2(1000)
   );
   type xx_disl_gu23_hist_tab is
      table of xx_disl_gu23_hist_row;
   type xx_disl_gu23_wagon_row is record (
         wagon_no varchar2(16),
         owner    varchar2(128),
         kind     varchar2(128),
         st_from  varchar2(128),
         st_to    varchar2(128),
         cargo    varchar2(256),
         weight   varchar2(32),
         found    number
   );
   type xx_disl_gu23_wagon_tab is
      table of xx_disl_gu23_wagon_row;

   -- Строка, разобранная из CLOB-пачки вагонов (RS/US-формат)
   type t_wagon_clob_row is record (
         wagon_no varchar2(16),
         owner    varchar2(128),
         kind     varchar2(128),
         st_from  varchar2(128),
         st_to    varchar2(128),
         cargo    varchar2(256),
         weight   varchar2(32)
   );
   type t_wagon_clob_tab is
      table of t_wagon_clob_row;

    -- ---- Типы для параметров Сохранения акта ----
   type t_gu23_save_act is record (
         p_user_id         number,
         p_id              number,                         -- 0/NULL = новый
         p_type            varchar2(16),             -- start / end / other
         p_status          varchar2(16),                  -- draft / active
         p_dept            varchar2(32),                        -- код цеха
         p_station         varchar2(128),             -- ID ст. составления
         p_st_from         varchar2(128),             -- ID ст. отправления
         p_st_to           varchar2(128),              -- ID ст. назначения
         p_waybill_no      varchar2(64), -- № накладной (только для поиска Дислокации, не хранится на строках акта)
         p_cargo_ref       varchar2(256),
         p_reason          varchar2(512),
         p_circumstances   varchar2(4000),
         p_start_at        varchar2(20),   -- 'YYYY-MM-DD HH24:MI' или NULL
         p_end_at          varchar2(20),
         p_linked_start_id number,
         p_wagons          clob, -- CHR(30): записи; CHR(31): поля: no,owner,kind,from,to,cargo,weight
         p_signers         clob, -- CHR(30): записи; CHR(31): поля: ref_id,fio,post,org
         p_force           varchar2(1) -- 'Y' = разрешить дубль открытого простоя
   );
   type t_gu23_add_file is record (
         p_act_id  number,
         p_file_id number,
         p_name    varchar2(512),
         p_ext     varchar2(32),
         p_mime    varchar2(128),
         p_path    varchar2(1024),
         p_user_id number
   );
   type t_gu23_annul_act is record (
         p_id      number,
         p_user_id number,
         p_reason  varchar2(1000)
   );
   type t_gu23_del_act is record (
         p_id      number,
         p_user_id number
   );
   type t_gu23_del_file is record (
         p_file_id number,
         p_user_id number
   );

    /* ************* end Типы ************************* */
   function fnc_boolean_num (
      p_bool in boolean
   ) return number;

    -- ---- Справочники
   function gu23_get_ref_cex return xx_disl_gu23_ref_tab
      pipelined;

   function gu23_get_ref_reason (
      p_kind in varchar2 default null
   ) return xx_disl_gu23_ref_tab
      pipelined;

    -- ---- Справочники станций
   function gu23_get_ref_station_compile return xx_disl_gu23_ref_tab                         -- ст. составления
      pipelined;

   function gu23_get_ref_st_from return xx_disl_gu23_ref_tab                         -- ст. отправления
      pipelined;

   function gu23_get_ref_st_to return xx_disl_gu23_ref_tab                          -- ст. назначения
      pipelined;

   function gu23_get_ref_cargo return xx_disl_gu23_ref_tab
      pipelined;

    -- Справочники подписантов
    -- работники предприятия; p_cex — код цеха для фильтрации (null = все)
   function gu23_get_ref_signer_own (
      p_dept_id in varchar2 default null
   ) return xx_disl_gu23_signer_tab
      pipelined;

    -- работники станции ОАО «РЖД»
   function gu23_get_ref_signer_rzd return xx_disl_gu23_signer_tab
      pipelined;

    -- ---- Акты ----
   function gu23_get_acts (
      p_q       in varchar2 default null,
      p_type    in varchar2 default null,
      p_status  in varchar2 default null,
      p_dept_id in varchar2 default null
   ) return xx_disl_gu23_act_tab
      pipelined;

   function gu23_get_act (
      p_id in number
   ) return xx_disl_gu23_act_tab
      pipelined;

   function gu23_get_rows (
      p_act_id in number
   ) return xx_disl_gu23_row_tab
      pipelined;

   function gu23_get_files (
      p_act_id in number
   ) return xx_disl_gu23_file_tab
      pipelined;

   function gu23_get_signers (
      p_act_id in number
   ) return xx_disl_gu23_signer_tab
      pipelined;

   function gu23_get_hist (
      p_act_id in number
   ) return xx_disl_gu23_hist_tab
      pipelined;

    -- открытые акты начала простоя (без связи с актами окончания)
   function gu23_get_open_starts return xx_disl_gu23_act_tab
      pipelined;

    -- ещё открытые (не закрытые действующим окончанием) вагоны акта начала
   function gu23_get_open_rows (
      p_start_id in number
   ) return xx_disl_gu23_row_tab
      pipelined;

    -- все акты по номеру вагона (поиск по вагону)
   function gu23_get_by_wagon (
      p_wagon in varchar2
   ) return xx_disl_gu23_act_tab
      pipelined;

    -- ---- Поиск станций (для autocomplete, мин 3 символа) ----
   function gu23_search_station (
      p_q in varchar2
   ) return xx_disl_gu23_ref_tab
      pipelined;

-- Строка, разобранная из CLOB-пачки вагонов (RS/US-формат)
   type t_wagon_clob_row is record (
         wagon_no varchar2(16),
         owner    varchar2(128),
         kind     varchar2(128),
         st_from  varchar2(128),
         st_to    varchar2(128),
         cargo    varchar2(256),
         weight   varchar2(32)
   );
   type t_wagon_clob_tab is
      table of t_wagon_clob_row;
   function parse_wagon_clob (
      p_clob in clob
   ) return t_wagon_clob_tab
      pipelined;
      
    -- получить данные по вагонам из дислокации ----
   function gu23_get_wagon_info (
      p_wagons       in clob,
      p_waybill_no   in varchar2 default null,
      p_dest_station in varchar2 default null,
      p_cargo_name   in varchar2 default null
   ) return xx_disl_gu23_wagon_tab
      pipelined;

    -- ---- Запись ----
    -- получить id для нового файла
   function gu23_new_file_id return number;

   function gu23_add_file (
      p_data in t_gu23_add_file
   ) return varchar2;

   function gu23_del_file (
      p_data in t_gu23_del_file
   ) return varchar2;

   -- Разбирает CLOB в формате RS/US в таблицу строк вагонов
   function parse_wagon_clob (
      p_clob in clob
   ) return t_wagon_clob_tab pipelined;

    -- Сохранение акта (создание/правка черновика) вместе со строками и подписантами.
    -- Возвращает: 'OK'||CHR(31)||id||CHR(31)||number   либо  'ERR'||CHR(31)||текст
   function gu23_save_act (
      p_data in t_gu23_save_act
   ) return varchar2;

   function gu23_del_act (
      p_data in t_gu23_del_act
   ) return varchar2;

   function gu23_annul_act (
      p_data in t_gu23_annul_act
   ) return varchar2;

    -- ---- Согласование актов ----

    -- ФИО пользователя по ID
   function gu23_approval_get_name (
      p_id in number
   ) return varchar2;

    -- Найти запись по HMAC-подписи; возвращает 'status'||CHR(31)||'DD.MM.YYYY HH24:MI' или NULL
   function gu23_approval_by_sig (
      p_sig in varchar2
   ) return varchar2;

    -- Создать запрос на согласование; возвращает 'OK' или 'ERR'||CHR(31)||текст
   function gu23_approval_request (
      p_act_id       in number,
      p_approver_id  in number,
      p_requested_by in number,
      p_token_sig    in varchar2
   ) return varchar2;

    -- Сохранить решение согласующего; возвращает 'OK' или 'ERR'||CHR(31)||текст
   function gu23_approval_save_decision (
      p_act_id      in number,
      p_approver_id in number,
      p_status      in varchar2,
      p_comment     in varchar2,
      p_token_sig   in varchar2
   ) return varchar2;

end xx_disl_gu23_pkg;