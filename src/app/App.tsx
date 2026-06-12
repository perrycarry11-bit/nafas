import { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Wifi,
  WifiOff,
  Loader2,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

import { Dashboard } from './components/Dashboard';
import { MothersSection } from './components/MothersSection';
import { BenefactorsSection } from './components/BenefactorsSection';
import { DoctorsSection } from './components/DoctorsSection';
import { ReportsSection } from './components/ReportsSection';
import { SMSPanel } from './components/SMSPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { SettingsSection } from './components/SettingsSection';
import { CommandPalette } from './components/CommandPalette';
import { ActivitiesSection } from './components/ui/ActivitiesSection.tsx';
import { ReferralsSection } from './components/ReferralsSection';

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
  | 'benefactors'
  | 'doctors'
  | 'reports'
  | 'sms'
  | 'settings'
  | 'activities'
  | 'referrals';

type Stats = {
  mothers: number;
  benefactors: number;
  doctors: number;
  activities: number;
  children: number;
};

interface AppUser {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'staff';
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

    // این دو مورد برای ورود آفلاین لازم‌اند، پس پاک نمی‌شوند:
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
    value === 'benefactors' ||
    value === 'doctors' ||
    value === 'reports' ||
    value === 'sms' ||
    value === 'settings' ||
    value === 'activities' ||
    value === 'referrals'
  );
}

function mapOnlineProfileToLegacyUser(profile: OnlineProfile): {
  role: 'admin' | 'staff';
  user: AppUser;
} {
  const legacyRole: 'admin' | 'staff' =
    profile.role === 'province_staff' ? 'staff' : 'admin';

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

  localStorage.setItem('nafas_online_profile', JSON.stringify(profile));

  localStorage.setItem('nafas_current_online_user_id', profile.id || '');
  localStorage.setItem('nafas_current_province_id', profile.province_id || '');
  localStorage.setItem('nafas_current_province_name', profile.province_name || '');
  localStorage.setItem('nafas_current_province_code', profile.province_code || '');
  localStorage.setItem('nafas_current_county_id', countyId);
  localStorage.setItem('nafas_current_county_name', countyName);
  localStorage.setItem('nafas_current_county_code', countyCode);
  localStorage.setItem('nafas_current_online_role', profile.role || '');
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
              ? 'آنلاین هستید - ورود با سرور مرکزی انجام می‌شود'
              : 'آفلاین هستید - ورود با حساب ذخیره‌شده روی این سیستم انجام می‌شود'}
          </div>

          {!isOnline && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 p-4 text-xs leading-7">
              برای ورود آفلاین، این کاربر باید قبلاً حداقل یک بار با اینترنت روی همین سیستم وارد شده باشد.
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
                  ورود آنلاین
                </>
              ) : (
                <>
                  <HardDrive size={17} />
                  ورود آفلاین
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

  const [currentRole, setCurrentRole] = useState<'admin' | 'staff'>('admin');
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);

  useEffect(() => {
    clearCurrentLoginData();

    setOnlineProfile(null);
    setActiveUser(null);
    setCurrentRole('admin');

    setReady(true);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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

    setOnlineProfile(profile);
    setCurrentRole(mapped.role);
    setActiveUser(mapped.user);

    localStorage.setItem('nafas_current_role', mapped.role);
    localStorage.setItem('nafas_active_user', JSON.stringify(mapped.user));

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
    if (
      currentRole === 'staff' &&
      activeUser &&
      !['dashboard', 'settings', 'referrals'].includes(sectionName)
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
              alert('در نسخه آنلاین، تغییر نقش فقط از طریق حساب کاربری آنلاین انجام می‌شود.');
            }}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenNotifications={() => setIsNotiOpen(true)}
          />
        )}

        {section === 'mothers' && <MothersSection onBack={goDashboard} />}
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

        {section === 'settings' && (
          <SettingsSection
            onBack={goDashboard}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            fontSize={fontSize}
            setFontSize={setFontSize}
            currentRole={currentRole}
            activeUser={activeUser}
            onUserSwitched={(role: 'admin' | 'staff', user: AppUser | null) => {
              alert('در نسخه آنلاین، تغییر نقش محلی غیرفعال است. برای تغییر کاربر باید از صفحه ورود استفاده شود.');

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