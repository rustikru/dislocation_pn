-- Добавление категории файла: 'general' (общий) или 'signed' (подписанный)
ALTER TABLE xx_disl_gu23_file
  ADD (file_category VARCHAR2(16) DEFAULT 'general' NOT NULL);
