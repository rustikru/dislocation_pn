-- Хранить номер накладной по каждому вагону в строках акта
ALTER TABLE xx_disl_gu23_act_row ADD (waybill_no VARCHAR2(64));

comment on column xx_disl_gu23_act_row.waybill_no is
   'Номер накладной по вагону (из дислокации)';
