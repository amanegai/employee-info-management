-- 評価項目未登録の社員は総合ランクをクリア
UPDATE employee e
SET evaluation = ''
WHERE evaluation <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM employee_evaluation_item ei
      WHERE ei.employee_id = e.id
        AND ei.rank_grade IS NOT NULL
        AND trim(ei.rank_grade) <> ''
  );

DELETE FROM employee_overall_evaluation oe
WHERE NOT EXISTS (
    SELECT 1
    FROM employee_evaluation_item ei
    WHERE ei.employee_id = oe.employee_id
      AND ei.rank_grade IS NOT NULL
      AND trim(ei.rank_grade) <> ''
);
