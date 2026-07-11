ALTER TABLE dispatch_client ADD COLUMN IF NOT EXISTS accounting_contact_name TEXT;
ALTER TABLE dispatch_client ADD COLUMN IF NOT EXISTS accounting_contact_department TEXT;
ALTER TABLE dispatch_client ADD COLUMN IF NOT EXISTS accounting_contact_phone TEXT;
ALTER TABLE dispatch_client ADD COLUMN IF NOT EXISTS accounting_contact_email TEXT;
