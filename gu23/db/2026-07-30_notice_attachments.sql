create table xx_disl_module_notic_file (
   id         number not null,
   notice_id  number not null,
   file_path  varchar2(1000) not null,
   file_name  varchar2(512) not null,
   file_mime  varchar2(128),
   created_at date default sysdate not null,
   created_by number,
   constraint xx_disl_module_notic_file_pk primary key ( id ),
   constraint xx_disl_module_notic_file_fk foreign key ( notice_id )
      references xx_disl_module_notif ( id )
         on delete cascade
);

create sequence xx_disl_module_notic_file_seq start with 1 increment by 1 nocache;

create index xx_disl_module_notic_file_n1 on
   xx_disl_module_notic_file (
      notice_id
   );

-- Если ранее была установлена версия с одним файлом непосредственно
-- в XX_DISL_MODULE_NOTIF, переносим уже загруженные вложения.
declare
   v_has_old_columns number;
begin
   select count(*)
     into v_has_old_columns
     from user_tab_columns
    where table_name = 'XX_DISL_MODULE_NOTIF'
      and column_name in ( 'FILE_PATH',
                           'FILE_NAME',
                           'FILE_MIME' );

   if v_has_old_columns = 3 then
      execute immediate q'[
            insert into xx_disl_module_notic_file (
                id,
                notice_id,
                file_path,
                file_name,
                file_mime,
                created_at,
                created_by
            )
            select xx_disl_module_notic_file_seq.nextval,
                   id,
                   file_path,
                   nvl(file_name, substr(file_path, instr(file_path, '/', -1) + 1)),
                   file_mime,
                   nvl(created_at, sysdate),
                   created_by
              from xx_disl_module_notif
             where module_code = 'GU23'
               and file_path is not null
        ]';
   end if;
end;
/