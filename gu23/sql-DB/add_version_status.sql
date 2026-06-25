-- Версия содержимого акта (инкремент при сохранении активного акта)
ALTER TABLE xx_disl_gu23_act
  ADD (content_version NUMBER DEFAULT 1 NOT NULL);

-- Версия документа на момент подписания + IP подписанта
ALTER TABLE xx_disl_gu23_approval
  ADD (signed_version NUMBER,
       signer_ip      VARCHAR2(64));

-- Пересоздать представление с добавлением content_version
CREATE OR REPLACE FORCE EDITIONABLE VIEW "XX_ETW"."XX_DISL_GU23_ACT_V" (
   "ID", "ACT_NUMBER", "ACT_START_NUMBER", "ACT_TYPE", "STATUS",
   "DEPT_ID", "DEPT_CODE", "DEPT_NAME",
   "STATION_ID", "STATION", "ST_FROM_ID", "ST_FROM", "ST_TO_ID", "ST_TO",
   "CARGO_REF", "REASON_ID", "REASON_NAME", "CIRCUMSTANCES",
   "START_AT", "END_AT", "DUR_DAYS", "DUR_HOURS", "DUR_TOTAL_H", "CAL_DAYS",
   "LINKED_START_ID", "LINKED_START_NUMBER",
   "WAGON_CNT", "FILE_CNT", "ANNUL_REASON",
   "CREATED_AT", "CREATED_BY", "MODIFIED_AT", "MODIFIED_BY",
   "CONTENT_VERSION"
) AS
   SELECT a.id,
          a.act_number,
          a_start.act_number                                                              AS act_start_number,
          a.act_type,
          a.status,
          dept.id                                                                         AS dept_id,
          dept.code                                                                       AS dept_code,
          dept.name                                                                       AS dept_name,
          a.station_id,
          ss.name                                                                         AS station,
          a.st_from_id,
          ssf.st_name                                                                     AS st_from,
          a.st_to_id,
          sst.st_name                                                                     AS st_to,
          a.cargo_ref,
          a.reason                                                                        AS reason_id,
          grr.name                                                                        AS reason_name,
          a.circumstances,
          a.start_at,
          a.end_at,
          a.dur_days,
          a.dur_hours,
          a.dur_total_h,
          a.cal_days,
          a.linked_start_id,
          (SELECT la.act_number FROM xx_disl_gu23_act la WHERE la.id = a.linked_start_id) AS linked_start_number,
          (SELECT COUNT(*) FROM xx_disl_gu23_act_row r WHERE r.act_id = a.id)             AS wagon_cnt,
          (SELECT COUNT(*) FROM xx_disl_gu23_file f WHERE f.act_id = a.id)                AS file_cnt,
          a.annul_reason,
          a.created_at,
          a.created_by,
          a.modified_at,
          a.modified_by,
          a.content_version
     FROM xx_disl_gu23_act a
     LEFT JOIN xx_disl_dept_v          dept    ON dept.id              = a.dept_id
     LEFT JOIN xx_disl_gu23_act        a_start ON a.linked_start_id    = a_start.id
     LEFT JOIN xx_disl_stations        ss      ON TO_CHAR(ss.station_id) = a.station_id
     LEFT JOIN xx_etw_station_bi_v     ssf     ON ssf.st_code          = a.st_from_id
     LEFT JOIN xx_etw_station_bi_v     sst     ON sst.st_code          = a.st_to_id
     LEFT JOIN xx_disl_gu23_ref_reason grr     ON a.reason             = TO_CHAR(grr.id);
