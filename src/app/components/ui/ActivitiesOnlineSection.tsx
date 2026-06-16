import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  ChevronDown,
  Image as ImageIcon,
} from 'lucide-react';

import { PageHeader } from '../PageHeader';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { ImageUploader } from '../ImageUploader';
import { todayJalali, toPersianNumber } from '../../utils/jalali';
import { supabase } from '../../utils/supabaseClient';

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
  access: string[];
  is_active: boolean;
}

interface Province {
  id: string;
  code: string;
  name: string;
}

interface NafasActivity {
  id: string;
  remoteId?: string;
  provinceId: string;
  provinceName: string;
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
  syncStatus: 'synced' | 'pending' | 'error';
  syncError?: string;
  updatedAt: string;
}

const STORAGE_KEY = 'nafas_activities_online_v1';

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

function getCurrentProfile(): OnlineProfile | null {
  try {
    const raw = localStorage.getItem('nafas_online_profile');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isNationalAdmin(profile: OnlineProfile | null) {
  return profile?.role === 'national_admin';
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

function emptyActivity(profile: OnlineProfile | null, selectedProvince: string, provinces: Province[]): NafasActivity {
  const provinceId = isNationalAdmin(profile)
    ? selectedProvince === 'all'
      ? ''
      : selectedProvince
    : profile?.province_id || '';

  const province = provinces.find(p => p.id === provinceId);

  return {
    id: makeId(),
    provinceId,
    provinceName: province?.name || profile?.province_name || '',
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
  };
}

function loadLocalActivities(): NafasActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalActivities(items: NafasActivity[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

async function loadProvinces(): Promise<Province[]> {
  const { data, error } = await supabase
    .from('provinces')
    .select('id, code, name')
    .order('name', { ascending: true });

  if (error) throw error;

  return Array.isArray(data) ? data : [];
}

function remoteToLocal(row: any): NafasActivity {
  return {
    id: row.local_id || row.id,
    remoteId: row.id,
    provinceId: row.province_id || '',
    provinceName: row.provinces?.name || '',
    title: row.title || '',
    type: row.activity_type || 'آموزشی',
    targetGroup: row.target_group || 'مادران',
    relatedTo: row.related_to || '',
    date: row.activity_date || '',
    location: row.location || '',
    organizer: row.organizer || '',
    participantsCount: row.participants_count ? String(row.participants_count) : '',
    description: row.description || '',
    result: row.result || '',
    photos: Array.isArray(row.photos) ? row.photos : [],
    syncStatus: 'synced',
    syncError: '',
    updatedAt: row.client_updated_at || row.updated_at || new Date().toISOString(),
  };
}

async function loadRemoteActivities() {
  const { data, error } = await supabase
    .from('activities')
    .select(
      `
      id,
      local_id,
      province_id,
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
      updated_at,
      deleted_at,
      provinces (
        name,
        code
      )
    `,
    )
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return Array.isArray(data) ? data.map(remoteToLocal) : [];
}

function makePayload(item: NafasActivity, profile: OnlineProfile | null) {
  return {
    local_id: item.id,
    province_id: item.provinceId,
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
  };
}

async function syncOne(item: NafasActivity, profile: OnlineProfile | null): Promise<NafasActivity> {
  if (!item.provinceId) {
    return {
      ...item,
      syncStatus: 'error',
      syncError: 'استان فعالیت مشخص نیست.',
    };
  }

  const payload = makePayload(item, profile);

  if (item.remoteId) {
    const { data, error } = await supabase
      .from('activities')
      .update(payload)
      .eq('id', item.remoteId)
      .select(
        `
        id,
        local_id,
        province_id,
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
        updated_at,
        deleted_at,
        provinces (
          name,
          code
        )
      `,
      )
      .single();

    if (error) throw error;

    return remoteToLocal(data);
  }

  const { data, error } = await supabase
    .from('activities')
    .insert(payload)
    .select(
      `
      id,
      local_id,
      province_id,
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
      updated_at,
      deleted_at,
      provinces (
        name,
        code
      )
    `,
    )
    .single();

  if (error) throw error;

  return remoteToLocal(data);
}

function mergeActivities(localItems: NafasActivity[], remoteItems: NafasActivity[]) {
  const map = new Map<string, NafasActivity>();

  remoteItems.forEach(item => {
    map.set(item.remoteId || item.id, item);
  });

  localItems.forEach(item => {
    if (item.syncStatus === 'pending' || item.syncStatus === 'error') {
      map.set(item.remoteId || item.id, item);
    } else if (!map.has(item.remoteId || item.id)) {
      map.set(item.remoteId || item.id, item);
    }
  });

  return Array.from(map.values());
}

function filterScope(items: NafasActivity[], profile: OnlineProfile | null) {
  if (!profile) return [];
  if (isNationalAdmin(profile)) return items;
  return items.filter(item => item.provinceId === profile.province_id);
}

export function ActivitiesOnlineSection({ onBack }: Props) {
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [activities, setActivities] = useState<NafasActivity[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<NafasActivity | null>(null);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('وضعیت همگام‌سازی آماده است.');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const national = isNationalAdmin(profile);

  useEffect(() => {
    const currentProfile = getCurrentProfile();
    setProfile(currentProfile);

    const local = filterScope(loadLocalActivities(), currentProfile);
    setActivities(local);

    async function init() {
      try {
        const provinceList = await loadProvinces();
        setProvinces(provinceList);

        if (navigator.onLine) {
          setSyncing(true);

          const remote = await loadRemoteActivities();
          const merged = filterScope(mergeActivities(local, remote), currentProfile);

          setActivities(merged);
          saveLocalActivities(merged);
          setMessage('اطلاعات از سرور مرکزی دریافت شد.');
        }
      } catch (error: any) {
        setMessage(error?.message || 'خطا در دریافت اطلاعات برخط');
      } finally {
        setSyncing(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    function online() {
      setIsOnline(true);
    }

    function offline() {
      setIsOnline(false);
    }

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);

    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const visible = useMemo(() => {
    let list = filterScope(activities, profile);

    if (national && selectedProvince !== 'all') {
      list = list.filter(item => item.provinceId === selectedProvince);
    }

    if (search.trim()) {
      list = list.filter(item => {
        const text = [
          item.title,
          item.type,
          item.targetGroup,
          item.date,
          item.location,
          item.description,
          item.result,
          item.provinceName,
        ].join(' ');

        return text.includes(search);
      });
    }

    return list;
  }, [activities, profile, national, selectedProvince, search]);

  function updateActivities(next: NafasActivity[]) {
    setActivities(next);
    saveLocalActivities(next);
  }

  async function handleSync() {
    if (!navigator.onLine) {
      setMessage('اینترنت قطع است؛ اطلاعات روی سیستم ذخیره شده است.');
      return;
    }

    try {
      setSyncing(true);
      setMessage('در حال همگام‌سازی...');

      let next = [...activities];

      for (let i = 0; i < next.length; i++) {
        const item = next[i];

        if (item.syncStatus === 'pending' || item.syncStatus === 'error') {
          try {
            next[i] = await syncOne(item, profile);
          } catch (error: any) {
            next[i] = {
              ...item,
              syncStatus: 'error',
              syncError: error?.message || 'خطا در همگام سازی',
            };
          }
        }
      }

      const remote = await loadRemoteActivities();
      const merged = filterScope(mergeActivities(next, remote), profile);

      updateActivities(merged);
      setMessage('همگام‌سازی انجام شد.');
    } catch (error: any) {
      setMessage(error?.message || 'خطا در همگام‌سازی');
    } finally {
      setSyncing(false);
    }
  }

  function openNew() {
    if (national && selectedProvince === 'all') {
      alert('برای ثبت فعالیت توسط تهران، اول یک استان مشخص انتخاب کن.');
      return;
    }

    setEditing(emptyActivity(profile, selectedProvince, provinces));
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

    const province = provinces.find(p => p.id === editing.provinceId);

    const item: NafasActivity = {
      ...editing,
      provinceName: province?.name || editing.provinceName || profile?.province_name || '',
      syncStatus: 'pending',
      syncError: '',
      updatedAt: new Date().toISOString(),
    };

    let next = activities.some(a => a.id === item.id)
      ? activities.map(a => (a.id === item.id ? item : a))
      : [...activities, item];

    updateActivities(next);
    setEditing(null);
    setView('list');

    if (navigator.onLine) {
      try {
        setSyncing(true);
        const synced = await syncOne(item, profile);

        next = next.map(a => (a.id === item.id ? synced : a));
        updateActivities(next);
        setMessage('فعالیت ذخیره و برخط شد.');
      } catch (error: any) {
        setMessage(error?.message || 'فعالیت محلی ذخیره شد اما برخط نشد.');
      } finally {
        setSyncing(false);
      }
    } else {
      setMessage('فعالیت روی سیستم ذخیره شد و بعد از اتصال اینترنت همگام سازی می‌شود.');
    }
  }

  function deleteActivity(id: string) {
    const next = activities.filter(item => item.id !== id);
    updateActivities(next);
    setMessage('فعالیت از سیستم حذف شد. حذف برخط را در مرحله بعد فعال می‌کنیم.');
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
            provinces={provinces}
            national={national}
            profile={profile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader
        title="فعالیت‌های نفس - نسخه برخط"
        onBack={onBack}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
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

      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            className={`rounded-2xl border px-4 py-3 text-xs font-bold flex items-center gap-2 ${
              isOnline
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isOnline ? 'برخط - اتصال به سرور مرکزی برقرار است' : 'برون خط (آفلاین) - تغییرات بعداً همگام سازی می‌شود'}
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {national ? 'مدیر کشوری تهران: مشاهده همه استان‌ها' : `نماینده استان: ${profile?.province_name || 'نامشخص'}`}
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {message}
          </div>
        </div>

        {national && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-5">
            <label className="block text-xs text-muted-foreground mb-2 font-bold">
              فیلتر استان برای مدیر کشوری تهران
            </label>

            <select
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard title="کل فعالیت‌ها" value={visible.length} />
          <StatCard title="آموزشی" value={visible.filter(i => i.type === 'آموزشی').length} />
          <StatCard title="فرهنگی" value={visible.filter(i => i.type === 'فرهنگی').length} />
          <StatCard title="دارای عکس" value={visible.filter(i => i.photos.length > 0).length} />
          <StatCard title="در انتظار همگام سازی" value={activities.filter(i => i.syncStatus !== 'synced').length} />
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو بر اساس عنوان، نوع فعالیت، تاریخ، مکان، استان یا توضیحات..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    'عنوان فعالیت',
                    'استان',
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
                {visible.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      index % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3 text-foreground">
                      {item.title || 'بدون عنوان'}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {item.provinceName || 'نامشخص'}
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
                      {item.location}
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
                          onClick={() => deleteActivity(item.id)}
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

                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
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
  national,
  profile,
}: {
  activityItem: NafasActivity;
  setActivityItem: React.Dispatch<React.SetStateAction<NafasActivity | null>>;
  provinces: Province[];
  national: boolean;
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
    });
  };

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
          در این بخش فعالیت‌های آموزشی، فرهنگی، حمایتی و سایر اقدامات مرکز ثبت می‌شود.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {national ? (
          <div className="col-span-2">
            <Label text="استان مربوط به فعالیت" />
            <SelectProvince value={activityItem.provinceId} onChange={updateProvince} provinces={provinces} />
          </div>
        ) : (
          <ReadOnlyBox label="استان" value={profile?.province_name || activityItem.provinceName || 'نامشخص'} />
        )}

        <TextInput
          label="عنوان فعالیت"
          value={activityItem.title}
          onChange={v => update({ title: v })}
          placeholder="مثلاً کارگاه آموزشی مراقبت از نوزاد"
        />

        <div>
          <Label text="نوع فعالیت" />
          <SelectField value={activityItem.type} onChange={v => update({ type: v })} options={ACTIVITY_TYPES} />
        </div>

        <div>
          <Label text="گروه هدف" />
          <SelectField value={activityItem.targetGroup} onChange={v => update({ targetGroup: v })} options={TARGET_GROUPS} />
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
        placeholder="جزئیات کامل فعالیت"
      />

      <TextAreaInput
        label="نتیجه و دستاورد فعالیت"
        value={activityItem.result}
        onChange={v => update({ result: v })}
        rows={3}
        placeholder="نتیجه فعالیت، بازخوردها و خروجی‌ها"
      />

      <div className="border border-border rounded-xl p-4 bg-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-foreground flex items-center gap-2" style={{ fontWeight: 700 }}>
              <ImageIcon size={16} />
              تصاویر فعالیت
            </h4>

            <p className="text-xs text-muted-foreground mt-1">
              امکان ثبت چند عکس برای هر فعالیت وجود دارد.
            </p>
          </div>

          <button onClick={addPhoto} type="button" className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            افزودن عکس
          </button>
        </div>

        <div className="space-y-4">
          {activityItem.photos.map((photo, index) => (
            <div key={`${index}-${photo}`} className="bg-card border border-border rounded-xl p-4">
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
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-2">{title}</p>

      <div className="flex items-center justify-between">
        <span className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
          {toPersianNumber(value)}
        </span>

        <Activity size={20} className="text-primary" />
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