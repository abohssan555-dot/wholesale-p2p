-- =====================================================================
-- تسجيل أول مستخدم كـ "مدير الموقع"
-- =====================================================================

insert into public.profiles (id, full_name, status)
values ('3fe49c8c-1409-46d1-bdbf-d4b1a06865bd', 'عبدالهادي', 'active');

insert into public.user_roles (user_id, role_id, assigned_by)
values (
  '3fe49c8c-1409-46d1-bdbf-d4b1a06865bd',
  'site_manager',
  '3fe49c8c-1409-46d1-bdbf-d4b1a06865bd'
);

-- تأكيد سريع: يفترض يرجع صف واحد فيه اسمك والدور
select p.full_name, r.name_ar
from public.profiles p
join public.user_roles ur on ur.user_id = p.id
join public.roles r on r.id = ur.role_id
where p.id = '3fe49c8c-1409-46d1-bdbf-d4b1a06865bd';
