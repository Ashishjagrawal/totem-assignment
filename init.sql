-- Initialize the memory_warehouse database
-- This script runs when the PostgreSQL container starts

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- CREATE DATABASE memory_warehouse;

-- Connect to the database
\c memory_warehouse;

-- The Prisma migrations will handle table creation
-- This file is here for any additional initialization needed
