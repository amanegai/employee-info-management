-- 稼働状況「休職中」を「休業」に統一
UPDATE employee SET work_status = '休業' WHERE work_status = '休職中';

UPDATE employee_status_change_log
SET old_work_status = '休業'
WHERE old_work_status = '休職中';

UPDATE employee_status_change_log
SET new_work_status = '休業'
WHERE new_work_status = '休職中';

UPDATE employee_status_suggestion
SET suggested_status = '休業'
WHERE suggested_status = '休職中';
