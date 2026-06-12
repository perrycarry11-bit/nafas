import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  BarChart3,
  Activity,
  MapPin,
  Users,
  RefreshCw,
  ShieldCheck,
  Baby,
  Heart,
  DollarSign,
} from 'lucide-react';

import { JalaliDatePicker } from './JalaliDatePicker';
import { supabase } from '../utils/supabaseClient';
import { getCurrentOnlineUser } from '../utils/onlineAuth';

interface Props {
  onBack: () => void;
}

type ReportType =
  | 'overview'
  | 'activities'
  | 'provinces'
  | 'mothers'
  | 'children'
  | 'costs'
  | 'services'
  | 'aids';

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

interface ActivityReportRow {
  id: string;
  province_id: string;
  province_name: string;
  county_id: string;
  county_name: string;
  registered_by: string;

  title: string;
  activity_type: string;
  target_group: string;
  activity_date: string;
  location: string;
  organizer: string;
  participants_count: number;
  description: string;
  result: string;
  photos_count: number;
  created_at?: string;
  updated_at?: string;
}

interface MotherReportRow {
  id: string;
  province_id: string;
  province_name: string;
  county_id: string;
  county_name: string;
  registered_by: string;

  tracking_code: string;
  name: string;
  nationalId: string;
  phone: string;
  status: string;
  joinDate: string;

  children_count: number;
  costs_total: number;
  services_count: number;

  children: any[];
  costs: any[];
  services: any[];
}

interface ChildReportRow {
  id: string;
  mother_name: string;
  province_name: string;
  county_name: string;
  registered_by: string;
  name: string;
  gender: string;
  birthDate: string;
  disease: string;
}

interface CostReportRow {
  id: string;
  mother_name: string;
  province_name: string;
  county_name: string;
  registered_by: string;
  title: string;
  amount: number;
  date: string;
}

interface ServiceReportRow {
  id: string;
  mother_name: string;
  province_name: string;
  county_name: string;
  registered_by: string;
  type: string;
  desc: string;
  date: string;
}

interface SummaryRow {
  key: string;
  province_id: string;
  province_name: string;
  county_id: string;
  county_name: string;
  registered_by: string;
  mothers_count: number;
  children_count: number;
  activities_count: number;
  participants_count: number;
  photos_count: number;
  costs_total: number;
  services_count: number;
}

function toPersianNumber(input: string | number) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  return input.toString().replace(/\d/g, digit => persianDigits[Number(digit)]);
}

function formatJalaliDisplay(date: string) {
  if (!date) return '-';

  return date.split('/').map(part => toPersianNumber(part)).join('/');
}

function gregorianToJalaliDisplay(value: string) {
  if (!value) return '';

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(date)
      .replace(/\u200e/g, '');
  } catch {
    return '';
  }
}

function toEnglishDigits(value: string) {
  return String(value || '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function parseRial(value: any) {
  const cleaned = toEnglishDigits(String(value || ''))
    .replace(/,/g, '')
    .replace(/[^\d]/g, '');

  const result = parseInt(cleaned || '0', 10);

  return Number.isFinite(result) ? result : 0;
}

function formatRial(value: number) {
  return `${toPersianNumber(value.toLocaleString('en-US'))} ریال`;
}

function getRelationObject(relation: any) {
  if (!relation) return {};
  if (Array.isArray(relation)) return relation[0] || {};
  return relation || {};
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

function getRegisteredByText(countyName: string, provinceName: string) {
  if (countyName) return `ثبت شده توسط ${countyName}`;
  if (provinceName) return `ثبت شده توسط ${provinceName}`;
  return 'ثبت کننده نامشخص';
}

function normalizeActivity(row: any): ActivityReportRow {
  const province = getRelationObject(row.provinces);
  const county = getRelationObject(row.counties);

  const provinceName = province.name || 'نامشخص';
  const countyName = county.name || '';

  return {
    id: row.id,
    province_id: row.province_id || '',
    province_name: provinceName,
    county_id: row.county_id || '',
    county_name: countyName,
    registered_by: getRegisteredByText(countyName, provinceName),

    title: row.title || 'بدون عنوان',
    activity_type: row.activity_type || 'نامشخص',
    target_group: row.target_group || 'نامشخص',
    activity_date: row.activity_date || '',
    location: row.location || '',
    organizer: row.organizer || '',
    participants_count: Number(row.participants_count || 0),
    description: row.description || '',
    result: row.result || '',
    photos_count: Array.isArray(row.photos) ? row.photos.length : 0,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function normalizeMother(row: any): MotherReportRow {
  const province = getRelationObject(row.provinces);
  const county = getRelationObject(row.counties);

  const provinceName = province.name || row.province_text || 'نامشخص';
  const countyName = county.name || '';

  const children = Array.isArray(row.children) ? row.children : [];
  const costs = Array.isArray(row.costs) ? row.costs : [];
  const services = Array.isArray(row.services) ? row.services : [];

  const firstName = row.first_name || '';
  const lastName = row.last_name || '';
  const name = `${firstName} ${lastName}`.trim() || 'بدون نام';

  const costsTotal = costs.reduce(
    (sum: number, cost: any) => sum + parseRial(cost.amount),
    0,
  );

  return {
    id: row.id,
    province_id: row.province_id || '',
    province_name: provinceName,
    county_id: row.county_id || '',
    county_name: countyName,
    registered_by: getRegisteredByText(countyName, provinceName),

    tracking_code: row.tracking_code || '',
    name,
    nationalId: row.national_id || '',
    phone: row.phone || '',
    status: row.pregnancy_status || 'در حال پیگیری',
    joinDate:
      row.join_date ||
      gregorianToJalaliDisplay(row.created_at || row.client_updated_at || row.updated_at),

    children_count: children.length,
    costs_total: costsTotal,
    services_count: services.length,

    children,
    costs,
    services,
  };
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map(row =>
      row
        .map(cell => {
          const value = String(cell ?? '').replace(/"/g, '""');
          return `"${value}"`;
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function ReportsSection({ onBack }: Props) {
  const [reportType, setReportType] = useState<ReportType>('overview');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState('all');
  const [selectedCountyId, setSelectedCountyId] = useState('all');

  const [activities, setActivities] = useState<ActivityReportRow[]>([]);
  const [mothersData, setMothersData] = useState<MotherReportRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('گزارش‌ها آماده هستند.');

  const national = isNationalAdmin(profile);
  const provinceAdmin = isProvinceAdmin(profile);
  const countyUser = isCountyUser(profile);

  useEffect(() => {
    async function init() {
      let currentProfile = getCurrentProfile();

      try {
        if (navigator.onLine) {
          const fresh = await getCurrentOnlineUser();

          if (fresh) {
            currentProfile = fresh as any;
          }
        }
      } catch {
        // اگر آنلاین نبود یا نشست مشکل داشت، از پروفایل ذخیره‌شده استفاده می‌شود
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

      await loadReportData(currentProfile);
    }

    init();
  }, []);

  async function loadReportData(currentProfile = profile) {
    try {
      setLoading(true);

      const nationalUser = isNationalAdmin(currentProfile);
      const provinceUser = isProvinceAdmin(currentProfile);
      const staffUser = isCountyUser(currentProfile);

      if (nationalUser) {
        setMessage('در حال دریافت گزارش همه استان‌ها و شهرستان‌ها از سرور مرکزی...');
      } else if (provinceUser) {
        setMessage(`در حال دریافت گزارش استان ${currentProfile?.province_name || ''}...`);
      } else {
        setMessage(`در حال دریافت گزارش شهرستان ${currentProfile?.county_name || ''}...`);
      }

      const provincesResult = await supabase
        .from('provinces')
        .select('id, code, name')
        .order('name', { ascending: true });

      if (provincesResult.error) throw provincesResult.error;

      const allProvinces = Array.isArray(provincesResult.data)
        ? provincesResult.data
        : [];

      const countiesResult = await supabase
        .from('counties')
        .select('id, province_id, code, name, is_active')
        .order('name', { ascending: true });

      if (countiesResult.error) throw countiesResult.error;

      const allCounties = Array.isArray(countiesResult.data)
        ? countiesResult.data
        : [];

      if (nationalUser) {
        setProvinces(allProvinces);
        setCounties(allCounties);
      } else {
        setProvinces(
          allProvinces.filter(province => province.id === currentProfile?.province_id),
        );

        setCounties(
          allCounties.filter(county => county.province_id === currentProfile?.province_id),
        );
      }

      let activitiesQuery = supabase
        .from('activities')
        .select(
          `
          id,
          province_id,
          county_id,
          title,
          activity_type,
          target_group,
          activity_date,
          location,
          organizer,
          participants_count,
          description,
          result,
          photos,
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
        `,
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      let mothersQuery = supabase
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
          province_text,
          pregnancy_status,
          children,
          costs,
          services,
          deleted_at,
          created_at,
          updated_at,
          client_updated_at,
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
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (!nationalUser) {
        if (!currentProfile?.province_id) {
          setActivities([]);
          setMothersData([]);
          setMessage('استان این کاربر مشخص نیست؛ گزارشی برای نمایش وجود ندارد.');
          return;
        }

        activitiesQuery = activitiesQuery.eq('province_id', currentProfile.province_id);
        mothersQuery = mothersQuery.eq('province_id', currentProfile.province_id);
      }

      if (staffUser) {
        if (!currentProfile?.county_id) {
          setActivities([]);
          setMothersData([]);
          setMessage('شهرستان این کاربر مشخص نیست؛ گزارشی برای نمایش وجود ندارد.');
          return;
        }

        activitiesQuery = activitiesQuery.eq('county_id', currentProfile.county_id);
        mothersQuery = mothersQuery.eq('county_id', currentProfile.county_id);
      }

      const [activitiesResult, mothersResult] = await Promise.all([
        activitiesQuery,
        mothersQuery,
      ]);

      if (activitiesResult.error) throw activitiesResult.error;
      if (mothersResult.error) throw mothersResult.error;

      const activityRows = Array.isArray(activitiesResult.data)
        ? activitiesResult.data.map(normalizeActivity)
        : [];

      const motherRows = Array.isArray(mothersResult.data)
        ? mothersResult.data.map(normalizeMother)
        : [];

      setActivities(activityRows);
      setMothersData(motherRows);

      if (nationalUser) {
        setMessage('گزارش همه استان‌ها و شهرستان‌ها با سرور مرکزی به‌روزرسانی شد.');
      } else if (provinceUser) {
        setMessage(`گزارش استان ${currentProfile?.province_name || ''} به‌روزرسانی شد.`);
      } else {
        setMessage(`فقط گزارش شهرستان ${currentProfile?.county_name || ''} نمایش داده می‌شود.`);
      }
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || 'خطا در دریافت گزارش‌ها');
    } finally {
      setLoading(false);
    }
  }

  const countyOptions = useMemo(() => {
    if (national) {
      if (selectedProvinceId === 'all') return counties;

      return counties.filter(county => county.province_id === selectedProvinceId);
    }

    if (profile?.province_id) {
      return counties.filter(county => county.province_id === profile.province_id);
    }

    return counties;
  }, [counties, national, selectedProvinceId, profile]);

  function filterScope<T extends { province_id: string; county_id: string }>(items: T[]) {
    let list = [...items];

    if (national && selectedProvinceId !== 'all') {
      list = list.filter(item => item.province_id === selectedProvinceId);
    }

    if ((national || provinceAdmin) && selectedCountyId !== 'all') {
      if (selectedCountyId === 'province') {
        list = list.filter(item => !item.county_id);
      } else {
        list = list.filter(item => item.county_id === selectedCountyId);
      }
    }

    if (countyUser && profile?.county_id) {
      list = list.filter(item => item.county_id === profile.county_id);
    }

    return list;
  }

  const filteredActivities = useMemo(() => {
    let list = filterScope(activities);

    if (fromDate) {
      list = list.filter(item => item.activity_date >= fromDate);
    }

    if (toDate) {
      list = list.filter(item => item.activity_date <= toDate);
    }

    if (search.trim()) {
      list = list.filter(item => {
        const text = [
          item.province_name,
          item.county_name,
          item.registered_by,
          item.title,
          item.activity_type,
          item.target_group,
          item.activity_date,
          item.location,
          item.organizer,
          item.description,
          item.result,
        ].join(' ');

        return text.includes(search.trim());
      });
    }

    return list;
  }, [
    activities,
    national,
    provinceAdmin,
    countyUser,
    selectedProvinceId,
    selectedCountyId,
    fromDate,
    toDate,
    search,
    profile,
  ]);

  const filteredMothers = useMemo(() => {
    let list = filterScope(mothersData);

    if (fromDate) {
      list = list.filter(item => !item.joinDate || item.joinDate >= fromDate);
    }

    if (toDate) {
      list = list.filter(item => !item.joinDate || item.joinDate <= toDate);
    }

    if (search.trim()) {
      list = list.filter(item => {
        const text = [
          item.province_name,
          item.county_name,
          item.registered_by,
          item.tracking_code,
          item.name,
          item.nationalId,
          item.phone,
          item.status,
          item.joinDate,
        ].join(' ');

        return text.includes(search.trim());
      });
    }

    return list;
  }, [
    mothersData,
    national,
    provinceAdmin,
    countyUser,
    selectedProvinceId,
    selectedCountyId,
    fromDate,
    toDate,
    search,
    profile,
  ]);

  const childrenRows = useMemo<ChildReportRow[]>(() => {
    return filteredMothers.flatMap(mother =>
      mother.children.map((child: any, index: number) => ({
        id: `${mother.id}-child-${index}`,
        mother_name: mother.name,
        province_name: mother.province_name,
        county_name: mother.county_name || mother.province_name,
        registered_by: mother.registered_by,
        name: child.name || 'بدون نام',
        gender: child.gender || '',
        birthDate: child.birthDate || '',
        disease: child.disease || '',
      })),
    );
  }, [filteredMothers]);

  const costRows = useMemo<CostReportRow[]>(() => {
    return filteredMothers.flatMap(mother =>
      mother.costs.map((cost: any, index: number) => ({
        id: `${mother.id}-cost-${index}`,
        mother_name: mother.name,
        province_name: mother.province_name,
        county_name: mother.county_name || mother.province_name,
        registered_by: mother.registered_by,
        title: cost.title || 'بدون عنوان',
        amount: parseRial(cost.amount),
        date: cost.date || '',
      })),
    );
  }, [filteredMothers]);

  const serviceRows = useMemo<ServiceReportRow[]>(() => {
    return filteredMothers.flatMap(mother =>
      mother.services.map((service: any, index: number) => ({
        id: `${mother.id}-service-${index}`,
        mother_name: mother.name,
        province_name: mother.province_name,
        county_name: mother.county_name || mother.province_name,
        registered_by: mother.registered_by,
        type: service.type || 'نامشخص',
        desc: service.desc || '',
        date: service.date || '',
      })),
    );
  }, [filteredMothers]);

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const map = new Map<string, SummaryRow>();

    filteredActivities.forEach(item => {
      const key = item.county_id || `province:${item.province_id}`;

      const current =
        map.get(key) ||
        {
          key,
          province_id: item.province_id,
          province_name: item.province_name,
          county_id: item.county_id,
          county_name: item.county_name || item.province_name,
          registered_by: item.registered_by,
          mothers_count: 0,
          children_count: 0,
          activities_count: 0,
          participants_count: 0,
          photos_count: 0,
          costs_total: 0,
          services_count: 0,
        };

      current.activities_count += 1;
      current.participants_count += item.participants_count || 0;
      current.photos_count += item.photos_count || 0;

      map.set(key, current);
    });

    filteredMothers.forEach(item => {
      const key = item.county_id || `province:${item.province_id}`;

      const current =
        map.get(key) ||
        {
          key,
          province_id: item.province_id,
          province_name: item.province_name,
          county_id: item.county_id,
          county_name: item.county_name || item.province_name,
          registered_by: item.registered_by,
          mothers_count: 0,
          children_count: 0,
          activities_count: 0,
          participants_count: 0,
          photos_count: 0,
          costs_total: 0,
          services_count: 0,
        };

      current.mothers_count += 1;
      current.children_count += item.children_count || 0;
      current.costs_total += item.costs_total || 0;
      current.services_count += item.services_count || 0;

      map.set(key, current);
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        b.mothers_count +
        b.activities_count -
        (a.mothers_count + a.activities_count),
    );
  }, [filteredActivities, filteredMothers]);

  const provinceSummary = useMemo<SummaryRow[]>(() => {
    const map = new Map<string, SummaryRow>();

    summaryRows.forEach(item => {
      const key = item.province_id || 'unknown';

      const current =
        map.get(key) ||
        {
          key,
          province_id: item.province_id,
          province_name: item.province_name,
          county_id: '',
          county_name: item.province_name,
          registered_by: `جمع استان ${item.province_name}`,
          mothers_count: 0,
          children_count: 0,
          activities_count: 0,
          participants_count: 0,
          photos_count: 0,
          costs_total: 0,
          services_count: 0,
        };

      current.mothers_count += item.mothers_count;
      current.children_count += item.children_count;
      current.activities_count += item.activities_count;
      current.participants_count += item.participants_count;
      current.photos_count += item.photos_count;
      current.costs_total += item.costs_total;
      current.services_count += item.services_count;

      map.set(key, current);
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        b.mothers_count +
        b.activities_count -
        (a.mothers_count + a.activities_count),
    );
  }, [summaryRows]);

  const totalMothers = filteredMothers.length;
  const totalChildren = filteredMothers.reduce(
    (sum, item) => sum + item.children_count,
    0,
  );
  const totalCosts = filteredMothers.reduce(
    (sum, item) => sum + item.costs_total,
    0,
  );
  const totalServices = filteredMothers.reduce(
    (sum, item) => sum + item.services_count,
    0,
  );
  const totalActivities = filteredActivities.length;
  const totalParticipants = filteredActivities.reduce(
    (sum, item) => sum + item.participants_count,
    0,
  );
  const totalPhotos = filteredActivities.reduce(
    (sum, item) => sum + item.photos_count,
    0,
  );

  function handleExportCSV() {
    if (reportType === 'overview' || reportType === 'provinces') {
      downloadCSV('nafas-summary-report.csv', [
        [
          'استان',
          'شهرستان / مرکز',
          'ثبت‌شده توسط',
          'تعداد مادر',
          'تعداد فرزند',
          'تعداد فعالیت',
          'شرکت‌کنندگان',
          'عکس فعالیت',
          'هزینه‌ها',
          'خدمات',
        ],
        ...summaryRows.map(item => [
          item.province_name,
          item.county_name,
          item.registered_by,
          String(item.mothers_count),
          String(item.children_count),
          String(item.activities_count),
          String(item.participants_count),
          String(item.photos_count),
          String(item.costs_total),
          String(item.services_count),
        ]),
      ]);

      return;
    }

    if (reportType === 'activities') {
      downloadCSV('nafas-activities-report.csv', [
        [
          'استان',
          'شهرستان / مرکز',
          'ثبت‌شده توسط',
          'عنوان فعالیت',
          'نوع فعالیت',
          'گروه هدف',
          'تاریخ',
          'مکان',
          'برگزارکننده',
          'تعداد شرکت‌کنندگان',
          'تعداد عکس',
          'شرح',
          'نتیجه',
        ],
        ...filteredActivities.map(item => [
          item.province_name,
          item.county_name || item.province_name,
          item.registered_by,
          item.title,
          item.activity_type,
          item.target_group,
          item.activity_date,
          item.location,
          item.organizer,
          String(item.participants_count),
          String(item.photos_count),
          item.description,
          item.result,
        ]),
      ]);

      return;
    }

    if (reportType === 'mothers') {
      downloadCSV('nafas-mothers-report.csv', [
        [
          'استان',
          'شهرستان / مرکز',
          'ثبت‌شده توسط',
          'کد پرونده',
          'نام',
          'کد ملی',
          'شماره تماس',
          'وضعیت',
          'تعداد فرزند',
          'هزینه‌ها',
          'خدمات',
          'تاریخ ثبت',
        ],
        ...filteredMothers.map(item => [
          item.province_name,
          item.county_name || item.province_name,
          item.registered_by,
          item.tracking_code,
          item.name,
          item.nationalId,
          item.phone,
          item.status,
          String(item.children_count),
          String(item.costs_total),
          String(item.services_count),
          item.joinDate,
        ]),
      ]);

      return;
    }

    if (reportType === 'children') {
      downloadCSV('nafas-children-report.csv', [
        ['استان', 'شهرستان / مرکز', 'ثبت‌شده توسط', 'نام مادر', 'نام فرزند', 'جنسیت', 'تاریخ تولد', 'بیماری'],
        ...childrenRows.map(item => [
          item.province_name,
          item.county_name,
          item.registered_by,
          item.mother_name,
          item.name,
          item.gender,
          item.birthDate,
          item.disease,
        ]),
      ]);

      return;
    }

    if (reportType === 'costs') {
      downloadCSV('nafas-costs-report.csv', [
        ['استان', 'شهرستان / مرکز', 'ثبت‌شده توسط', 'نام مادر', 'عنوان هزینه', 'مبلغ', 'تاریخ'],
        ...costRows.map(item => [
          item.province_name,
          item.county_name,
          item.registered_by,
          item.mother_name,
          item.title,
          String(item.amount),
          item.date,
        ]),
      ]);

      return;
    }

    if (reportType === 'services') {
      downloadCSV('nafas-services-report.csv', [
        ['استان', 'شهرستان / مرکز', 'ثبت‌شده توسط', 'نام مادر', 'نوع خدمت', 'توضیحات', 'تاریخ'],
        ...serviceRows.map(item => [
          item.province_name,
          item.county_name,
          item.registered_by,
          item.mother_name,
          item.type,
          item.desc,
          item.date,
        ]),
      ]);

      return;
    }

    alert('گزارش خیرین بعد از اصلاح بخش خیرین آنلاین می‌شود.');
  }

  const reportTabs: { key: ReportType; label: string }[] = [
    {
      key: 'overview',
      label: national
        ? 'خلاصه کشوری'
        : provinceAdmin
          ? 'خلاصه استان'
          : 'خلاصه شهرستان',
    },
    { key: 'provinces', label: national ? 'گزارش استان‌ها' : 'گزارش شهرستان‌ها' },
    { key: 'mothers', label: 'مادران' },
    { key: 'children', label: 'فرزندان' },
    { key: 'activities', label: 'فعالیت‌های نفس' },
    { key: 'costs', label: 'هزینه‌ها' },
    { key: 'services', label: 'خدمات' },
    { key: 'aids', label: 'کمک‌های خیرین' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4 print:hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary"
              type="button"
            >
              <ArrowRight size={18} />
            </button>

            <div>
              <h2 className="text-foreground font-bold text-lg">
                مدیریت گزارش‌ها
              </h2>

              <p className="text-xs text-muted-foreground mt-1">
                {national
                  ? 'مدیر تهران: مشاهده مجموع کشور، استان‌ها و شهرستان‌ها'
                  : provinceAdmin
                    ? `مدیر استان: گزارش استان ${profile?.province_name || 'نامشخص'}`
                    : `کاربر شهرستان: فقط گزارش ${profile?.county_name || 'شهرستان خودتان'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadReportData()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-card border border-border text-foreground"
              type="button"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              به‌روزرسانی
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              type="button"
            >
              <FileSpreadsheet size={15} />
              خروجی اکسل
            </button>

            <button
              onClick={() => window.print()}
              className="bg-primary text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              type="button"
            >
              <Printer size={15} />
              چاپ / PDF
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-xs print:hidden flex items-center gap-2 ${
            national
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : countyUser
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <ShieldCheck size={15} />
          {national
            ? 'شما با حساب تهران وارد شده‌اید؛ می‌توانید همه کشور، استان‌ها و شهرستان‌ها را ببینید.'
            : countyUser
              ? `شما با حساب شهرستان ${profile?.county_name || ''} وارد شده‌اید؛ فقط گزارش همین شهرستان نمایش داده می‌شود.`
              : `شما با حساب استان ${profile?.province_name || ''} وارد شده‌اید؛ می‌توانید همه شهرستان‌های استان را تفکیکی یا مجموع ببینید.`}
        </div>

        <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground print:hidden">
          {message}
        </div>

        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 overflow-x-auto print:hidden border border-border">
          {reportTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setReportType(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap ${
                reportType === t.key
                  ? 'bg-card text-primary shadow-sm border'
                  : 'text-muted-foreground'
              }`}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="جستجو در گزارش با نام، کد، استان، شهرستان یا عبارت ثبت شده توسط..."
                className="w-full pr-9 pl-4 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-muted-foreground"
              type="button"
            >
              <Filter size={14} />
              فیلتر
            </button>
          </div>

          {showFilters && (
            <div
              className={`grid gap-4 pt-4 border-t border-border mt-4 ${
                national ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'
              }`}
            >
              {national && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    انتخاب استان
                  </label>

                  <select
                    value={selectedProvinceId}
                    onChange={e => {
                      setSelectedProvinceId(e.target.value);
                      setSelectedCountyId('all');
                    }}
                    className="form-input"
                  >
                    <option value="all">همه کشور / مجموع همه استان‌ها</option>

                    {provinces.map(province => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!national && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    استان
                  </label>

                  <div className="form-input bg-muted/40 text-primary font-bold">
                    {profile?.province_name || 'استان نامشخص'}
                  </div>
                </div>
              )}

              {(national || provinceAdmin) && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    شهرستان / ثبت‌شده توسط
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
              )}

              <JalaliDatePicker
                label="از تاریخ"
                value={fromDate}
                onChange={setFromDate}
                placeholder="تاریخ شروع"
              />

              <JalaliDatePicker
                label="تا تاریخ"
                value={toDate}
                onChange={setToDate}
                placeholder="تاریخ پایان"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <ReportCard title="کل مادران" value={totalMothers} icon={<Heart size={20} />} />
          <ReportCard title="کل فرزندان" value={totalChildren} icon={<Baby size={20} />} />
          <ReportCard title="فعالیت‌ها" value={totalActivities} icon={<Activity size={20} />} />
          <ReportCard title="شرکت‌کنندگان" value={totalParticipants} icon={<Users size={20} />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <ReportCard title="خدمات ثبت‌شده" value={totalServices} icon={<BarChart3 size={20} />} />
          <ReportCard title="عکس‌های فعالیت" value={totalPhotos} icon={<MapPin size={20} />} />
          <ReportCard title="ردیف‌های هزینه" value={costRows.length} icon={<DollarSign size={20} />} />
          <ReportCard title="مبلغ کل هزینه‌ها" valueText={formatRial(totalCosts)} icon={<DollarSign size={20} />} />
        </div>

        {reportType === 'overview' && (
          <OverviewReport
            summaryRows={summaryRows}
            provinceSummary={provinceSummary}
            activities={filteredActivities}
            national={national}
          />
        )}

        {reportType === 'provinces' && (
          <SummaryReport
            title={national ? 'گزارش تفکیکی استان‌ها' : 'گزارش تفکیکی شهرستان‌ها و مرکز استان'}
            rows={national ? provinceSummary : summaryRows}
          />
        )}

        {reportType === 'activities' && (
          <ActivitiesReport activities={filteredActivities} />
        )}

        {reportType === 'mothers' && (
          <MothersReport mothers={filteredMothers} />
        )}

        {reportType === 'children' && (
          <ChildrenReport children={childrenRows} />
        )}

        {reportType === 'costs' && (
          <CostsReport costs={costRows} />
        )}

        {reportType === 'services' && (
          <ServicesReport services={serviceRows} />
        )}

        {reportType === 'aids' && (
          <ComingSoonReport />
        )}
      </div>
    </div>
  );
}

function ReportCard({
  title,
  value,
  valueText,
  icon,
}: {
  title: string;
  value?: number;
  valueText?: string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{title}</p>

          <span
            className="text-foreground"
            style={{ fontSize: '1.35rem', fontWeight: 800 }}
          >
            {valueText || toPersianNumber(value || 0)}
          </span>
        </div>

        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function OverviewReport({
  summaryRows,
  provinceSummary,
  activities,
  national,
}: {
  summaryRows: SummaryRow[];
  provinceSummary: SummaryRow[];
  activities: ActivityReportRow[];
  national: boolean;
}) {
  const latest = activities.slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SummaryReport
        title={national ? 'خلاصه استان‌ها' : 'خلاصه شهرستان‌ها'}
        rows={national ? provinceSummary.slice(0, 6) : summaryRows.slice(0, 6)}
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-bold text-foreground">
          آخرین فعالیت‌های ثبت‌شده
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['ثبت‌شده توسط', 'عنوان', 'نوع', 'تاریخ'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {latest.map(item => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">{item.registered_by}</td>
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.activity_type}</td>
                <td className="px-4 py-3">
                  {formatJalaliDisplay(item.activity_date)}
                </td>
              </tr>
            ))}

            {latest.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  هنوز فعالیتی ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryReport({
  title,
  rows,
}: {
  title: string;
  rows: SummaryRow[];
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border font-bold text-foreground">
        {title}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1050px]">
          <thead className="bg-muted/50">
            <tr>
              {[
                'استان',
                'شهرستان / مرکز',
                'ثبت‌شده توسط',
                'مادران',
                'فرزندان',
                'فعالیت',
                'شرکت‌کنندگان',
                'عکس',
                'هزینه‌ها',
                'خدمات',
              ].map(h => (
                <th key={h} className="px-4 py-3 text-right text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map(item => (
              <tr key={item.key} className="border-t border-border">
                <td className="px-4 py-3">{item.province_name}</td>
                <td className="px-4 py-3">{item.county_name}</td>
                <td className="px-4 py-3">{item.registered_by}</td>
                <td className="px-4 py-3">{toPersianNumber(item.mothers_count)}</td>
                <td className="px-4 py-3">{toPersianNumber(item.children_count)}</td>
                <td className="px-4 py-3">{toPersianNumber(item.activities_count)}</td>
                <td className="px-4 py-3">{toPersianNumber(item.participants_count)}</td>
                <td className="px-4 py-3">{toPersianNumber(item.photos_count)}</td>
                <td className="px-4 py-3">{formatRial(item.costs_total)}</td>
                <td className="px-4 py-3">{toPersianNumber(item.services_count)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                  گزارشی برای نمایش وجود ندارد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivitiesReport({ activities }: { activities: ActivityReportRow[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-muted/50">
            <tr>
              {[
                'استان',
                'شهرستان / مرکز',
                'ثبت‌شده توسط',
                'عنوان فعالیت',
                'نوع فعالیت',
                'گروه هدف',
                'تاریخ',
                'مکان',
                'برگزارکننده',
                'شرکت‌کنندگان',
                'عکس',
              ].map(h => (
                <th key={h} className="px-4 py-3 text-right text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {activities.map(item => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">{item.province_name}</td>
                <td className="px-4 py-3">{item.county_name || item.province_name}</td>
                <td className="px-4 py-3">{item.registered_by}</td>
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.activity_type}</td>
                <td className="px-4 py-3">{item.target_group}</td>
                <td className="px-4 py-3">{formatJalaliDisplay(item.activity_date)}</td>
                <td className="px-4 py-3">{item.location || '-'}</td>
                <td className="px-4 py-3">{item.organizer || '-'}</td>
                <td className="px-4 py-3">{toPersianNumber(item.participants_count)}</td>
                <td className="px-4 py-3">{toPersianNumber(item.photos_count)}</td>
              </tr>
            ))}

            {activities.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                  گزارشی برای نمایش وجود ندارد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MothersReport({ mothers }: { mothers: MotherReportRow[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-muted/50">
            <tr>
              {[
                'استان',
                'شهرستان / مرکز',
                'ثبت‌شده توسط',
                'کد پرونده',
                'نام مادر',
                'کد ملی',
                'شماره تماس',
                'وضعیت',
                'فرزندان',
                'هزینه‌ها',
                'خدمات',
                'تاریخ ثبت',
              ].map(h => (
                <th key={h} className="px-4 py-3 text-right text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {mothers.map(m => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">{m.province_name}</td>
                <td className="px-4 py-3">{m.county_name || m.province_name}</td>
                <td className="px-4 py-3">{m.registered_by}</td>
                <td className="px-4 py-3" dir="ltr">{m.tracking_code || '-'}</td>
                <td className="px-4 py-3">{m.name}</td>
                <td className="px-4 py-3">{toPersianNumber(m.nationalId || '-')}</td>
                <td className="px-4 py-3">{toPersianNumber(m.phone || '-')}</td>
                <td className="px-4 py-3">{m.status}</td>
                <td className="px-4 py-3">{toPersianNumber(m.children_count)}</td>
                <td className="px-4 py-3">{formatRial(m.costs_total)}</td>
                <td className="px-4 py-3">{toPersianNumber(m.services_count)}</td>
                <td className="px-4 py-3">{formatJalaliDisplay(m.joinDate)}</td>
              </tr>
            ))}

            {mothers.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">
                  هنوز مادری در محدوده شما ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChildrenReport({ children }: { children: ChildReportRow[] }) {
  return (
    <SimpleTable
      headers={['استان', 'شهرستان / مرکز', 'ثبت‌شده توسط', 'نام مادر', 'نام فرزند', 'جنسیت', 'تاریخ تولد', 'بیماری']}
      rows={children.map(item => [
        item.province_name,
        item.county_name,
        item.registered_by,
        item.mother_name,
        item.name,
        item.gender || '-',
        formatJalaliDisplay(item.birthDate),
        item.disease || '-',
      ])}
      empty="هنوز فرزندی در محدوده شما ثبت نشده است."
    />
  );
}

function CostsReport({ costs }: { costs: CostReportRow[] }) {
  return (
    <SimpleTable
      headers={['استان', 'شهرستان / مرکز', 'ثبت‌شده توسط', 'نام مادر', 'عنوان هزینه', 'مبلغ', 'تاریخ']}
      rows={costs.map(item => [
        item.province_name,
        item.county_name,
        item.registered_by,
        item.mother_name,
        item.title,
        formatRial(item.amount),
        formatJalaliDisplay(item.date),
      ])}
      empty="هنوز هزینه‌ای در محدوده شما ثبت نشده است."
    />
  );
}

function ServicesReport({ services }: { services: ServiceReportRow[] }) {
  return (
    <SimpleTable
      headers={['استان', 'شهرستان / مرکز', 'ثبت‌شده توسط', 'نام مادر', 'نوع خدمت', 'توضیحات', 'تاریخ']}
      rows={services.map(item => [
        item.province_name,
        item.county_name,
        item.registered_by,
        item.mother_name,
        item.type,
        item.desc || '-',
        formatJalaliDisplay(item.date),
      ])}
      empty="هنوز خدمتی در محدوده شما ثبت نشده است."
    />
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[950px]">
          <thead className="bg-muted/50">
            <tr>
              {headers.map(header => (
                <th
                  key={header}
                  className="px-4 py-3 text-right text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComingSoonReport() {
  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <BarChart3 size={36} className="mx-auto text-primary mb-4" />

      <h3 className="text-foreground font-bold mb-2">
        گزارش خیرین بعد از اصلاح بخش خیرین آنلاین می‌شود
      </h3>

      <p className="text-sm text-muted-foreground leading-7">
        الان گزارش مادران، فرزندان، هزینه‌ها، خدمات و فعالیت‌های نفس بر اساس استان و شهرستان فعال شد.
        بعد از اصلاح بخش خیرین، گزارش کمک‌های خیرین هم به همین ساختار اضافه می‌شود.
      </p>
    </div>
  );
}