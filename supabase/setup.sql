-- =====================================================================
-- AQUALAND — Installation de la base Supabase
-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- =====================================================================

-- 1. Administrateurs (les personnes qui voient toutes les demandes et déposent les devis)
create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('laurent.degeest@gmail.com') on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- 2. Diagnostics et devis
create table if not exists public.diagnostics (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  nom text, telephone text, code_postal text, durete text,
  personnes text, logement text, plus_10_ans text, constats text,
  equipement text, emplacement text, evacuation text, remarque text,
  photos text[] not null default '{}',
  statut text not null default 'recu' check (statut in ('recu','etude','devis_pret','accepte','refuse')),
  modele text, devis_montant numeric, devis_note text, devis_path text
);
alter table public.diagnostics enable row level security;

-- Tout visiteur peut envoyer un diagnostic (sans pouvoir s'attribuer un devis)
drop policy if exists "diag_insert" on public.diagnostics;
create policy "diag_insert" on public.diagnostics for insert to anon, authenticated
  with check (statut = 'recu' and devis_path is null and devis_montant is null);

-- Le client voit ses propres demandes (même e-mail), l'admin voit tout
drop policy if exists "diag_select" on public.diagnostics;
create policy "diag_select" on public.diagnostics for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_admin());

-- Seul l'admin modifie ou supprime
drop policy if exists "diag_update_admin" on public.diagnostics;
create policy "diag_update_admin" on public.diagnostics for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "diag_delete_admin" on public.diagnostics;
create policy "diag_delete_admin" on public.diagnostics for delete to authenticated
  using (public.is_admin());

-- Le client peut accepter son devis (et rien d'autre)
create or replace function public.accepter_devis(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.diagnostics set statut = 'accepte', updated_at = now()
  where id = p_id and statut = 'devis_pret' and lower(email) = lower(auth.jwt() ->> 'email');
$$;
grant execute on function public.accepter_devis(uuid) to authenticated;

-- 3. Fichiers : photos des clients et devis PDF (privés)
insert into storage.buckets (id, name, public) values ('photos','photos', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('devis','devis', false) on conflict do nothing;

drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'photos');
drop policy if exists "photos_admin_read" on storage.objects;
create policy "photos_admin_read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_admin());

drop policy if exists "devis_admin_all" on storage.objects;
create policy "devis_admin_all" on storage.objects for all to authenticated
  using (bucket_id = 'devis' and public.is_admin())
  with check (bucket_id = 'devis' and public.is_admin());
drop policy if exists "devis_client_read" on storage.objects;
create policy "devis_client_read" on storage.objects for select to authenticated
  using (bucket_id = 'devis' and exists (
    select 1 from public.diagnostics d
    where d.devis_path = storage.objects.name and lower(d.email) = lower(auth.jwt() ->> 'email')));
