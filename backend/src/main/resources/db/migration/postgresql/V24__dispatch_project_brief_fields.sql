ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS billing_price_label VARCHAR(200),
    ADD COLUMN IF NOT EXISTS interview_rounds TEXT;
