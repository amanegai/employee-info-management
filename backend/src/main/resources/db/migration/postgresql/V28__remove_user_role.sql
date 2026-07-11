-- 一般（USER）ロールを廃止し、該当ユーザーを無効化する
UPDATE auth_user
SET enabled = 0
WHERE id IN (
    SELECT user_id
    FROM auth_user_role
    GROUP BY user_id
    HAVING COUNT(*) = 1 AND MAX(role) = 'USER'
);

DELETE FROM auth_user_role WHERE role = 'USER';
