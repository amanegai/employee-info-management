ALTER TABLE dispatch_client_internal_contact
    ADD COLUMN IF NOT EXISTS employee_id BIGINT REFERENCES employee(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_client_internal_employee
    ON dispatch_client_internal_contact(employee_id);

UPDATE dispatch_client_internal_contact ic
SET employee_id = (
    SELECT e.id
    FROM employee e
    WHERE LOWER(TRIM(e.name)) = LOWER(TRIM(ic.contact_name))
    ORDER BY e.id
    LIMIT 1
)
WHERE ic.employee_id IS NULL;
