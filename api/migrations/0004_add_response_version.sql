-- Migration: Add survey_version column to responses table (if missing from older init)
ALTER TABLE responses ADD COLUMN survey_version TEXT NOT NULL DEFAULT 'v1.0';
