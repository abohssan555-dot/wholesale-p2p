-- =====================================================================
-- منصة توصيل تجار الجملة — 002: audit logging helpers
-- Run this AFTER 001_core_schema.sql, in the same Supabase project.
-- =====================================================================

-- ---------------------------------------------------------------------
-- log_action(): the only sanctioned way to write into audit_log.
-- security definer => runs with the owner's privileges, so it can
-- insert into audit_log even though no role has direct insert rights
-- on that table (see 001's RLS policies).
-- ---------------------------------------------------------------------
create or replace function public.log_action(
  p_action text,
  p_target_table text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
  values (auth.uid(), p_action, p_target_table, p_target_id, p_metadata);
end;
$$;

-- ---------------------------------------------------------------------
-- Trigger: verification_requests
-- Fires on stage changes so every approval/rejection step is logged
-- automatically — no app code has to remember to call log_action().
-- ---------------------------------------------------------------------
create or replace function public.trg_log_verification_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    perform public.log_action(
      'تقديم طلب اعتماد',
      'verification_requests',
      new.id,
      jsonb_build_object('applicant_type', new.applicant_type, 'stage', new.stage)
    );
  elsif (tg_op = 'UPDATE' and old.stage is distinct from new.stage) then
    perform public.log_action(
      case new.stage
        when 'logistics_review' then 'ترشيح المشرف اللوجستي'
        when 'final_review'     then 'رفع للاعتماد النهائي'
        when 'approved'         then 'اعتماد نهائي'
        when 'rejected'         then 'رفض الطلب'
        else 'تحديث حالة الطلب'
      end,
      'verification_requests',
      new.id,
      jsonb_build_object('from_stage', old.stage, 'to_stage', new.stage,
                          'rejection_reason', new.rejection_reason)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verification_audit on public.verification_requests;
create trigger trg_verification_audit
  after insert or update on public.verification_requests
  for each row execute function public.trg_log_verification_change();

-- ---------------------------------------------------------------------
-- Trigger: user_roles
-- Logs every role assignment/removal (site manager's action per spec).
-- ---------------------------------------------------------------------
create or replace function public.trg_log_role_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    perform public.log_action(
      'تعيين دور',
      'user_roles',
      new.user_id,
      jsonb_build_object('role_id', new.role_id)
    );
  elsif (tg_op = 'DELETE') then
    perform public.log_action(
      'إلغاء دور',
      'user_roles',
      old.user_id,
      jsonb_build_object('role_id', old.role_id)
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_roles_audit on public.user_roles;
create trigger trg_user_roles_audit
  after insert or delete on public.user_roles
  for each row execute function public.trg_log_role_change();

-- ---------------------------------------------------------------------
-- Trigger: profiles.status changes (e.g. suspending an account)
-- ---------------------------------------------------------------------
create or replace function public.trg_log_profile_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (old.status is distinct from new.status) then
    perform public.log_action(
      case new.status
        when 'suspended' then 'تعليق حساب'
        when 'active'    then 'إعادة تفعيل حساب'
        else 'تغيير حالة حساب'
      end,
      'profiles',
      new.id,
      jsonb_build_object('from_status', old.status, 'to_status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_status_audit on public.profiles;
create trigger trg_profile_status_audit
  after update on public.profiles
  for each row execute function public.trg_log_profile_status_change();

-- =====================================================================
-- Quick manual test (optional — run once, then check audit_log table):
--   select public.log_action('اختبار يدوي', null, null, '{"note":"test"}');
-- =====================================================================
