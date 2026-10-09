begin;
-- Include the Discord contact promised by DC-013; keep literal search and officer access checks.
create or replace function public.list_applications(p_query text default '',p_status public.application_status default null,p_mode public.tryout_mode default null,p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if public.current_officer_role() is null then raise exception 'Officer access required' using errcode='42501'; end if;
 if p_query is null or length(p_query)>100 or p_page is null or p_page not between 1 and 100000 then raise exception 'Invalid filters' using errcode='22023'; end if;
 with filtered as (
  select id,reference,ign,mode,selected_map,status,created_at from public.applications
  where (p_status is null or status=p_status) and (p_mode is null or mode=p_mode)
  and (p_query='' or position(lower(p_query) in lower(ign))>0 or position(lower(p_query) in reference::text)>0 or position(lower(p_query) in lower(discord_name))>0)
 ), page as (select * from filtered order by created_at desc,id limit 20 offset (p_page-1)*20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id) from page),'[]'::jsonb),
  'count',(select count(*) from filtered),'total',(select count(*) from public.applications),
  'pending',(select count(*) from public.applications where status='pending_review')) into result;
 return result;
end;
$$;
revoke all on function public.list_applications(text,public.application_status,public.tryout_mode,integer) from public,anon,authenticated;
grant execute on function public.list_applications(text,public.application_status,public.tryout_mode,integer) to authenticated;
commit;

