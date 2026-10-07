begin;
insert into auth.users(id) values('a8000000-0000-4000-8000-000000000001');
insert into public.officer_profiles(id,display_name,role) values('a8000000-0000-4000-8000-000000000001','Synthetic transaction-only officer','staff');
select set_config('request.jwt.claim.sub',(select id::text from public.officer_profiles where active and role='admin' order by created_at limit 1),true);
set local role authenticated;
select public.manage_officer('a8000000-0000-4000-8000-000000000001',1,'delete','Synthetic transaction-only deletion','Synthetic transaction-only officer');
reset role;
delete from auth.users where id='a8000000-0000-4000-8000-000000000001';
reset role;
do $$ begin
 if not exists(select 1 from public.officer_profiles where id='a8000000-0000-4000-8000-000000000001' and auth_user_id is null and not active and deleted_at is not null) then raise exception 'Auth deletion did not detach historical profile'; end if;
end $$;
rollback;
select 'Hosted foreign-key deletion and history preservation passed; all fixtures rolled back' as result;
