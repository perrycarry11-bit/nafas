import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Image as ImageIcon,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  MapPin,
  Building2,
} from 'lucide-react';

import { PageHeader } from '../PageHeader';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { ImageUploader } from '../ImageUploader';
import { todayJalali, toPersianNumber } from '../../utils/jalali';
import { supabase } from '../../utils/supabaseClient';
import { getCurrentOnlineUser } from '../../utils/onlineAuth';

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

type SyncStatus = 'synced' | 'pending' | 'pending_delete' | 'error';

interface NafasActivity {
  id: string;
  remoteId?: string;
  deviceId: string;

  provinceId: string;
  provinceName: string;
  provinceCode: string;

  countyId: string;
  countyName: string;
  countyCode: string;

  title: string;
  type: string;
  targetGroup: string;
  relatedTo: string;
  date: string;
  location: string;
  organizer: string;
  participantsCount: string;
  description: string;
  result: string;
  photos: string[];

  syncStatus: SyncStatus;
  syncError?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

const STORAGE_KEY = 'nafas_activities';
const DEVICE_ID_KEY = 'nafas_device_id';
const SELECTED_PROVINCE_KEY = 'nafas_selected_activity_province';
const SELECTED_COUNTY_KEY = 'nafas_selected_activity_county';

const ACTIVITY_SELECT = `
  id,
  local_id,
  device_id,
  province_id,
  county_id,
  title,
  activity_type,
  target_group,
  related_to,
  activity_date,
  location,
  organizer,
  description,
  result,
  participants_count,
  photos,
  client_updated_at,
  deleted_at,
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

const ACTIVITY_TYPES = [
  'آموزشی',
  'فرهنگی',
  'تفریحی',
  'حمایتی',
  'درمانی',
  'روانشناسی',
  'مشاوره خانواده',
  'مذهبی',
  'مناسبتی',
  'رسانه‌ای',
  'اشتغال‌زایی',
  'مهارت‌آموزی',
  'کمک معیشتی',
  'پویش مردمی',
  'جلسه گروهی مادران',
  'کارگاه مادر و کودک',
  'بازدید میدانی',
  'جشن تولد نوزادان',
  'توزیع بسته حمایتی',
  'سایر',
];

const TARGET_GROUPS = [
  'مادران',
  'فرزندان',
  'خانواده‌ها',
  'خیرین',
  'کارکنان مرکز',
  'عموم مردم',
  'مادران در حال پیگیری',
  'مادران نجات‌یافته',
  'کودکان',
  'سایر',
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function toEnglishDigits(value: string) {
  return String(value || '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function parseNumber(value: string) {
  const cleaned = toEnglishDigits(value).replace(/[^\d]/g, '');
  const result = parseInt(cleaned || '0', 10);
  return Number.isFinite(result) ? result : 0;
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

function getRegisteredByText(item: NafasActivity) {
  if (item.countyName) return `ثبت شده توسط ${item.countyName}`;
  if (item.provinceName) return `ثبت شده توسط ${item.provinceName}`;
  return 'ثبت کننده نامشخص';
}

function getActivityPlaceText(item: NafasActivity) {
  if (item.countyName) return item.countyName;
  if (item.provinceName) return item.provinceName;
  return 'نامشخص';
}

function emptyActivity(
  profile: OnlineProfile | null,
  selectedProvinceId: string,
  selectedCountyId: string,
  provinces: Province[],
  counties: County[],
): NafasActivity {
  let provinceId = '';
  let countyId = '';

  if (isNationalAdmin(profile)) {
    provinceId = selectedProvinceId !== 'all' ? selectedProvinceId : '';
    countyId = selectedCountyId !== 'all' ? selectedCountyId : '';
  } else if (isProvinceAdmin(profile)) {
    provinceId = profile?.province_id || '';
    countyId = selectedCountyId !== 'all' ? selectedCountyId : '';
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
  const countyName = findCountyName(countyId, counties, profile);
  const countyCode = findCountyCode(countyId, counties, profile);

  return {
    id: makeId(),
    deviceId: getDeviceId(),

    provinceId,
    provinceName,
    provinceCode,

    countyId,
    countyName,
    countyCode,

    title: '',
    type: 'آموزشی',
    targetGroup: 'مادران',
    relatedTo: '',
    date: todayJalali(),
    location: '',
    organizer: '',
    participantsCount: '',
    description: '',
    result: '',
    photos: [],

    syncStatus: 'pending',
    syncError: '',
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

function normalizeLocalActivity(
  item: any,
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
): NafasActivity {
  const id = item.id || item.localId || item.local_id || makeId();

  const provinceId =
    item.provinceId ||
    item.province_id ||
    (!isNationalAdmin(profile) ? profile?.province_id || '' : '');

  const countyId = item.countyId || item.county_id || '';

  const hasRemote = Boolean(item.remoteId || item.remote_id);

  const provinceName =
    item.provinceName ||
    item.province_name ||
    findProvinceName(provinceId, provinces, profile);

  const countyName =
    item.countyName ||
    item.county_name ||
    findCountyName(countyId, counties, profile);

  return {
    id,
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

    title: item.title || '',
    type: item.type || item.activity_type || 'آموزشی',
    targetGroup: item.targetGroup || item.target_group || 'مادران',
    relatedTo: item.relatedTo || item.related_to || '',
    date: item.date || item.activity_date || todayJalali(),
    location: item.location || '',
    organizer: item.organizer || '',
    participantsCount: String(
      item.participantsCount || item.participants_count || '',
    ),
    description: item.description || '',
    result: item.result || '',
    photos: Array.isArray(item.photos) ? item.photos : [],

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

function remoteToLocal(row: any): NafasActivity {
  const province = getRelationObject(row.provinces);
  const county = getRelationObject(row.counties);

  const provinceName = province.name || '';
  const countyName = county.name || '';

  return {
    id: row.local_id || row.id,
    remoteId: row.id,
    deviceId: row.device_id || getDeviceId(),

    provinceId: row.province_id || '',
    provinceName,
    provinceCode: province.code || '',

    countyId: row.county_id || '',
    countyName,
    countyCode: county.code || '',

    title: row.title || '',
    type: row.activity_type || 'آموزشی',
    targetGroup: row.target_group || 'مادران',
    relatedTo: row.related_to || '',
    date: row.activity_date || '',
    location: row.location || '',
    organizer: row.organizer || '',
    participantsCount: row.participants_count
      ? String(row.participants_count)
      : '',
    description: row.description || '',
    result: row.result || '',
    photos: Array.isArray(row.photos) ? row.photos : [],

    syncStatus: 'synced',
    syncError: '',
    updatedAt: row.client_updated_at || row.updated_at || new Date().toISOString(),
    deletedAt: row.deleted_at || null,
  };
}

function getActivityStableKey(item: NafasActivity) {
  return item.remoteId || item.id || `${item.title}-${item.date}` || makeId();
}

function shouldKeepNewActivity(current: NafasActivity, next: NafasActivity) {
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

function dedupeActivities(items: NafasActivity[]) {
  const map = new Map<string, NafasActivity>();
  const aliasToKey = new Map<string, string>();

  items.forEach(item => {
    if (item.deletedAt) return;

    const naturalScope = item.countyId || item.provinceId || 'unknown';

    const aliases = [
      item.id ? `id:${item.id}` : '',
      item.remoteId ? `remote:${item.remoteId}` : '',
      item.title && item.date
        ? `natural:${item.title}-${item.date}-${naturalScope}`
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

    if (!finalKey) {
      finalKey = getActivityStableKey(item);
    }

    const current = map.get(finalKey);

    if (!current) {
      map.set(finalKey, item);
    } else if (shouldKeepNewActivity(current, item)) {
      map.set(finalKey, item);
    }

    aliases.forEach(alias => {
      aliasToKey.set(alias, finalKey);
    });
  });

  return Array.from(map.values());
}

function loadLocalActivities(
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
): NafasActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed.map(item =>
      normalizeLocalActivity(item, profile, provinces, counties),
    );

    const cleaned = dedupeActivities(normalized);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));

    return cleaned;
  } catch {
    return [];
  }
}

function saveLocalActivities(items: NafasActivity[]) {
  try {
    const cleaned = dedupeActivities(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

function filterByUserScope(items: NafasActivity[], profile: OnlineProfile | null) {
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

async function fetchRemoteActivities(): Promise<NafasActivity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_SELECT)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return Array.isArray(data) ? data.map(remoteToLocal) : [];
}

function localToPayload(item: NafasActivity, profile: OnlineProfile | null) {
  return {
    local_id: item.id,
    device_id: item.deviceId || getDeviceId(),

    province_id: item.provinceId || null,
    county_id: item.countyId || null,

    title: item.title || 'بدون عنوان',
    activity_type: item.type || 'آموزشی',
    target_group: item.targetGroup || '',
    related_to: item.relatedTo || '',
    activity_date: item.date || '',
    location: item.location || '',
    organizer: item.organizer || '',
    description: item.description || '',
    result: item.result || '',
    participants_count: parseNumber(item.participantsCount),
    photos: Array.isArray(item.photos) ? item.photos : [],

    created_by: profile?.id || null,
    updated_by: profile?.id || null,
    client_updated_at: item.updatedAt || new Date().toISOString(),
    deleted_at: item.deletedAt || null,
  };
}

async function syncOneActivity(
  item: NafasActivity,
  profile: OnlineProfile | null,
): Promise<NafasActivity> {
  if (!item.provinceId) {
    return {
      ...item,
      syncStatus: 'error',
      syncError: 'استان فعالیت مشخص نیست.',
    };
  }

  if (item.syncStatus === 'pending_delete') {
    if (item.remoteId) {
      const { error } = await supabase
        .from('activities')
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
      .from('activities')
      .update(payload)
      .eq('id', item.remoteId)
      .select(ACTIVITY_SELECT)
      .single();

    if (error) throw error;

    return remoteToLocal(data);
  }

  const { data, error } = await supabase
    .from('activities')
    .insert(payload)
    .select(ACTIVITY_SELECT)
    .single();

  if (error) throw error;

  return remoteToLocal(data);
}

function mergeActivities(
  localItems: NafasActivity[],
  remoteItems: NafasActivity[],
) {
  const combined = [...remoteItems, ...localItems];
  const cleaned = dedupeActivities(combined);

  return cleaned.filter(item => !item.deletedAt);
}

export function ActivitiesSection({ onBack }: Props) {
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState(() => {
    return localStorage.getItem(SELECTED_PROVINCE_KEY) || 'all';
  });

  const [selectedCountyId, setSelectedCountyId] = useState(() => {
    return localStorage.getItem(SELECTED_COUNTY_KEY) || 'all';
  });

  const [activities, setActivities] = useState<NafasActivity[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<NafasActivity | null>(null);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('وضعیت همگام‌سازی آماده است.');

  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const national = isNationalAdmin(profile);
  const provinceAdmin = isProvinceAdmin(profile);
  const countyUser = isCountyUser(profile);

  useEffect(() => {
    async function init() {
      let currentProfile = getCurrentProfile();

      try {
        if (navigator.onLine) {
          const freshProfile = await getCurrentOnlineUser();
          if (freshProfile) currentProfile = freshProfile as any;
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
          loadLocalActivities(currentProfile, provinceList, countyList),
          currentProfile,
        );

        setActivities(dedupeActivities(local));

        if (navigator.onLine) {
          await syncAndReload(local, currentProfile);
        }
      } catch (error: any) {
        const local = filterByUserScope(
          loadLocalActivities(currentProfile, [], []),
          currentProfile,
        );

        setActivities(dedupeActivities(local));
        setSyncMessage(error?.message || 'خطا در دریافت اطلاعات برخط');
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

  async function syncAndReload(
    baseItems = activities,
    currentProfile = profile,
  ) {
    try {
      setSyncing(true);
      setSyncMessage('در حال همگام‌سازی فعالیت‌ها...');

      let next = dedupeActivities([...baseItems]);

      for (let i = 0; i < next.length; i++) {
        if (
          next[i].syncStatus === 'pending' ||
          next[i].syncStatus === 'pending_delete' ||
          next[i].syncStatus === 'error'
        ) {
          try {
            next[i] = await syncOneActivity(next[i], currentProfile);
          } catch (error: any) {
            next[i] = {
              ...next[i],
              syncStatus: 'error',
              syncError: error?.message || 'خطا در همگام‌سازی',
            };
          }
        }
      }

      const remote = await fetchRemoteActivities();
      const merged = filterByUserScope(
        mergeActivities(next, remote),
        currentProfile,
      );

      const cleaned = dedupeActivities(merged);

      setActivities(cleaned);
      saveLocalActivities(cleaned);

      setSyncMessage('فعالیت‌ها با سرور مرکزی همگام شد.');
    } catch (error: any) {
      setSyncMessage(error?.message || 'خطا در همگام‌سازی');
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

  const visibleActivities = useMemo(() => {
    let list = filterByUserScope(dedupeActivities(activities), profile);

    if (national && selectedProvinceId !== 'all') {
      list = list.filter(item => item.provinceId === selectedProvinceId);
    }

    if ((national || provinceAdmin) && selectedCountyId !== 'all') {
      list = list.filter(item => item.countyId === selectedCountyId);
    }

    if (countyUser && profile?.county_id) {
      list = list.filter(item => item.countyId === profile.county_id);
    }

    if (search.trim()) {
      list = list.filter(item => {
        const registeredBy = getRegisteredByText(item);
        const place = getActivityPlaceText(item);

        const text = [
          item.title,
          item.type,
          item.targetGroup,
          item.relatedTo,
          item.date,
          item.location,
          item.organizer,
          item.description,
          item.result,
          item.provinceName,
          item.countyName,
          place,
          registeredBy,
          item.syncStatus,
        ].join(' ');

        return text.includes(search);
      });
    }

    return dedupeActivities(list);
  }, [
    activities,
    profile,
    national,
    provinceAdmin,
    countyUser,
    selectedProvinceId,
    selectedCountyId,
    search,
  ]);

  const countySummary = useMemo(() => {
    const map = new Map<
      string,
      { countyId: string; countyName: string; count: number }
    >();

    visibleActivities.forEach(item => {
      const key = item.countyId || `province:${item.provinceId || 'unknown'}`;

      const current =
        map.get(key) ||
        {
          countyId: key,
          countyName: item.countyName || item.provinceName || 'نامشخص',
          count: 0,
        };

      current.count += 1;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visibleActivities]);

  function updateActivities(next: NafasActivity[]) {
    const cleaned = dedupeActivities(next);
    setActivities(cleaned);
    saveLocalActivities(cleaned);
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
      alert('برای ثبت فعالیت توسط مدیر تهران، ابتدا استان را انتخاب کنید.');
      return;
    }

    if (countyUser) {
      const countyId =
        profile?.county_id ||
        localStorage.getItem('nafas_current_county_id') ||
        '';

      if (!countyId) {
        alert('شهرستان کاربر مشخص نیست. یک بار خارج شوید و دوباره برخط وارد شوید.');
        return;
      }
    }

    setEditing(
      emptyActivity(
        profile,
        selectedProvinceId,
        selectedCountyId,
        provinces,
        counties,
      ),
    );

    setView('form');
  }

  function openEdit(item: NafasActivity) {
    setEditing({
      ...item,
      photos: [...item.photos],
    });

    setView('form');
  }

  async function saveActivity() {
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
      alert('استان فعالیت مشخص نیست.');
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

    const countyName = countyId
      ? findCountyName(countyId, counties, profile)
      : '';

    const countyCode = countyId
      ? findCountyCode(countyId, counties, profile)
      : '';

    const item: NafasActivity = {
      ...editing,

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
    };

    let next = activities.some(a => a.id === item.id)
      ? activities.map(a => (a.id === item.id ? item : a))
      : [...activities, item];

    next = dedupeActivities(next);

    updateActivities(next);
    setEditing(null);
    setView('list');

    if (navigator.onLine) {
      try {
        setSyncing(true);

        const synced = await syncOneActivity(item, profile);

        next = next.map(a => (a.id === item.id ? synced : a));
        next = dedupeActivities(next);

        updateActivities(next);
        setSyncMessage('فعالیت ذخیره و برخط شد.');
      } catch (error: any) {
        setSyncMessage(error?.message || 'فعالیت محلی ذخیره شد اما برخط نشد.');
      } finally {
        setSyncing(false);
      }
    } else {
      setSyncMessage('فعالیت روی سیستم ذخیره شد و بعد از اتصال اینترنت همگام سازی می‌شود.');
    }
  }

  async function deleteActivity(item: NafasActivity) {
    const confirmed = confirm('آیا از حذف این فعالیت مطمئن هستید؟');
    if (!confirmed) return;

    let next: NafasActivity[];

    if (item.remoteId) {
      next = activities.map(activity =>
        activity.id === item.id
          ? {
              ...activity,
              syncStatus: 'pending_delete',
              deletedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : activity,
      );
    } else {
      next = activities.filter(activity => activity.id !== item.id);
    }

    updateActivities(next);

    if (navigator.onLine) {
      await syncAndReload(next);
    } else {
      setSyncMessage('حذف فعالیت روی سیستم ثبت شد و بعد از اتصال اینترنت همگام سازی می‌شود.');
    }
  }

  if (view === 'form' && editing) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title={editing.title || 'ثبت فعالیت جدید'}
          onBack={() => setView('list')}
          action={
            <button onClick={saveActivity} type="button" className="btn-primary">
              ذخیره فعالیت
            </button>
          }
        />

        <div className="p-6 max-w-5xl mx-auto">
          <ActivityForm
            activityItem={editing}
            setActivityItem={setEditing}
            counties={counties}
            provinces={provinces}
            national={national}
            provinceAdmin={provinceAdmin}
            profile={profile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader
        title="فعالیت‌های نفس"
        onBack={onBack}
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
              onClick={openNew}
              type="button"
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} />
              ثبت فعالیت جدید
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
              ? 'برخط - اتصال به سرور مرکزی برقرار است'
              : 'برون خط (آفلاین) - تغییرات بعداً همگام سازی می‌شود'}
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
                  فعالیت ثبت‌شده
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard title="کل فعالیت‌ها" value={visibleActivities.length} />
          <StatCard
            title="آموزشی"
            value={visibleActivities.filter(item => item.type === 'آموزشی').length}
          />
          <StatCard
            title="فرهنگی"
            value={visibleActivities.filter(item => item.type === 'فرهنگی').length}
          />
          <StatCard
            title="دارای عکس"
            value={visibleActivities.filter(item => item.photos.length > 0).length}
          />
          <StatCard
            title="در انتظار همگام سازی"
            value={activities.filter(item => item.syncStatus !== 'synced').length}
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
            placeholder="جستجو بر اساس عنوان، نوع فعالیت، تاریخ، مکان، شهرستان، استان یا عبارت ثبت شده توسط..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1250px]">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    'عنوان فعالیت',
                    'ثبت‌شده توسط',
                    'استان',
                    'شهرستان / مرکز',
                    'نوع فعالیت',
                    'گروه هدف',
                    'تاریخ شمسی',
                    'مکان',
                    'تعداد عکس',
                    'وضعیت همگام سازی',
                    'عملیات',
                  ].map(header => (
                    <th
                      key={header}
                      className="px-4 py-3 text-right text-muted-foreground font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleActivities.map((item, index) => (
                  <tr
                    key={`${item.id}-${item.remoteId || 'local'}`}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      index % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3 text-foreground">
                      {item.title || 'بدون عنوان'}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold">
                        <Building2 size={12} />
                        {getRegisteredByText(item)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {item.provinceName || 'نامشخص'}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {getActivityPlaceText(item)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                        {item.type}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {item.targetGroup}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {toPersianNumber(item.date)}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {item.location || '-'}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {toPersianNumber(item.photos.length)}
                    </td>

                    <td className="px-4 py-3">
                      <SyncBadge item={item} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          type="button"
                          className="text-primary hover:underline text-xs flex items-center gap-1"
                        >
                          <Eye size={13} />
                          مشاهده / ویرایش
                        </button>

                        <button
                          onClick={() => deleteActivity(item)}
                          type="button"
                          className="text-destructive hover:underline text-xs flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {visibleActivities.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      هنوز فعالیتی ثبت نشده است.
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

function ActivityForm({
  activityItem,
  setActivityItem,
  provinces,
  counties,
  national,
  provinceAdmin,
  profile,
}: {
  activityItem: NafasActivity;
  setActivityItem: Dispatch<SetStateAction<NafasActivity | null>>;
  provinces: Province[];
  counties: County[];
  national: boolean;
  provinceAdmin: boolean;
  profile: OnlineProfile | null;
}) {
  const update = (patch: Partial<NafasActivity>) => {
    setActivityItem(prev => (prev ? { ...prev, ...patch } : prev));
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
      return activityItem.provinceId
        ? county.province_id === activityItem.provinceId
        : true;
    }

    return profile?.province_id
      ? county.province_id === profile.province_id
      : true;
  });

  const updatePhoto = (index: number, value: string) => {
    const nextPhotos = [...activityItem.photos];
    nextPhotos[index] = value;
    update({ photos: nextPhotos });
  };

  const addPhoto = () => {
    update({ photos: [...activityItem.photos, ''] });
  };

  const removePhoto = (index: number) => {
    update({
      photos: activityItem.photos.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div>
        <h3
          className="text-primary mb-1"
          style={{ fontSize: '1.1rem', fontWeight: 700 }}
        >
          اطلاعات فعالیت نفس
        </h3>

        <p className="text-sm text-muted-foreground">
          در این بخش می‌توانید فعالیت‌های آموزشی، فرهنگی، حمایتی، تفریحی و سایر اقدامات مرکز را ثبت کنید.
        </p>
      </div>

      <div className="border border-border rounded-2xl bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground mb-3 font-bold">
          محل ثبت فعالیت
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {national ? (
            <div>
              <Label text="استان مربوط به فعالیت" />
              <SelectProvince
                value={activityItem.provinceId}
                onChange={updateProvince}
                provinces={provinces}
              />
            </div>
          ) : (
            <ReadOnlyBox
              label="استان"
              value={profile?.province_name || activityItem.provinceName || 'نامشخص'}
            />
          )}

          {national || provinceAdmin ? (
            <div>
              <Label text="شهرستان / ثبت‌شده توسط" />
              <SelectCounty
                value={activityItem.countyId}
                onChange={updateCounty}
                counties={availableCounties}
                provinceName={
                  activityItem.provinceName ||
                  profile?.province_name ||
                  'خود استان'
                }
              />
            </div>
          ) : (
            <ReadOnlyBox
              label="ثبت‌شده توسط"
              value={profile?.county_name || activityItem.countyName || 'نامشخص'}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="عنوان فعالیت"
          value={activityItem.title}
          onChange={v => update({ title: v })}
          placeholder="مثلاً کارگاه آموزشی مراقبت از نوزاد"
        />

        <div>
          <Label text="نوع فعالیت" />
          <SelectField
            value={activityItem.type}
            onChange={v => update({ type: v })}
            options={ACTIVITY_TYPES}
          />
        </div>

        <div>
          <Label text="گروه هدف" />
          <SelectField
            value={activityItem.targetGroup}
            onChange={v => update({ targetGroup: v })}
            options={TARGET_GROUPS}
          />
        </div>

        <TextInput
          label="مرتبط با مادر / خانواده"
          value={activityItem.relatedTo}
          onChange={v => update({ relatedTo: v })}
          placeholder="نام مادر، خانواده یا گروه مرتبط"
        />

        <JalaliDatePicker
          label="تاریخ فعالیت"
          value={activityItem.date}
          onChange={v => update({ date: v })}
        />

        <TextInput
          label="مکان برگزاری"
          value={activityItem.location}
          onChange={v => update({ location: v })}
          placeholder="مثلاً مرکز نفس، مدرسه، مسجد، سالن اجتماعات"
        />

        <TextInput
          label="مسئول / برگزارکننده"
          value={activityItem.organizer}
          onChange={v => update({ organizer: v })}
          placeholder="نام مسئول یا تیم برگزارکننده"
        />

        <TextInput
          label="تعداد شرکت‌کنندگان"
          value={activityItem.participantsCount}
          onChange={v => update({ participantsCount: v })}
          placeholder="مثلاً 25"
        />
      </div>

      <TextAreaInput
        label="شرح فعالیت"
        value={activityItem.description}
        onChange={v => update({ description: v })}
        rows={4}
        placeholder="جزئیات کامل فعالیت، هدف، مخاطبان، روند برگزاری و نکات مهم"
      />

      <TextAreaInput
        label="نتیجه و دستاورد فعالیت"
        value={activityItem.result}
        onChange={v => update({ result: v })}
        rows={3}
        placeholder="نتیجه فعالیت، تعداد افراد بهره‌مند، بازخوردها و خروجی‌ها"
      />

      <div className="border border-border rounded-xl p-4 bg-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4
              className="text-foreground flex items-center gap-2"
              style={{ fontWeight: 700 }}
            >
              <ImageIcon size={16} />
              تصاویر فعالیت
            </h4>

            <p className="text-xs text-muted-foreground mt-1">
              امکان ثبت چند عکس برای هر فعالیت وجود دارد.
            </p>
          </div>

          <button
            onClick={addPhoto}
            type="button"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} />
            افزودن عکس
          </button>
        </div>

        <div className="space-y-4">
          {activityItem.photos.map((photo, index) => (
            <div
              key={`${index}-${photo}`}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-foreground" style={{ fontWeight: 600 }}>
                  عکس {toPersianNumber(index + 1)}
                </span>

                <button
                  onClick={() => removePhoto(index)}
                  type="button"
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <ImageUploader
                label="انتخاب / آپلود عکس"
                value={photo}
                onChange={v => updatePhoto(index, v)}
              />
            </div>
          ))}

          {activityItem.photos.length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
              هنوز عکسی برای این فعالیت ثبت نشده است.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SyncBadge({ item }: { item: NafasActivity }) {
  if (item.syncStatus === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-bold">
        <Cloud size={12} />
        همگام سازی‌شده
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
      در انتظار همگام سازی
    </span>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>

      <p className="text-2xl font-extrabold text-foreground">
        {toPersianNumber(value)}
      </p>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <label className="block text-sm text-muted-foreground mb-1">
      {text}
    </label>
  );
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

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label text={label} />

      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <Label text={label} />

      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="form-input resize-none"
      />
    </div>
  );
}