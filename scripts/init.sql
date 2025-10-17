-- Initialize database with required schemas and extensions
-- This script runs when PostgreSQL container starts for the first time
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS shared;

CREATE SCHEMA IF NOT EXISTS vbl;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA shared TO vbl_user;

GRANT ALL PRIVILEGES ON SCHEMA vbl TO vbl_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA shared TO vbl_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA vbl TO vbl_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA shared TO vbl_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA vbl TO vbl_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON TABLES TO vbl_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA vbl GRANT ALL ON TABLES TO vbl_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON SEQUENCES TO vbl_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA vbl GRANT ALL ON SEQUENCES TO vbl_user;