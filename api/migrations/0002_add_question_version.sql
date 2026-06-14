-- Migration: Add version column to questions table
ALTER TABLE questions ADD COLUMN version TEXT NOT NULL DEFAULT 'v1.0';
