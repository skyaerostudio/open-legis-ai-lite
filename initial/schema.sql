-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clauses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version_id uuid,
  clause_ref text,
  text text NOT NULL CHECK (length(TRIM(BOTH FROM text)) > 0),
  page_from integer,
  page_to integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clauses_pkey PRIMARY KEY (id),
  CONSTRAINT clauses_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.document_versions(id)
);
CREATE TABLE public.conflicts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version_id uuid,
  law_ref text NOT NULL,
  overlap_score double precision NOT NULL CHECK (overlap_score >= 0::double precision AND overlap_score <= 1::double precision),
  excerpt text NOT NULL,
  cite_json jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conflicts_pkey PRIMARY KEY (id),
  CONSTRAINT conflicts_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.document_versions(id)
);
CREATE TABLE public.diffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  v_from uuid,
  v_to uuid,
  clause_ref text,
  change_kind text NOT NULL CHECK (change_kind = ANY (ARRAY['added'::text, 'deleted'::text, 'modified'::text])),
  score double precision CHECK (score >= 0::double precision AND score <= 1::double precision),
  diff_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT diffs_pkey PRIMARY KEY (id),
  CONSTRAINT diffs_v_to_fkey FOREIGN KEY (v_to) REFERENCES public.document_versions(id),
  CONSTRAINT diffs_v_from_fkey FOREIGN KEY (v_from) REFERENCES public.document_versions(id)
);
CREATE TABLE public.document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid,
  version_label text NOT NULL,
  storage_path text NOT NULL,
  pages integer,
  processing_status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_versions_pkey PRIMARY KEY (id),
  CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_url text,
  kind text,
  jurisdiction text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clause_id uuid UNIQUE,
  vector USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT embeddings_clause_id_fkey FOREIGN KEY (clause_id) REFERENCES public.clauses(id)
);