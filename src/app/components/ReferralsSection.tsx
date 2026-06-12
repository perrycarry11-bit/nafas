import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import {
  Plus,
  Search,
  Trash2,
  FileText,
  Building2,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  MapPin,
  Printer,
  Sparkles,
  Wand2,
  Copy,
  CheckCircle2,
  Save,
  Eye,
  EyeOff,
  UserRound,
  ClipboardCheck,
} from 'lucide-react';

import { PageHeader } from './PageHeader';
import { JalaliDatePicker } from './JalaliDatePicker';
import { todayJalali, formatJalaliDisplay, toPersianNumber } from '../utils/jalali';
import { supabase } from '../utils/supabaseClient';
import { getCurrentOnlineUser } from '../utils/onlineAuth';
import nafasLogo from '../../styles/logo.png';

/*
  کلید ChatGPT خودت را اینجا قرار بده.
  مثال:
  const DEFAULT_OPENAI_API_KEY = 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx';
*/
const DEFAULT_OPENAI_API_KEY = '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';

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

type SyncStatus = 'synced' | 'pending' | 'pending_delete' | 'error';

interface Props {
  onBack: () => void;
}

interface Province {
  id: string;
  code: string;
  name: string;
}

interface County {
  id: string;
  province_id: string;
  code: string;
  name: string;
  is_active?: boolean;
}

interface OnlineProfile {
  id: string;
  full_name: string;
  username: string;
  role: 'national_admin' | 'province_admin' | 'province_staff';
  province_id: string | null;
  province_name: string;
  province_code: string;
  county_id?: string | null;
  county_name?: string;
  county_code?: string;
  access: string[];
  is_active: boolean;
}

interface MotherOption {
  id: string;
  province_id: string;
  province_name: string;
  county_id: string;
  county_name: string;
  name: string;
  tracking_code: string;
  national_id: string;
  phone: string;
  status: string;
}

interface DoctorOption {
  id: string;
  province_id: string;
  province_name: string;
  county_id: string;
  county_name: string;
  full_name: string;
  specialty: string;
  phone: string;
}

interface Referral {
  id: string;
  remoteId?: string;
  deviceId: string;

  provinceId: string;
  provinceName: string;
  provinceCode: string;

  countyId: string;
  countyName: string;
  countyCode: string;

  motherId: string;
  motherName: string;
  motherTrackingCode: string;
  motherNationalId: string;
  motherPhone: string;

  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;

  referralType: string;
  recipientTitle: string;
  recipientName: string;
  recipientOrganization: string;
  subject: string;
  body: string;
  issueDate: string;
  validUntil: string;
  status: string;
  notes: string;

  syncStatus: SyncStatus;
  syncError?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

const STORAGE_KEY = 'nafas_referrals';
const DEVICE_ID_KEY = 'nafas_device_id';
const SELECTED_PROVINCE_KEY = 'nafas_referrals_selected_province';
const SELECTED_COUNTY_KEY = 'nafas_referrals_selected_county';

const REFERRAL_SELECT = `
  id,
  local_id,
  device_id,
  province_id,
  county_id,
  mother_id,
  mother_name,
  mother_tracking_code,
  mother_national_id,
  mother_phone,
  doctor_id,
  doctor_name,
  doctor_specialty,
  referral_type,
  recipient_title,
  recipient_name,
  recipient_organization,
  subject,
  body,
  issue_date,
  valid_until,
  status,
  notes,
  client_updated_at,
  deleted_at,
  created_at,
  updated_at,
  provinces (
    name,
    code
  ),
  counties (
    name,
    code
  )
`;

const REFERRAL_TYPES = [
  'پزشکی',
  'زنان و زایمان',
  'سونوگرافی',
  'آزمایشگاه',
  'مشاوره',
  'روانشناسی',
  'مددکاری',
  'حقوقی',
  'حمایتی',
  'دارویی',
  'درمانی',
  'سایر',
];

const REFERRAL_STATUSES = [
  'پیش‌نویس',
  'صادر شده',
  'تحویل شده',
  'انجام شده',
  'لغو شده',
];

const AI_TONES = [
  'رسمی و اداری',
  'رسمی و صمیمی',
  'کوتاه و خلاصه',
  'محترمانه و کامل',
  'پزشکی و دقیق',
];

const PRESET_TEXTS = [
  {
    title: 'معرفی جهت معاینه',
    text: `احتراماً، بدین‌وسیله سرکار خانم {mother} جهت انجام معاینات درمانی و مشاوره‌ای به حضور معرفی می‌گردند.

خواهشمند است دستور فرمایید همکاری لازم در بررسی وضعیت سلامت ایشان و ارائه راهنمایی‌های لازم مبذول گردد.`,
  },
  {
    title: 'بررسی مادر باردار',
    text: `با سلام و احترام

به پیوست، سرکار خانم {mother} از مادران تحت پیگیری مرکز مردمی نفس جهت بررسی وضعیت سلامت مادر و جنین به آن مرکز محترم معرفی می‌گردند.

خواهشمند است همکاری لازم جهت ارائه خدمات تخصصی انجام پذیرد.`,
  },
  {
    title: 'متن رسمی کوتاه',
    text: `با سلام و احترام

بدین‌وسیله سرکار خانم {mother} که تحت پوشش مرکز مردمی نفس می‌باشند، جهت دریافت خدمات مورد نیاز به آن مرکز محترم معرفی می‌گردند.

پیشاپیش از همکاری شما سپاسگزاریم.`,
  },
];

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function getDeviceId() {
  try {
    const saved = localStorage.getItem(DEVICE_ID_KEY);
    if (saved) return saved;

    const next = `device-${makeId()}`;
    localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return `device-${makeId()}`;
  }
}

function getCurrentProfile(): OnlineProfile | null {
  try {
    const raw = localStorage.getItem('nafas_online_profile');
    if (!raw) return null;

    const profile = JSON.parse(raw);

    return {
      ...profile,
      province_id:
        profile.province_id ||
        localStorage.getItem('nafas_current_province_id') ||
        null,
      province_name:
        profile.province_name ||
        localStorage.getItem('nafas_current_province_name') ||
        '',
      province_code:
        profile.province_code ||
        localStorage.getItem('nafas_current_province_code') ||
        '',
      county_id:
        profile.county_id ||
        localStorage.getItem('nafas_current_county_id') ||
        null,
      county_name:
        profile.county_name ||
        localStorage.getItem('nafas_current_county_name') ||
        '',
      county_code:
        profile.county_code ||
        localStorage.getItem('nafas_current_county_code') ||
        '',
    };
  } catch {
    return null;
  }
}

function isNationalAdmin(profile: OnlineProfile | null) {
  return profile?.role === 'national_admin';
}

function isProvinceAdmin(profile: OnlineProfile | null) {
  return profile?.role === 'province_admin';
}

function isCountyUser(profile: OnlineProfile | null) {
  return profile?.role === 'province_staff';
}

function getRelationObject(relation: any) {
  if (!relation) return {};
  if (Array.isArray(relation)) return relation[0] || {};
  return relation || {};
}

function findProvinceName(
  provinceId: string,
  provinces: Province[],
  profile: OnlineProfile | null,
) {
  const found = provinces.find(item => item.id === provinceId);
  if (found) return found.name;
  if (profile?.province_id === provinceId) return profile.province_name || '';
  return '';
}

function findProvinceCode(
  provinceId: string,
  provinces: Province[],
  profile: OnlineProfile | null,
) {
  const found = provinces.find(item => item.id === provinceId);
  if (found) return found.code;
  if (profile?.province_id === provinceId) return profile.province_code || '';
  return '';
}

function findCountyName(
  countyId: string,
  counties: County[],
  profile: OnlineProfile | null,
) {
  const found = counties.find(item => item.id === countyId);
  if (found) return found.name;
  if (profile?.county_id === countyId) return profile.county_name || '';
  return '';
}

function findCountyCode(
  countyId: string,
  counties: County[],
  profile: OnlineProfile | null,
) {
  const found = counties.find(item => item.id === countyId);
  if (found) return found.code;
  if (profile?.county_id === countyId) return profile.county_code || '';
  return '';
}

function getRegisteredByText(item: Referral) {
  if (item.countyName) return `ثبت شده توسط ${item.countyName}`;
  if (item.provinceName) return `ثبت شده توسط ${item.provinceName}`;
  return 'ثبت کننده نامشخص';
}

function getPlaceText(item: Referral) {
  if (item.countyName) return item.countyName;
  if (item.provinceName) return item.provinceName;
  return 'نامشخص';
}

function normalizePhone(value: string) {
  return String(value || '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');
}

function makeReferralNumber(item: Referral) {
  if (item.motherTrackingCode) return item.motherTrackingCode;
  return `REF-${item.id.slice(0, 6).toUpperCase()}`;
}

function safeDate(date: string) {
  if (!date || date === '-') return '-';
  return formatJalaliDisplay(date);
}

function applyPresetText(template: string, item: Referral) {
  return template.replaceAll('{mother}', item.motherName || '................');
}

function buildReferralLocalText(item: Referral, customInstruction = '') {
  const extra = customInstruction.trim()
    ? `\n\nتوضیح تکمیلی:\n${customInstruction.trim()}`
    : '';

  return `با سلام و احترام

بدین‌وسیله سرکار خانم ${item.motherName || '................'} ${
    item.motherNationalId ? `به شماره ملی ${item.motherNationalId}` : ''
  } که تحت پوشش و پیگیری مرکز مردمی نفس ${item.provinceName || ''} ${
    item.countyName ? `- ${item.countyName}` : ''
  } می‌باشند، جهت ${item.referralType || 'دریافت خدمات'} به آن مرکز محترم معرفی می‌گردند.

خواهشمند است دستور فرمایید همکاری لازم در زمینه بررسی، مشاوره و ارائه خدمات مورد نیاز ایشان انجام پذیرد.

پیشاپیش از همکاری ارزشمند شما سپاسگزاریم.

مرکز مردمی نفس${extra}`;
}

function emptyReferral(
  profile: OnlineProfile | null,
  selectedProvinceId: string,
  selectedCountyId: string,
  provinces: Province[],
  counties: County[],
): Referral {
  let provinceId = '';
  let countyId = '';

  if (isNationalAdmin(profile)) {
    provinceId = selectedProvinceId !== 'all' ? selectedProvinceId : '';
    countyId =
      selectedCountyId !== 'all' && selectedCountyId !== 'province'
        ? selectedCountyId
        : '';
  } else if (isProvinceAdmin(profile)) {
    provinceId =
      profile?.province_id ||
      localStorage.getItem('nafas_current_province_id') ||
      '';

    countyId =
      selectedCountyId !== 'all' && selectedCountyId !== 'province'
        ? selectedCountyId
        : '';
  } else {
    provinceId =
      profile?.province_id ||
      localStorage.getItem('nafas_current_province_id') ||
      '';

    countyId =
      profile?.county_id ||
      localStorage.getItem('nafas_current_county_id') ||
      '';
  }

  const provinceName = findProvinceName(provinceId, provinces, profile);
  const provinceCode = findProvinceCode(provinceId, provinces, profile);
  const countyName = countyId ? findCountyName(countyId, counties, profile) : '';
  const countyCode = countyId ? findCountyCode(countyId, counties, profile) : '';

  const base: Referral = {
    id: makeId(),
    remoteId: '',
    deviceId: getDeviceId(),

    provinceId,
    provinceName,
    provinceCode,

    countyId,
    countyName,
    countyCode,

    motherId: '',
    motherName: '',
    motherTrackingCode: '',
    motherNationalId: '',
    motherPhone: '',

    doctorId: '',
    doctorName: '',
    doctorSpecialty: '',

    referralType: 'پزشکی',
    recipientTitle: 'پزشک محترم / مرکز درمانی گرامی',
    recipientName: '',
    recipientOrganization: '',
    subject: 'معرفی‌نامه پزشکی',
    body: '',
    issueDate: todayJalali(),
    validUntil: '',
    status: 'پیش‌نویس',
    notes: '',

    syncStatus: 'pending',
    syncError: '',
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  base.body = buildReferralLocalText(base);
  return base;
}

function normalizeReferral(
  item: any,
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
): Referral {
  const provinceId =
    item.provinceId ||
    item.province_id ||
    (!isNationalAdmin(profile) ? profile?.province_id || '' : '');

  const countyId =
    item.countyId ||
    item.county_id ||
    (isCountyUser(profile) ? profile?.county_id || '' : '');

  const hasRemote = Boolean(item.remoteId || item.remote_id);

  const provinceName =
    item.provinceName ||
    item.province_name ||
    findProvinceName(provinceId, provinces, profile) ||
    '';

  const countyName =
    item.countyName ||
    item.county_name ||
    findCountyName(countyId, counties, profile) ||
    '';

  return {
    id: item.id || item.localId || item.local_id || makeId(),
    remoteId: item.remoteId || item.remote_id || '',
    deviceId: item.deviceId || item.device_id || getDeviceId(),

    provinceId,
    provinceName,
    provinceCode:
      item.provinceCode ||
      item.province_code ||
      findProvinceCode(provinceId, provinces, profile),

    countyId,
    countyName,
    countyCode:
      item.countyCode ||
      item.county_code ||
      findCountyCode(countyId, counties, profile),

    motherId: item.motherId || item.mother_id || '',
    motherName: item.motherName || item.mother_name || '',
    motherTrackingCode: item.motherTrackingCode || item.mother_tracking_code || '',
    motherNationalId: item.motherNationalId || item.mother_national_id || '',
    motherPhone: item.motherPhone || item.mother_phone || '',

    doctorId: item.doctorId || item.doctor_id || '',
    doctorName: item.doctorName || item.doctor_name || '',
    doctorSpecialty: item.doctorSpecialty || item.doctor_specialty || '',

    referralType: item.referralType || item.referral_type || 'پزشکی',
    recipientTitle: item.recipientTitle || item.recipient_title || 'پزشک محترم / مرکز درمانی گرامی',
    recipientName: item.recipientName || item.recipient_name || '',
    recipientOrganization: item.recipientOrganization || item.recipient_organization || '',
    subject: item.subject || 'معرفی‌نامه پزشکی',
    body: item.body || '',
    issueDate: item.issueDate || item.issue_date || todayJalali(),
    validUntil: item.validUntil || item.valid_until || '',
    status: item.status || 'پیش‌نویس',
    notes: item.notes || '',

    syncStatus:
      item.syncStatus ||
      item.sync_status ||
      (hasRemote ? 'synced' : 'pending'),
    syncError: item.syncError || item.sync_error || '',
    updatedAt:
      item.updatedAt ||
      item.updated_at ||
      item.client_updated_at ||
      new Date().toISOString(),
    deletedAt: item.deletedAt || item.deleted_at || null,
  };
}

function remoteToLocal(row: any): Referral {
  const province = getRelationObject(row.provinces);
  const county = getRelationObject(row.counties);

  return {
    id: row.local_id || row.id,
    remoteId: row.id,
    deviceId: row.device_id || getDeviceId(),

    provinceId: row.province_id || '',
    provinceName: province.name || '',
    provinceCode: province.code || '',

    countyId: row.county_id || '',
    countyName: county.name || '',
    countyCode: county.code || '',

    motherId: row.mother_id || '',
    motherName: row.mother_name || '',
    motherTrackingCode: row.mother_tracking_code || '',
    motherNationalId: row.mother_national_id || '',
    motherPhone: row.mother_phone || '',

    doctorId: row.doctor_id || '',
    doctorName: row.doctor_name || '',
    doctorSpecialty: row.doctor_specialty || '',

    referralType: row.referral_type || 'پزشکی',
    recipientTitle: row.recipient_title || 'پزشک محترم / مرکز درمانی گرامی',
    recipientName: row.recipient_name || '',
    recipientOrganization: row.recipient_organization || '',
    subject: row.subject || 'معرفی‌نامه پزشکی',
    body: row.body || '',
    issueDate: row.issue_date || '',
    validUntil: row.valid_until || '',
    status: row.status || 'پیش‌نویس',
    notes: row.notes || '',

    syncStatus: 'synced',
    syncError: '',
    updatedAt: row.client_updated_at || row.updated_at || new Date().toISOString(),
    deletedAt: row.deleted_at || null,
  };
}

function localToPayload(item: Referral, profile: OnlineProfile | null) {
  return {
    local_id: item.id,
    device_id: item.deviceId || getDeviceId(),

    province_id: item.provinceId || null,
    county_id: item.countyId || null,

    mother_id: item.motherId || null,
    mother_name: item.motherName || '',
    mother_tracking_code: item.motherTrackingCode || '',
    mother_national_id: item.motherNationalId || '',
    mother_phone: item.motherPhone || '',

    doctor_id: item.doctorId || null,
    doctor_name: item.doctorName || '',
    doctor_specialty: item.doctorSpecialty || '',

    referral_type: item.referralType || '',
    recipient_title: item.recipientTitle || '',
    recipient_name: item.recipientName || '',
    recipient_organization: item.recipientOrganization || '',
    subject: item.subject || '',
    body: item.body || '',
    issue_date: item.issueDate || '',
    valid_until: item.validUntil || '',
    status: item.status || '',
    notes: item.notes || '',

    created_by: profile?.id || null,
    updated_by: profile?.id || null,
    client_updated_at: item.updatedAt || new Date().toISOString(),
    deleted_at: item.deletedAt || null,
    updated_at: new Date().toISOString(),
  };
}

function getStableKey(item: Referral) {
  return item.remoteId || item.id || `${item.motherName}-${item.issueDate}-${item.subject}` || makeId();
}

function shouldKeepNew(current: Referral, next: Referral) {
  const currentPending =
    current.syncStatus === 'pending' ||
    current.syncStatus === 'pending_delete' ||
    current.syncStatus === 'error';

  const nextPending =
    next.syncStatus === 'pending' ||
    next.syncStatus === 'pending_delete' ||
    next.syncStatus === 'error';

  if (nextPending && !currentPending) return true;
  if (currentPending && !nextPending) return false;

  const currentTime = new Date(current.updatedAt || 0).getTime();
  const nextTime = new Date(next.updatedAt || 0).getTime();

  return nextTime >= currentTime;
}

function dedupeReferrals(items: Referral[]) {
  const map = new Map<string, Referral>();
  const aliasToKey = new Map<string, string>();

  items.forEach(item => {
    if (item.deletedAt) return;

    const scope = item.countyId || item.provinceId || 'unknown';

    const aliases = [
      item.id ? `id:${item.id}` : '',
      item.remoteId ? `remote:${item.remoteId}` : '',
      item.motherName && item.issueDate && item.subject
        ? `natural:${item.motherName}-${item.issueDate}-${item.subject}-${scope}`
        : '',
    ].filter(Boolean);

    let finalKey = '';

    for (const alias of aliases) {
      const found = aliasToKey.get(alias);
      if (found) {
        finalKey = found;
        break;
      }
    }

    if (!finalKey) finalKey = getStableKey(item);

    const current = map.get(finalKey);

    if (!current) {
      map.set(finalKey, item);
    } else if (shouldKeepNew(current, item)) {
      map.set(finalKey, item);
    }

    aliases.forEach(alias => {
      aliasToKey.set(alias, finalKey);
    });
  });

  return Array.from(map.values());
}

function loadItems(
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
): Referral[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    const normalized = data.map(item =>
      normalizeReferral(item, profile, provinces, counties),
    );

    const cleaned = dedupeReferrals(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));

    return cleaned;
  } catch {
    return [];
  }
}

function saveItems(items: Referral[]) {
  try {
    const cleaned = dedupeReferrals(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

function filterByUserScope(items: Referral[], profile: OnlineProfile | null) {
  if (!profile) return [];

  if (isNationalAdmin(profile)) return items;

  if (isProvinceAdmin(profile)) {
    return items.filter(item => item.provinceId === profile.province_id);
  }

  return items.filter(
    item =>
      item.provinceId === profile.province_id &&
      item.countyId === profile.county_id,
  );
}

function applyScopeFilter<T extends { province_id: string; county_id: string }>(
  items: T[],
  profile: OnlineProfile | null,
  selectedProvinceId: string,
  selectedCountyId: string,
) {
  let list = [...items];

  if (!profile) return [];

  if (isNationalAdmin(profile) && selectedProvinceId !== 'all') {
    list = list.filter(item => item.province_id === selectedProvinceId);
  }

  if (isProvinceAdmin(profile)) {
    list = list.filter(item => item.province_id === profile.province_id);
  }

  if ((isNationalAdmin(profile) || isProvinceAdmin(profile)) && selectedCountyId !== 'all') {
    if (selectedCountyId === 'province') {
      list = list.filter(item => !item.county_id);
    } else {
      list = list.filter(item => item.county_id === selectedCountyId);
    }
  }

  if (isCountyUser(profile)) {
    list = list.filter(
      item =>
        item.province_id === profile.province_id &&
        item.county_id === profile.county_id,
    );
  }

  return list;
}

async function fetchProvinces(): Promise<Province[]> {
  const { data, error } = await supabase
    .from('provinces')
    .select('id, code, name')
    .order('name', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchCounties(): Promise<County[]> {
  const { data, error } = await supabase
    .from('counties')
    .select('id, province_id, code, name, is_active')
    .order('name', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchRemoteReferrals(): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select(REFERRAL_SELECT)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data.map(remoteToLocal) : [];
}

async function syncOneReferral(
  item: Referral,
  profile: OnlineProfile | null,
): Promise<Referral> {
  if (!item.provinceId) {
    return {
      ...item,
      syncStatus: 'error',
      syncError: 'استان معرفی‌نامه مشخص نیست.',
    };
  }

  if (item.syncStatus === 'pending_delete') {
    if (item.remoteId) {
      const { error } = await supabase
        .from('referrals')
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: profile?.id || null,
          client_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.remoteId);

      if (error) throw error;
    }

    return {
      ...item,
      deletedAt: new Date().toISOString(),
      syncStatus: 'synced',
      syncError: '',
    };
  }

  const payload = localToPayload(item, profile);

  if (item.remoteId) {
    const { data, error } = await supabase
      .from('referrals')
      .update(payload)
      .eq('id', item.remoteId)
      .select(REFERRAL_SELECT)
      .single();

    if (error) throw error;

    return remoteToLocal(data);
  }

  const { data, error } = await supabase
    .from('referrals')
    .insert(payload)
    .select(REFERRAL_SELECT)
    .single();

  if (error) throw error;

  return remoteToLocal(data);
}

function mergeReferrals(localItems: Referral[], remoteItems: Referral[]) {
  return dedupeReferrals([...remoteItems, ...localItems]).filter(item => !item.deletedAt);
}

function printReferral(item: Referral) {
  const bodyText = item.body || buildReferralLocalText(item);
  const logoSrc = nafasLogo;

  const html = `
  <html dir="rtl" lang="fa">
    <head>
      <title>معرفی‌نامه پزشکی</title>
      <style>
        @font-face {
          font-family: 'NafasPrint';
          src: url('/fonts/Vazirmatn-Regular.woff2') format('woff2');
          font-weight: 400;
        }
        @font-face {
          font-family: 'NafasPrint';
          src: url('/fonts/Vazirmatn-Bold.woff2') format('woff2');
          font-weight: 800;
        }
        @page { size: A4; margin: 18mm; }
        body {
          margin: 0;
          background: #f4fbf9;
          font-family: 'NafasPrint', 'Vazirmatn', 'IRANSansX', Tahoma, Arial, sans-serif;
          color: #102622;
          direction: rtl;
        }
        .sheet {
          width: 180mm;
          min-height: 260mm;
          margin: 0 auto;
          background: white;
          padding: 20mm 18mm;
          box-sizing: border-box;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16mm;
        }
        .meta {
          font-size: 12px;
          line-height: 2.1;
          color: #1f3d38;
          min-width: 45mm;
        }
        .brand {
          text-align: center;
          flex: 1;
        }
        .brand img {
          width: 56px;
          height: 56px;
          object-fit: contain;
          margin-bottom: 6px;
        }
        .brand .name {
          font-weight: 800;
          font-size: 15px;
        }
        .brand .sub {
          font-size: 11px;
          color: #46625d;
          margin-top: 2px;
        }
        .line {
          border-top: 2px solid #1f3d38;
          margin: 8mm 0 12mm;
        }
        h1 {
          text-align: center;
          font-size: 22px;
          margin: 0 0 14mm;
          font-weight: 800;
        }
        .recipient {
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 8mm;
          line-height: 2;
        }
        .body {
          font-size: 15px;
          line-height: 2.35;
          white-space: pre-line;
          text-align: justify;
        }
        .info-box {
          border: 1px solid #dbe9e6;
          border-radius: 12px;
          padding: 10px 14px;
          margin: 10mm 0;
          background: #f8fffd;
          font-size: 13px;
          color: #36534e;
        }
        .footer {
          margin-top: 24mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }
        .stamp {
          text-align: center;
          border: 1px dashed #9ab8b2;
          border-radius: 12px;
          width: 58mm;
          height: 28mm;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6f8a85;
          font-size: 12px;
        }
        .signature {
          text-align: center;
          min-width: 55mm;
          font-size: 13px;
          line-height: 2;
        }
        @media print {
          body { background: white; }
          .sheet { margin: 0; width: auto; min-height: auto; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="top">
          <div class="meta">
            <div>تاریخ: ${item.issueDate || '-'}</div>
            <div>شماره: ${makeReferralNumber(item)}</div>
            <div>پیوست: ${item.notes ? 'دارد' : 'ندارد'}</div>
          </div>

          <div class="brand">
            <img src="${logoSrc}" />
            <div class="name">مرکز مردمی نفس</div>
            <div class="sub">نفس نجات فرزندان سقط</div>
          </div>

          <div style="width:45mm"></div>
        </div>

        <div class="line"></div>

        <h1>${item.subject || 'معرفی‌نامه پزشکی'}</h1>

        <div class="recipient">
          ${item.recipientTitle || 'پزشک محترم / مرکز درمانی گرامی'}
          ${item.recipientName ? `، ${item.recipientName}` : ''}
          ${item.recipientOrganization ? ` / ${item.recipientOrganization}` : ''}
        </div>

        <div class="body">${bodyText.replace(/\n/g, '<br/>')}</div>

        <div class="info-box">
          مادر معرفی‌شده: ${item.motherName || '-'}
          ${item.motherPhone ? ` | تماس: ${item.motherPhone}` : ''}
          ${item.validUntil ? ` | اعتبار تا: ${item.validUntil}` : ''}
        </div>

        <div class="footer">
          <div class="stamp">محل مهر مرکز</div>
          <div class="signature">
            <div>مرکز مردمی نفس</div>
            <div>${item.provinceName || ''} ${item.countyName ? `- ${item.countyName}` : ''}</div>
            <div>امضا و تأیید مسئول مرکز</div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
  </html>
  `;

  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(html);
  win.document.close();
}

export function ReferralsSection({ onBack }: Props) {
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState(() => {
    return localStorage.getItem(SELECTED_PROVINCE_KEY) || 'all';
  });

  const [selectedCountyId, setSelectedCountyId] = useState(() => {
    return localStorage.getItem(SELECTED_COUNTY_KEY) || 'all';
  });

  const [view, setView] = useState<'list' | 'form'>('list');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [editing, setEditing] = useState<Referral | null>(null);
  const [search, setSearch] = useState('');

  const [motherOptions, setMotherOptions] = useState<MotherOption[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('وضعیت همگام‌سازی آماده است.');

  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const openaiApiKey = DEFAULT_OPENAI_API_KEY;

  const [aiModel, setAiModel] = useState(
    () => localStorage.getItem('nafas_referral_openai_model') || DEFAULT_OPENAI_MODEL,
  );
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiSettingsSaved, setAiSettingsSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiCopied, setAiCopied] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiTone, setAiTone] = useState('رسمی و اداری');

  const national = isNationalAdmin(profile);
  const provinceAdmin = isProvinceAdmin(profile);
  const countyUser = isCountyUser(profile);

  useEffect(() => {
    async function init() {
      let currentProfile = getCurrentProfile();

      try {
        if (navigator.onLine) {
          const fresh = await getCurrentOnlineUser();
          if (fresh) currentProfile = fresh as any;
        }
      } catch {
        // fallback local profile
      }

      currentProfile = currentProfile
        ? {
            ...currentProfile,
            province_id:
              currentProfile.province_id ||
              localStorage.getItem('nafas_current_province_id') ||
              null,
            province_name:
              currentProfile.province_name ||
              localStorage.getItem('nafas_current_province_name') ||
              '',
            province_code:
              currentProfile.province_code ||
              localStorage.getItem('nafas_current_province_code') ||
              '',
            county_id:
              currentProfile.county_id ||
              localStorage.getItem('nafas_current_county_id') ||
              null,
            county_name:
              currentProfile.county_name ||
              localStorage.getItem('nafas_current_county_name') ||
              '',
            county_code:
              currentProfile.county_code ||
              localStorage.getItem('nafas_current_county_code') ||
              '',
          }
        : null;

      setProfile(currentProfile);

      if (currentProfile?.role === 'province_admin') {
        setSelectedProvinceId(currentProfile.province_id || 'all');
      }

      if (currentProfile?.role === 'province_staff') {
        setSelectedProvinceId(currentProfile.province_id || 'all');
        setSelectedCountyId(currentProfile.county_id || 'all');
      }

      try {
        const provinceList = await fetchProvinces();
        const countyList = await fetchCounties();

        setProvinces(provinceList);
        setCounties(countyList);

        const local = filterByUserScope(
          loadItems(currentProfile, provinceList, countyList),
          currentProfile,
        );

        setReferrals(dedupeReferrals(local));

        await loadReferenceOptions(currentProfile, provinceList, countyList);

        if (navigator.onLine) {
          await syncAndReload(local, currentProfile);
        }
      } catch (error: any) {
        const local = filterByUserScope(
          loadItems(currentProfile, [], []),
          currentProfile,
        );

        setReferrals(dedupeReferrals(local));
        setSyncMessage(error?.message || 'خطا در دریافت اطلاعات آنلاین');
      }
    }

    init();
  }, []);

  useEffect(() => {
    localStorage.setItem(SELECTED_PROVINCE_KEY, selectedProvinceId);
  }, [selectedProvinceId]);

  useEffect(() => {
    localStorage.setItem(SELECTED_COUNTY_KEY, selectedCountyId);
  }, [selectedCountyId]);

  useEffect(() => {
    if (profile) {
      loadReferenceOptions(profile, provinces, counties);
    }
  }, [profile, selectedProvinceId, selectedCountyId]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadReferenceOptions(
    currentProfile = profile,
    provinceList = provinces,
    countyList = counties,
  ) {
    if (!currentProfile) return;

    try {
      const [mothersResult, doctorsResult] = await Promise.all([
        supabase
          .from('mothers')
          .select(
            `
            id,
            province_id,
            county_id,
            tracking_code,
            first_name,
            last_name,
            national_id,
            phone,
            pregnancy_status,
            deleted_at,
            provinces ( name, code ),
            counties ( name, code )
          `,
          )
          .is('deleted_at', null)
          .order('updated_at', { ascending: false }),

        supabase
          .from('doctors')
          .select(
            `
            id,
            province_id,
            county_id,
            full_name,
            specialty,
            phone,
            deleted_at,
            provinces ( name, code ),
            counties ( name, code )
          `,
          )
          .is('deleted_at', null)
          .order('updated_at', { ascending: false }),
      ]);

      if (mothersResult.error) throw mothersResult.error;
      if (doctorsResult.error) throw doctorsResult.error;

      const scopedMothers = applyScopeFilter(
        (Array.isArray(mothersResult.data) ? mothersResult.data : []).map((row: any) => ({
          ...row,
          province_id: row.province_id || '',
          county_id: row.county_id || '',
        })),
        currentProfile,
        selectedProvinceId,
        selectedCountyId,
      );

      const scopedDoctors = applyScopeFilter(
        (Array.isArray(doctorsResult.data) ? doctorsResult.data : []).map((row: any) => ({
          ...row,
          province_id: row.province_id || '',
          county_id: row.county_id || '',
        })),
        currentProfile,
        selectedProvinceId,
        selectedCountyId,
      );

      setMotherOptions(
        scopedMothers.map((row: any) => {
          const province = getRelationObject(row.provinces);
          const county = getRelationObject(row.counties);

          return {
            id: row.id,
            province_id: row.province_id || '',
            province_name:
              province.name ||
              findProvinceName(row.province_id || '', provinceList, currentProfile),
            county_id: row.county_id || '',
            county_name:
              county.name ||
              findCountyName(row.county_id || '', countyList, currentProfile),
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'بدون نام',
            tracking_code: row.tracking_code || '',
            national_id: row.national_id || '',
            phone: row.phone || '',
            status: row.pregnancy_status || '',
          };
        }),
      );

      setDoctorOptions(
        scopedDoctors.map((row: any) => {
          const province = getRelationObject(row.provinces);
          const county = getRelationObject(row.counties);

          return {
            id: row.id,
            province_id: row.province_id || '',
            province_name:
              province.name ||
              findProvinceName(row.province_id || '', provinceList, currentProfile),
            county_id: row.county_id || '',
            county_name:
              county.name ||
              findCountyName(row.county_id || '', countyList, currentProfile),
            full_name: row.full_name || 'بدون نام',
            specialty: row.specialty || '',
            phone: row.phone || '',
          };
        }),
      );
    } catch (error: any) {
      setSyncMessage(error?.message || 'خطا در دریافت لیست مادران و پزشکان');
    }
  }

  async function syncAndReload(
    baseItems = referrals,
    currentProfile = profile,
  ) {
    try {
      setSyncing(true);
      setSyncMessage('در حال همگام‌سازی معرفی‌نامه‌ها...');

      let next = dedupeReferrals([...baseItems]);

      for (let i = 0; i < next.length; i++) {
        if (
          next[i].syncStatus === 'pending' ||
          next[i].syncStatus === 'pending_delete' ||
          next[i].syncStatus === 'error'
        ) {
          try {
            next[i] = await syncOneReferral(next[i], currentProfile);
          } catch (error: any) {
            next[i] = {
              ...next[i],
              syncStatus: 'error',
              syncError: error?.message || 'خطا در همگام‌سازی',
            };
          }
        }
      }

      const remote = await fetchRemoteReferrals();

      const merged = filterByUserScope(
        mergeReferrals(next, remote),
        currentProfile,
      );

      const cleaned = dedupeReferrals(merged);

      setReferrals(cleaned);
      saveItems(cleaned);

      setSyncMessage('معرفی‌نامه‌ها با سرور مرکزی همگام شدند.');
    } catch (error: any) {
      setSyncMessage(error?.message || 'خطا در همگام‌سازی معرفی‌نامه‌ها');
    } finally {
      setSyncing(false);
    }
  }

  const countyOptions = useMemo(() => {
    if (national) {
      if (selectedProvinceId === 'all') return counties;
      return counties.filter(item => item.province_id === selectedProvinceId);
    }

    if (profile?.province_id) {
      return counties.filter(item => item.province_id === profile.province_id);
    }

    return counties;
  }, [counties, national, selectedProvinceId, profile]);

  const visibleReferrals = useMemo(() => {
    let list = filterByUserScope(dedupeReferrals(referrals), profile);

    if (national && selectedProvinceId !== 'all') {
      list = list.filter(item => item.provinceId === selectedProvinceId);
    }

    if ((national || provinceAdmin) && selectedCountyId !== 'all') {
      if (selectedCountyId === 'province') {
        list = list.filter(item => !item.countyId);
      } else {
        list = list.filter(item => item.countyId === selectedCountyId);
      }
    }

    if (countyUser && profile?.county_id) {
      list = list.filter(item => item.countyId === profile.county_id);
    }

    if (search.trim()) {
      list = list.filter(item => {
        const text = [
          item.motherName,
          item.motherTrackingCode,
          item.motherNationalId,
          item.doctorName,
          item.doctorSpecialty,
          item.referralType,
          item.recipientName,
          item.recipientOrganization,
          item.subject,
          item.issueDate,
          item.status,
          item.provinceName,
          item.countyName,
          getRegisteredByText(item),
        ].join(' ');

        return text.includes(search.trim());
      });
    }

    return dedupeReferrals(list);
  }, [
    referrals,
    profile,
    national,
    provinceAdmin,
    countyUser,
    selectedProvinceId,
    selectedCountyId,
    search,
  ]);

  const countySummary = useMemo(() => {
    const map = new Map<string, { key: string; name: string; count: number }>();

    visibleReferrals.forEach(item => {
      const key = item.countyId || `province:${item.provinceId || 'unknown'}`;
      const name = item.countyName || item.provinceName || 'نامشخص';

      const current =
        map.get(key) ||
        {
          key,
          name,
          count: 0,
        };

      current.count += 1;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visibleReferrals]);

  const issuedCount = visibleReferrals.filter(item => item.status === 'صادر شده').length;
  const doneCount = visibleReferrals.filter(item => item.status === 'انجام شده').length;
  const pendingCount = referrals.filter(item => item.syncStatus !== 'synced').length;

  function updateList(next: Referral[]) {
    const cleaned = dedupeReferrals(next);
    setReferrals(cleaned);
    saveItems(cleaned);
  }

  function handleManualSync() {
    if (!navigator.onLine) {
      setSyncMessage('اینترنت قطع است؛ اطلاعات روی سیستم ذخیره شده است.');
      return;
    }

    syncAndReload();
  }

  function openNew() {
    if (national && selectedProvinceId === 'all') {
      alert('برای ثبت معرفی‌نامه توسط تهران، ابتدا استان را انتخاب کنید.');
      return;
    }

    if (countyUser) {
      const countyId =
        profile?.county_id ||
        localStorage.getItem('nafas_current_county_id') ||
        '';

      if (!countyId) {
        alert('شهرستان کاربر مشخص نیست. یک بار خارج شوید و دوباره آنلاین وارد شوید.');
        return;
      }
    }

    const item = emptyReferral(
      profile,
      selectedProvinceId,
      selectedCountyId,
      provinces,
      counties,
    );

    setEditing(item);
    setAiResult('');
    setAiError('');
    setAiInstruction('');
    setView('form');
  }

  function openEdit(item: Referral) {
    setEditing({ ...item });
    setAiResult('');
    setAiError('');
    setAiInstruction('');
    setView('form');
  }

  async function saveReferral() {
    if (!editing) return;

    let provinceId = editing.provinceId || '';
    let countyId = editing.countyId || '';

    if (countyUser) {
      provinceId =
        profile?.province_id ||
        localStorage.getItem('nafas_current_province_id') ||
        '';

      countyId =
        profile?.county_id ||
        localStorage.getItem('nafas_current_county_id') ||
        '';
    }

    if (provinceAdmin) {
      provinceId =
        profile?.province_id ||
        localStorage.getItem('nafas_current_province_id') ||
        '';
    }

    if (!provinceId) {
      alert('استان معرفی‌نامه مشخص نیست.');
      return;
    }

    if (!editing.motherName.trim()) {
      alert('لطفاً مادر مربوط به معرفی‌نامه را انتخاب یا وارد کنید.');
      return;
    }

    const provinceName =
      findProvinceName(provinceId, provinces, profile) ||
      profile?.province_name ||
      '';

    const provinceCode =
      findProvinceCode(provinceId, provinces, profile) ||
      profile?.province_code ||
      '';

    const countyName = countyId ? findCountyName(countyId, counties, profile) : '';
    const countyCode = countyId ? findCountyCode(countyId, counties, profile) : '';

    const item: Referral = {
      ...editing,

      provinceId,
      provinceName,
      provinceCode,

      countyId,
      countyName,
      countyCode,

      motherPhone: normalizePhone(editing.motherPhone),

      body: editing.body || buildReferralLocalText(editing),

      syncStatus: 'pending',
      syncError: '',
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deviceId: editing.deviceId || getDeviceId(),
    };

    let next = referrals.some(r => r.id === item.id)
      ? referrals.map(r => (r.id === item.id ? item : r))
      : [...referrals, item];

    next = dedupeReferrals(next);

    updateList(next);
    setEditing(null);
    setView('list');

    if (navigator.onLine) {
      try {
        setSyncing(true);

        const synced = await syncOneReferral(item, profile);

        next = next.map(r => (r.id === item.id ? synced : r));
        next = dedupeReferrals(next);

        updateList(next);
        setSyncMessage('معرفی‌نامه ذخیره و آنلاین شد.');
      } catch (error: any) {
        setSyncMessage(error?.message || 'معرفی‌نامه محلی ذخیره شد اما آنلاین نشد.');
      } finally {
        setSyncing(false);
      }
    } else {
      setSyncMessage('معرفی‌نامه روی سیستم ذخیره شد و بعد از اتصال اینترنت سینک می‌شود.');
    }
  }

  async function deleteReferral(item: Referral) {
    const confirmed = confirm('آیا از حذف این معرفی‌نامه مطمئن هستید؟');

    if (!confirmed) return;

    let next: Referral[];

    if (item.remoteId) {
      next = referrals.map(referral =>
        referral.id === item.id
          ? {
              ...referral,
              syncStatus: 'pending_delete',
              deletedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : referral,
      );
    } else {
      next = referrals.filter(referral => referral.id !== item.id);
    }

    updateList(next);

    if (navigator.onLine) {
      await syncAndReload(next);
    } else {
      setSyncMessage('حذف معرفی‌نامه روی سیستم ثبت شد و بعد از اتصال اینترنت سینک می‌شود.');
    }
  }

  function selectMother(motherId: string) {
    if (!editing) return;

    const mother = motherOptions.find(item => item.id === motherId);

    if (!mother) {
      setEditing({
        ...editing,
        motherId: '',
        motherName: '',
        motherTrackingCode: '',
        motherNationalId: '',
        motherPhone: '',
      });
      return;
    }

    const next: Referral = {
      ...editing,

      provinceId: mother.province_id || editing.provinceId,
      provinceName: mother.province_name || editing.provinceName,

      countyId: mother.county_id || editing.countyId,
      countyName: mother.county_name || editing.countyName,

      motherId: mother.id,
      motherName: mother.name,
      motherTrackingCode: mother.tracking_code,
      motherNationalId: mother.national_id,
      motherPhone: mother.phone,
    };

    next.body =
      !editing.body || editing.body.includes('................')
        ? buildReferralLocalText(next)
        : editing.body;

    setEditing(next);
  }

  function selectDoctor(doctorId: string) {
    if (!editing) return;

    const doctor = doctorOptions.find(item => item.id === doctorId);

    if (!doctor) {
      setEditing({
        ...editing,
        doctorId: '',
        doctorName: '',
        doctorSpecialty: '',
      });
      return;
    }

    setEditing({
      ...editing,
      doctorId: doctor.id,
      doctorName: doctor.full_name,
      doctorSpecialty: doctor.specialty,
      recipientName: doctor.full_name,
      recipientOrganization: doctor.specialty || editing.recipientOrganization,
      recipientTitle: 'پزشک محترم / مرکز درمانی گرامی',
    });
  }

  function handleSaveAISettings() {
    localStorage.setItem('nafas_referral_openai_model', aiModel);

    setAiSettingsSaved(true);
    setTimeout(() => setAiSettingsSaved(false), 2000);
  }

  async function generateReferralAIText() {
    if (!editing) return;

    setAiError('');
    setAiCopied(false);
    setAiLoading(true);

    const localText = buildReferralLocalText(editing, aiInstruction);

    if (!openaiApiKey.trim() || openaiApiKey.includes('اینجا کلید')) {
      setAiResult(localText);
      setAiLoading(false);
      return;
    }

    const prompt = `
یک متن معرفی‌نامه رسمی فارسی برای مرکز مردمی نفس بنویس.

اطلاعات فرم:
نام مادر: ${editing.motherName || 'نامشخص'}
کد پرونده: ${editing.motherTrackingCode || 'نامشخص'}
کد ملی: ${editing.motherNationalId || 'نامشخص'}
نوع معرفی‌نامه: ${editing.referralType}
گیرنده: ${editing.recipientTitle} ${editing.recipientName}
مرکز / سازمان گیرنده: ${editing.recipientOrganization || 'نامشخص'}
استان ثبت‌کننده: ${editing.provinceName || 'نامشخص'}
شهرستان ثبت‌کننده: ${editing.countyName || 'خود استان'}
موضوع: ${editing.subject}
توضیحات داخلی فرم: ${editing.notes || 'ندارد'}

درخواست اختصاصی کاربر:
${aiInstruction || 'درخواست خاصی ثبت نشده است.'}

لحن مورد نظر:
${aiTone}

قوانین:
- متن رسمی، انسانی و مناسب چاپ باشد.
- متن برای بدنه معرفی‌نامه باشد، نه کل نامه.
- از عبارت‌های دقیق و محترمانه استفاده کن.
- اگر کاربر توضیح خاصی داده، همان را محور متن قرار بده.
- از واژه‌های حساس یا توضیحات پزشکی غیرضروری استفاده نکن.
- متن خیلی طولانی نشود.
- فقط متن نهایی بدنه معرفی‌نامه را بده.
`;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel || DEFAULT_OPENAI_MODEL,
          instructions:
            'تو دستیار فارسی برای نگارش معرفی‌نامه‌های رسمی، اداری، انسانی و مناسب چاپ برای مرکز حمایتی مادران هستی.',
          input: prompt,
          max_output_tokens: 650,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'خطا در پاسخ ChatGPT');
      }

      const outputText =
        data?.output_text ||
        data?.output
          ?.flatMap((item: any) => item.content || [])
          ?.map((content: any) => content.text || '')
          ?.join('')
          ?.trim() ||
        '';

      if (!outputText) {
        throw new Error('متنی از ChatGPT دریافت نشد.');
      }

      setAiResult(outputText.trim());
    } catch (error: any) {
      console.error(error);
      setAiError(error?.message || 'اتصال به ChatGPT انجام نشد؛ متن پیشنهادی آفلاین ساخته شد.');
      setAiResult(localText);
    } finally {
      setAiLoading(false);
    }
  }

  function useAIText() {
    if (!editing || !aiResult.trim()) return;

    setEditing({
      ...editing,
      body: aiResult.trim(),
    });
  }

  async function copyAIText() {
    if (!aiResult.trim()) return;

    try {
      await navigator.clipboard.writeText(aiResult);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 1800);
    } catch {
      setAiCopied(false);
    }
  }

  function goBackDashboard() {
    saveItems(referrals);
    onBack();
  }

  if (view === 'form' && editing) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title="صدور معرفی‌نامه پزشکی"
          onBack={() => setView('list')}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printReferral(editing)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground flex items-center gap-2"
              >
                <Printer size={15} />
                چاپ معرفی‌نامه
              </button>

              <button type="button" onClick={saveReferral} className="btn-primary">
                ذخیره معرفی‌نامه
              </button>
            </div>
          }
        />

        <div className="p-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7">
              <ReferralPreview item={editing} />
            </div>

            <div className="xl:col-span-5 space-y-5">
              <ReferralControlPanel
                referral={editing}
                setReferral={setEditing}
                provinces={provinces}
                counties={counties}
                motherOptions={motherOptions}
                doctorOptions={doctorOptions}
                national={national}
                provinceAdmin={provinceAdmin}
                profile={profile}
                selectMother={selectMother}
                selectDoctor={selectDoctor}
              />

              <PresetTexts
                referral={editing}
                setReferral={setEditing}
              />

              <ReferralAIBox
                openaiApiKey={openaiApiKey}
                aiModel={aiModel}
                setAiModel={setAiModel}
                showAiKey={showAiKey}
                setShowAiKey={setShowAiKey}
                aiSettingsSaved={aiSettingsSaved}
                handleSaveAISettings={handleSaveAISettings}
                aiLoading={aiLoading}
                generateReferralAIText={generateReferralAIText}
                aiError={aiError}
                aiResult={aiResult}
                setAiResult={setAiResult}
                useAIText={useAIText}
                copyAIText={copyAIText}
                aiCopied={aiCopied}
                aiInstruction={aiInstruction}
                setAiInstruction={setAiInstruction}
                aiTone={aiTone}
                setAiTone={setAiTone}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader
        title="معرفی‌نامه‌ها"
        onBack={goBackDashboard}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              type="button"
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:border-primary/40 flex items-center gap-2"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              همگام‌سازی
            </button>

            <button
              type="button"
              onClick={openNew}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} />
              ثبت معرفی‌نامه جدید
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            className={`rounded-2xl border px-4 py-3 text-xs font-bold flex items-center gap-2 ${
              isOnline
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isOnline
              ? 'آنلاین - اتصال به سرور مرکزی برقرار است'
              : 'آفلاین - تغییرات بعداً سینک می‌شود'}
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {national
              ? 'مدیر تهران: مشاهده همه معرفی‌نامه‌های کشور'
              : provinceAdmin
                ? `مدیر استان: ${profile?.province_name || 'نامشخص'}`
                : `کاربر شهرستان: ${profile?.county_name || 'نامشخص'}`}
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {syncMessage}
          </div>
        </div>

        {(national || provinceAdmin) && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {national && (
              <div>
                <label className="block text-xs text-muted-foreground mb-2 font-bold">
                  فیلتر استان
                </label>

                <select
                  value={selectedProvinceId}
                  onChange={e => {
                    setSelectedProvinceId(e.target.value);
                    setSelectedCountyId('all');
                  }}
                  className="form-input"
                >
                  <option value="all">همه کشور / همه استان‌ها</option>

                  {provinces.map(province => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-bold">
                فیلتر شهرستان / ثبت‌شده توسط
              </label>

              <select
                value={selectedCountyId}
                onChange={e => setSelectedCountyId(e.target.value)}
                className="form-input"
              >
                <option value="all">همه شهرستان‌ها و خود استان</option>
                <option value="province">ثبت‌شده توسط خود استان</option>

                {countyOptions.map(county => (
                  <option key={county.id} value={county.id}>
                    ثبت شده توسط {county.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {(national || provinceAdmin) && countySummary.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            {countySummary.slice(0, 8).map(item => (
              <div
                key={item.key}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 text-primary mb-2">
                  <MapPin size={16} />
                  <span className="text-xs font-bold">
                    ثبت شده توسط {item.name}
                  </span>
                </div>

                <p className="text-2xl font-extrabold text-foreground">
                  {toPersianNumber(item.count)}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  معرفی‌نامه ثبت‌شده
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <StatCard title="کل معرفی‌نامه‌ها" value={visibleReferrals.length} icon={<FileText size={20} />} />
          <StatCard title="صادر شده" value={issuedCount} icon={<CheckCircle2 size={20} />} />
          <StatCard title="انجام شده" value={doneCount} icon={<UserRound size={20} />} />
          <StatCard title="در انتظار سینک" value={pendingCount} icon={<CloudOff size={20} />} />
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام مادر، کد پرونده، نوع معرفی‌نامه، پزشک، استان، شهرستان یا عبارت ثبت شده توسط..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1300px]">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    'مادر',
                    'ثبت‌شده توسط',
                    'استان',
                    'شهرستان / مرکز',
                    'نوع',
                    'گیرنده',
                    'موضوع',
                    'تاریخ صدور',
                    'وضعیت',
                    'سینک',
                    'عملیات',
                  ].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-right text-muted-foreground font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleReferrals.map((item, index) => (
                  <tr
                    key={`${item.id}-${item.remoteId || 'local'}`}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      index % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">
                        {item.motherName || 'بدون نام'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                        {item.motherTrackingCode || '-'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold">
                        <Building2 size={12} />
                        {getRegisteredByText(item)}
                      </span>
                    </td>

                    <td className="px-4 py-3">{item.provinceName || '-'}</td>
                    <td className="px-4 py-3">{getPlaceText(item)}</td>
                    <td className="px-4 py-3">{item.referralType}</td>
                    <td className="px-4 py-3">
                      {item.recipientName || item.recipientOrganization || '-'}
                    </td>
                    <td className="px-4 py-3">{item.subject || '-'}</td>
                    <td className="px-4 py-3">{safeDate(item.issueDate)}</td>
                    <td className="px-4 py-3">{item.status}</td>

                    <td className="px-4 py-3">
                      <SyncBadge item={item} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="text-primary hover:underline text-xs"
                        >
                          مشاهده / ویرایش
                        </button>

                        <button
                          type="button"
                          onClick={() => printReferral(item)}
                          className="text-emerald-600 hover:underline text-xs flex items-center gap-1"
                        >
                          <Printer size={13} />
                          چاپ
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteReferral(item)}
                          className="text-destructive hover:underline text-xs flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {visibleReferrals.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      موردی یافت نشد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferralPreview({ item }: { item: Referral }) {
  const body = item.body || buildReferralLocalText(item);

  return (
    <div className="sticky top-24">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-foreground font-extrabold">
            پیش‌نمایش معرفی‌نامه
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            هر تغییری در فرم سمت راست بدهید، همین‌جا دیده می‌شود.
          </p>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
          <FileText size={13} />
          A4
        </span>
      </div>

      <div
        className="bg-white rounded-[2rem] shadow-2xl shadow-primary/10 border border-border p-5 md:p-8 overflow-hidden"
        style={{ fontFamily: 'Vazirmatn, IRANSansX, Tahoma, Arial, sans-serif' }}
      >
        <div className="mx-auto bg-white text-[#132724] border border-[#e4efec] shadow-lg rounded-2xl max-w-[720px] min-h-[900px] p-10 relative">
          <div className="flex items-start justify-between">
            <div className="text-xs leading-7 text-[#264942] min-w-[140px]">
              <div>تاریخ: {safeDate(item.issueDate)}</div>
              <div>شماره: {makeReferralNumber(item)}</div>
              <div>پیوست: {item.notes ? 'دارد' : 'ندارد'}</div>
            </div>

            <div className="text-center">
              <img
                src={nafasLogo}
                alt="لوگو نفس"
                className="w-16 h-16 object-contain mx-auto mb-2"
              />
              <div className="font-extrabold text-sm">مرکز مردمی نفس</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                نفس نجات فرزندان سقط
              </div>
            </div>

            <div className="min-w-[140px]" />
          </div>

          <div className="border-t-2 border-[#173f39] mt-8 mb-10" />

          <h1 className="text-center text-2xl font-black mb-10 text-[#172b27]">
            {item.subject || 'معرفی‌نامه پزشکی'}
          </h1>

          <div className="text-[16px] leading-9 font-bold mb-7 text-[#152b27]">
            {item.recipientTitle || 'پزشک محترم / مرکز درمانی گرامی'}
            {item.recipientName ? `، ${item.recipientName}` : ''}
            {item.recipientOrganization ? ` / ${item.recipientOrganization}` : ''}
          </div>

          <div className="text-[15px] leading-[2.35rem] text-justify whitespace-pre-line">
            {body}
          </div>

          <div className="mt-10 rounded-2xl border border-[#d7e8e4] bg-[#f8fffd] p-4 text-sm leading-7 text-[#36534e]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="font-bold">مادر معرفی‌شده:</span>{' '}
                {item.motherName || '-'}
              </div>

              <div>
                <span className="font-bold">شماره تماس:</span>{' '}
                {toPersianNumber(item.motherPhone || '-')}
              </div>

              <div>
                <span className="font-bold">نوع معرفی‌نامه:</span>{' '}
                {item.referralType || '-'}
              </div>

              <div>
                <span className="font-bold">اعتبار تا:</span>{' '}
                {safeDate(item.validUntil)}
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between gap-8">
            <div className="w-48 h-24 rounded-2xl border border-dashed border-[#9ab8b2] flex items-center justify-center text-xs text-[#71908a]">
              محل مهر مرکز
            </div>

            <div className="text-center text-sm leading-8 min-w-[200px]">
              <div className="font-bold">مرکز مردمی نفس</div>
              <div>
                {item.provinceName || ''}
                {item.countyName ? ` - ${item.countyName}` : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                امضا و تأیید مسئول مرکز
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ReferralControlPanel({
  referral,
  setReferral,
  provinces,
  counties,
  motherOptions,
  doctorOptions,
  national,
  provinceAdmin,
  profile,
  selectMother,
  selectDoctor,
}: {
  referral: Referral;
  setReferral: Dispatch<SetStateAction<Referral | null>>;
  provinces: Province[];
  counties: County[];
  motherOptions: MotherOption[];
  doctorOptions: DoctorOption[];
  national: boolean;
  provinceAdmin: boolean;
  profile: OnlineProfile | null;
  selectMother: (motherId: string) => void;
  selectDoctor: (doctorId: string) => void;
}) {
  const update = (patch: Partial<Referral>) => {
    setReferral(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const updateProvince = (provinceId: string) => {
    const province = provinces.find(p => p.id === provinceId);

    update({
      provinceId,
      provinceName: province?.name || '',
      provinceCode: province?.code || '',
      countyId: '',
      countyName: '',
      countyCode: '',
    });
  };

  const updateCounty = (countyId: string) => {
    const county = counties.find(c => c.id === countyId);

    update({
      countyId,
      countyName: county?.name || '',
      countyCode: county?.code || '',
    });
  };

  const availableCounties = counties.filter(county => {
    if (national) {
      return referral.provinceId
        ? county.province_id === referral.provinceId
        : true;
    }

    return profile?.province_id
      ? county.province_id === profile.province_id
      : true;
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <ClipboardCheck size={17} />
        </div>

        <div>
          <h3 className="text-foreground font-extrabold">
            تنظیمات معرفی‌نامه
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            اطلاعات را وارد کنید؛ پیش‌نمایش سمت چپ زنده تغییر می‌کند.
          </p>
        </div>
      </div>

      <div className="border border-border rounded-2xl bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground mb-3 font-bold">
          محل ثبت معرفی‌نامه
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {national ? (
            <div>
              <Label text="استان مربوط به معرفی‌نامه" />
              <SelectProvince
                value={referral.provinceId}
                onChange={updateProvince}
                provinces={provinces}
              />
            </div>
          ) : (
            <ReadOnlyBox
              label="استان"
              value={profile?.province_name || referral.provinceName || 'نامشخص'}
            />
          )}

          {national || provinceAdmin ? (
            <div>
              <Label text="شهرستان / ثبت‌شده توسط" />
              <SelectCounty
                value={referral.countyId}
                onChange={updateCounty}
                counties={availableCounties}
                provinceName={
                  referral.provinceName ||
                  profile?.province_name ||
                  'خود استان'
                }
              />
            </div>
          ) : (
            <ReadOnlyBox
              label="ثبت‌شده توسط"
              value={profile?.county_name || referral.countyName || 'نامشخص'}
            />
          )}
        </div>
      </div>

      <div>
        <Label text="انتخاب مادر از پرونده‌ها" />

        <div className="relative">
          <select
            value={referral.motherId || ''}
            onChange={e => selectMother(e.target.value)}
            className="form-input appearance-none pr-3 pl-8 cursor-pointer w-full"
          >
            <option value="">انتخاب مادر...</option>

            {motherOptions.map(mother => (
              <option key={mother.id} value={mother.id}>
                {mother.name} - {mother.county_name || mother.province_name} - {mother.tracking_code || 'بدون کد'}
              </option>
            ))}
          </select>

          <ChevronDown
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="نام مادر"
          value={referral.motherName}
          onChange={v => update({ motherName: v })}
        />

        <TextInput
          label="کد پرونده مادر"
          value={referral.motherTrackingCode}
          onChange={v => update({ motherTrackingCode: v })}
        />

        <TextInput
          label="کد ملی مادر"
          value={referral.motherNationalId}
          onChange={v => update({ motherNationalId: v })}
        />

        <TextInput
          label="شماره تماس مادر"
          value={referral.motherPhone}
          onChange={v => update({ motherPhone: v })}
        />
      </div>

      <div>
        <Label text="انتخاب پزشک / متخصص" />

        <div className="relative">
          <select
            value={referral.doctorId || ''}
            onChange={e => selectDoctor(e.target.value)}
            className="form-input appearance-none pr-3 pl-8 cursor-pointer w-full"
          >
            <option value="">انتخاب پزشک...</option>

            {doctorOptions.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.full_name} - {doctor.specialty} - {doctor.county_name || doctor.province_name}
              </option>
            ))}
          </select>

          <ChevronDown
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label text="نوع معرفی‌نامه" />
          <SelectField
            value={referral.referralType}
            onChange={v => update({ referralType: v })}
            options={REFERRAL_TYPES}
          />
        </div>

        <div>
          <Label text="وضعیت" />
          <SelectField
            value={referral.status}
            onChange={v => update({ status: v })}
            options={REFERRAL_STATUSES}
          />
        </div>

        <TextInput
          label="عنوان گیرنده"
          value={referral.recipientTitle}
          onChange={v => update({ recipientTitle: v })}
        />

        <TextInput
          label="نام گیرنده / پزشک"
          value={referral.recipientName}
          onChange={v => update({ recipientName: v })}
        />

        <TextInput
          label="سازمان / مرکز گیرنده"
          value={referral.recipientOrganization}
          onChange={v => update({ recipientOrganization: v })}
        />

        <TextInput
          label="موضوع"
          value={referral.subject}
          onChange={v => update({ subject: v })}
        />

        <JalaliDatePicker
          label="تاریخ صدور"
          value={referral.issueDate}
          onChange={v => update({ issueDate: v })}
        />

        <JalaliDatePicker
          label="اعتبار تا تاریخ"
          value={referral.validUntil}
          onChange={v => update({ validUntil: v })}
          placeholder="اختیاری"
        />
      </div>

      <TextAreaInput
        label="متن معرفی‌نامه"
        value={referral.body}
        onChange={v => update({ body: v })}
        rows={9}
      />

      <TextAreaInput
        label="توضیحات داخلی / پیوست"
        value={referral.notes}
        onChange={v => update({ notes: v })}
        rows={3}
      />
    </div>
  );
}

function PresetTexts({
  referral,
  setReferral,
}: {
  referral: Referral;
  setReferral: Dispatch<SetStateAction<Referral | null>>;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
          <FileText size={17} />
        </div>

        <div>
          <h3 className="text-foreground font-extrabold">
            متن‌های پیش‌فرض
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            با یک کلیک متن آماده داخل معرفی‌نامه قرار می‌گیرد.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {PRESET_TEXTS.map(item => (
          <button
            key={item.title}
            type="button"
            onClick={() =>
              setReferral(prev =>
                prev
                  ? {
                      ...prev,
                      body: applyPresetText(item.text, referral),
                    }
                  : prev,
              )
            }
            className="w-full text-right rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-colors p-3"
          >
            <div className="text-sm font-bold text-foreground">
              {item.title}
            </div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {applyPresetText(item.text, referral)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReferralAIBox({
  openaiApiKey,
  aiModel,
  setAiModel,
  showAiKey,
  setShowAiKey,
  aiSettingsSaved,
  handleSaveAISettings,
  aiLoading,
  generateReferralAIText,
  aiError,
  aiResult,
  setAiResult,
  useAIText,
  copyAIText,
  aiCopied,
  aiInstruction,
  setAiInstruction,
  aiTone,
  setAiTone,
}: {
  openaiApiKey: string;
  aiModel: string;
  setAiModel: (value: string) => void;
  showAiKey: boolean;
  setShowAiKey: (value: boolean) => void;
  aiSettingsSaved: boolean;
  handleSaveAISettings: () => void;
  aiLoading: boolean;
  generateReferralAIText: () => void;
  aiError: string;
  aiResult: string;
  setAiResult: (value: string) => void;
  useAIText: () => void;
  copyAIText: () => void;
  aiCopied: boolean;
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  aiTone: string;
  setAiTone: (value: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles size={17} />
          </div>

          <div>
            <h3 className="text-foreground font-extrabold">
              متن‌یار معرفی‌نامه
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              اینجا توضیح بده چه متنی می‌خوای؛ ChatGPT متن پیشنهادی می‌نویسد.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={generateReferralAIText}
          disabled={aiLoading}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
        >
          {aiLoading ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Wand2 size={15} />
          )}
          {aiLoading ? 'در حال تولید...' : 'تولید متن'}
        </button>
      </div>

      <div>
        <Label text="متنی که می‌خواهی ChatGPT بر اساس آن معرفی‌نامه بنویسد" />

        <textarea
          value={aiInstruction}
          onChange={e => setAiInstruction(e.target.value)}
          rows={4}
          className="form-input resize-none"
          placeholder="مثلاً: برای این مادر بنویس که به دلیل نیاز به بررسی فوری وضعیت بارداری، لطفاً توسط متخصص زنان معاینه شود و نتیجه به مرکز نفس اعلام گردد..."
        />

        <p className="text-[11px] text-muted-foreground mt-1 leading-5">
          این توضیح فقط برای تولید متن است و تا وقتی دکمه «استفاده در متن معرفی‌نامه» را نزنی، وارد نامه نمی‌شود.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label text="لحن متن" />

          <select
            value={aiTone}
            onChange={e => setAiTone(e.target.value)}
            className="form-input"
          >
            {AI_TONES.map(tone => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label text="مدل ChatGPT" />

          <input
            value={aiModel}
            onChange={e => setAiModel(e.target.value)}
            className="form-input text-xs"
            placeholder="gpt-4.1-mini"
          />
        </div>
      </div>

      <div className="border border-border rounded-2xl bg-muted/20 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label text="API Key داخل کد" />

            <div className="relative">
              <input
                type={showAiKey ? 'text' : 'password'}
                value={openaiApiKey}
                readOnly
                className="form-input text-xs pl-8 bg-muted/40 cursor-not-allowed"
                placeholder="کلید داخل کد قرار داده شده است"
              />

              <button
                type="button"
                onClick={() => setShowAiKey(!showAiKey)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1 leading-5">
              کلید از بالای فایل ReferralsSection.tsx خوانده می‌شود.
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveAISettings}
              type="button"
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                aiSettingsSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              <Save size={14} />
              {aiSettingsSaved ? 'تنظیمات ذخیره شد ✓' : 'ذخیره مدل ChatGPT'}
            </button>
          </div>
        </div>
      </div>

      {aiError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-xs p-3 leading-6">
          {aiError}
        </div>
      )}

      <TextAreaInput
        label="خروجی ChatGPT"
        value={aiResult}
        onChange={setAiResult}
        rows={7}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useAIText}
          disabled={!aiResult.trim()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          استفاده در متن معرفی‌نامه
        </button>

        <button
          type="button"
          onClick={copyAIText}
          disabled={!aiResult.trim()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold disabled:opacity-50 hover:border-primary/40"
        >
          <Copy size={14} />
          {aiCopied ? 'کپی شد' : 'کپی متن'}
        </button>
      </div>
    </div>
  );
}

function SyncBadge({ item }: { item: Referral }) {
  if (item.syncStatus === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-bold">
        <Cloud size={12} />
        سینک‌شده
      </span>
    );
  }

  if (item.syncStatus === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-1 text-xs font-bold"
        title={item.syncError || ''}
      >
        <CloudOff size={12} />
        خطا
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-bold">
      <CloudOff size={12} />
      در انتظار سینک
    </span>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xl font-extrabold text-foreground">
          {toPersianNumber(value)}
        </p>

        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <label className="block text-sm text-muted-foreground mb-1">{text}</label>;
}

function ReadOnlyBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label text={label} />

      <div className="form-input bg-muted/40 text-primary font-bold">
        {value || '-'}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label text={label} />

      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="form-input"
      />
    </div>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <Label text={label} />

      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="form-input resize-none"
      />
    </div>
  );
}

function SelectProvince({
  value,
  onChange,
  provinces,
}: {
  value: string;
  onChange: (value: string) => void;
  provinces: Province[];
}) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="form-input appearance-none pr-3 pl-8 cursor-pointer w-full"
      >
        <option value="">انتخاب استان...</option>

        {provinces.map(province => (
          <option key={province.id} value={province.id}>
            {province.name}
          </option>
        ))}
      </select>

      <ChevronDown
        size={14}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}

function SelectCounty({
  value,
  onChange,
  counties,
  provinceName,
}: {
  value: string;
  onChange: (value: string) => void;
  counties: County[];
  provinceName: string;
}) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="form-input appearance-none pr-3 pl-8 cursor-pointer w-full"
      >
        <option value="">
          ثبت شده توسط {provinceName || 'خود استان'}
        </option>

        {counties.map(county => (
          <option key={county.id} value={county.id}>
            ثبت شده توسط {county.name}
          </option>
        ))}
      </select>

      <ChevronDown
        size={14}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="form-input appearance-none pr-3 pl-8 cursor-pointer w-full"
      >
        <option value="">انتخاب کنید...</option>

        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={14}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}