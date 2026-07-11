ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS optional_skills TEXT,
    ADD COLUMN IF NOT EXISTS billing_unit_price INTEGER;
