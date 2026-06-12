import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Stethoscope,
  Building2,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';

import { PageHeader } from './PageHeader';
import { toPersianNumber } from '../utils/jalali';
import { supabase } from '../utils/supabaseClient';
import { getCurrentOnlineUser } from '../utils/onlineAuth';

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

interface Doctor {
  id: string;
  remoteId?: string;
  deviceId: string;

  provinceId: string;
  provinceName: string;
  provinceCode: string;

  countyId: string;
  countyName: string;
  countyCode: string;

  fullName: string;
  specialty: string;
  medicalSystemCode: string;
  phone: string;
  phone2: string;
  clinicName: string;
  city: string;
  province: string;
  address: string;
  cooperationType: string;
  availability: string;
  notes: string;

  syncStatus: SyncStatus;
  syncError?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

const STORAGE_KEY = 'nafas_doctors';
const DEVICE_ID_KEY = 'nafas_device_id';
const SELECTED_PROVINCE_KEY = 'nafas_doctors_selected_province';
const SELECTED_COUNTY_KEY = 'nafas_doctors_selected_county';

const DOCTOR_SELECT = `
  id,
  local_id,
  device_id,
  province_id,
  county_id,
  full_name,
  specialty,
  medical_system_code,
  phone,
  phone2,
  clinic_name,
  city,
  province_text,
  address,
  cooperation_type,
  availability,
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

const SPECIALTIES = [
  'متخصص زنان و زایمان',
  'ماما',
  'پزشک عمومی',
  'متخصص اطفال',
  'روانشناس',
  'مشاور خانواده',
  'مددکار اجتماعی',
  'متخصص تغذیه',
  'سونوگرافی',
  'آزمایشگاه',
  'داروساز',
  'دندانپزشک',
  'روانپزشک',
  'وکیل / مشاور حقوقی',
  'سایر',
];

const COOPERATION_TYPES = [
  'همکار ثابت',
  'همکار افتخاری',
  'ارجاع موردی',
  'تخفیف خدمات',
  'خدمات رایگان',
  'مشاوره تلفنی',
  'سایر',
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

function getRegisteredByText(item: Doctor) {
  if (item.countyName) return `ثبت شده توسط ${item.countyName}`;
  if (item.provinceName) return `ثبت شده توسط ${item.provinceName}`;
  return 'ثبت کننده نامشخص';
}

function getPlaceText(item: Doctor) {
  if (item.countyName) return item.countyName;
  if (item.provinceName) return item.provinceName;
  return 'نامشخص';
}

function emptyDoctor(
  profile: OnlineProfile | null,
  selectedProvinceId: string,
  selectedCountyId: string,
  provinces: Province[],
  counties: County[],
): Doctor {
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

  return {
    id: makeId(),
    remoteId: '',
    deviceId: getDeviceId(),

    provinceId,
    provinceName,
    provinceCode,

    countyId,
    countyName,
    countyCode,

    fullName: '',
    specialty: 'متخصص زنان و زایمان',
    medicalSystemCode: '',
    phone: '',
    phone2: '',
    clinicName: '',
    city: '',
    province: provinceName,
    address: '',
    cooperationType: 'همکار افتخاری',
    availability: '',
    notes: '',

    syncStatus: 'pending',
    syncError: '',
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

function normalizeDoctor(
  item: any,
  profile: OnlineProfile | null,
  provinces: Province[],
  counties: County[],
): Doctor {
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
    item.province ||
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

    fullName: item.fullName || item.full_name || '',
    specialty: item.specialty || 'متخصص زنان و زایمان',
    medicalSystemCode:
      item.medicalSystemCode || item.medical_system_code || '',
    phone: item.phone || '',
    phone2: item.phone2 || '',
    clinicName: item.clinicName || item.clinic_name || '',
    city: item.city || '',
    province: item.province || item.province_text || provinceName,
    address: item.address || '',
    cooperationType:
      item.cooperationType || item.cooperation_type || 'همکار افتخاری',
    availability: item.availability || '',
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

function remoteToLocal(row: any): Doctor {
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

    fullName: row.full_name || '',
    specialty: row.specialty || 'متخصص زنان و زایمان',
    medicalSystemCode: row.medical_system_code || '',
    phone: row.phone || '',
    phone2: row.phone2 || '',
    clinicName: row.clinic_name || '',
    city: row.city || '',
    province: row.province_text || province.name || '',
    address: row.address || '',
    cooperationType: row.cooperation_type || 'همکار افتخاری',
    availability: row.availability || '',
    notes: row.notes || '',

    syncStatus: 'synced',
    syncError: '',
    updatedAt: row.client_updated_at || row.updated_at || new Date().toISOString(),
    deletedAt: row.deleted_at || null,
  };
}

function localToPayload(item: Doctor, profile: OnlineProfile | null) {
  return {
    local_id: item.id,
    device_id: item.deviceId || getDeviceId(),

    province_id: item.provinceId || null,
    county_id: item.countyId || null,

    full_name: item.fullName || '',
    specialty: item.specialty || '',
    medical_system_code: item.medicalSystemCode || '',
    phone: item.phone || '',
    phone2: item.phone2 || '',
    clinic_name: item.clinicName || '',
    city: item.city || '',
    province_text: item.province || item.provinceName || '',
    address: item.address || '',
    cooperation_type: item.cooperationType || '',
    availability: item.availability || '',
    notes: item.notes || '',

    created_by: profile?.id || null,
    updated_by: profile?.id || null,
    client_updated_at: item.updatedAt || new Date().toISOString(),
    deleted_at: item.deletedAt || null,
    updated_at: new Date().toISOString(),
  };
}

function getStableKey(item: Doctor) {
  return item.remoteId || item.id || `${item.fullName}-${item.phone}` || makeId();
}

function shouldKeepNew(current: Doctor, next: Doctor) {
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

function dedupeDoctors(items: Doctor[]) {
  const map = new Map<string, Doctor>();
  const aliasToKey = new Map<string, string>();

  items.forEach(item => {
    if (item.deletedAt) return;

    const scope = item.countyId || item.provinceId || 'unknown';

    const aliases = [
      item.id ? `id:${item.id}` : '',
      item.remoteId ? `remote:${item.remoteId}` : '',
      item.fullName && item.phone
        ? `natural:${item.fullName}-${item.phone}-${scope}`
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
): Doctor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const data = JSON.parse(raw);

    if (!Array.isArray(data)) return [];

    const normalized = data.map(item =>
      normalizeDoctor(item, profile, provinces, counties),
    );

    const cleaned = dedupeDoctors(normalized);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));

    return cleaned;
  } catch {
    return [];
  }
}

function saveItems(items: Doctor[]) {
  try {
    const cleaned = dedupeDoctors(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

function filterByUserScope(items: Doctor[], profile: OnlineProfile | null) {
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

async function fetchRemoteDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select(DOCTOR_SELECT)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return Array.isArray(data) ? data.map(remoteToLocal) : [];
}

async function syncOneDoctor(
  item: Doctor,
  profile: OnlineProfile | null,
): Promise<Doctor> {
  if (!item.provinceId) {
    return {
      ...item,
      syncStatus: 'error',
      syncError: 'استان پزشک مشخص نیست.',
    };
  }

  if (item.syncStatus === 'pending_delete') {
    if (item.remoteId) {
      const { error } = await supabase
        .from('doctors')
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
      .from('doctors')
      .update(payload)
      .eq('id', item.remoteId)
      .select(DOCTOR_SELECT)
      .single();

    if (error) throw error;

    return remoteToLocal(data);
  }

  const { data, error } = await supabase
    .from('doctors')
    .insert(payload)
    .select(DOCTOR_SELECT)
    .single();

  if (error) throw error;

  return remoteToLocal(data);
}

function mergeDoctors(localItems: Doctor[], remoteItems: Doctor[]) {
  const combined = [...remoteItems, ...localItems];

  return dedupeDoctors(combined).filter(item => !item.deletedAt);
}

export function DoctorsSection({ onBack }: Props) {
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
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [editing, setEditing] = useState<Doctor | null>(null);
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

        setDoctors(dedupeDoctors(local));

        if (navigator.onLine) {
          await syncAndReload(local, currentProfile);
        }
      } catch (error: any) {
        const local = filterByUserScope(
          loadItems(currentProfile, [], []),
          currentProfile,
        );

        setDoctors(dedupeDoctors(local));
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
    baseItems = doctors,
    currentProfile = profile,
  ) {
    try {
      setSyncing(true);
      setSyncMessage('در حال همگام‌سازی پزشکان و متخصصین...');

      let next = dedupeDoctors([...baseItems]);

      for (let i = 0; i < next.length; i++) {
        if (
          next[i].syncStatus === 'pending' ||
          next[i].syncStatus === 'pending_delete' ||
          next[i].syncStatus === 'error'
        ) {
          try {
            next[i] = await syncOneDoctor(next[i], currentProfile);
          } catch (error: any) {
            next[i] = {
              ...next[i],
              syncStatus: 'error',
              syncError: error?.message || 'خطا در همگام‌سازی',
            };
          }
        }
      }

      const remote = await fetchRemoteDoctors();

      const merged = filterByUserScope(
        mergeDoctors(next, remote),
        currentProfile,
      );

      const cleaned = dedupeDoctors(merged);

      setDoctors(cleaned);
      saveItems(cleaned);

      setSyncMessage('پزشکان و متخصصین با سرور مرکزی همگام شدند.');
    } catch (error: any) {
      setSyncMessage(error?.message || 'خطا در همگام‌سازی پزشکان');
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

  const visibleDoctors = useMemo(() => {
    let list = filterByUserScope(dedupeDoctors(doctors), profile);

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
          item.fullName,
          item.specialty,
          item.medicalSystemCode,
          item.phone,
          item.phone2,
          item.clinicName,
          item.city,
          item.province,
          item.provinceName,
          item.countyName,
          item.cooperationType,
          item.availability,
          getRegisteredByText(item),
          item.notes,
          item.syncStatus,
        ].join(' ');

        return text.includes(search.trim());
      });
    }

    return dedupeDoctors(list);
  }, [
    doctors,
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
      {
        key: string;
        name: string;
        count: number;
      }
    >();

    visibleDoctors.forEach(item => {
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
  }, [visibleDoctors]);

  const totalDoctors = visibleDoctors.length;
  const totalSpecialties = new Set(visibleDoctors.map(item => item.specialty)).size;
  const fixedCount = visibleDoctors.filter(
    item => item.cooperationType === 'همکار ثابت',
  ).length;
  const pendingCount = doctors.filter(item => item.syncStatus !== 'synced').length;

  function updateList(next: Doctor[]) {
    const cleaned = dedupeDoctors(next);
    setDoctors(cleaned);
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
      alert('برای ثبت پزشک توسط تهران، ابتدا استان را انتخاب کنید.');
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

    setEditing(
      emptyDoctor(
        profile,
        selectedProvinceId,
        selectedCountyId,
        provinces,
        counties,
      ),
    );

    setView('form');
  }

  function openEdit(item: Doctor) {
    setEditing({ ...item });
    setView('form');
  }

  async function saveDoctor() {
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
      alert('استان پزشک مشخص نیست.');
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

    const item: Doctor = {
      ...editing,

      provinceId,
      provinceName,
      provinceCode,

      countyId,
      countyName,
      countyCode,

      province: editing.province || provinceName,

      syncStatus: 'pending',
      syncError: '',
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deviceId: editing.deviceId || getDeviceId(),
    };

    let next = doctors.some(d => d.id === item.id)
      ? doctors.map(d => (d.id === item.id ? item : d))
      : [...doctors, item];

    next = dedupeDoctors(next);

    updateList(next);
    setEditing(null);
    setView('list');

    if (navigator.onLine) {
      try {
        setSyncing(true);

        const synced = await syncOneDoctor(item, profile);

        next = next.map(d => (d.id === item.id ? synced : d));
        next = dedupeDoctors(next);

        updateList(next);
        setSyncMessage('پزشک ذخیره و آنلاین شد.');
      } catch (error: any) {
        setSyncMessage(error?.message || 'پزشک محلی ذخیره شد اما آنلاین نشد.');
      } finally {
        setSyncing(false);
      }
    } else {
      setSyncMessage('پزشک روی سیستم ذخیره شد و بعد از اتصال اینترنت سینک می‌شود.');
    }
  }

  async function deleteDoctor(item: Doctor) {
    const confirmed = confirm('آیا از حذف این پزشک / متخصص مطمئن هستید؟');

    if (!confirmed) return;

    let next: Doctor[];

    if (item.remoteId) {
      next = doctors.map(doctor =>
        doctor.id === item.id
          ? {
              ...doctor,
              syncStatus: 'pending_delete',
              deletedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : doctor,
      );
    } else {
      next = doctors.filter(doctor => doctor.id !== item.id);
    }

    updateList(next);

    if (navigator.onLine) {
      await syncAndReload(next);
    } else {
      setSyncMessage('حذف پزشک روی سیستم ثبت شد و بعد از اتصال اینترنت سینک می‌شود.');
    }
  }

  function goBackDashboard() {
    saveItems(doctors);
    onBack();
  }

  if (view === 'form' && editing) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title={editing.fullName || 'ثبت پزشک / متخصص جدید'}
          onBack={() => setView('list')}
          action={
            <button type="button" onClick={saveDoctor} className="btn-primary">
              ذخیره پزشک
            </button>
          }
        />

        <div className="p-6 max-w-5xl mx-auto">
          <DoctorForm
            doctor={editing}
            setDoctor={setEditing}
            provinces={provinces}
            counties={counties}
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
        title="پزشکان و متخصصین"
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
              ثبت پزشک جدید
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
              ? 'مدیر تهران: مشاهده همه پزشکان کشور'
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
                  پزشک / متخصص ثبت‌شده
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <StatCard title="کل پزشکان" value={totalDoctors} icon={<Stethoscope size={20} />} />
          <StatCard title="تخصص‌ها" value={totalSpecialties} icon={<UserRound size={20} />} />
          <StatCard title="همکار ثابت" value={fixedCount} icon={<Building2 size={20} />} />
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
            placeholder="جستجو بر اساس نام، تخصص، شماره تماس، استان، شهرستان یا عبارت ثبت شده توسط..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1250px]">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    'نام پزشک / متخصص',
                    'ثبت‌شده توسط',
                    'استان',
                    'شهرستان / مرکز',
                    'تخصص',
                    'شماره نظام',
                    'شماره تماس',
                    'مرکز / کلینیک',
                    'نوع همکاری',
                    'وضعیت سینک',
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
                {visibleDoctors.map((item, index) => (
                  <tr
                    key={`${item.id}-${item.remoteId || 'local'}`}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      index % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3">{item.fullName || 'بدون نام'}</td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold">
                        <Building2 size={12} />
                        {getRegisteredByText(item)}
                      </span>
                    </td>

                    <td className="px-4 py-3">{item.provinceName || '-'}</td>
                    <td className="px-4 py-3">{getPlaceText(item)}</td>
                    <td className="px-4 py-3">{item.specialty}</td>
                    <td className="px-4 py-3">
                      {toPersianNumber(item.medicalSystemCode || '-')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Phone size={13} />
                        {toPersianNumber(item.phone || '-')}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.clinicName || '-'}</td>
                    <td className="px-4 py-3">{item.cooperationType || '-'}</td>

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
                          onClick={() => deleteDoctor(item)}
                          className="text-destructive hover:underline text-xs flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {visibleDoctors.length === 0 && (
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

function DoctorForm({
  doctor,
  setDoctor,
  provinces,
  counties,
  national,
  provinceAdmin,
  profile,
}: {
  doctor: Doctor;
  setDoctor: Dispatch<SetStateAction<Doctor | null>>;
  provinces: Province[];
  counties: County[];
  national: boolean;
  provinceAdmin: boolean;
  profile: OnlineProfile | null;
}) {
  const update = (patch: Partial<Doctor>) => {
    setDoctor(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const updateProvince = (provinceId: string) => {
    const province = provinces.find(p => p.id === provinceId);

    update({
      provinceId,
      provinceName: province?.name || '',
      provinceCode: province?.code || '',
      province: province?.name || '',
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
      return doctor.provinceId
        ? county.province_id === doctor.provinceId
        : true;
    }

    return profile?.province_id
      ? county.province_id === profile.province_id
      : true;
  });

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div>
        <h3 className="text-primary" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
          اطلاعات پزشک / متخصص
        </h3>

        <p className="text-xs text-muted-foreground mt-1">
          مشخصات پزشک، تخصص، نوع همکاری و محل ثبت را وارد کنید.
        </p>
      </div>

      <div className="border border-border rounded-2xl bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground mb-3 font-bold">
          محل ثبت پزشک
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {national ? (
            <div>
              <Label text="استان مربوط به پزشک" />

              <SelectProvince
                value={doctor.provinceId}
                onChange={updateProvince}
                provinces={provinces}
              />
            </div>
          ) : (
            <ReadOnlyBox
              label="استان"
              value={profile?.province_name || doctor.provinceName || 'نامشخص'}
            />
          )}

          {national || provinceAdmin ? (
            <div>
              <Label text="شهرستان / ثبت‌شده توسط" />

              <SelectCounty
                value={doctor.countyId}
                onChange={updateCounty}
                counties={availableCounties}
                provinceName={
                  doctor.provinceName ||
                  profile?.province_name ||
                  'خود استان'
                }
              />
            </div>
          ) : (
            <ReadOnlyBox
              label="ثبت‌شده توسط"
              value={profile?.county_name || doctor.countyName || 'نامشخص'}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="نام و نام خانوادگی"
          value={doctor.fullName}
          onChange={v => update({ fullName: v })}
        />

        <div>
          <Label text="تخصص / نقش" />

          <SelectField
            value={doctor.specialty}
            onChange={v => update({ specialty: v })}
            options={SPECIALTIES}
          />
        </div>

        <TextInput
          label="شماره نظام پزشکی / کد"
          value={doctor.medicalSystemCode}
          onChange={v => update({ medicalSystemCode: v })}
        />

        <TextInput
          label="شماره تماس"
          value={doctor.phone}
          onChange={v => update({ phone: v })}
        />

        <TextInput
          label="شماره تماس دوم"
          value={doctor.phone2}
          onChange={v => update({ phone2: v })}
        />

        <TextInput
          label="نام مرکز / کلینیک"
          value={doctor.clinicName}
          onChange={v => update({ clinicName: v })}
        />

        <TextInput
          label="شهر"
          value={doctor.city}
          onChange={v => update({ city: v })}
        />

        <TextInput
          label="استان متنی"
          value={doctor.province}
          onChange={v => update({ province: v })}
        />

        <div>
          <Label text="نوع همکاری" />

          <SelectField
            value={doctor.cooperationType}
            onChange={v => update({ cooperationType: v })}
            options={COOPERATION_TYPES}
          />
        </div>

        <TextInput
          label="زمان‌های همکاری / توضیح کوتاه"
          value={doctor.availability}
          onChange={v => update({ availability: v })}
        />
      </div>

      <TextAreaInput
        label="آدرس"
        value={doctor.address}
        onChange={v => update({ address: v })}
        rows={2}
      />

      <TextAreaInput
        label="توضیحات"
        value={doctor.notes}
        onChange={v => update({ notes: v })}
        rows={3}
      />
    </div>
  );
}

function SyncBadge({ item }: { item: Doctor }) {
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