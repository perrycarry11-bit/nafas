// @ts-nocheck

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_ACCESS = [
  'dashboard',
  'mothers',
  'benefactors',
  'doctors',
  'reports',
  'sms',
  'settings',
  'activities',
  'referrals',
  'communications',
  'cultural',
  'profile',
];

const FULL_ACCESS = [
  'dashboard',
  'mothers',
  'benefactors',
  'doctors',
  'reports',
  'sms',
  'settings',
  'activities',
  'referrals',
  'centers',
  'communications',
  'cultural',
  'profile',
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function usernameToEmail(username: string) {
  const clean = username.trim().toLowerCase();

  if (clean.includes('@')) {
    return clean;
  }

  return `${clean}@nafas.ir`;
}

function normalizeUsername(value: string) {
  return String(value || '').trim().toLowerCase();
}

function isNationalRole(role: string) {
  return (
    role === 'national_admin' ||
    role === 'country_admin' ||
    role === 'super_admin' ||
    role === 'main_admin' ||
    role === 'central_admin'
  );
}

function isProvinceAdminRole(role: string) {
  return role === 'province_admin' || role === 'province_manager';
}

function isCountyRole(role: string) {
  return (
    role === 'province_staff' ||
    role === 'county_user' ||
    role === 'county_staff'
  );
}

function normalizeAccess(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map(item => String(item || '').trim())
    .filter(item => ALLOWED_ACCESS.includes(item));
}

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: 'تنظیمات سرور Supabase کامل نیست.' },
        500,
      );
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return jsonResponse({ error: 'ورود شما معتبر نیست.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const requesterResult = await adminClient.auth.getUser(token);

    if (requesterResult.error || !requesterResult.data.user) {
      return jsonResponse({ error: 'کاربر واردشده معتبر نیست.' }, 401);
    }

    const requesterId = requesterResult.data.user.id;

    const requesterProfileResult = await adminClient
      .from('profiles')
      .select(
        `
        id,
        username,
        full_name,
        role,
        province_id,
        county_id,
        access,
        is_active
      `,
      )
      .eq('id', requesterId)
      .single();

    if (requesterProfileResult.error || !requesterProfileResult.data) {
      return jsonResponse({ error: 'پروفایل کاربر واردشده پیدا نشد.' }, 403);
    }

    const requester = requesterProfileResult.data;

    if (!requester.is_active) {
      return jsonResponse({ error: 'حساب شما غیرفعال است.' }, 403);
    }

    const body = await req.json();

    const rawTargetUserId = String(body.target_user_id || '').trim();

    if (!rawTargetUserId) {
      return jsonResponse({ error: 'کاربر هدف مشخص نیست.' }, 400);
    }

    const targetUserId = rawTargetUserId === 'self'
      ? requester.id
      : rawTargetUserId;

    const hasUsername = hasOwn(body, 'username') && String(body.username || '').trim() !== '';
    const hasPassword = hasOwn(body, 'password') && String(body.password || '').trim() !== '';
    const hasFullName = hasOwn(body, 'full_name') && String(body.full_name || '').trim() !== '';
    const hasAccess = Array.isArray(body.access);
    const hasIsActive = hasOwn(body, 'is_active');

    const requestedUsername = hasUsername
      ? normalizeUsername(body.username)
      : '';

    const requestedPassword = hasPassword
      ? String(body.password || '').trim()
      : '';

    const requestedFullName = hasFullName
      ? String(body.full_name || '').trim()
      : '';

    if (
      !hasUsername &&
      !hasPassword &&
      !hasFullName &&
      !hasAccess &&
      !hasIsActive
    ) {
      return jsonResponse(
        { error: 'هیچ تغییری برای ذخیره ارسال نشده است.' },
        400,
      );
    }

    if (hasUsername && requestedUsername.length < 3) {
      return jsonResponse(
        { error: 'نام کاربری جدید باید حداقل ۳ کاراکتر باشد.' },
        400,
      );
    }

    if (hasPassword && requestedPassword.length < 6) {
      return jsonResponse(
        { error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' },
        400,
      );
    }

    const targetProfileResult = await adminClient
      .from('profiles')
      .select(
        `
        id,
        username,
        full_name,
        role,
        province_id,
        county_id,
        access,
        is_active
      `,
      )
      .eq('id', targetUserId)
      .single();

    if (targetProfileResult.error || !targetProfileResult.data) {
      return jsonResponse({ error: 'کاربر هدف پیدا نشد.' }, 404);
    }

    const target = targetProfileResult.data;

    const isSelfEdit = requester.id === target.id;
    const requesterIsNational = isNationalRole(requester.role);
    const requesterIsProvinceAdmin = isProvinceAdminRole(requester.role);

    let canEdit = false;

    let finalUsername = target.username;
    let finalFullName = target.full_name;
    let finalAccess = Array.isArray(target.access) ? target.access : [];
    let finalIsActive = target.is_active;

    /*
      قوانین امنیتی نهایی:

      1) ویرایش شخصی:
         فقط اطلاعات ورود خودش را تغییر می‌دهد:
         username / password
         role / province_id / county_id / created_by / access / is_active تغییر نمی‌کند.

      2) مدیر کشور:
         فقط مدیر استان‌ها را ویرایش می‌کند.
         استان، نقش، شهرستان، created_by و محدوده کاربر تغییر نمی‌کند.

      3) مدیر استان:
         فقط کاربران شهرستان استان خودش را ویرایش می‌کند.
         province_id، county_id، created_by و نقش کاربر تغییر نمی‌کند.
    */

    if (isSelfEdit) {
      canEdit = true;

      if (hasUsername) {
        finalUsername = requestedUsername;
      }

      finalFullName = target.full_name;
      finalAccess = Array.isArray(target.access) ? target.access : [];
      finalIsActive = target.is_active;
    } else if (requesterIsNational && isProvinceAdminRole(target.role)) {
      canEdit = true;

      if (hasUsername) {
        finalUsername = requestedUsername;
      }

      if (hasFullName) {
        finalFullName = requestedFullName;
      }

      finalAccess = FULL_ACCESS;

      if (hasIsActive) {
        finalIsActive = body.is_active !== false;
      }
    } else if (
      requesterIsProvinceAdmin &&
      isCountyRole(target.role) &&
      target.province_id === requester.province_id
    ) {
      canEdit = true;

      if (hasUsername) {
        finalUsername = requestedUsername;
      }

      if (hasFullName) {
        finalFullName = requestedFullName;
      }

      if (hasAccess) {
        const requestedAccess = normalizeAccess(body.access);

        if (requestedAccess.length === 0) {
          return jsonResponse(
            { error: 'حداقل یک سطح دسترسی برای کاربر شهرستان انتخاب کنید.' },
            400,
          );
        }

        finalAccess = requestedAccess;
      } else {
        finalAccess = Array.isArray(target.access) ? target.access : [];
      }

      if (hasIsActive) {
        finalIsActive = body.is_active !== false;
      }
    }

    if (!canEdit) {
      return jsonResponse(
        { error: 'شما اجازه ویرایش اطلاعات ورود این کاربر را ندارید.' },
        403,
      );
    }

    if (!finalUsername || finalUsername.length < 3) {
      return jsonResponse(
        { error: 'نام کاربری نهایی معتبر نیست.' },
        400,
      );
    }

    if (hasUsername && finalUsername !== target.username) {
      const duplicateProfile = await adminClient
        .from('profiles')
        .select('id')
        .eq('username', finalUsername)
        .neq('id', target.id)
        .maybeSingle();

      if (duplicateProfile.error) {
        return jsonResponse({ error: duplicateProfile.error.message }, 400);
      }

      if (duplicateProfile.data?.id) {
        return jsonResponse(
          { error: 'این نام کاربری قبلاً برای کاربر دیگری ثبت شده است.' },
          409,
        );
      }
    }

    const authUpdatePayload: Record<string, unknown> = {
      user_metadata: {
        username: finalUsername,
        full_name: finalFullName,
        role: target.role,
      },
    };

    if (hasUsername && finalUsername !== target.username) {
      authUpdatePayload.email = usernameToEmail(finalUsername);
      authUpdatePayload.email_confirm = true;
    }

    if (hasPassword) {
      authUpdatePayload.password = requestedPassword;
    }

    const shouldUpdateAuth =
      hasUsername ||
      hasPassword ||
      hasFullName;

    if (shouldUpdateAuth) {
      const authUpdate = await adminClient.auth.admin.updateUserById(
        target.id,
        authUpdatePayload,
      );

      if (authUpdate.error) {
        return jsonResponse(
          {
            error:
              authUpdate.error.message ||
              'خطا در تغییر اطلاعات ورود کاربر.',
          },
          400,
        );
      }
    }

    const profileUpdatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (hasUsername) {
      profileUpdatePayload.username = finalUsername;
    }

    if (!isSelfEdit && hasFullName) {
      profileUpdatePayload.full_name = finalFullName;
    }

    if (!isSelfEdit && hasAccess) {
      profileUpdatePayload.access = finalAccess;
    }

    if (!isSelfEdit && hasIsActive) {
      profileUpdatePayload.is_active = finalIsActive;
    }

    const profileUpdate = await adminClient
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', target.id)
      .select(
        `
        id,
        full_name,
        username,
        role,
        province_id,
        county_id,
        access,
        is_active,
        provinces (
          name,
          code
        ),
        counties (
          name,
          code
        )
      `,
      )
      .single();

    if (profileUpdate.error) {
      return jsonResponse({ error: profileUpdate.error.message }, 400);
    }

    return jsonResponse({
      ok: true,
      message:
        hasUsername && hasPassword
          ? 'نام کاربری و رمز عبور با موفقیت تغییر کرد.'
          : hasUsername
            ? 'نام کاربری با موفقیت تغییر کرد.'
            : hasPassword
              ? 'رمز عبور با موفقیت تغییر کرد.'
              : 'اطلاعات کاربر با موفقیت تغییر کرد.',
      profile: profileUpdate.data,
    });
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطای ناشناخته در ویرایش کاربر',
      },
      500,
    );
  }
});