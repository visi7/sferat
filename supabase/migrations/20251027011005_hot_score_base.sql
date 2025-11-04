-- Base function: MUST exist before recompute_hot_score uses it
create or replace function public.compute_hot_score(vote_sum int, created timestamptz)
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

  order_score := log(greatest(abs(vote_sum), 1)) * sign_score;
  seconds_since := extract(epoch from (created - timestamp '1970-01-01'));

  return round(order_score + (seconds_since / 45000), 7);
end;
$$;
