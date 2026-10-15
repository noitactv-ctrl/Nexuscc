ALTER TABLE public.card_bases
  ADD COLUMN IF NOT EXISTS created_by_id integer REFERENCES public.users(id);
