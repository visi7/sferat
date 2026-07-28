-- Fixes voting: compute_hot_score() called round(double precision, integer),
-- which does not exist in PostgreSQL (the 2-argument round() only has a
-- numeric overload). The original core.sql version had the ::numeric cast;
-- later hot_score_fix migrations dropped it by accident. This restores it
-- without changing the function's signature or logic otherwise.

create or replace function public.compute_hot_score(vote_sum bigint, created timestamptz)
returns double precision
language plpgsql
as $$
declare
  order_score double precision;
  sign_score int;
  seconds_since double precision;
begin
  if vote_sum is null then
    vote_sum := 0;
  end if;

  if vote_sum > 0 then
    sign_score := 1;
  elsif vote_sum < 0 then
    sign_score := -1;
  else
    sign_score := 0;
  end if;

  order_score := ln(greatest(abs(vote_sum)::double precision, 1)) * sign_score;
  seconds_since := extract(epoch from (created - timestamp '1970-01-01'));

  return round((order_score + (seconds_since / 45000))::numeric, 7);
end;
$$;
