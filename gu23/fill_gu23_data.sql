-- fill_gu23_data.sql — заполнение справочников ГУ-23.
-- БЕЗОПАСНО: таблицы не дропаются; акты/строки/файлы/история НЕ трогаются.
-- Идемпотентно: справочники очищаются и заливаются заново (без дублей).
-- Запускать как скрипт под нужной схемой (локально — XX_ETW),
-- после того как таблицы уже созданы (install_gu23_all.sql / install_gu23.sql).
SET DEFINE OFF

-- очистка справочников перед повторным наполнением (FK на акты нет — безопасно)
DELETE FROM xx_disl_gu23_ref_signer;
DELETE FROM xx_disl_gu23_ref_wagon_kind;
DELETE FROM xx_disl_gu23_ref_cargo;
DELETE FROM xx_disl_gu23_ref_owner;
DELETE FROM xx_disl_gu23_ref_station;
DELETE FROM xx_disl_gu23_ref_reason;
DELETE FROM xx_disl_gu23_ref_cex;

-- dev-пользователь (его user_id должен совпадать с db_config.local.php)
DELETE FROM xx_disl_gu23_users WHERE user_id = 1;
INSERT INTO xx_disl_gu23_users (user_id, login, full_name)
VALUES (1, 'dev', 'Локальный разработчик');

-- цеха
INSERT INTO xx_disl_gu23_ref_cex (id, code, name) VALUES (xx_disl_gu23_ref_cex_seq.NEXTVAL, 'ЖДЦ', 'Железнодорожный цех');

-- причины
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Простой под выгрузкой');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Простой под погрузкой');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Неприём вагонов станцией');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Ожидание подачи/уборки');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Неудовлетворительное состояние вагона');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Техническая неисправность');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Коммерческая неисправность');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Повреждение вагона');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Следы течи / просыпания / загрязнения');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Несоответствие требованиям погрузки/выгрузки');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Качество перевозимого груза');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Предоставление информации собственнику');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Предоставление информации экспедитору');


-- собственники
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'ОАО «РЖД»');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'ПГК');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'ФГК');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'НефтеТрансСервис');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'СУЭК');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'Собственный парк');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'Уралкалий');

-- род вагона
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Полувагон');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Цистерна');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Крытый');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Платформа');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Хоппер');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Думпкар');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Окатышевоз');

-- грузы
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Уголь каменный');
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Кокс');
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Удобрения минеральные');
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Дизельное топливо');
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Нефть и нефтепродукты');
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Щебень');
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Металл прокатный');
INSERT INTO xx_disl_gu23_ref_cargo (id, name) VALUES (xx_disl_gu23_ref_cargo_seq.NEXTVAL, 'Лес и лесоматериалы');

-- подписанты
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Смирнов А.В.', 'Начальник смены', 'Предприятие', 'ЖДЦ', 'Работник предприятия');
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Петрова Е.Н.', 'Инженер по перевозкам', 'Предприятие', 'ЖДЦ', 'Работник предприятия');
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Козлов Д.А.', 'Приёмосдатчик', 'ОАО «РЖД»', 'ст. Углеуральская', 'Работник станции ОАО «РЖД»');
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Орлова М.С.', 'Мастер', 'Предприятие', 'ВЧД', 'Работник предприятия');

COMMIT;
