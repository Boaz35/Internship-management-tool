-- Feedback v3: the summary-document feature is removed. Dropping the table
-- also drops its RLS policies (summaries_select / summaries_write from 0002/0004).
drop table if exists public.summaries cascade;
