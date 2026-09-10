begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','owner-a@example.com'),
 ('00000000-0000-4000-8000-000000000002','owner-b@example.com'),
 ('00000000-0000-4000-8000-000000000003','client-a@example.com'),
 ('00000000-0000-4000-8000-000000000004','staff-a@example.com');
insert into organizations(id,name,slug) values
 ('10000000-0000-4000-8000-000000000001','Company A','company-a'),
 ('10000000-0000-4000-8000-000000000002','Company B','company-b');
insert into memberships values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','owner'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','owner'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','staff');
insert into clients(id,organization_id,user_id,name,email) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','Client A','client-a@example.com'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',null,'Client B','client-b@example.com'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',null,'Other client A','other-a@example.com');
insert into projects(id,organization_id,client_id,name) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Project A'),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Project B'),
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','Other project A');
insert into milestones(organization_id,project_id,title) select organization_id,id,'Milestone' from projects;
insert into updates(organization_id,project_id,title,body,client_visible) select organization_id,id,'Public update','Progress',true from projects;
insert into updates(organization_id,project_id,title,body,client_visible) select organization_id,id,'Private update','Internal',false from projects;
insert into documents(organization_id,project_id,name,path,kind,client_visible)
 select organization_id,id,'plan.pdf',organization_id::text||'/'||id::text||'/plan.pdf','document',true from projects;
insert into documents(organization_id,project_id,name,path,kind,client_visible)
 select organization_id,id,'photo.png',organization_id::text||'/'||id::text||'/photo.png','photo',true from projects;
insert into documents(organization_id,project_id,name,path,kind,client_visible)
 select organization_id,id,'private.pdf',organization_id::text||'/'||id::text||'/private.pdf','document',false from projects;
insert into storage.objects(bucket_id,name) select 'project-files',path from documents;
insert into messages(organization_id,project_id,sender_id,body) select organization_id,id,'00000000-0000-4000-8000-000000000001','Hello' from projects;
insert into templates(organization_id,title,body) select id,'Template','Message' from organizations;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","email":"owner-a@example.com"}',true);
select is((select count(*)::int from organizations),1,'Owner sees only their organization');
select is((select count(*)::int from clients),2,'Clients isolated by tenant');
select is((select count(*)::int from projects),2,'Projects isolated by tenant');
select is((select count(*)::int from milestones),2,'Milestones isolated by tenant');
select is((select count(*)::int from updates),4,'Updates isolated by tenant');
select is((select count(*)::int from documents where kind='document'),4,'Documents isolated by tenant');
select is((select count(*)::int from documents where kind='photo'),2,'Photos isolated by tenant');
select is((select count(*)::int from messages),2,'Messages isolated by tenant');
select is((select count(*)::int from templates),1,'Templates isolated by tenant');
select is((select count(*)::int from storage.objects),6,'Storage reads isolated by tenant');
select is((select count(*)::int from projects where id='30000000-0000-4000-8000-000000000002'),0,'Forged project route UUID reveals nothing');
select throws_ok($$insert into clients(organization_id,name,email) values('10000000-0000-4000-8000-000000000002','Forged','x@example.com')$$,'42501',null,'Forged tenant insert denied');
select throws_ok($$insert into projects(organization_id,client_id,name) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Forged')$$,'23503',null,'Cross-tenant client assignment denied by composite FK');
select throws_ok($$update projects set organization_id='10000000-0000-4000-8000-000000000002' where id='30000000-0000-4000-8000-000000000001'$$,'P0001',null,'Moving a record into another tenant is denied');
select throws_ok($$insert into messages(organization_id,project_id,sender_id,body) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Spoof')$$,'42501',null,'Message sender spoofing denied');
select throws_ok($$update clients set user_id='00000000-0000-4000-8000-000000000002' where id='20000000-0000-4000-8000-000000000001'$$,'P0001',null,'Client identity cannot be reassigned by payload');
select throws_ok($$insert into storage.objects(bucket_id,name) values('project-files','10000000-0000-4000-8000-000000000002/30000000-0000-4000-8000-000000000002/evil.pdf')$$,'42501',null,'Cross-tenant storage upload denied');
select throws_ok($$insert into storage.objects(bucket_id,name) values('project-files','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000002/evil.pdf')$$,'42501',null,'Mismatched organization and project storage path denied');
select throws_ok($$insert into storage.objects(bucket_id,name) values('project-files','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/../evil.pdf')$$,'42501',null,'Storage path traversal denied');
select lives_ok($$insert into storage.objects(bucket_id,name) values('project-files','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/new.pdf')$$,'Staff can upload into their project');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","email":"client-a@example.com"}',true);
select is((select count(*)::int from clients),1,'Homeowner sees only their client record');
select is((select count(*)::int from projects),1,'Homeowner sees only assigned projects, not same-tenant neighbors');
select is((select count(*)::int from milestones),1,'Homeowner milestones limited to assigned project');
select is((select count(*)::int from updates),1,'Internal updates hidden from homeowner');
select is((select count(*)::int from documents where kind='document'),1,'Private documents hidden from homeowner');
select is((select count(*)::int from documents where kind='photo'),1,'Homeowner sees only assigned project photos');
select is((select count(*)::int from storage.objects),2,'Homeowner cannot fetch private file bodies');
select is((select count(*)::int from templates),0,'Staff message templates hidden from homeowner');
select is((select count(*)::int from memberships),0,'Staff membership list hidden from homeowner');
select is((select count(*)::int from messages),1,'Homeowner conversations limited to assigned project');
select throws_ok($$insert into updates(organization_id,project_id,title,body) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Forged','Update')$$,'42501',null,'Homeowner cannot author contractor updates');
select throws_ok($$insert into messages(organization_id,project_id,body) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','Wrong project')$$,'42501',null,'Homeowner cannot message another client project');
select lives_ok($$insert into messages(organization_id,project_id,body) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Custom homeowner response')$$,'Homeowner can send custom responses');
select throws_ok($$insert into storage.objects(bucket_id,name) values('project-files','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/client.pdf')$$,'42501',null,'Homeowner cannot upload staff files');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","email":"staff-a@example.com"}',true);
select is((select count(*)::int from projects),2,'Staff can manage their company projects');
select throws_ok($$insert into invitations(organization_id,email,role) values('10000000-0000-4000-8000-000000000001','new@example.com','staff')$$,'42501',null,'Staff cannot invite or escalate membership');
select throws_ok($$insert into memberships values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','owner')$$,'42501',null,'Direct owner escalation denied');

reset role;
update clients set archived=true where id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","email":"client-a@example.com"}',true);
select is((select count(*)::int from projects),0,'Archiving a client revokes project access');
select is((select count(*)::int from storage.objects),0,'Archiving a client revokes file access');
select is((select count(*)::int from messages),0,'Archiving a client revokes message access');
reset role;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000005','other-a@example.com');
insert into invitations(organization_id,email,role,client_id) values('10000000-0000-4000-8000-000000000001','other-a@example.com','client','20000000-0000-4000-8000-000000000003');
insert into invitations(organization_id,email,role,created_at) values('10000000-0000-4000-8000-000000000002','other-a@example.com','staff',now()-interval '8 days');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","email":"client-a@example.com"}',true);
select lives_ok($$select accept_invitations()$$,'Nonmatching email can safely check invitations');
select is((select count(*)::int from projects),0,'Nonmatching email cannot claim another invitation');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000005","email":"other-a@example.com"}',true);
select lives_ok($$select accept_invitations()$$,'Matching email can claim a client invitation');
select is((select count(*)::int from projects),1,'Claimed invitation grants only the assigned project');
select is((select count(*)::int from memberships),0,'Expired staff invitation grants no membership');
select lives_ok($$select accept_invitations()$$,'Invitation acceptance is idempotent');
select lives_ok($$select create_organization('New company','new-company')$$,'Organization creation atomically provisions an owner');
select * from finish();
rollback;
