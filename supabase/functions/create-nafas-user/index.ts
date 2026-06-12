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

function makeCountyCode(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\u0600-\u06FFa-z0-9_]/g, '')
    .slice(0, 60);
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

    const userResult = await adminClient.auth.getUser(token);

    if (userResult.error || !userResult.data.user) {
      return jsonResponse({ error: 'کاربر واردشده معتبر نیست.' }, 401);
    }

    const creatorId = userResult.data.user.id;

    const creatorProfileResult = await adminClient
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
      .eq('id', creatorId)
      .single();

    if (creatorProfileResult.error || !creatorProfileResult.data) {
      return jsonResponse({ error: 'پروفایل مدیر پیدا نشد.' }, 403);
    }

    const creator = creatorProfileResult.data;

    if (!creator.is_active) {
      return jsonResponse({ error: 'حساب مدیر غیرفعال است.' }, 403);
    }

    const body = await req.json();

    const fullName = String(body.full_name || '').trim();
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    const requestedRole = String(body.role || 'province_staff').trim();

    const requestedAccess = Array.isArray(body.access) ? body.access : [];
    let access = requestedAccess.filter((item: string) =>
      ALLOWED_ACCESS.includes(item),
    );

    const isActive = body.is_active !== false;

    if (!fullName) {
      return jsonResponse({ error: 'نام کامل را وارد کنید.' }, 400);
    }

    if (!username) {
      return jsonResponse({ error: 'نام کاربری را وارد کنید.' }, 400);
    }

    if (username.length < 3) {
      return jsonResponse(
        { error: 'نام کاربری باید حداقل ۳ کاراکتر باشد.' },
        400,
      );
    }

    if (!password || password.length < 6) {
      return jsonResponse(
        { error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' },
        400,
      );
    }

    if (
      requestedRole !== 'province_admin' &&
      requestedRole !== 'province_staff'
    ) {
      return jsonResponse({ error: 'نقش کاربر معتبر نیست.' }, 400);
    }

    if (
      creator.role !== 'national_admin' &&
      creator.role !== 'province_admin'
    ) {
      return jsonResponse(
        { error: 'شما اجازه ساخت کاربر جدید ندارید.' },
        403,
      );
    }

    /*
      قانون ساخت کاربر:
      مدیر تهران:
        می‌تواند مدیر استان بسازد.
        می‌تواند کاربر شهرستان هم بسازد.

      مدیر استان:
        فقط می‌تواند کاربر شهرستان داخل استان خودش بسازد.
        نمی‌تواند مدیر استان دیگر بسازد.
    */

    if (creator.role === 'province_admin' && requestedRole === 'province_admin') {
      return jsonResponse(
        { error: 'مدیر استان اجازه ساخت مدیر استان دیگر را ندارد.' },
        403,
      );
    }

    let provinceId = String(body.province_id || '').trim();

    if (creator.role === 'province_admin') {
      provinceId = creator.province_id;
    }

    if (!provinceId) {
      return jsonResponse({ error: 'استان مشخص نیست.' }, 400);
    }

    const provinceCheck = await adminClient
      .from('provinces')
      .select('id, name')
      .eq('id', provinceId)
      .single();

    if (provinceCheck.error || !provinceCheck.data) {
      return jsonResponse({ error: 'استان انتخاب‌شده معتبر نیست.' }, 400);
    }

    let countyId: string | null = null;

    if (requestedRole === 'province_staff') {
      const countyIdFromBody = String(body.county_id || '').trim();
      const countyName = String(body.county_name || '').trim();

      countyId = countyIdFromBody || null;

      if (!countyId && countyName) {
        const existingCounty = await adminClient
          .from('counties')
          .select('id')
          .eq('province_id', provinceId)
          .eq('name', countyName)
          .maybeSingle();

        if (existingCounty.error) {
          return jsonResponse({ error: existingCounty.error.message }, 400);
        }

        if (existingCounty.data?.id) {
          countyId = existingCounty.data.id;
        } else {
          const insertedCounty = await adminClient
            .from('counties')
            .insert({
              province_id: provinceId,
              name: countyName,
              code: makeCountyCode(countyName),
              is_active: true,
              created_by: creatorId,
            })
            .select('id')
            .single();

          if (insertedCounty.error) {
            return jsonResponse({ error: insertedCounty.error.message }, 400);
          }

          countyId = insertedCounty.data.id;
        }
      }

      if (!countyId) {
        return jsonResponse(
          { error: 'برای کاربر شهرستان، شهرستان را انتخاب یا وارد کنید.' },
          400,
        );
      }

      const countyCheck = await adminClient
        .from('counties')
        .select('id, province_id')
        .eq('id', countyId)
        .single();

      if (countyCheck.error || !countyCheck.data) {
        return jsonResponse({ error: 'شهرستان معتبر نیست.' }, 400);
      }

      if (countyCheck.data.province_id !== provinceId) {
        return jsonResponse(
          { error: 'این شهرستان متعلق به استان انتخاب‌شده نیست.' },
          400,
        );
      }

      if (access.length === 0) {
        return jsonResponse(
          { error: 'حداقل یک سطح دسترسی برای کاربر شهرستان انتخاب کنید.' },
          400,
        );
      }
    }

    if (requestedRole === 'province_admin') {
      if (creator.role !== 'national_admin') {
        return jsonResponse(
          { error: 'فقط مدیر تهران می‌تواند مدیر استان بسازد.' },
          403,
        );
      }

      countyId = null;

      if (access.length === 0) {
        access = FULL_ACCESS;
      }
    }

    const duplicateProfile = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (duplicateProfile.error) {
      return jsonResponse({ error: duplicateProfile.error.message }, 400);
    }

    if (duplicateProfile.data?.id) {
      return jsonResponse(
        { error: 'این نام کاربری قبلاً ثبت شده است.' },
        409,
      );
    }

    const email = usernameToEmail(username);

    const createdUser = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName,
        role: requestedRole,
      },
    });

    if (createdUser.error || !createdUser.data.user) {
      return jsonResponse(
        { error: createdUser.error?.message || 'ساخت کاربر انجام نشد.' },
        400,
      );
    }

    const newUserId = createdUser.data.user.id;

    const profileInsert = await adminClient
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: fullName,
        username,
        role: requestedRole,
        province_id: provinceId,
        county_id: countyId,
        access,
        is_active: isActive,
        created_by: creatorId,
      })
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

    if (profileInsert.error) {
      await adminClient.auth.admin.deleteUser(newUserId);

      return jsonResponse({ error: profileInsert.error.message }, 400);
    }

    return jsonResponse({
      ok: true,
      message:
        requestedRole === 'province_admin'
          ? 'مدیر استان با موفقیت ساخته شد.'
          : 'کاربر شهرستان با موفقیت ساخته شد.',
      profile: profileInsert.data,
    });
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطای ناشناخته در ساخت کاربر',
      },
      500,
    );
  }
});