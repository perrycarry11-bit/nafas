import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';

import {
  signInOnline,
  type OnlineProfile,
} from '../utils/onlineAuth';

import nafasLogo from '../../styles/logo.png';

interface Props {
  onLogin?: (profile: OnlineProfile) => void;
  onSuccess?: (profile: OnlineProfile) => void;
  onLoggedIn?: (profile: OnlineProfile) => void;
  setProfile?: (profile: OnlineProfile) => void;
  setCurrentUser?: (profile: OnlineProfile) => void;
  setCurrentRole?: (role: string) => void;
  [key: string]: any;
}

function toPersianRole(role: string) {
  if (role === 'national_admin') return 'مدیر کشوری';
  if (role === 'province_admin') return 'مدیر استان';
  if (role === 'province_staff') return 'کاربر شهرستان';
  return 'کاربر سامانه';
}

function persistCurrentProfile(profile: OnlineProfile) {
  localStorage.setItem('nafas_auth_mode', 'online');
  localStorage.setItem('nafas_online_profile', JSON.stringify(profile));

  localStorage.setItem('nafas_active_user', profile.full_name || profile.username || '');
  localStorage.setItem('nafas_current_role', profile.role || '');

  localStorage.setItem('nafas_current_online_user_id', profile.id || '');
  localStorage.setItem('nafas_current_online_role', profile.role || '');

  localStorage.setItem('nafas_current_province_id', profile.province_id || '');
  localStorage.setItem('nafas_current_province_name', profile.province_name || '');
  localStorage.setItem('nafas_current_province_code', profile.province_code || '');

  const countyId = (profile as any).county_id || '';
  const countyName = (profile as any).county_name || '';
  const countyCode = (profile as any).county_code || '';

  localStorage.setItem('nafas_current_county_id', countyId);
  localStorage.setItem('nafas_current_county_name', countyName);
  localStorage.setItem('nafas_current_county_code', countyCode);
}

export function OnlineLogin(props: Props) {
  const {
    onLogin,
    onSuccess,
    onLoggedIn,
    setProfile,
    setCurrentUser,
    setCurrentRole,
  } = props;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successText, setSuccessText] = useState('');

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccessText('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    if (!isOnline) {
      setError('برای ورود برخط، اتصال اینترنت لازم است.');
      return;
    }

    try {
      setLoading(true);

      const profile = await signInOnline(cleanUsername, cleanPassword);

      if (!profile) {
        throw new Error('پروفایل کاربر پیدا نشد.');
      }

      if (!profile.is_active) {
        throw new Error('حساب کاربری شما غیرفعال است.');
      }

      persistCurrentProfile(profile);

      setSuccessText(
        `ورود موفق؛ ${profile.full_name || profile.username || 'کاربر'} - ${toPersianRole(profile.role)}`,
      );

      onLogin?.(profile);
      onSuccess?.(profile);
      onLoggedIn?.(profile);
      setProfile?.(profile);
      setCurrentUser?.(profile);
      setCurrentRole?.(profile.role);
    } catch (err: any) {
      const message =
        err?.message ||
        'ورود انجام نشد. نام کاربری یا رمز عبور را بررسی کنید.';

      if (
        message.includes('Invalid login credentials') ||
        message.includes('invalid_credentials')
      ) {
        setError('نام کاربری یا رمز عبور اشتباه است.');
      } else if (message.includes('Email not confirmed')) {
        setError('حساب کاربری هنوز تأیید نشده است.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-background via-[#f3fbf9] to-[#eef7f5] flex items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-md">
        <div className="bg-card/95 backdrop-blur border border-border rounded-[2rem] shadow-2xl shadow-primary/10 p-7 md:p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-sm">
              <img
                src={nafasLogo}
                alt="مرکز مردمی نفس"
                className="w-14 h-14 object-contain"
              />
            </div>

            <h1 className="text-foreground text-2xl font-extrabold">
              ورود به سامانه مرکزی نفس
            </h1>

            <p className="text-muted-foreground text-sm mt-2 leading-6">
              ورود اختصاصی مدیران استان‌ها و کاربران مجاز مراکز نفس
            </p>
          </div>

          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-xs font-bold flex items-center justify-center gap-2 ${
              isOnline
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isOnline
              ? 'اتصال برقرار است - ورود با سرور مرکزی انجام می‌شود'
              : 'اتصال اینترنت برقرار نیست'}
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-xs leading-6 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successText && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-xs leading-6 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{successText}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2">
                نام کاربری
              </label>

              <div className="relative">
                <User
                  size={17}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  className="w-full h-12 pr-10 pl-4 rounded-2xl border border-border bg-input-background text-foreground text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
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
                  size={17}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full h-12 pr-10 pl-10 rounded-2xl border border-border bg-input-background text-foreground text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="رمز عبور خود را وارد کنید"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isOnline}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ShieldCheck size={18} />
              )}

              {loading ? 'در حال بررسی اطلاعات...' : 'ورود امن به سامانه'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-border bg-muted/30 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={17} />
              </div>

              <div>
                <p className="text-xs font-bold text-foreground">
                  دسترسی فقط برای کاربران تعریف‌شده
                </p>

                <p className="text-xs text-muted-foreground leading-6 mt-1">
                  برای ورود، از نام کاربری و رمز عبوری استفاده کنید که توسط مدیر سامانه یا مدیر استان برای شما ایجاد شده است.
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

export default OnlineLogin;