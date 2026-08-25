create or replace force view xx_etw.xx_disl_gu23_act_v (
   id,
   act_number,
   act_start_number,
   act_type,
   status,
   dept_id,
   dept_code,
   dept_name,
   station_id,
   station,
   st_from_id,
   st_from,
   st_to_id,
   st_to,
   cargo_ref,
   reason_id,
   reason_name,
   categ_id,
   categ_name,
   circumstances,
   start_at,
   end_at,
   dur_days,
   dur_hours,
   dur_total_h,
   cal_days,
   linked_start_id,
   linked_start_number,
   wagon_cnt,
   file_cnt,
   annul_reason,
   created_at,
   created_by,
   modified_at,
   modified_by,
   content_version,
   org_id
) as
   select a.id,
          a.act_number,
          a_start.act_number as act_start_number,
          a.act_type,
          a.status,
          dept.id as dept_id,
          dept.code as dept_code,
          dept.name as dept_name,
          a.station_id,
          ss.name as station,
          a.st_from_id,
          ssf.st_name as st_from,
          a.st_to_id,
          sst.st_name as st_to,
          a.cargo_ref,
          a.reason as reason_id,
          grr.name as reason_name,
          grr.categ as categ_id,
          grr.categ_name as categ_name,
          a.circumstances,
          a.start_at,
          a.end_at,
          a.dur_days,
          a.dur_hours,
          a.dur_total_h,
          a.cal_days,
          a.linked_start_id,
          (
             select la.act_number
               from xx_disl_gu23_act la
              where la.id = a.linked_start_id
          ) as linked_start_number,
          (
             select count(*)
               from xx_disl_gu23_act_row r
              where r.act_id = a.id
          ) as wagon_cnt,
          (
             select count(*)
               from xx_disl_gu23_file f
              where f.act_id = a.id
          ) as file_cnt,
          a.annul_reason,
          a.created_at,
          a.created_by,
          a.modified_at,
          a.modified_by,
          a.content_version,
          a.org_id
     from xx_disl_gu23_act a
     left join xx_disl_dept_v dept
   on dept.id = a.dept_id
     left join xx_disl_gu23_act a_start
   on a.linked_start_id = a_start.id
     left join xx_disl_stations ss
   on to_char(ss.station_id) = a.station_id
     left join xx_nsi_station_v ssf
   on ssf.e_st_code = a.st_from_id
     left join xx_nsi_station_v sst
   on sst.e_st_code = a.st_to_id
     left join xx_disl_gu23_ref_reason_v grr
   on a.reason = to_char(grr.id);
