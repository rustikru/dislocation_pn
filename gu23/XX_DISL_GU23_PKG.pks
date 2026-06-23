create or replace package xx_etw.xx_disl_gu23_pkg as
    /******************************************************************************
    NAME:  xx_etw.xx_disl_gu23_pkg
    PURPOSE:   Акты: составление актов (форма ГУ-23)
    REVISIONS:
    Ver        Date        Author           Description
    ---------  ----------  ---------------  ------------------------------------
    1.0        23.06.2026  BekmansurovRR    1. Created this package.
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
         id     number,
         fio    varchar2(256),
         post   varchar2(256),
         org    varchar2(256),
         unit   varchar2(256),
         stype  varchar2(128),
         ord_no number
   );
   type xx_disl_gu23_signer_tab is
      table of xx_disl_gu23_signer_row;
   type xx_disl_gu23_act_row is record (
         id                  number,
         act_number          varchar2(64),
         act_type            varchar2(16),
         status              varchar2(16),
         cex                 varchar2(32),
         station             varchar2(128),
         reason              varchar2(512),
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

   function gu23_get_ref_station return xx_disl_gu23_ref_tab
      pipelined;

   function gu23_get_ref_owner return xx_disl_gu23_ref_tab
      pipelined;

   function gu23_get_ref_wagon_kind return xx_disl_gu23_ref_tab
      pipelined;

   function gu23_get_ref_signer return xx_disl_gu23_signer_tab
      pipelined;

    -- ---- Акты ----
   function gu23_get_acts (
      p_q      in varchar2 default null,
      p_type   in varchar2 default null,
      p_status in varchar2 default null,
      p_cex    in varchar2 default null
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

    -- ---- Интеграция Oracle BI / получить данные по вагонам из дислокации ----
   function gu23_get_wagon_info (
      p_wagons  in clob,
      p_station in varchar2 default null
   ) return xx_disl_gu23_wagon_tab
      pipelined;

    -- ---- Запись ----
    -- получить id для нового файла
   function gu23_new_file_id return number;

   function gu23_add_file (
      p_act_id  in number,
      p_file_id in number,
      p_name    in varchar2,
      p_ext     in varchar2,
      p_mime    in varchar2,
      p_path    in varchar2,
      p_user_id in number
   ) return varchar2;

   function gu23_del_file (
      p_file_id in number,
      p_user_id in number
   ) return varchar2;

    -- сохранение акта (создание/правка черновика) вместе со строками и подписантами.
    -- Возвращает: 'OK'||CHR(31)||id||CHR(31)||number   либо  'ERR'||CHR(31)||текст
   function gu23_save_act (
      p_user_id         in number,
      p_id              in number,   -- 0/NULL = новый
      p_type            in varchar2, -- start / end / other
      p_status          in varchar2, -- draft / active
      p_cex             in varchar2,
      p_station         in varchar2,
      p_reason          in varchar2,
      p_circumstances   in varchar2,
      p_start_at        in varchar2, -- 'YYYY-MM-DD HH24:MI' или NULL
      p_end_at          in varchar2,
      p_linked_start_id in number,
      p_wagons          in clob, -- записи CHR(30); поля CHR(31): no,owner,kind,from,to,cargo,weight
      p_signers         in clob, -- записи CHR(30); поля CHR(31): fio,post,org
      p_force           in varchar2 default 'N' -- 'Y' = разрешить дубль открытого простоя
   ) return varchar2;

   function gu23_del_act (
      p_id      in number,
      p_user_id in number
   ) return varchar2;

   function gu23_annul_act (
      p_id      in number,
      p_user_id in number,
      p_reason  in varchar2
   ) return varchar2;
end xx_disl_gu23_pkg;