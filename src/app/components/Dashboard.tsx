import { useState } from 'react';
import {
  Users,
  Heart,
  Stethoscope,
  BarChart3,
  MessageSquare,
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
} from 'lucide-react';

// @ts-ignore
import logo from '../../styles/logo.png';
import { todayJalali, toPersianNumber } from '../utils/jalali';

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

  const allowedSections = allSections.filter(section => {
    if (currentRole === 'admin') return true;
    if (section.id === 'referrals') return true;
    if (!activeUser || !Array.isArray(activeUser.access)) return false;
    return activeUser.access.includes(section.id);
  });

  const allStatsCards = [
    {
      id: 'mothers',
      label: 'کل مادران',
      value: stats.mothers,
      icon: Users,
      color: 'from-blue-500 to-cyan-400',
      trend: '+۱۲٪',
    },
    {
      id: 'children',
      label: 'فرزندان نجات‌یافته',
      value: stats.children,
      icon: Baby,
      color: 'from-amber-500 to-yellow-400',
      trend: '+۸٪',
    },
    {
      id: 'benefactors',
      label: 'کل خیرین',
      value: stats.benefactors,
      icon: Heart,
      color: 'from-emerald-500 to-teal-400',
      trend: '+۵٪',
    },
    {
      id: 'doctors',
      label: 'پزشکان',
      value: stats.doctors,
      icon: Stethoscope,
      color: 'from-purple-500 to-indigo-400',
      trend: '+۱۸٪',
    },
    {
      id: 'activities',
      label: 'فعالیت‌های نفس',
      value: stats.activities,
      icon: Sparkles,
      color: 'from-rose-500 to-pink-400',
      trend: '+۳۰٪',
    },
  ];

  const allowedStatsCards = allStatsCards.filter(card => {
    if (currentRole === 'admin') return true;
    if (card.id === 'children') return true;
    if (!activeUser || !Array.isArray(activeUser.access)) return false;
    return activeUser.access.includes(card.id);
  });

  const userInitial =
    currentRole === 'admin'
      ? 'مدیر'
      : activeUser?.name?.[0] || activeUser?.username?.[0] || 'ک';

  const handleAdminVerify = () => {
    if (passInput === '6405' || passInput === '۶۴۰۵') {
      setShowPassModal(false);
      setPassInput('');
      setPassError(false);

      if (onSwitchToAdmin) {
        onSwitchToAdmin();
      }
    } else {
      setPassError(true);
    }
  };

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
                  <img
                    src={logo}
                    alt="لوگو"
                    className="w-14 h-14 object-contain"
                  />
                </div>

                <div>
                  <h1 className="text-lg font-extrabold text-foreground">
                    مرکز مردمی نفس
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    نفس نجات فرزندان سقط
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4 px-2">
                <p className="text-[11px] font-bold text-muted-foreground tracking-wider">
                  منوی اصلی
                </p>
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
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${section.soft}`}
                        >
                          <Icon size={17} />
                        </span>

                        <span className="text-sm font-semibold">
                          {section.label}
                        </span>
                      </span>

                      <ChevronLeft
                        size={15}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
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
                    ? 'شما با دسترسی مدیر وارد شده‌اید.'
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
                    <img
                      src={logo}
                      alt="لوگو"
                      className="w-14 h-14 object-contain"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-3 py-1 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {currentRole === 'admin'
                          ? 'پنل مدیریت اصلی سیستم'
                          : `همکار فعال: ${activeUser?.name || 'کارمند'}`}
                      </span>
                    </div>

                    <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                      مرکز مردمی نفس
                    </h1>

                    <p className="text-muted-foreground text-xs md:text-sm mt-1">
                      داشبورد مدیریت مادران، خیرین، پزشکان و فعالیت‌های مرکز
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    className="hidden lg:flex items-center bg-background/80 border border-border rounded-2xl px-4 py-3 w-72 shadow-sm transition-all hover:border-primary/50 hover:ring-4 hover:ring-primary/10 cursor-pointer group"
                  >
                    <Search
                      size={16}
                      className="text-muted-foreground group-hover:text-primary transition-colors ml-2"
                    />

                    <span className="text-sm text-muted-foreground/70 group-hover:text-foreground transition-colors flex-1 text-right">
                      جستجوی هوشمند...
                    </span>

                    <kbd
                      className="bg-muted border border-border px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground font-sans font-medium"
                      dir="ltr"
                    >
                      Ctrl K
                    </kbd>
                  </button>

                  <div className="flex items-center gap-2 mr-auto lg:mr-0">
                    <button
                      type="button"
                      onClick={onOpenSearch}
                      className="lg:hidden p-3 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-primary transition-all"
                    >
                      <Search size={18} />
                    </button>

                    {currentRole === 'staff' && (
                      <button
                        type="button"
                        onClick={() => setShowPassModal(true)}
                        className="flex items-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-rose-500/20 cursor-pointer"
                      >
                        <Lock size={14} />
                        مدیریت
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onOpenNotifications}
                      className="relative p-3 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer group"
                    >
                      <Bell
                        size={18}
                        className="group-hover:text-primary transition-colors"
                      />

                      <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-card animate-pulse" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('settings')}
                      className="p-3 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer"
                    >
                      <Settings size={18} />
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

                    <p className="text-sm text-white/80">
                      امروز {toPersianNumber(jd)} / {toPersianNumber(jm)} /{' '}
                      {toPersianNumber(jy)} است.
                    </p>
                  </div>

                  <h2 className="text-2xl md:text-4xl font-extrabold mb-3 leading-tight">
                    خوش آمدید
                  </h2>

                  <p className="text-white/80 leading-7 max-w-2xl">
                    مدیریت پرونده مادران، خیرین، پزشکان، معرفی‌نامه‌ها، پیامک‌ها
                    و فعالیت‌های مرکز در یک داشبورد ساده و حرفه‌ای.
                  </p>

                  <div className="flex flex-wrap gap-3 mt-7">
                    <button
                      type="button"
                      onClick={() => onNavigate('mothers')}
                      className="flex items-center gap-2 rounded-2xl bg-white text-primary px-4 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                      <PlusCircle size={17} />
                      ثبت مادر جدید
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('referrals')}
                      className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/25 text-white px-4 py-3 text-sm font-bold backdrop-blur hover:bg-white/20 transition-all active:scale-95"
                    >
                      <FileText size={17} />
                      صدور معرفی‌نامه
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/60 bg-white/75 dark:bg-card/75 backdrop-blur-2xl shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                    <ShieldCheck size={22} />
                  </div>

                  <h3 className="text-lg font-extrabold text-foreground mb-2">
                    وضعیت امروز مرکز
                  </h3>

                  <p className="text-sm text-muted-foreground leading-7">
                    آمارها بر اساس اطلاعات ثبت‌شده در سیستم نمایش داده می‌شوند.
                  </p>
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
                  <h3 className="text-lg font-extrabold text-foreground">
                    نمای کلی آمار
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    خلاصه وضعیت ثبت‌شده در سامانه
                  </p>
                </div>
              </div>

              {allowedStatsCards.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
                  {allowedStatsCards.map(item => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        className="rounded-[1.7rem] bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-white/70 shadow-lg shadow-slate-200/50 p-5 group hover:-translate-y-1 hover:shadow-2xl transition-all"
                      >
                        <div className="flex justify-between items-start mb-5">
                          <div
                            className={`p-3 rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg group-hover:scale-110 transition-transform`}
                          >
                            <Icon size={21} />
                          </div>

                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                            <TrendingUp size={12} />
                            {item.trend}
                          </span>
                        </div>

                        <h3 className="text-3xl font-extrabold text-foreground mb-1">
                          {toPersianNumber(item.value || 0)}
                        </h3>

                        <p className="text-muted-foreground text-sm">
                          {item.label}
                        </p>
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
                    <Sparkles size={18} className="text-primary" />
                    ماژول‌های مجاز شما
                  </h3>

                  <p className="text-sm text-muted-foreground mt-1">
                    برای ورود به هر بخش روی کارت مربوطه کلیک کنید.
                  </p>
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
                        <div
                          className={`absolute -inset-10 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-[0.08] transition-opacity blur-2xl`}
                        />

                        <div>
                          <div className="flex items-start justify-between mb-5 relative z-10">
                            <div
                              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center text-white shadow-lg group-hover:-translate-y-1 group-hover:scale-105 transition-transform`}
                            >
                              <Icon size={24} />
                            </div>

                            {section.stat && (
                              <div className="bg-background/80 px-3 py-1.5 rounded-xl border border-border">
                                <span className="text-foreground font-bold text-sm">
                                  {toPersianNumber(
                                    stats[
                                      section.stat as keyof typeof stats
                                    ] || 0,
                                  )}
                                </span>

                                <span className="text-muted-foreground text-xs mr-1">
                                  {section.unit}
                                </span>
                              </div>
                            )}
                          </div>

                          <h3 className="text-foreground text-lg font-extrabold mb-2 relative z-10">
                            {section.label}
                          </h3>

                          <p className="text-muted-foreground text-sm leading-relaxed relative z-10">
                            {section.desc}
                          </p>
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
                  <Lock
                    size={40}
                    className="mx-auto text-muted-foreground/50 mb-4"
                  />

                  <p className="text-muted-foreground font-medium">
                    هیچ بخشی مجاز نیست.
                  </p>
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
                <Lock size={18} />
                مدیریت
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowPassModal(false);
                  setPassError(false);
                  setPassInput('');
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="password"
              placeholder="••••"
              value={passInput}
              onChange={e => {
                setPassInput(e.target.value);
                setPassError(false);
              }}
              className={`w-full text-center tracking-widest text-lg p-3 rounded-xl border bg-input-background focus:outline-none transition-all ${
                passError
                  ? 'border-rose-500 bg-rose-500/5'
                  : 'border-border focus:border-rose-500'
              }`}
              autoFocus
            />

            {passError && (
              <p className="text-xs text-rose-500 text-center mt-2 font-medium">
                رمز اشتباه است.
              </p>
            )}

            <button
              type="button"
              onClick={handleAdminVerify}
              className="w-full mt-5 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl cursor-pointer"
            >
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

      <p className="text-lg font-extrabold text-foreground">
        {toPersianNumber(value || 0)}
      </p>
    </div>
  );
}