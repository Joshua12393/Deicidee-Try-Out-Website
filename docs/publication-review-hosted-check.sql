-- Manual development verification. All draft, publication and role changes roll back.
begin;
do $$
declare admin_id uuid; staff_id uuid; cfg public.recruitment_configuration; doc jsonb;
 draft_revision integer; key uuid:=gen_random_uuid(); result integer; staff_version integer;
begin
 select id into admin_id from public.officer_profiles where role='admin' and active and auth_user_id is not null and deletion_requested_at is null order by created_at limit 1;
 select p.id into staff_id from public.officer_profiles p where p.role='staff' and p.active and p.auth_user_id is not null and p.deletion_requested_at is null
 and not exists(select 1 from public.publication_requests r where r.author_id=p.id and r.status='pending') order by p.created_at limit 1;
 if admin_id is null or staff_id is null then raise exception 'Verification needs an active admin and staff without a pending request'; end if;
 select * into cfg from public.recruitment_configuration where id;
 doc:=jsonb_set(coalesce(cfg.published_content,cfg.draft_content),'{serverRegion}','"Synthetic rollback verification"');
 if doc is null then raise exception 'Verification requires a configured draft'; end if;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claim.sub',staff_id::text,true);
 select coalesce((select revision from public.officer_configuration_drafts where officer_id=staff_id),0) into draft_revision;
 result:=public.save_officer_configuration_draft(doc,draft_revision,cfg.revision,true,key);
 if public.save_officer_configuration_draft(doc,draft_revision,cfg.revision,true,key)<>result then raise exception 'Duplicate request changed its receipt'; end if;
 if (select published_content is distinct from cfg.published_content or revision<>cfg.revision or recruitment_open is distinct from cfg.recruitment_open from public.recruitment_configuration where id) then raise exception 'Staff request changed live settings'; end if;
 begin
  perform public.save_recruitment_configuration(doc,cfg.revision,'publish');
  raise exception 'Staff directly published settings';
 exception when insufficient_privilege then null; end;
 begin
  perform public.review_publication_request(key,true,cfg.revision,'Synthetic staff bypass');
  raise exception 'Staff reviewed publication';
 exception when insufficient_privilege then null; end;
 begin
  perform public.change_officer_role(staff_id,1,'admin','Synthetic staff elevation');
  raise exception 'Staff elevated its role';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 result:=public.review_publication_request(key,true,cfg.revision,'Synthetic admin review');
 if result<>cfg.revision+1 then raise exception 'Approval did not increment revision'; end if;
 if (select published_content is distinct from doc or recruitment_open from public.recruitment_configuration where id) then raise exception 'Approved snapshot was not published with closed intake'; end if;
 if public.review_publication_request(key,true,cfg.revision,'Synthetic admin review')<>result then raise exception 'Review retry failed'; end if;
 select version into staff_version from public.officer_profiles where id=staff_id;
 perform public.change_officer_role(staff_id,staff_version,'admin','Synthetic rollback promotion');
 if (select role from public.officer_profiles where id=staff_id)<>'admin' then raise exception 'Role assignment failed'; end if;
 execute 'reset role';
 raise notice 'Hosted publication requests, approval, retries, staff denial and role assignment passed; transaction will roll back';
end;
$$;
rollback;
