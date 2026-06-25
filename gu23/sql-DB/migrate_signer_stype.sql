-- Добавить колонку stype в xx_disl_gu23_signer
-- 'own' = работник предприятия (signer_ref_id = xx_disl_users.id)
-- 'rzd' = работник станции РЖД (signer_ref_id = xx_disl_gu23_ref_signer.id)
ALTER TABLE xx_disl_gu23_signer ADD stype VARCHAR2(16);

-- Заполнить существующие записи (backfill)
UPDATE xx_disl_gu23_signer s
   SET stype = CASE
                  WHEN s.signer_ref_id IS NOT NULL
                       AND EXISTS (SELECT 1 FROM xx_disl_users u WHERE u.id = s.signer_ref_id)
                  THEN 'own'
                  WHEN s.signer_ref_id IS NOT NULL
                  THEN 'rzd'
                  ELSE NULL
               END
 WHERE stype IS NULL;

COMMIT;
