ALTER TABLE employee ADD COLUMN IF NOT EXISTS assignment_role TEXT;
ALTER TABLE dispatch_project ADD COLUMN IF NOT EXISTS project_role TEXT;
