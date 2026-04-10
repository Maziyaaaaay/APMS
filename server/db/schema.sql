-- ============================================================
-- KTU Activity Point Management System — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → Paste → Run)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Drop existing tables (safe re-run) ──────────────────────────────────────
drop table if exists point_overrides cascade;
drop table if exists circulars cascade;
drop table if exists certificates cascade;
drop table if exists departments cascade;
drop table if exists users cascade;

-- ─── Users ───────────────────────────────────────────────────────────────────
create table users (
  id              uuid primary key default gen_random_uuid(),
  role            text not null check (role in ('student', 'faculty', 'admin')),
  is_super_admin  boolean not null default false,
  username        text not null unique,
  password_hash   text not null,
  name            text not null,
  email           text,
  profile_url     text,
  -- Student fields
  roll_no         text,
  department      text,
  class           text,
  year            integer,
  semester        integer,
  student_type    text check (student_type in ('regular', 'lateral', 'pwd')),
  -- Faculty fields
  designation     text,
  created_at      timestamptz default now()
);

-- ─── Departments ─────────────────────────────────────────────────────────────
create table departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz default now()
);

-- ─── Certificates ─────────────────────────────────────────────────────────────
create table certificates (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references users(id) on delete cascade,
  activity_id    text not null,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  points_awarded integer,
  level_selected text,
  hours          numeric,
  description    text,
  notes          text,
  file_url       text,
  created_at     timestamptz default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid references users(id)
);

-- ─── Circulars ────────────────────────────────────────────────────────────────
create table circulars (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ─── Point Overrides ─────────────────────────────────────────────────────────
create table point_overrides (
  activity_id text primary key,
  override    jsonb not null,
  updated_at  timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- We use the service_role key on the backend, which bypasses RLS.
alter table users enable row level security;
alter table certificates enable row level security;
alter table departments enable row level security;
alter table circulars enable row level security;
alter table point_overrides enable row level security;

-- ─── Indexes for performance ──────────────────────────────────────────────────
create index idx_certificates_student_id on certificates(student_id);
create index idx_certificates_status on certificates(status);
create index idx_users_username on users(username);
create index idx_users_role on users(role);
create index idx_users_department on users(department);
