import { useState, useEffect } from 'react';
import {
  Users,
  Heart,
  Stethoscope,
  BarChart3,
  MessageSquare,
  MessagesSquare,
  Settings,
  Sparkles,
  Search,
  Bell,
  TrendingUp,
  Lock,
  X,
  Baby,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  CalendarDays,
  ChevronLeft,
  PlusCircle,
  Building2,
  LibraryBig,
  KeyRound,
  Loader2,
} from 'lucide-react';

// @ts-ignore
import logo from '../../styles/logo.png';
import { todayJalali, toPersianNumber } from '../utils/jalali';
import { supabase } from '../utils/supabaseClient';

interface Props {
  onNavigate: (section: string) => void;
  stats: {
    mothers: number;
    benefactors: number;
    doctors: number;
    activities: number;
    children: number;
  };
  darkMode: boolean;
  currentRole?: 'admin' | 'staff';
  activeUser?: any;
  onSwitchToAdmin?: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
}

type ManagementLevel = 'country' | 'province' | 'county';

// --- داده‌های تقویم برای نمایش هشدارهای زنده در داشبورد ---
const NAFAS_EVENTS = [
  { id: '1', title: 'روز ملی جوان', month: 11, day: 11, category: 'general', description: 'فرصت عالی برای همایش‌های تبیین جوانی جمعیت' },
  { id: '2', title: 'روز جهانی ماما', month: 2, day: 15, category: 'medical', description: 'ارسال پیامک تبریک و تجلیل از ماماهای همکار مرکز نفس' },
  { id: '3', title: 'روز ملی جمعیت', month: 2, day: 30, category: 'population', description: 'مهم‌ترین رویداد سال؛ نیاز به برنامه‌ریزی رسانه‌ای و همایش کشوری از ۳۰ روز قبل' },
  { id: '4', title: 'روز جهانی کودک', month: 7, day: 16, category: 'mother', description: 'جشنواره فرزندان نجات‌یافته نفس' },
  { id: '5', title: 'روز خانواده و تکریم بازنشستگان', month: 4, day: 21, category: 'mother', description: 'بزرگداشت مفهوم خانواده سلول بنیادی جامعه' },
  { id: '6', title: 'روز پزشک (بزرگداشت ابن سینا)', month: 6, day: 1, category: 'medical', description: 'تقدیر اختصاصی از پزشکان و متخصصین زنان و زایمان همکار' },
  { id: '7', title: 'روز داروساز (بزرگداشت زکریای رازی)', month: 6, day: 5, category: 'medical', description: 'تقدیر از داروخانه‌ها و داروسازان شبکه حمایتی نفس' },
  { id: '8', title: 'روز بهورز', month: 6, day: 12, category: 'medical', description: 'تجلیل از بهورزان و رابطین بهداشت روستایی شبکه نفس' },
  { id: '9', title: 'روز بزرگداشت زن و مادر', month: 10, day: 20, category: 'mother', description: 'سالروز میلاد حضرت فاطمه (س)؛ تجلیل از مادران صابر و فداکار' },
  { id: '10', title: 'روز پرستار', month: 8, day: 25, category: 'medical', description: 'بزرگداشت مقام پرستاران و کادر درمان همکار' },
];

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];
// --------------------------------------------------------

function getStoredManagementLevel(currentRole: 'admin' | 'staff'): ManagementLevel {
  try {
    const stored = localStorage.getItem('nafas_current_management_level');

    if (stored === 'country' || stored === 'province' || stored === 'county') {
      return stored;
    }

    const onlineRole = localStorage.getItem('nafas_current_online_role') || '';
    const countyId = localStorage.getItem('nafas_current_county_id') || '';

    if (
      onlineRole === 'country_admin' ||
      onlineRole === 'national_admin' ||
      onlineRole === 'super_admin' ||
      onlineRole === 'main_admin' ||
      onlineRole === 'central_admin'
    ) {
      return 'country';
    }

    if (
      onlineRole === 'province_admin' ||
      onlineRole === 'province_manager' ||
      onlineRole === 'admin'
    ) {
      return 'province';
    }

    if (countyId) {
      return 'county';
    }

    return currentRole === 'admin' ? 'province' : 'county';
  } catch {
    return currentRole === 'admin' ? 'province' : 'county';
  }
}

function getManagementLabel(level: ManagementLevel) {
  if (level === 'country') return 'پنل مدیریت کشوری';
  if (level === 'province') return 'پنل مدیریت استان';
  return 'پنل مرکز / شهرستان';
}

function getManagementDescription(level: ManagementLevel) {
  if (level === 'country') {
    return 'مشاهده و پایش اطلاعات استان‌ها، شهرستان‌ها، مراکز، گزارش‌ها و ارتباطات کل کشور';
  }

  if (level === 'province') {
    return 'مشاهده و پایش اطلاعات شهرستان‌ها و مراکز استان، گزارش‌ها و ارتباطات داخلی استان';
  }

  return 'ثبت و مدیریت اطلاعات مادران، خیرین، پزشکان، معرفی‌نامه‌ها، پیامک‌ها و فعالیت‌های مرکز';
}

const allSections = [
  {
    id: 'mothers',
    icon: Users,
    label: 'مادران',
    desc: 'ثبت و مدیریت مادران',
    color: 'from-blue-500 to-cyan-400',
    soft: 'bg-blue-500/10 text-blue-600',
    stat: 'mothers',
    unit: 'مادر',
  },
  {
    id: 'benefactors',
    icon: Heart,
    label: 'خیرین',
    desc: 'مدیریت خیرین و کمک‌ها',
    color: 'from-emerald-500 to-teal-400',
    soft: 'bg-emerald-500/10 text-emerald-600',
    stat: 'benefactors',
    unit: 'خیر',
  },
  {
    id: 'doctors',
    icon: Stethoscope,
    label: 'پزشکان و متخصصین',
    desc: 'مدیریت پزشکان همکار',
    color: 'from-purple-500 to-indigo-400',
    soft: 'bg-purple-500/10 text-purple-600',
    stat: 'doctors',
    unit: 'پزشک',
  },
  {
    id: 'reports',
    icon: BarChart3,
    label: 'گزارش‌ها',
    desc: 'گزارش‌گیری و خروجی داده',
    color: 'from-rose-500 to-pink-400',
    soft: 'bg-rose-500/10 text-rose-600',
    stat: '',
    unit: '',
  },
  {
    id: 'sms',
    icon: MessageSquare,
    label: 'پنل پیامکی',
    desc: 'ارسال پیامک انبوه',
    color: 'from-amber-500 to-yellow-400',
    soft: 'bg-amber-500/10 text-amber-600',
    stat: '',
    unit: '',
  },
  {
    id: 'activities',
    icon: Sparkles,
    label: 'فعالیت‌های نفس',
    desc: 'ثبت فعالیت‌های آموزشی و فرهنگی',
    color: 'from-orange-500 to-red-400',
    soft: 'bg-orange-500/10 text-orange-600',
    stat: 'activities',
    unit: 'فعالیت',
  },
  {
    id: 'referrals',
    icon: FileText,
    label: 'معرفی‌نامه',
    desc: 'صدور معرفی‌نامه پزشکی رسمی',
    color: 'from-violet-500 to-fuchsia-400',
    soft: 'bg-violet-500/10 text-violet-600',
    stat: '',
    unit: '',
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    label: 'تقویم و مناسبت‌های ستادی',
    desc: 'پایش مناسبت‌های سال ۱۴۰۵ و تنظیم هشدارهای پیش‌دستانه',
    color: 'from-amber-500 to-orange-400',
    soft: 'bg-amber-500/10 text-amber-600',
    stat: '',
    unit: '',
  },
  {
    id: 'centers',
    icon: Building2,
    label: 'مدیریت مراکز نفس',
    desc: 'مشاهده و مدیریت استان‌ها، شهرستان‌ها و مراکز',
    color: 'from-teal-500 to-emerald-400',
    soft: 'bg-teal-500/10 text-teal-600',
    stat: '',
    unit: '',
  },
  {
    id: 'communications',
    icon: MessagesSquare,
    label: 'ارتباطات داخلی',
    desc: 'پیام‌رسانی بین کشور، استان و شهرستان',
    color: 'from-sky-500 to-blue-400',
    soft: 'bg-sky-500/10 text-sky-600',
    stat: '',
    unit: '',
  },
  {
    id: 'cultural',
    icon: LibraryBig,
    label: 'مرکز اسناد و چندرسانه‌ای',
    desc: 'مشاهده و اشتراک‌گذاری عمومی ویدیو، پوستر و اسناد',
    color: 'from-fuchsia-500 to-purple-400',
    soft: 'bg-fuchsia-500/10 text-fuchsia-600',
    stat: '',
    unit: '',
  },
  {
    id: 'profile',
    icon: KeyRound,
    label: 'حساب کاربری',
    desc: 'تغییر نام کاربری و رمز عبور',
    color: 'from-slate-600 to-slate-400',
    soft: 'bg-slate-500/10 text-slate-600',
    stat: '',
    unit: '',
  },
];

export function Dashboard({
  onNavigate,
  stats,
  darkMode,
  currentRole = 'admin',
  activeUser,
  onSwitchToAdmin,
  onOpenSearch,
  onOpenNotifications,
}: Props) {
  const today = todayJalali();
  const [jy = '', jm = '', jd = ''] = today.split('/');

  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  // استیت‌های مربوط به پیام‌های جدید در داشبورد
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // استیت هشدارهای تقویم
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const managementLevel = getStoredManagementLevel(currentRole);
  const isManagementDashboard = currentRole === 'admin' && managementLevel !== 'county';

  const allowedSections = allSections.filter(section => {
    if (currentRole === 'admin') return true;
    if (['referrals', 'communications', 'cultural', 'profile', 'calendar', 'centers'].includes(section.id)) return true;
    if (!activeUser || !Array.isArray(activeUser.access)) return false;
    return activeUser.access.includes(section.id);
  });

  const allStatsCards = [
    { id: 'mothers', label: 'کل مادران', value: stats.mothers, icon: Users, color: 'from-blue-500 to-cyan-400', trend: '+۱۲٪' },
    { id: 'children', label: 'فرزندان نجات‌یافته', value: stats.children, icon: Baby, color: 'from-amber-500 to-yellow-400', trend: '+۸٪' },
    { id: 'benefactors', label: 'کل خیرین', value: stats.benefactors, icon: Heart, color: 'from-emerald-500 to-teal-400', trend: '+۵٪' },
    { id: 'doctors', label: 'پزشکان', value: stats.doctors, icon: Stethoscope, color: 'from-purple-500 to-indigo-400', trend: '+۱۸٪' },
    { id: 'activities', label: 'فعالیت‌های نفس', value: stats.activities, icon: Sparkles, color: 'from-rose-500 to-pink-400', trend: '+۳۰٪' },
  ];

  const allowedStatsCards = allStatsCards.filter(card => {
    if (currentRole === 'admin') return true;
    if (card.id === 'children') return true;
    if (!activeUser || !Array.isArray(activeUser.access)) return false;
    return activeUser.access.includes(card.id);
  });

  const userInitial = currentRole === 'admin' ? 'مدیر' : activeUser?.name?.[0] || activeUser?.username?.[0] || 'ک';

  const handleAdminVerify = () => {
    if (passInput === '6405' || passInput === '۶۴۰۵') {
      setShowPassModal(false);
      setPassInput('');
      setPassError(false);
      if (onSwitchToAdmin) onSwitchToAdmin();
    } else {
      setPassError(true);
    }
  };

  // بررسی زنده رویدادهای تقویم برای نمایش در داشبورد
  useEffect(() => {
    const savedReminders = localStorage.getItem('nafas_calendar_reminders_v1');
    const reminderDays = savedReminders ? JSON.parse(savedReminders) : {
      '1': 7, '2': 3, '3': 30, '6': 1, '9': 7,
    };

    const parts = today.split('/').map(num => parseInt(num) || 0);
    const tMonth = parts[1] || 1;
    const tDay = parts[2] || 1;

    const getDayOfYear = (m: number, d: number) => {
      let days = d;
      for (let i = 1; i < m; i++) days += i <= 6 ? 31 : 30;
      return days;
    };

    const todayDayOfYear = getDayOfYear(tMonth, tDay);

    const upcoming = NAFAS_EVENTS.map(event => {
      const configDays = reminderDays[event.id] || 0;
      const eventDayOfYear = getDayOfYear(event.month, event.day);
      let diff = eventDayOfYear - todayDayOfYear;
      
      if (diff < 0) diff += 365; // محاسبه برای سال بعد اگر رد شده بود

      return { ...event, diff, configDays };
    }).filter(event => event.diff >= 0 && event.diff <= event.configDays)
      .sort((a, b) => a.diff - b.diff);

    setUpcomingEvents(upcoming);
  }, [today]);

  // دریافت و تازه‌سازی زنده (Realtime) پیام‌های جدید
  useEffect(() => {
    async function fetchRecentMessages() {
      if (!allowedSections.some(s => s.id === 'communications')) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      try {
        setLoadingMessages(true);
        const profileStr = localStorage.getItem('nafas_online_profile');
        if (!profileStr) return;
        
        const profile = JSON.parse(profileStr);
        
        const { data, error } = await supabase
          .from('internal_messages')
          .select('id, title, sender_id, created_at, target_type, target_province_id, target_county_id, is_global, profiles(full_name)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        const filtered = (data || []).filter((msg: any) => {
          if (msg.sender_id === profile.id) return false;
          if (msg.is_global || msg.target_type === 'global') return true;

          if (managementLevel === 'country') {
            if (msg.target_type === 'country') return true;
          }
          if (managementLevel === 'province') {
            if (msg.target_province_id === profile.province_id) {
              if (['province', 'province_admin', 'county'].includes(msg.target_type)) return true;
            }
          }
          if (managementLevel === 'county') {
            if (msg.target_province_id === profile.province_id) {
              if (msg.target_type === 'province') return true;
              if (msg.target_type === 'county' && msg.target_county_id === profile.county_id) return true;
            }
          }
          return false;
        }).slice(0, 2); // فقط ۲ پیام آخر در باکس سبز نمایش داده می‌شود

        setRecentMessages(filtered.map((m: any) => {
          const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          // اولویت سیستم: نام کامل -> نام کاربری -> کاربر سیستم
          const name = prof?.full_name || prof?.username || 'کاربر سیستم';
          return { ...m, sender_name: name };
        }));

      } catch (err) {
        console.error('Error fetching recent messages', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchRecentMessages();

    // اتصال به سوپابیس برای دریافت زنده (Realtime) پیام‌ها
    const channel = supabase
      .channel('dashboard_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages' },
        () => {
          // در صورت دریافت پیام جدید در دیتابیس، فوراً لیست آپدیت می‌شود
          fetchRecentMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRole, managementLevel]);

  return (
    <div
      className="min-h-screen bg-transparent p-4 md:p-6 transition-colors duration-300"
      dir="rtl"
      data-theme={darkMode ? 'dark' : 'light'}
    >
      <div className="max-w-[1500px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden xl:flex flex-col sticky top-6 h-[calc(100vh-48px)] rounded-[2rem] border border-white/60 bg-white/75 dark:bg-card/75 backdrop-blur-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-visible">
                  <img src={logo} alt="لوگو" className="w-14 h-14 object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-foreground">مرکز مردمی نفس</h1>
                  <p className="text-xs text-muted-foreground mt-1">نفس نجات فرزندان سقط</p>
                </div>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4 px-2">
                <p className="text-[11px] font-bold text-muted-foreground tracking-wider">منوی اصلی</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20"
                >
                  <LayoutDashboard size={18} />
                  <span className="text-sm font-bold">داشبورد</span>
                </button>

                {allowedSections.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onNavigate(section.id)}
                      className="w-full group flex items-center justify-between px-4 py-3 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-muted/50 transition-all"
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${section.soft}`}>
                          <Icon size={17} />
                        </span>
                        <span className="text-sm font-semibold">{section.label}</span>
                      </span>
                      <ChevronLeft size={15} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-border/50">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-500/10 border border-primary/10 p-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                  <ShieldCheck size={16} />
                  وضعیت دسترسی
                </div>
                <p className="text-xs text-muted-foreground leading-6">
                  {currentRole === 'admin'
                    ? `${getManagementLabel(managementLevel)} فعال است.`
                    : `کاربر فعال: ${activeUser?.name || 'کارمند'}`}
                </p>
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <header className="rounded-[2rem] border border-white/60 bg-white/75 dark:bg-card/75 backdrop-blur-2xl shadow-xl shadow-slate-200/50 p-4 md:p-5">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="xl:hidden w-14 h-14 flex items-center justify-center overflow-visible">
                    <img src={logo} alt="لوگو" className="w-14 h-14 object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-3 py-1 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {currentRole === 'admin'
                          ? getManagementLabel(managementLevel)
                          : `همکار فعال: ${activeUser?.name || 'کارمند'}`}
                      </span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">مرکز مردمی نفس</h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1">
                      {getManagementDescription(managementLevel)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    className="hidden lg:flex items-center bg-background/80 border border-border rounded-2xl px-4 py-3 w-72 shadow-sm transition-all hover:border-primary/50 hover:ring-4 hover:ring-primary/10 cursor-pointer group"
                  >
                    <Search size={16} className="text-muted-foreground group-hover:text-primary transition-colors ml-2" />
                    <span className="text-sm text-muted-foreground/70 group-hover:text-foreground transition-colors flex-1 text-right">جستجوی هوشمند...</span>
                    <kbd className="bg-muted border border-border px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground font-sans font-medium" dir="ltr">Ctrl K</kbd>
                  </button>

                  <div className="flex items-center gap-2 mr-auto lg:mr-0">
                    <button type="button" onClick={onOpenSearch} className="lg:hidden p-3 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-primary transition-all">
                      <Search size={18} />
                    </button>

                    {currentRole === 'staff' && (
                      <button type="button" onClick={() => setShowPassModal(true)} className="flex items-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-rose-500/20 cursor-pointer">
                        <Lock size={14} /> مدیریت
                      </button>
                    )}

                    <button type="button" onClick={onOpenNotifications} className="relative p-3 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer group">
                      <Bell size={18} className="group-hover:text-primary transition-colors" />
                      <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-card animate-pulse" />
                    </button>

                    <button type="button" onClick={() => onNavigate('settings')} className="p-3 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer">
                      <Settings size={18} />
                    </button>

                    <button type="button" onClick={() => onNavigate('profile')} className="p-3 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer" title="حساب کاربری">
                      <KeyRound size={18} />
                    </button>

                    <div className="min-w-11 h-11 px-3 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary/20">
                      {userInitial}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-teal-600 to-emerald-500 text-white p-6 md:p-8 shadow-2xl shadow-primary/25">
                <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full bg-black/10 blur-3xl" />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                      <CalendarDays size={19} />
                    </span>
                    <p className="text-sm text-white/80">امروز {toPersianNumber(jd)} / {toPersianNumber(jm)} / {toPersianNumber(jy)} است.</p>
                  </div>

                  <h2 className="text-2xl md:text-4xl font-extrabold mb-3 leading-tight">
                    {isManagementDashboard ? 'داشبورد مدیریتی' : 'خوش آمدید'}
                  </h2>

                  <p className="text-white/80 leading-7 max-w-2xl mb-8">
                    {isManagementDashboard
                      ? 'در این پنل می‌توانید مراکز، گزارش‌ها، آمارها، پیام‌های داخلی و اطلاعات ثبت‌شده زیرمجموعه‌ها را مشاهده و پایش کنید.'
                      : 'مدیریت پرونده مادران، خیرین، پزشکان، معرفی‌نامه‌ها، پیامک‌ها و فعالیت‌های مرکز در یک داشبورد ساده و حرفه‌ای.'}
                  </p>

                  {/* ---------- ویجت هشدارهای تقویم در داشبورد ---------- */}
                  {upcomingEvents.length > 0 && (
                    <div className="max-w-2xl space-y-3 mb-6">
                      {upcomingEvents.map(event => (
                        <div key={event.id} className="group flex flex-col md:flex-row md:items-center justify-between bg-amber-500/80 hover:bg-amber-500/90 border border-amber-300/40 backdrop-blur-md rounded-2xl p-4 shadow-xl transition-all">
                          <div className="flex items-center gap-4 overflow-hidden mb-3 md:mb-0">
                            <div className="relative w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                              <CalendarDays size={22} className="text-white animate-bounce" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-md shadow-sm">
                                  {event.diff === 0 ? 'امروز!' : `${toPersianNumber(event.diff)} روز مانده`}
                                </span>
                                <span className="text-xs font-extrabold text-white truncate drop-shadow-sm">{event.title}</span>
                              </div>
                              <p className="text-xs font-medium text-amber-50 truncate">
                                {toPersianNumber(event.day)} {MONTH_NAMES[event.month - 1]} - {event.description}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => onNavigate('calendar')} className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors mr-16 md:mr-0 shrink-0">
                            ورود به تقویم <ChevronLeft size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* --------------------------------------------------- */}

                  {/* ---------- ویجت پیام‌های زنده داخل باکس سبز ---------- */}
                  {allowedSections.some(s => s.id === 'communications') && (
                    <div className="max-w-2xl space-y-3 mb-8">
                      {loadingMessages ? (
                        <div className="flex items-center gap-2 text-white/70 text-xs">
                          <Loader2 size={14} className="animate-spin" /> در حال بررسی صندوق پیام...
                        </div>
                      ) : recentMessages.length > 0 ? (
                        recentMessages.map(msg => (
                          <div
                            key={msg.id}
                            onClick={() => onNavigate('communications')}
                            className="group flex flex-col md:flex-row md:items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-2xl p-4 cursor-pointer transition-all shadow-lg"
                          >
                            <div className="flex items-center gap-4 overflow-hidden mb-3 md:mb-0">
                              <div className="relative w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                                <Bell size={20} className="text-white group-hover:animate-pulse" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-primary animate-pulse" />
                              </div>
                              <div className="overflow-hidden">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-md shadow-sm">پیام فوری</span>
                                  <span className="text-xs font-medium text-white/80 truncate">از طرف: {msg.sender_name}</span>
                                </div>
                                <p className="text-sm font-extrabold text-white truncate">{msg.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-white/60 group-hover:text-white transition-colors mr-16 md:mr-0">
                              باز کردن و پاسخ
                              <ChevronLeft size={16} />
                            </div>
                          </div>
                        ))
                      ) : null}
                    </div>
                  )}
                  {/* --------------------------------------------------- */}

                  <div className="flex flex-wrap gap-3 mt-7 pt-4 border-t border-white/10">
                    {isManagementDashboard ? (
                      <>
                        <button type="button" onClick={() => onNavigate('centers')} className="flex items-center gap-2 rounded-2xl bg-white text-primary px-4 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95">
                          <Building2 size={17} /> مدیریت مراکز نفس
                        </button>
                        <button type="button" onClick={() => onNavigate('reports')} className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/25 text-white px-4 py-3 text-sm font-bold backdrop-blur hover:bg-white/20 transition-all active:scale-95">
                          <BarChart3 size={17} /> مشاهده گزارش‌ها
                        </button>
                        <button type="button" onClick={() => onNavigate('communications')} className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/25 text-white px-4 py-3 text-sm font-bold backdrop-blur hover:bg-white/20 transition-all active:scale-95">
                          <MessageSquare size={17} /> ارتباطات داخلی
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => onNavigate('mothers')} className="flex items-center gap-2 rounded-2xl bg-white text-primary px-4 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95">
                          <PlusCircle size={17} /> ثبت مادر جدید
                        </button>
                        <button type="button" onClick={() => onNavigate('referrals')} className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/25 text-white px-4 py-3 text-sm font-bold backdrop-blur hover:bg-white/20 transition-all active:scale-95">
                          <FileText size={17} /> صدور معرفی‌نامه
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/60 bg-white/75 dark:bg-card/75 backdrop-blur-2xl shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                    <ShieldCheck size={22} />
                  </div>
                  <h3 className="text-lg font-extrabold text-foreground mb-2">وضعیت امروز مرکز</h3>
                  <p className="text-sm text-muted-foreground leading-7">آمارها بر اساس اطلاعات ثبت‌شده در سیستم نمایش داده می‌شوند.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <MiniInfo label="مادران" value={stats.mothers} />
                  <MiniInfo label="فرزندان" value={stats.children} />
                  <MiniInfo label="خیرین" value={stats.benefactors} />
                  <MiniInfo label="پزشکان" value={stats.doctors} />
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">نمای کلی آمار</h3>
                  <p className="text-sm text-muted-foreground mt-1">خلاصه وضعیت ثبت‌شده در سامانه</p>
                </div>
              </div>

              {allowedStatsCards.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
                  {allowedStatsCards.map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="rounded-[1.7rem] bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-white/70 shadow-lg shadow-slate-200/50 p-5 group hover:-translate-y-1 hover:shadow-2xl transition-all">
                        <div className="flex justify-between items-start mb-5">
                          <div className={`p-3 rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon size={21} />
                          </div>
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                            <TrendingUp size={12} />
                            {item.trend}
                          </span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-foreground mb-1">{toPersianNumber(item.value || 0)}</h3>
                        <p className="text-muted-foreground text-sm">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-card/80 border border-white/70 rounded-[1.7rem] p-6 text-center text-muted-foreground">
                  شما آمار مجازی ندارید.
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    <Sparkles size={18} className="text-primary" /> ماژول‌های مجاز شما
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">برای ورود به هر بخش روی کارت مربوطه کلیک کنید.</p>
                </div>
              </div>

              {allowedSections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {allowedSections.map(section => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => onNavigate(section.id)}
                        className="w-full group relative overflow-hidden rounded-[1.8rem] bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-white/70 p-6 text-right hover:border-primary/40 transition-all duration-300 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between min-h-[170px] cursor-pointer"
                      >
                        <div className={`absolute -inset-10 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-[0.08] transition-opacity blur-2xl`} />
                        <div>
                          <div className="flex items-start justify-between mb-5 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center text-white shadow-lg group-hover:-translate-y-1 group-hover:scale-105 transition-transform`}>
                              <Icon size={24} />
                            </div>
                            {section.stat && (
                              <div className="bg-background/80 px-3 py-1.5 rounded-xl border border-border">
                                <span className="text-foreground font-bold text-sm">
                                  {toPersianNumber(stats[section.stat as keyof typeof stats] || 0)}
                                </span>
                                <span className="text-muted-foreground text-xs mr-1">{section.unit}</span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-foreground text-lg font-extrabold mb-2 relative z-10">{section.label}</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed relative z-10">{section.desc}</p>
                        </div>
                        <div className="relative z-10 mt-5 flex items-center gap-1 text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>ورود به بخش</span>
                          <ChevronLeft size={16} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-card/80 border border-white/70 rounded-[1.8rem] p-10 text-center">
                  <Lock size={40} className="mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">هیچ بخشی مجاز نیست.</p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <Lock size={18} /> مدیریت
              </div>
              <button type="button" onClick={() => { setShowPassModal(false); setPassError(false); setPassInput(''); }} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <input
              type="password"
              placeholder="••••"
              value={passInput}
              onChange={e => { setPassInput(e.target.value); setPassError(false); }}
              className={`w-full text-center tracking-widest text-lg p-3 rounded-xl border bg-input-background focus:outline-none transition-all ${passError ? 'border-rose-500 bg-rose-500/5' : 'border-border focus:border-rose-500'}`}
              autoFocus
            />
            {passError && <p className="text-xs text-rose-500 text-center mt-2 font-medium">رمز اشتباه است.</p>}
            <button type="button" onClick={handleAdminVerify} className="w-full mt-5 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl cursor-pointer">
              ورود به پنل
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-background/70 border border-border p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-extrabold text-foreground">{toPersianNumber(value || 0)}</p>
    </div>
  );
}