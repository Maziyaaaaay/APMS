create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_tokens_user_idx on public.password_reset_tokens(user_id);
alter table public.password_reset_tokens enable row level security;
revoke all on public.password_reset_tokens from anon, authenticated;

-- Atomically consume one live token, update the APMS password, and invalidate
-- all outstanding reset tokens for the account. Only the trusted API key may call it.
create or replace function public.apms_consume_password_reset(p_token_hash text, p_password_hash text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Server role required'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_password_hash is null or length(p_password_hash) < 20 then return false; end if;
  delete from public.password_reset_tokens where token_hash = p_token_hash and expires_at > now() returning user_id into v_user_id;
  if v_user_id is null then return false; end if;
  update public.users set password_hash = p_password_hash where id = v_user_id and account_status = 'approved';
  if not found then return false; end if;
  delete from public.password_reset_tokens where user_id = v_user_id;
  return true;
end;
$$;
revoke all on function public.apms_consume_password_reset(text, text) from public, anon, authenticated;
grant execute on function public.apms_consume_password_reset(text, text) to service_role;
