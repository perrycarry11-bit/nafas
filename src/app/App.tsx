import { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Wifi,
  WifiOff,
  Loader2,
  ShieldCheck,
  HardDrive,
  Building2,
  MessagesSquare,
  LibraryBig,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

import { Dashboard } from './components/Dashboard';
import { ProfileSection } from './components/ProfileSection';

import { MothersSection } from './components/MothersSection';
import { CalendarSection } from './components/CalendarSection';
import { BenefactorsSection } from './components/BenefactorsSection';
import { DoctorsSection } from './components/DoctorsSection';
import { ReportsSection } from './components/ReportsSection';
import { SMSPanel } from './components/SMSPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { SettingsSection } from './components/SettingsSection';
import { CommandPalette } from './components/CommandPalette';
import { ActivitiesSection } from './components/ui/ActivitiesSection.tsx';
import { ReferralsSection } from './components/ReferralsSection';

// Import کامپوننت‌های اصلی بخش‌های جدید
import { CentersSection } from './components/CentersSection';
import { InternalCommunicationsSection } from './components/InternalCommunicationsSection';
import { CulturalResourcesSection } from './components/CulturalResourcesSection';

import {
  signInOnline,
  type OnlineProfile,
} from './utils/onlineAuth';

import {
  getLastOfflineUsername,
  signInOffline,
} from './utils/offlineAuth';

import logo from '../styles/logo.png';

type Section =
  | 'dashboard'
  | 'mothers'
  | 'calendar'
  | 'benefactors'
  | 'doctors'
  | 'reports'
  | 'sms'
  | 'settings'
  | 'activities'
  | 'referrals'
  | 'centers'
  | 'communications'
  | 'cultural'
  | 'profile';

type Stats = {
  mothers: number;
  benefactors: number;
  doctors: number;
  activities: number;
  children: number;
};

type LegacyRole = 'admin' | 'staff';

type ManagementLevel = 'country' | 'province' | 'county';

interface AppUser {
  id: string;
  name: string;
  username: string;
  role: LegacyRole;
  access: string[];
}

function clearCurrentLoginData() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth-token')
      ) {
        localStorage.removeItem(key);
      }
    });

    localStorage.removeItem('nafas_online_profile');
    localStorage.removeItem('nafas_active_user');
    localStorage.removeItem('nafas_current_role');

    localStorage.removeItem('nafas_current_online_user_id');
    localStorage.removeItem('nafas_current_province_id');
    localStorage.removeItem('nafas_current_province_name');
    localStorage.removeItem('nafas_current_province_code');
    localStorage.removeItem('nafas_current_county_id');
    localStorage.removeItem('nafas_current_county_name');
    localStorage.removeItem('nafas_current_county_code');
    localStorage.removeItem('nafas_current_online_role');
    localStorage.removeItem('nafas_current_management_level');
    localStorage.removeItem('nafas_is_management_view');

    // این دو مورد برای ورود برون خط (آفلاین) لازم‌اند، پس پاک نمی‌شوند:
    // nafas_offline_auth_users_v1
    // nafas_last_offline_username
  } catch {
    // ignore
  }
}

function readArrayCount(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function getChildrenCount(): number {
  try {
    const raw = localStorage.getItem('nafas_mothers');
    if (!raw) return 0;

    const mothers = JSON.parse(raw);
    let totalChildren = 0;

    if (Array.isArray(mothers)) {
      mothers.forEach((m: any) => {
        if (Array.isArray(m.children)) {
          totalChildren += m.children.length;
        } else if (typeof m.childrenCount === 'number') {
          totalChildren += m.childrenCount;
        } else if (typeof m.children === 'number') {
          totalChildren += m.children;
        } else if (typeof m.childrenCount === 'string') {
          totalChildren += parseInt(m.childrenCount) || 0;
        }
      });
    }

    return totalChildren;
  } catch {
    return 0;
  }
}

function getStats(): Stats {
  return {
    mothers: readArrayCount('nafas_mothers'),
    benefactors: readArrayCount('nafas_benefactors'),
    doctors: readArrayCount('nafas_doctors'),
    activities: readArrayCount('nafas_activities'),
    children: getChildrenCount(),
  };
}

function isValidSection(value: string | null): value is Section {
  return (
    value === 'dashboard' ||
    value === 'mothers' ||
    value === 'calendar' ||
    value === 'benefactors' ||
    value === 'doctors' ||
    value === 'reports' ||
    value === 'sms' ||
    value === 'settings' ||
    value === 'activities' ||
    value === 'referrals' ||
    value === 'centers' ||
    value === 'communications' ||
    value === 'cultural' ||
    value === 'profile'
  );
}

function normalizeOnlineRole(role: string | undefined | null) {
  return String(role || '').trim().toLowerCase();
}

function getManagementLevel(profile: OnlineProfile | null): ManagementLevel {
  if (!profile) return 'county';

  const role = normalizeOnlineRole(profile.role);
  const countyId = (profile as any).county_id || '';

  if (
    role === 'country_admin' ||
    role === 'national_admin' ||
    role === 'super_admin' ||
    role === 'main_admin' ||
    role === 'central_admin'
  ) {
    return 'country';
  }

  if (
    role === 'province_admin' ||
    role === 'province_manager' ||
    role === 'admin'
  ) {
    return 'province';
  }

  if (
    role === 'county_user' ||
    role === 'county_staff' ||
    role === 'province_staff' ||
    role === 'staff'
  ) {
    return 'county';
  }

  if (countyId) {
    return 'county';
  }

  return 'province';
}

function getManagementLevelLabel(level: ManagementLevel) {
  if (level === 'country') return 'مدیریت کشوری';
  if (level === 'province') return 'مدیریت استان';
  return 'کاربر شهرستان / مرکز';
}

function mapOnlineProfileToLegacyUser(profile: OnlineProfile): {
  role: LegacyRole;
  user: AppUser;
} {
  const managementLevel = getManagementLevel(profile);

  const legacyRole: LegacyRole =
    managementLevel === 'county' ? 'staff' : 'admin';

  return {
    role: legacyRole,
    user: {
      id: profile.id,
      name: profile.full_name,
      username: profile.username,
      role: legacyRole,
      access: profile.access || [],
    },
  };
}

function persistProfileScope(profile: OnlineProfile) {
  const countyId = (profile as any).county_id || '';
  const countyName = (profile as any).county_name || '';
  const countyCode = (profile as any).county_code || '';
  const managementLevel = getManagementLevel(profile);

  localStorage.setItem('nafas_online_profile', JSON.stringify(profile));

  localStorage.setItem('nafas_current_online_user_id', profile.id || '');
  localStorage.setItem('nafas_current_province_id', profile.province_id || '');
  localStorage.setItem('nafas_current_province_name', profile.province_name || '');
  localStorage.setItem('nafas_current_province_code', profile.province_code || '');
  localStorage.setItem('nafas_current_county_id', countyId);
  localStorage.setItem('nafas_current_county_name', countyName);
  localStorage.setItem('nafas_current_county_code', countyCode);
  localStorage.setItem('nafas_current_online_role', profile.role || '');
  localStorage.setItem('nafas_current_management_level', managementLevel);
  localStorage.setItem(
    'nafas_is_management_view',
    managementLevel === 'county' ? 'false' : 'true',
  );
  localStorage.setItem('nafas_auth_mode', 'online');
}

function LoginPage({
  onLogin,
}: {
  onLogin: (profile: OnlineProfile) => void;
}) {
  const [username, setUsername] = useState(() => {
    return getLastOfflineUsername() || '';
  });

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

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

  async function handleLogin() {
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setLoading(true);

    try {
      let profile: OnlineProfile;

      if (isOnline) {
        profile = await signInOnline(username.trim(), password.trim());
      } else {
        profile = (await signInOffline(username.trim(), password.trim())) as OnlineProfile;
      }

      persistProfileScope(profile);
      onLogin(profile);
    } catch (err: any) {
      console.error(err);

      let message = err?.message || 'ورود انجام نشد. دوباره تلاش کنید.';

      if (
        message === 'Invalid login credentials' ||
        message.includes('Invalid login credentials') ||
        message.includes('invalid_credentials')
      ) {
        message = 'نام کاربری یا رمز عبور اشتباه است.';
      }

      if (message.includes('Email not confirmed')) {
        message = 'حساب کاربری هنوز تأیید نشده است.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleLogin();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#eef7f5] px-4 relative overflow-hidden"
      dir="rtl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(15,118,110,0.14),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(139,92,246,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(238,247,245,0.96))]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 dark:bg-card/90 backdrop-blur-2xl border border-white/70 dark:border-border rounded-[2rem] shadow-2xl p-7">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-20 h-20 rounded-[1.5rem] bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-4 shadow-sm">
              <img
                src={logo}
                alt="مرکز مردمی نفس"
                className="w-14 h-14 object-contain"
              />
            </div>

            <h1 className="text-2xl font-extrabold text-foreground">
              ورود به سامانه مرکزی نفس
            </h1>

            <p className="text-sm text-muted-foreground mt-2 leading-7">
              ورود اختصاصی مدیران استان‌ها و کاربران مجاز مراکز نفس
            </p>
          </div>

          <div
            className={`mb-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${
              isOnline
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}

            {isOnline
              ? 'برخط هستید - ورود با سرور مرکزی انجام می‌شود'
              : 'برون خط (آفلاین) هستید - ورود با حساب ذخیره‌شده روی این سیستم انجام می‌شود'}
          </div>

          {!isOnline && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 p-4 text-xs leading-7">
              برای ورود برون خط (آفلاین)، این کاربر باید قبلاً حداقل یک بار با اینترنت روی همین سیستم وارد شده باشد.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2">
                نام کاربری
              </label>

              <div className="relative">
                <User
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="form-input pr-9 text-left"
                  dir="ltr"
                  placeholder="نام کاربری خود را وارد کنید"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2">
                رمز عبور
              </label>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="password"
                  className="form-input pr-9 text-left"
                  dir="ltr"
                  placeholder="رمز عبور خود را وارد کنید"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold p-3 leading-6">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              type="button"
              className="w-full btn-primary py-3.5 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  در حال ورود...
                </>
              ) : isOnline ? (
                <>
                  <ShieldCheck size={17} />
                  ورود برخط
                </>
              ) : (
                <>
                  <HardDrive size={17} />
                  ورود برون خط (آفلاین)
                </>
              )}
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-muted/60 border border-border p-4 text-xs text-muted-foreground leading-7">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={17} />
              </div>

              <div>
                <p className="text-xs font-bold text-foreground">
                  ورود فقط برای کاربران مجاز
                </p>

                <p className="text-xs text-muted-foreground leading-7 mt-1">
                  برای ورود، نام کاربری و رمز عبوری را وارد کنید که توسط مدیر سامانه یا مدیر استان برای شما ایجاد شده است.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-5 leading-6">
          مرکز مردمی نفس - سامانه مدیریت اطلاعات و عملیات مراکز
        </p>
      </div>
    </div>
  );
}

// حفظ Placeholderها مطابق با دستور کاربر مبنی بر عدم حذف کدها
function PlaceholderSection({
  title,
  subtitle,
  icon,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 md:px-8 py-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-extrabold mb-3">
              {icon}
              بخش جدید سامانه نفس
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-foreground">
              {title}
            </h1>

            <p className="text-sm text-muted-foreground leading-7 mt-2">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="btn-secondary shrink-0"
          >
            <ArrowRight size={17} />
            بازگشت
          </button>
        </div>

        <div className="rounded-[2rem] border border-border bg-white/85 dark:bg-card/85 backdrop-blur-xl shadow-2xl p-5 md:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}

function CentersPlaceholder({
  onBack,
  managementLevel,
}: {
  onBack: () => void;
  managementLevel: ManagementLevel;
}) {
  return (
    <PlaceholderSection
      title="مدیریت مراکز نفس"
      subtitle="این بخش برای مشاهده، پایش و مدیریت استان‌ها، شهرستان‌ها و مراکز نفس استفاده می‌شود."
      icon={<Building2 size={15} />}
      onBack={onBack}
    >
      <div className="space-y-4 text-sm leading-8 text-muted-foreground">
        <p>
          سطح دسترسی فعلی شما:{' '}
          <span className="font-extrabold text-primary">
            {getManagementLevelLabel(managementLevel)}
          </span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <h3 className="font-black text-foreground mb-2">
              مدیر کشور
            </h3>
            <p>
              مشاهده همه استان‌ها، تعداد مراکز هر استان، ریز گزارش‌ها و مدیریت کاربران استانی.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <h3 className="font-black text-foreground mb-2">
              مدیر استان
            </h3>
            <p>
              مشاهده شهرستان‌ها و مراکز استان خودش، ساخت کاربر شهرستان و بررسی ریز اطلاعات ثبت‌شده.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <h3 className="font-black text-foreground mb-2">
              کاربر شهرستان
            </h3>
            <p>
              مشاهده و ثبت اطلاعات فقط در محدوده شهرستان یا مرکز خودش.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          در قدم بعدی، کامپوننت اختصاصی این بخش و جدول‌های Supabase مربوط به مراکز را اضافه می‌کنیم.
        </p>
      </div>
    </PlaceholderSection>
  );
}

function CommunicationsPlaceholder({
  onBack,
  managementLevel,
}: {
  onBack: () => void;
  managementLevel: ManagementLevel;
}) {
  return (
    <PlaceholderSection
      title="ارتباطات داخلی"
      subtitle="پیام‌رسانی داخلی بین کشور، استان و شهرستان‌ها طبق سطح دسترسی."
      icon={<MessagesSquare size={15} />}
      onBack={onBack}
    >
      <div className="space-y-4 text-sm leading-8 text-muted-foreground">
        <p>
          سطح دسترسی فعلی شما:{' '}
          <span className="font-extrabold text-primary">
            {getManagementLevelLabel(managementLevel)}
          </span>
        </p>

        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <h3 className="font-black text-foreground mb-2">
            قوانین پیام‌رسانی
          </h3>

          <ul className="list-disc pr-5 space-y-2">
            <li>کشور می‌تواند به همه استان‌ها، شهرستان‌ها یا کل کشور پیام بدهد.</li>
            <li>استان می‌تواند به کشور و شهرستان‌های خودش پیام بدهد.</li>
            <li>شهرستان فقط می‌تواند به استان خودش پیام بدهد.</li>
            <li>شهرستان امکان پیام مستقیم به کشور ندارد.</li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          در قدم بعدی جدول‌های internal_messages و internal_message_reads را اضافه می‌کنیم.
        </p>
      </div>
    </PlaceholderSection>
  );
}

function CulturalPlaceholder({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <PlaceholderSection
      title="بانک محتوای فرهنگی"
      subtitle="محل نگهداری بخش‌نامه‌ها، آموزش‌ها، پوسترها، موشن‌کلیپ‌ها، موسیقی و موارد قانونی."
      icon={<LibraryBig size={15} />}
      onBack={onBack}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm leading-8 text-muted-foreground">
        {[
          'بخش‌نامه‌ها',
          'آموزشی',
          'پوستر',
          'موشن‌کلیپ',
          'موسیقی',
          'موارد قانونی',
          'قانون جوانی جمعیت',
        ].map(item => (
          <div
            key={item}
            className="rounded-2xl border border-border bg-muted/40 p-4"
          >
            <h3 className="font-black text-foreground mb-2">
              {item}
            </h3>
            <p>
              این دسته در قدم بعدی به فایل، توضیح، سطح نمایش و وضعیت فعال/غیرفعال متصل می‌شود.
            </p>
          </div>
        ))}
      </div>
    </PlaceholderSection>
  );
}

function ProfilePlaceholder({
  onBack,
  managementLevel,
}: {
  onBack: () => void;
  managementLevel: ManagementLevel;
}) {
  return (
    <PlaceholderSection
      title="حساب کاربری و تغییر رمز"
      subtitle="تغییر نام کاربری و رمز عبور توسط خود کاربر و مدیر بالادستی."
      icon={<KeyRound size={15} />}
      onBack={onBack}
    >
      <div className="space-y-4 text-sm leading-8 text-muted-foreground">
        <p>
          سطح دسترسی فعلی شما:{' '}
          <span className="font-extrabold text-primary">
            {getManagementLevelLabel(managementLevel)}
          </span>
        </p>

        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <h3 className="font-black text-foreground mb-2">
            منطق تغییر رمز
          </h3>

          <ul className="list-disc pr-5 space-y-2">
            <li>هر کاربر بتواند نام کاربری و رمز خودش را تغییر دهد.</li>
            <li>مدیر استان بتواند نام کاربری و رمز شهرستان‌های خودش را تغییر دهد.</li>
            <li>مدیر کشور بتواند نام کاربری و رمز مدیران استان را تغییر دهد.</li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          این قابلیت نیاز به Edge Function جدید با نام update-nafas-user دارد تا رمز عبور به صورت امن در Supabase Auth تغییر کند.
        </p>
      </div>
    </PlaceholderSection>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [onlineProfile, setOnlineProfile] = useState<OnlineProfile | null>(null);

  const [section, setSection] = useState<Section>(() => {
    const savedSection = localStorage.getItem('nafas_current_section');
    return isValidSection(savedSection) ? savedSection : 'dashboard';
  });

  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [stats, setStats] = useState<Stats>(getStats());

  const [currentRole, setCurrentRole] = useState<LegacyRole>('admin');
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);

  const [managementLevel, setManagementLevel] =
    useState<ManagementLevel>('county');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);

  useEffect(() => {
    clearCurrentLoginData();

    setOnlineProfile(null);
    setActiveUser(null);
    setCurrentRole('admin');
    setManagementLevel('county');

    setReady(true);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }

      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotiOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('nafas_current_role', currentRole);

    if (activeUser) {
      localStorage.setItem('nafas_active_user', JSON.stringify(activeUser));
    } else {
      localStorage.removeItem('nafas_active_user');
    }
  }, [currentRole, activeUser]);

  useEffect(() => {
    localStorage.setItem('nafas_current_section', section);
  }, [section]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
  }, [darkMode, fontSize]);

  function applyOnlineProfile(profile: OnlineProfile) {
    const mapped = mapOnlineProfileToLegacyUser(profile);
    const nextManagementLevel = getManagementLevel(profile);

    setOnlineProfile(profile);
    setCurrentRole(mapped.role);
    setActiveUser(mapped.user);
    setManagementLevel(nextManagementLevel);

    localStorage.setItem('nafas_current_role', mapped.role);
    localStorage.setItem('nafas_active_user', JSON.stringify(mapped.user));
    localStorage.setItem('nafas_current_management_level', nextManagementLevel);
    localStorage.setItem(
      'nafas_is_management_view',
      nextManagementLevel === 'county' ? 'false' : 'true',
    );

    persistProfileScope(profile);
  }

  function refreshStats() {
    setStats(getStats());
  }

  function goDashboard() {
    refreshStats();
    setSection('dashboard');
  }

  function navigate(sectionName: string) {
    // افزودن تقویم و مراکز به لیست بخش‌های مجاز کارمندان
    const alwaysAllowedForStaff = [
      'dashboard',
      'settings',
      'referrals',
      'communications',
      'cultural',
      'profile',
      'centers',
      'calendar'
    ];

    if (
      currentRole === 'staff' &&
      activeUser &&
      !alwaysAllowedForStaff.includes(sectionName)
    ) {
      if (!activeUser.access.includes(sectionName)) {
        alert('حساب کاربری شما دسترسی لازم برای ورود به این بخش را ندارد.');
        return;
      }
    }

    if (isValidSection(sectionName)) {
      if (sectionName === 'dashboard') {
        refreshStats();
      }

      setSection(sectionName);
    }
  }

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#eef7f5] text-primary font-bold"
        dir="rtl"
      >
        در حال آماده‌سازی سامانه...
      </div>
    );
  }

  if (!onlineProfile) {
    return (
      <LoginPage
        onLogin={profile => {
          applyOnlineProfile(profile);
          setSection('dashboard');
        }}
      />
    );
  }

  return (
    <div
      className="relative w-full h-screen min-h-screen overflow-y-auto overflow-x-hidden bg-[#eef7f5] text-foreground transition-colors duration-300"
      dir="rtl"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(15,118,110,0.10),transparent_25%),radial-gradient(circle_at_90%_15%,rgba(139,92,246,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(238,247,245,0.95))]" />

      <div className="relative z-10 min-h-screen pb-10">
        {section === 'dashboard' && (
          <Dashboard
            onNavigate={navigate}
            stats={stats}
            darkMode={darkMode}
            currentRole={currentRole}
            activeUser={activeUser}
            onSwitchToAdmin={() => {
              alert('در نسخه برخط، تغییر نقش فقط از طریق حساب کاربری برخط انجام می‌شود.');
            }}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenNotifications={() => setIsNotiOpen(true)}
          />
        )}

        {section === 'mothers' && <MothersSection onBack={goDashboard} />}
        {section === 'calendar' && <CalendarSection onBack={goDashboard} />}
        {section === 'benefactors' && <BenefactorsSection onBack={goDashboard} />}
        {section === 'doctors' && <DoctorsSection onBack={goDashboard} />}
        {section === 'reports' && <ReportsSection onBack={goDashboard} />}
        {section === 'sms' && <SMSPanel onBack={goDashboard} />}

        {section === 'activities' && (
          <ActivitiesSection
            key={`activities-${onlineProfile.id}-${onlineProfile.role}-${onlineProfile.province_id || 'national'}-${(onlineProfile as any).county_id || 'province'}`}
            onBack={goDashboard}
          />
        )}

        {section === 'referrals' && <ReferralsSection onBack={goDashboard} />}

        {section === 'centers' && (
          <CentersSection onBack={goDashboard} />
        )}

        {section === 'communications' && (
          <InternalCommunicationsSection onBack={goDashboard} />
        )}

        {section === 'cultural' && (
          <CulturalResourcesSection onBack={goDashboard} />
        )}

        {section === 'profile' && <ProfileSection onBack={goDashboard} />}

        {section === 'settings' && (
          <SettingsSection
            onBack={goDashboard}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            fontSize={fontSize}
            setFontSize={setFontSize}
            currentRole={currentRole}
            activeUser={activeUser}
            onUserSwitched={(role: LegacyRole, user: AppUser | null) => {
              alert('در نسخه برخط، تغییر نقش محلی غیرفعال است. برای تغییر کاربر باید از صفحه ورود استفاده شود.');

              setCurrentRole(role);
              setActiveUser(user);
              setSection('dashboard');
            }}
          />
        )}
      </div>

      <CommandPalette
        isOpen={isSearchOpen}
        setIsOpen={setIsSearchOpen}
        onNavigate={navigate}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentRole={currentRole}
        activeUser={activeUser}
      />

      <NotificationCenter
        isOpen={isNotiOpen}
        onClose={() => setIsNotiOpen(false)}
        currentRole={currentRole}
      />
    </div>
  );
}