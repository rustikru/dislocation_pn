create or replace view xx_etw.xx_disl_gu23_org_v as
select id,
       name
  from xx_etw.xx_disl_enterprise
 where id in (2, 3);

comment on table xx_etw.xx_disl_gu23_org_v is
    'Организации, доступные в фильтре архива актов ГУ-23';
