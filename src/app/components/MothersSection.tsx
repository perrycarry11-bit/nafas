import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Plus,
  Search,
  User,
  Baby,
  DollarSign,
  Heart,
  Copy,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Trash2,
  MapPin,
  Building2,
} from 'lucide-react';

import { PageHeader } from './PageHeader';
import { Tabs } from './MotherTabs';
import { toPersianNumber } from '../utils/jalali';
import { supabase } from '../utils/supabaseClient';
import { getCurrentOnlineUser } from '../utils/onlineAuth';

export interface Child {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  disease: string;
  photo: string;
}

export interface Cost {
  id: string;
  title: string;
  amount: string;
  date: string;
  receipt: string;
}

export interface Service {
  id: string;
  type: string;
  desc: string;
  date: string;
  photo: string;
}

type SyncStatus = 'synced' | 'pending' | 'pending_delete' | 'error';

export interface Mother {
  id: string;
  remoteId?: string;
  deviceId?: string;

  provinceId?: string;
  provinceName?: string;
  provinceCode?: string;

  countyId?: string;
  countyName?: string;
  countyCode?: string;

  syncStatus?: SyncStatus;
  syncError?: string;
  updatedAt?: string;
  deletedAt?: string | null;

  trackingCode: string;

  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: string;
  nationalId: string;

  phone: string;
  phone2: string;
  husbandPhone: string;
  cardNumber: string;

  city: string;
  province: string;

  marital: string;
  education: string;
  job: string;
  spouseJob: string;
  spouseEducation: string;

  insurance: string;
  kinship: string;
  kinshipType: string;
  propertyType: string;

  pregnancyStart: string;
  dueDate: string;
  pregnancyStatus: string;
  abortionReason: string;

  address: string;
  notes: string;

  children: Child[];
  costs: Cost[];
  services: Service[];
}

interface Props {
  onBack: () => void;
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

const STORAGE_KEY = 'nafas_mothers';
const DEVICE_ID_KEY = 'nafas_device_id';
const SELECTED_PROVINCE_KEY = 'nafas_mothers_selected_province';
const SELECTED_COUNTY_KEY = 'nafas_mothers_selected_county';

const MOTHER_SELECT = `
  id,
  local_id,
  device_id,
  province_id,
  county_id,
  tracking_code,
  first_name,
  last_name,
  father_name,
  birth_date,
  national_id,
  phone,
  phone2,
  husband_phone,
  card_number,
  city,
  province_text,
  marital,
  education,
  job,
  spouse_job,
  spouse_education,
  insurance,
  kinship,
  kinship_type,
  property_type,
  pregnancy_start,
  due_date,
  pregnancy_status,
  abortion_reason,
  address,
  notes,
  children,
  costs,
  services,
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

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function getDeviceId() {
  try {
    const saved = localStorage.getItem(DEVICE_ID_KEY);

    if (saved) {
      return saved;
    }

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

    if (!raw) {
      return null;
    }

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

function getCurrentJalaliYear() {
  try {
    const year = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
    }).format(new Date());

    return year.replace(/[^\d]/g, '') || '1405';
  } catch {
    return '1405';
  }
}

function generateTrackingCode(existingMothers: Partial<Mother>[]) {
  const year = getCurrentJalaliYear();
  let maxNumber = 0;

  existingMothers.forEach(mother => {
    const code = mother.trackingCode || '';
    const match = code.match(/^NF-(\d{4})-(\d+)$/);

    if (match && match[1] === year) {
      const currentNumber = parseInt(match[2], 10);

      if (!Number.isNaN(currentNumber) && currentNumber > maxNumber) {
        maxNumber = currentNumber;
      }
    }
  });

  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(4, '0');

  return `NF-${year}-${paddedNumber}`;
}

function amountToNumber(value: string) {
  const cleaned = String(value || '')
    .replace(/,/g, '')
    .replace(/[^\d۰-۹٠-٩]/g, '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const result = parseInt(cleaned || '0', 10);

  return Number.isFinite(result) ? result : 0;
}

function formatRial(value: number) {
  return `${toPersianNumber(value.toLocaleString('en-US'))} ریال`;
}

function findProvinceName(
  provinceId: string,
  provinces: Province[],
  profile: OnlineProfile | null,
) {
  const found = provinces.find(item => item.id === provinceId);

  if (found) return found.name;

  if (profile?.province_id === provinceId) {
    return profile.province_name || '';
  }

  return '';
}

function findProvinceCode(
  provinceId: string,
  provinces: Province[],
  profile: OnlineProfile | null,
) {
  const found = provinces.find(item => item.id === provinceId);

  if (found) return found.code;

  if (profile?.province_id === provinceId) {
    return profile.province_code || '';
  }

  return '';
}

function findCountyName(
  countyId: string,
  counties: County[],
  profile: OnlineProfile | null,
) {
  const found = counties.find(item => item.id === countyId);

  if (found) return found.name;

  if (profile?.county_id === countyId) {
    return profile.county_name || '';
  }

  return '';
}

function findCountyCode(
  countyId: string,
  counties: County[],
  profile: OnlineProfile | null,
) {
  const found = counties.find(item => item.id === countyId);

  if (found) return found.code;

  if (profile?.county_id === countyId) {
    return profile.county_code || '';
  }

  return '';
}

function getRegisteredByText(mother: Mother) {
  if (mother.countyName) {
    return `ثبت شده توسط ${mother.countyName}`;
  }

  if (mother.provinceName) {
    return `ثبت شده توسط ${mother.provinceName}`;
  }

  return 'ثبت کننده نامشخص';
}

function normalizeMother(
  mother: Partial<Mother>,
  allMothers: Partial<Mother>[],
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
): Mother {
  const id = mother.id || makeId();

  const provinceId =
    mother.provinceId ||
    (!isNationalAdmin(profile) ? profile?.province_id || '' : '');

  const countyId =
    mother.countyId ||
    (isCountyUser(profile) ? profile?.county_id || '' : '');

  const provinceName =
    mother.provinceName ||
    findProvinceName(provinceId || '', provinces, profile) ||
    mother.province ||
    '';

  const countyName =
    mother.countyName ||
    findCountyName(countyId || '', counties, profile) ||
    '';

  const hasRemote = Boolean(mother.remoteId);

  return {
    id,
    remoteId: mother.remoteId || '',
    deviceId: mother.deviceId || getDeviceId(),

    provinceId,
    provinceName,
    provinceCode:
      mother.provinceCode ||
      findProvinceCode(provinceId || '', provinces, profile) ||
      '',

    countyId,
    countyName,
    countyCode:
      mother.countyCode ||
      findCountyCode(countyId || '', counties, profile) ||
      '',

    syncStatus: mother.syncStatus || (hasRemote ? 'synced' : 'pending'),
    syncError: mother.syncError || '',
    updatedAt: mother.updatedAt || new Date().toISOString(),
    deletedAt: mother.deletedAt || null,

    trackingCode: mother.trackingCode || generateTrackingCode(allMothers),

    firstName: mother.firstName || '',
    lastName: mother.lastName || '',
    fatherName: mother.fatherName || '',
    birthDate: mother.birthDate || '',
    nationalId: mother.nationalId || '',

    phone: mother.phone || '',
    phone2: mother.phone2 || '',
    husbandPhone: mother.husbandPhone || '',
    cardNumber: mother.cardNumber || '',

    city: mother.city || '',
    province: mother.province || provinceName,

    marital: mother.marital || 'متأهل',
    education: mother.education || '',
    job: mother.job || '',
    spouseJob: mother.spouseJob || '',
    spouseEducation: mother.spouseEducation || '',

    insurance: mother.insurance || 'بدون بیمه',
    kinship: mother.kinship || 'خیر',
    kinshipType: mother.kinshipType || '',
    propertyType: mother.propertyType || 'اجاره‌ای',

    pregnancyStart: mother.pregnancyStart || '',
    dueDate: mother.dueDate || '',
    pregnancyStatus: mother.pregnancyStatus || 'در حال پیگیری',
    abortionReason: mother.abortionReason || '',

    address: mother.address || '',
    notes: mother.notes || '',

    children: Array.isArray(mother.children) ? mother.children : [],
    costs: Array.isArray(mother.costs) ? mother.costs : [],
    services: Array.isArray(mother.services) ? mother.services : [],
  };
}

function normalizeMothers(
  items: Partial<Mother>[],
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
) {
  return items.map(item =>
    normalizeMother(item, items, profile, provinces, counties),
  );
}

function getMotherStableKey(item: Mother) {
  return item.remoteId || item.id || item.trackingCode || makeId();
}

function shouldKeepNewMother(current: Mother, next: Mother) {
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

function dedupeMothers(items: Mother[]) {
  const map = new Map<string, Mother>();
  const aliasToKey = new Map<string, string>();

  items.forEach(item => {
    if (item.deletedAt) return;

    const aliases = [
      item.id ? `id:${item.id}` : '',
      item.remoteId ? `remote:${item.remoteId}` : '',
      item.trackingCode ? `tracking:${item.trackingCode}` : '',
    ].filter(Boolean);

    let finalKey = '';

    for (const alias of aliases) {
      const found = aliasToKey.get(alias);

      if (found) {
        finalKey = found;
        break;
      }
    }

    if (!finalKey) {
      finalKey = getMotherStableKey(item);
    }

    const current = map.get(finalKey);

    if (!current) {
      map.set(finalKey, item);
    } else if (shouldKeepNewMother(current, item)) {
      map.set(finalKey, item);
    }

    aliases.forEach(alias => {
      aliasToKey.set(alias, finalKey);
    });
  });

  return Array.from(map.values());
}

function loadMothers(
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
): Mother[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const data = JSON.parse(raw);

    if (!Array.isArray(data)) return [];

    const normalized = normalizeMothers(data, profile, provinces, counties);
    const cleaned = dedupeMothers(normalized);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));

    return cleaned;
  } catch {
    return [];
  }
}

function saveMothers(items: Mother[]) {
  try {
    const cleaned = dedupeMothers(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

function visibleMothers(items: Mother[]) {
  return items.filter(
    item => item.syncStatus !== 'pending_delete' && !item.deletedAt,
  );
}

function filterByUserScope(items: Mother[], profile: OnlineProfile | null) {
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

function remoteToLocal(row: any): Mother {
  const province = getRelationObject(row.provinces);
  const county = getRelationObject(row.counties);

  return {
    id: row.local_id || row.id,
    remoteId: row.id,
    deviceId: row.device_id || getDeviceId(),

    provinceId: row.province_id || '',
    provinceName: province.name || row.province_text || '',
    provinceCode: province.code || '',

    countyId: row.county_id || '',
    countyName: county.name || '',
    countyCode: county.code || '',

    syncStatus: 'synced',
    syncError: '',
    updatedAt: row.client_updated_at || row.updated_at || new Date().toISOString(),
    deletedAt: row.deleted_at || null,

    trackingCode: row.tracking_code || '',

    firstName: row.first_name || '',
    lastName: row.last_name || '',
    fatherName: row.father_name || '',
    birthDate: row.birth_date || '',
    nationalId: row.national_id || '',

    phone: row.phone || '',
    phone2: row.phone2 || '',
    husbandPhone: row.husband_phone || '',
    cardNumber: row.card_number || '',

    city: row.city || '',
    province: row.province_text || province.name || '',

    marital: row.marital || 'متأهل',
    education: row.education || '',
    job: row.job || '',
    spouseJob: row.spouse_job || '',
    spouseEducation: row.spouse_education || '',

    insurance: row.insurance || 'بدون بیمه',
    kinship: row.kinship || 'خیر',
    kinshipType: row.kinship_type || '',
    propertyType: row.property_type || 'اجاره‌ای',

    pregnancyStart: row.pregnancy_start || '',
    dueDate: row.due_date || '',
    pregnancyStatus: row.pregnancy_status || 'در حال پیگیری',
    abortionReason: row.abortion_reason || '',

    address: row.address || '',
    notes: row.notes || '',

    children: Array.isArray(row.children) ? row.children : [],
    costs: Array.isArray(row.costs) ? row.costs : [],
    services: Array.isArray(row.services) ? row.services : [],
  };
}

function localToPayload(item: Mother, profile: OnlineProfile | null) {
  return {
    local_id: item.id,
    device_id: item.deviceId || getDeviceId(),

    province_id: item.provinceId || null,
    county_id: item.countyId || null,

    tracking_code: item.trackingCode || '',

    first_name: item.firstName || '',
    last_name: item.lastName || '',
    father_name: item.fatherName || '',
    birth_date: item.birthDate || '',
    national_id: item.nationalId || '',

    phone: item.phone || '',
    phone2: item.phone2 || '',
    husband_phone: item.husbandPhone || '',
    card_number: item.cardNumber || '',

    city: item.city || '',
    province_text: item.province || item.provinceName || '',

    marital: item.marital || '',
    education: item.education || '',
    job: item.job || '',
    spouse_job: item.spouseJob || '',
    spouse_education: item.spouseEducation || '',

    insurance: item.insurance || '',
    kinship: item.kinship || '',
    kinship_type: item.kinshipType || '',
    property_type: item.propertyType || '',

    pregnancy_start: item.pregnancyStart || '',
    due_date: item.dueDate || '',
    pregnancy_status: item.pregnancyStatus || '',
    abortion_reason: item.abortionReason || '',

    address: item.address || '',
    notes: item.notes || '',

    children: Array.isArray(item.children) ? item.children : [],
    costs: Array.isArray(item.costs) ? item.costs : [],
    services: Array.isArray(item.services) ? item.services : [],

    created_by: profile?.id || null,
    updated_by: profile?.id || null,
    client_updated_at: item.updatedAt || new Date().toISOString(),
    deleted_at: item.deletedAt || null,
  };
}

async function fetchRemoteMothers(): Promise<Mother[]> {
  const { data, error } = await supabase
    .from('mothers')
    .select(MOTHER_SELECT)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return Array.isArray(data) ? data.map(remoteToLocal) : [];
}

async function syncOneMother(
  item: Mother,
  profile: OnlineProfile | null,
): Promise<Mother> {
  if (!item.provinceId) {
    return {
      ...item,
      syncStatus: 'error',
      syncError: 'استان پرونده مشخص نیست.',
    };
  }

  if (!item.countyId) {
    return {
      ...item,
      syncStatus: 'error',
      syncError: 'شهرستان پرونده مشخص نیست.',
    };
  }

  if (item.syncStatus === 'pending_delete') {
    if (item.remoteId) {
      const { error } = await supabase
        .from('mothers')
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: profile?.id || null,
          client_updated_at: new Date().toISOString(),
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
      .from('mothers')
      .update(payload)
      .eq('id', item.remoteId)
      .select(MOTHER_SELECT)
      .single();

    if (error) throw error;

    return remoteToLocal(data);
  }

  const { data, error } = await supabase
    .from('mothers')
    .insert(payload)
    .select(MOTHER_SELECT)
    .single();

  if (error) throw error;

  return remoteToLocal(data);
}

function mergeMothers(localItems: Mother[], remoteItems: Mother[]) {
  const combined = [...remoteItems, ...localItems];
  const cleaned = dedupeMothers(combined);

  return cleaned.filter(item => !item.deletedAt);
}

export function MothersSection({ onBack }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [editing, setEditing] = useState<Mother | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState(() => {
    return localStorage.getItem(SELECTED_PROVINCE_KEY) || 'all';
  });

  const [selectedCountyId, setSelectedCountyId] = useState(() => {
    return localStorage.getItem(SELECTED_COUNTY_KEY) || 'all';
  });

  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('وضعیت همگام‌سازی آماده است.');

  const national = isNationalAdmin(profile);
  const provinceAdmin = isProvinceAdmin(profile);
  const countyUser = isCountyUser(profile);

  useEffect(() => {
    async function init() {
      let currentProfile = getCurrentProfile();

      try {
        if (navigator.onLine) {
          const freshProfile = await getCurrentOnlineUser();

          if (freshProfile) {
            currentProfile = freshProfile as any;
          }
        }
      } catch {
        // اگر اینترنت یا نشست مشکل داشت، از پروفایل ذخیره‌شده محلی استفاده می‌شود
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
        setSelectedCountyId('all');
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

        if (currentProfile?.role === 'province_staff') {
          const countyExists = countyList.some(
            county => county.id === currentProfile?.county_id,
          );

          if (!currentProfile.county_id || !countyExists) {
            setSyncMessage(
              'حساب شهرستان شما county_id معتبر ندارد. از مدیر استان بخواهید این کاربر را برای شهرستان درست بسازد.',
            );
          }
        }

        if (currentProfile?.role === 'province_admin') {
          const savedCounty = localStorage.getItem(SELECTED_COUNTY_KEY) || 'all';

          const isValidCounty =
            savedCounty === 'all' ||
            countyList.some(
              county =>
                county.id === savedCounty &&
                county.province_id === currentProfile?.province_id,
            );

          if (!isValidCounty) {
            setSelectedCountyId('all');
          }
        }

        const local = filterByUserScope(
          loadMothers(currentProfile, provinceList, countyList),
          currentProfile,
        );

        setMothers(dedupeMothers(local));

        if (navigator.onLine) {
          await syncAndReload(local, currentProfile);
        }
      } catch (error: any) {
        setSyncMessage(error?.message || 'خطا در دریافت اطلاعات مادران');
      }
    }

    init();
  }, []);

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

  useEffect(() => {
    localStorage.setItem(SELECTED_PROVINCE_KEY, selectedProvinceId);
  }, [selectedProvinceId]);

  useEffect(() => {
    localStorage.setItem(SELECTED_COUNTY_KEY, selectedCountyId);
  }, [selectedCountyId]);

  async function syncAndReload(
    baseItems = mothers,
    currentProfile = profile,
  ) {
    try {
      setSyncing(true);
      setSyncMessage('در حال همگام‌سازی پرونده‌های مادران...');

      let next = dedupeMothers([...baseItems]);

      for (let i = 0; i < next.length; i++) {
        if (
          next[i].syncStatus === 'pending' ||
          next[i].syncStatus === 'pending_delete' ||
          next[i].syncStatus === 'error'
        ) {
          try {
            next[i] = await syncOneMother(next[i], currentProfile);
          } catch (error: any) {
            next[i] = {
              ...next[i],
              syncStatus: 'error',
              syncError: error?.message || 'خطا در سینک',
            };
          }
        }
      }

      next = dedupeMothers(next).filter(item => !item.deletedAt);

      const remote = await fetchRemoteMothers();
      const merged = filterByUserScope(
        mergeMothers(next, remote),
        currentProfile,
      );

      const cleaned = dedupeMothers(merged);

      setMothers(cleaned);
      saveMothers(cleaned);

      setSyncMessage('پرونده‌های مادران با سرور مرکزی همگام شد.');
    } catch (error: any) {
      setSyncMessage(error?.message || 'خطا در همگام‌سازی مادران');
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

  const visibleScopedMothers = useMemo(() => {
    let list = visibleMothers(filterByUserScope(dedupeMothers(mothers), profile));

    if (national && selectedProvinceId !== 'all') {
      list = list.filter(item => item.provinceId === selectedProvinceId);
    }

    if ((national || provinceAdmin) && selectedCountyId !== 'all') {
      list = list.filter(item => item.countyId === selectedCountyId);
    }

    if (countyUser && profile?.county_id) {
      list = list.filter(item => item.countyId === profile.county_id);
    }

    return dedupeMothers(list);
  }, [
    mothers,
    profile,
    national,
    provinceAdmin,
    countyUser,
    selectedProvinceId,
    selectedCountyId,
  ]);

  const countySummary = useMemo(() => {
    const map = new Map<
      string,
      {
        countyId: string;
        countyName: string;
        count: number;
      }
    >();

    visibleScopedMothers.forEach(item => {
      const key = item.countyId || 'unknown';

      const current =
        map.get(key) ||
        {
          countyId: item.countyId || 'unknown',
          countyName: item.countyName || 'نامشخص',
          count: 0,
        };

      current.count += 1;

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visibleScopedMothers]);

  const filtered = visibleScopedMothers.filter(m => {
    const registeredBy = getRegisteredByText(m);

    const text = [
      m.trackingCode,
      m.firstName,
      m.lastName,
      m.nationalId,
      m.phone,
      m.phone2,
      m.city,
      m.province,
      m.provinceName,
      m.countyName,
      registeredBy,
      m.pregnancyStatus,
      m.syncStatus,
    ].join(' ');

    return text.includes(search);
  });

  const totalCosts =
    editing?.costs.reduce((sum, c) => sum + amountToNumber(c.amount), 0) || 0;

  const updateMothers = (next: Mother[]) => {
    const normalized = normalizeMothers(next, profile, provinces, counties);
    const cleaned = dedupeMothers(normalized);

    setMothers(cleaned);
    saveMothers(cleaned);
  };

  const openNew = () => {
    let provinceId = '';
    let countyId = '';

    const fixedProvinceId =
      profile?.province_id ||
      localStorage.getItem('nafas_current_province_id') ||
      '';

    const fixedCountyId =
      profile?.county_id ||
      localStorage.getItem('nafas_current_county_id') ||
      '';

    const fixedProvinceName =
      profile?.province_name ||
      localStorage.getItem('nafas_current_province_name') ||
      '';

    const fixedCountyName =
      profile?.county_name ||
      localStorage.getItem('nafas_current_county_name') ||
      '';

    if (national) {
      if (selectedProvinceId === 'all') {
        alert('برای ثبت پرونده توسط تهران، ابتدا استان را انتخاب کنید.');
        return;
      }

      if (selectedCountyId === 'all') {
        alert('برای ثبت پرونده توسط تهران، ابتدا شهرستان را انتخاب کنید.');
        return;
      }

      provinceId = selectedProvinceId;
      countyId = selectedCountyId;
    } else if (provinceAdmin) {
      if (selectedCountyId === 'all') {
        alert('برای ثبت پرونده، ابتدا شهرستان را انتخاب کنید.');
        return;
      }

      provinceId = fixedProvinceId;
      countyId = selectedCountyId;
    } else {
      provinceId = fixedProvinceId;
      countyId = fixedCountyId;
    }

    if (!provinceId) {
      alert('استان کاربر مشخص نیست. یک بار خارج شوید و دوباره آنلاین وارد شوید.');
      return;
    }

    if (!countyId) {
      alert('شهرستان کاربر مشخص نیست. این کاربر شهرستان به درستی ساخته نشده یا county_id ندارد.');
      return;
    }

    const provinceName =
      findProvinceName(provinceId, provinces, profile) || fixedProvinceName;

    const provinceCode = findProvinceCode(provinceId, provinces, profile);

    const countyName =
      findCountyName(countyId, counties, profile) || fixedCountyName;

    const countyCode = findCountyCode(countyId, counties, profile);

    setEditing({
      id: makeId(),
      remoteId: '',
      deviceId: getDeviceId(),

      provinceId,
      provinceName,
      provinceCode,

      countyId,
      countyName,
      countyCode,

      syncStatus: 'pending',
      syncError: '',
      updatedAt: new Date().toISOString(),
      deletedAt: null,

      trackingCode: generateTrackingCode(mothers),

      firstName: '',
      lastName: '',
      fatherName: '',
      birthDate: '',
      nationalId: '',

      phone: '',
      phone2: '',
      husbandPhone: '',
      cardNumber: '',

      city: '',
      province: provinceName,

      marital: 'متأهل',
      education: '',
      job: '',
      spouseJob: '',
      spouseEducation: '',

      insurance: 'بدون بیمه',
      kinship: 'خیر',
      kinshipType: '',
      propertyType: 'اجاره‌ای',

      pregnancyStart: '',
      dueDate: '',
      pregnancyStatus: 'در حال پیگیری',
      abortionReason: '',

      address: '',
      notes: '',

      children: [],
      costs: [],
      services: [],
    });

    setView('form');
    setTab(0);
    setCopiedTracking(false);
  };

  const openEdit = (mother: Mother) => {
    const normalizedMother = normalizeMother(
      mother,
      mothers,
      profile,
      provinces,
      counties,
    );

    setEditing({
      ...normalizedMother,
      children: [...normalizedMother.children],
      costs: [...normalizedMother.costs],
      services: [...normalizedMother.services],
    });

    setView('form');
    setTab(0);
    setCopiedTracking(false);
  };

  const save = async () => {
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
      alert('استان پرونده مشخص نیست.');
      return;
    }

    if (!countyId) {
      alert('شهرستان پرونده مشخص نیست.');
      return;
    }

    const provinceName = findProvinceName(provinceId, provinces, profile);
    const provinceCode = findProvinceCode(provinceId, provinces, profile);
    const countyName = findCountyName(countyId, counties, profile);
    const countyCode = findCountyCode(countyId, counties, profile);

    const motherToSave: Mother = {
      ...editing,

      provinceId,
      provinceName,
      provinceCode,

      countyId,
      countyName,
      countyCode,

      province: editing.province || provinceName,

      trackingCode:
        editing.trackingCode && editing.trackingCode.trim()
          ? editing.trackingCode
          : generateTrackingCode(mothers),

      children: Array.isArray(editing.children) ? editing.children : [],
      costs: Array.isArray(editing.costs) ? editing.costs : [],
      services: Array.isArray(editing.services) ? editing.services : [],

      syncStatus: 'pending',
      syncError: '',
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deviceId: editing.deviceId || getDeviceId(),
    };

    let next = mothers.find(m => m.id === motherToSave.id)
      ? mothers.map(m => (m.id === motherToSave.id ? motherToSave : m))
      : [...mothers, motherToSave];

    next = dedupeMothers(next);

    updateMothers(next);
    setEditing(null);
    setView('list');

    if (navigator.onLine) {
      try {
        setSyncing(true);

        const synced = await syncOneMother(motherToSave, profile);

        next = next.map(m => (m.id === motherToSave.id ? synced : m));
        next = dedupeMothers(next);

        updateMothers(next);

        setSyncMessage('پرونده مادر ذخیره و آنلاین شد.');
      } catch (error: any) {
        setSyncMessage(error?.message || 'پرونده محلی ذخیره شد اما آنلاین نشد.');
      } finally {
        setSyncing(false);
      }
    } else {
      setSyncMessage('پرونده روی سیستم ذخیره شد و بعد از اتصال اینترنت سینک می‌شود.');
    }
  };

  const del = async (id: string) => {
    const target = mothers.find(m => m.id === id);
    if (!target) return;

    const confirmed = confirm('آیا از حذف این پرونده مطمئن هستید؟');
    if (!confirmed) return;

    let next: Mother[];

    if (target.remoteId) {
      next = mothers.map(m =>
        m.id === id
          ? {
              ...m,
              syncStatus: 'pending_delete',
              deletedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : m,
      );
    } else {
      next = mothers.filter(m => m.id !== id);
    }

    updateMothers(next);

    if (navigator.onLine) {
      await syncAndReload(next);
    } else {
      setSyncMessage('حذف روی سیستم ثبت شد و بعد از اتصال اینترنت سینک می‌شود.');
    }
  };

  const goBackDashboard = () => {
    saveMothers(mothers);
    onBack();
  };

  const copyTrackingCode = async (code: string) => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 1800);
    } catch {
      setCopiedTracking(false);
    }
  };

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title="مادران"
          onBack={goBackDashboard}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => syncAndReload()}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:border-primary/40 flex items-center gap-2"
                type="button"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                همگام‌سازی
              </button>

              <button
                onClick={openNew}
                className="btn-primary flex items-center gap-2"
                type="button"
              >
                <Plus size={15} />
                اضافه کردن مادر جدید
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
                : 'آفلاین - اطلاعات بعداً سینک می‌شود'}
            </div>

            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
              {national
                ? 'مدیر تهران: مشاهده همه استان‌ها و شهرستان‌ها'
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
                    <option value="all">همه استان‌ها</option>
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
                  <option value="all">همه شهرستان‌ها</option>
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
                  key={item.countyId}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <MapPin size={16} />
                    <span className="text-xs font-bold">
                      ثبت شده توسط {item.countyName}
                    </span>
                  </div>

                  <p className="text-2xl font-extrabold text-foreground">
                    {toPersianNumber(item.count)}
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    پرونده مادر
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
            <StatCard title="کل پرونده‌ها" value={filtered.length} icon={<User size={20} />} />

            <StatCard
              title="در حال پیگیری"
              value={filtered.filter(m => m.pregnancyStatus === 'در حال پیگیری').length}
              icon={<Heart size={20} />}
            />

            <StatCard
              title="فرزندان"
              value={filtered.reduce((sum, m) => sum + m.children.length, 0)}
              icon={<Baby size={20} />}
            />

            <StatCard
              title="هزینه‌ها"
              value={filtered.reduce(
                (sum, m) =>
                  sum +
                  m.costs.reduce((innerSum, c) => innerSum + amountToNumber(c.amount), 0),
                0,
              )}
              icon={<DollarSign size={20} />}
              rial
            />

            <StatCard
              title="در انتظار سینک"
              value={mothers.filter(m => m.syncStatus !== 'synced').length}
              icon={<CloudOff size={20} />}
            />
          </div>

          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو با کد پرونده، نام، کد ملی، شماره تماس، استان، شهرستان یا عبارت ثبت شده توسط..."
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1320px]">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      'کد پرونده',
                      'نام و نام خانوادگی',
                      'ثبت‌شده توسط',
                      'استان',
                      'شهرستان',
                      'کد ملی',
                      'شماره تماس',
                      'وضعیت',
                      'فرزندان',
                      'هزینه‌ها',
                      'خدمات',
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
                  {filtered.map((m, i) => {
                    const rowTotal = m.costs.reduce(
                      (sum, c) => sum + amountToNumber(c.amount),
                      0,
                    );

                    return (
                      <tr
                        key={`${m.id}-${m.remoteId || 'local'}`}
                        className={`border-t border-border hover:bg-muted/30 transition-colors ${
                          i % 2 === 0 ? '' : 'bg-muted/10'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => copyTrackingCode(m.trackingCode)}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold hover:bg-primary/15"
                          >
                            <Copy size={12} />
                            <span dir="ltr">{m.trackingCode}</span>
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          {m.firstName} {m.lastName}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold">
                            <Building2 size={12} />
                            {getRegisteredByText(m)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {m.provinceName || m.province || '-'}
                        </td>

                        <td className="px-4 py-3">
                          {m.countyName || '-'}
                        </td>

                        <td className="px-4 py-3">
                          {toPersianNumber(m.nationalId || '-')}
                        </td>

                        <td className="px-4 py-3">
                          {toPersianNumber(m.phone || '-')}
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                            {m.pregnancyStatus || 'نامشخص'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {toPersianNumber(m.children.length)}
                        </td>

                        <td className="px-4 py-3">
                          {formatRial(rowTotal)}
                        </td>

                        <td className="px-4 py-3">
                          {toPersianNumber(m.services.length)}
                        </td>

                        <td className="px-4 py-3">
                          <SyncBadge mother={m} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(m)}
                              className="text-primary hover:underline text-xs"
                              type="button"
                            >
                              ویرایش
                            </button>

                            <button
                              onClick={() => del(m.id)}
                              className="text-destructive hover:underline text-xs flex items-center gap-1"
                              type="button"
                            >
                              <Trash2 size={13} />
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={13}
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

          {copiedTracking && (
            <div className="fixed bottom-6 left-6 z-50 bg-green-500 text-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={18} />
              کد پرونده کپی شد
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!editing) return null;

  const tabs = [
    { label: 'اطلاعات فردی', icon: User },
    { label: 'فرزندان', icon: Baby },
    { label: 'هزینه‌ها', icon: DollarSign },
    { label: 'خدمات ارائه‌شده', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader
        title={
          editing.firstName || editing.lastName
            ? `${editing.firstName} ${editing.lastName}`.trim()
            : 'ثبت پرونده جدید'
        }
        onBack={() => setView('list')}
        action={
          <button onClick={save} className="btn-primary" type="button">
            ذخیره کل پرونده
          </button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-4 mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              کد رهگیری پرونده
            </p>

            <div className="flex items-center gap-2">
              <span
                dir="ltr"
                className="inline-flex items-center rounded-xl bg-primary/10 text-primary px-3 py-1.5 font-extrabold tracking-wide"
              >
                {editing.trackingCode}
              </span>

              <button
                type="button"
                onClick={() => copyTrackingCode(editing.trackingCode)}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:border-primary/40"
              >
                <Copy size={14} />
                کپی کد
              </button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground leading-6">
            <div>
              استان:{' '}
              <span className="font-bold text-primary">
                {editing.provinceName || editing.province || '-'}
              </span>
              {' '} | شهرستان:{' '}
              <span className="font-bold text-primary">
                {editing.countyName || '-'}
              </span>
            </div>

            <div className="mt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold">
                <Building2 size={12} />
                {getRegisteredByText(editing)}
              </span>
            </div>
          </div>

          <SyncBadge mother={editing} />
        </div>

        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${
                tab === i
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <Tabs
          mother={editing}
          setMother={setEditing}
          tab={tab}
          setTab={setTab}
          totalCosts={totalCosts}
        />

        {copiedTracking && (
          <div className="fixed bottom-6 left-6 z-50 bg-green-500 text-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 size={18} />
            کد پرونده کپی شد
          </div>
        )}
      </div>
    </div>
  );
}

function SyncBadge({ mother }: { mother: Mother }) {
  if (mother.syncStatus === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-bold">
        <Cloud size={12} />
        سینک‌شده
      </span>
    );
  }

  if (mother.syncStatus === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-1 text-xs font-bold"
        title={mother.syncError || ''}
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
  rial = false,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  rial?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xl font-extrabold text-foreground">
          {rial ? formatRial(value) : toPersianNumber(value)}
        </p>

        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}