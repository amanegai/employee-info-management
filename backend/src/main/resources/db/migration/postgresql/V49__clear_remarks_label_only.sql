-- 履歴書インポートで「備考」ラベルだけが本文として保存されたデータをクリア
UPDATE employee_personal
SET remarks = NULL
WHERE remarks IS NOT NULL
  AND TRIM(BOTH FROM remarks) IN ('備考', '備考：', '備考:');
