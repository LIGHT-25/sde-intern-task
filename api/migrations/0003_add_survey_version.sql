-- Migration: Add version column to surveys table (if missing from older init)
-- This is safe: SQLite's ALTER TABLE ADD COLUMN is a no-op error if column exists,
-- but D1 will fail. We rely on this migration only running once.
ALTER TABLE surveys ADD COLUMN version TEXT NOT NULL DEFAULT 'v1.0';
