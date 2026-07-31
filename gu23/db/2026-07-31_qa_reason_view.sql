CREATE OR REPLACE VIEW XX_ETW.XX_DISL_GU23_REF_REASON_V AS
SELECT q.short_code AS id,
       q.description AS name,
       'any' AS act_kind,
       CASE
           WHEN REGEXP_LIKE(TRIM(q.attribute1), '^[0-9]+$')
           THEN TO_NUMBER(TRIM(q.attribute1))
       END AS categ,
       (
           SELECT MAX(r.name) KEEP (DENSE_RANK FIRST ORDER BY r.id)
             FROM XX_ETW.XX_DISL_GENERAL_REF r
            WHERE r.ref_code = 'CATEG_CAUSE'
              AND r.id = CASE
                             WHEN REGEXP_LIKE(TRIM(q.attribute1), '^[0-9]+$')
                             THEN TO_NUMBER(TRIM(q.attribute1))
                         END
              AND SYSDATE BETWEEN r.start_effect_date AND r.end_effect_date
       ) AS categ_name,
       'Y' AS active
  FROM XX_ETW.QA_PLAN_CHAR_VALUE_LOOKUPS q
 WHERE q.plan_id = 1980
   AND q.char_id = 2900;

