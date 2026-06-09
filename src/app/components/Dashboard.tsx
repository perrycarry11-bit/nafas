import {
  Users,
  Heart,
  Stethoscope,
  BarChart3,
  MessageSquare,
  Settings,
  Sparkles,
} from 'lucide-react';

import logo from '../../styles/logo.png';
import { todayJalali, toPersianNumber } from '../utils/jalali';

interface Props {
  onNavigate: (section: string) => void;
  stats: {
    mothers: number;
    benefactors: number;
    doctors: number;
    activities: number;
  };
  darkMode: boolean;
}

const sections = [
  {
    id: 'mothers',
    icon: Users,
    label: 'مادران',
    desc: 'ثبت و مدیریت مادران',
    color: 'from-teal-500 to-teal-700',
    stat: 'mothers',
    unit: 'مادر',
  },
  {
    id: 'benefactors',
    icon: Heart,
    label: 'خیرین',
    desc: 'مدیریت خیرین و کمک‌ها',
    color: 'from-emerald-500 to-emerald-700',
    stat: 'benefactors',
    unit: 'خیر',
  },
  {
    id: 'doctors',
    icon: Stethoscope,
    label: 'پزشکان و متخصصین',
    desc: 'مدیریت پزشکان همکار',
    color: 'from-cyan-600 to-cyan-800',
    stat: 'doctors',
    unit: 'پزشک',
  },
  {
    id: 'reports',
    icon: BarChart3,
    label: 'گزارش‌ها',
    desc: 'گزارش‌گیری و خروجی داده',
    color: 'from-slate-500 to-slate-700',
    stat: null,
    unit: '',
  },
  {
    id: 'sms',
    icon: MessageSquare,
    label: 'پنل پیامکی',
    desc: 'ارسال پیامک انبوه',
    color: 'from-violet-500 to-violet-700',
    stat: null,
    unit: '',
  },
  {
    id: 'activities',
    icon: Sparkles,
    label: 'فعالیت‌های نفس',
    desc: 'ثبت فعالیت‌های آموزشی، فرهنگی، حمایتی و تصاویر',
    color: 'from-amber-500 to-orange-600',
    stat: 'activities',
    unit: 'فعالیت',
  },
];

export function Dashboard({ onNavigate, stats, darkMode }: Props) {
  const today = todayJalali();
  const [jy = '', jm = '', jd = ''] = today.split('/');

  const statsCards = [
    {
      label: 'کل مادران',
      value: stats.mothers,
      icon: Users,
    },
    {
      label: 'کل خیرین',
      value: stats.benefactors,
      icon: Heart,
    },
    {
      label: 'پزشکان',
      value: stats.doctors,
      icon: Stethoscope,
    },
    {
      label: 'فعالیت‌های نفس',
      value: stats.activities,
      icon: Sparkles,
    },
  ];

  return (
    <div
      className="min-h-screen bg-background"
      dir="rtl"
      data-theme={darkMode ? 'dark' : 'light'}
    >
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoBox />

            <div>
              <h1
                className="text-foreground"
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
              >
                مرکز مردمی نفس
              </h1>
              <p
                className="text-muted-foreground"
                style={{ fontSize: '0.75rem' }}
              >
                سیستم مدیریت جامع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left">
              <p
                className="text-muted-foreground"
                style={{ fontSize: '0.75rem' }}
              >
                تاریخ امروز
              </p>
              <p
                className="text-foreground"
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                {toPersianNumber(jd)} / {toPersianNumber(jm)} /{' '}
                {toPersianNumber(jy)}
              </p>
            </div>

            <button
              onClick={() => onNavigate('settings')}
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="تنظیمات"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h2
            className="text-foreground mb-1"
            style={{ fontSize: '1.4rem', fontWeight: 700 }}
          >
            خوش آمدید
          </h2>
          <p className="text-muted-foreground">
            از منوی زیر به بخش‌های مختلف دسترسی داشته باشید
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {statsCards.map(item => (
            <div
              key={item.label}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon size={18} className="text-primary" />
              </div>

              <div>
                <p
                  className="text-muted-foreground"
                  style={{ fontSize: '0.8rem' }}
                >
                  {item.label}
                </p>
                <p
                  className="text-foreground"
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {toPersianNumber(item.value)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {sections.map(sec => (
            <NavCard
              key={sec.id}
              icon={sec.icon}
              label={sec.label}
              desc={sec.desc}
              color={sec.color}
              unit={sec.unit}
              stat={
                sec.stat
                  ? stats[sec.stat as keyof typeof stats] || 0
                  : undefined
              }
              onClick={() => onNavigate(sec.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LogoBox() {
  return (
    <div
      className="w-14 h-14 flex items-center justify-center overflow-visible"
      style={{
        minWidth: '56px',
        minHeight: '56px',
      }}
    >
      <img
        src={logo}
        alt="لوگو مرکز نفس"
        className="block"
        style={{
          width: '56px',
          height: '56px',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

function NavCard({
  icon: Icon,
  label,
  desc,
  color,
  stat,
  unit,
  onClick,
}: {
  icon: any;
  label: string;
  desc: string;
  color: string;
  stat?: number;
  unit?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="group relative overflow-hidden bg-card border border-border rounded-2xl p-6 text-right hover:border-primary hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity`}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
        >
          <Icon size={22} className="text-white" />
        </div>

        {stat !== undefined && (
          <span
            className="text-muted-foreground"
            style={{ fontSize: '0.8rem' }}
          >
            {toPersianNumber(stat)} {unit}
          </span>
        )}
      </div>

      <h3
        className="text-foreground mb-1"
        style={{ fontSize: '1rem', fontWeight: 700 }}
      >
        {label}
      </h3>

      <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
        {desc}
      </p>

      <div
        className="mt-4 flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ fontSize: '0.8rem' }}
      >
        <span>ورود به بخش</span>
        <span>←</span>
      </div>
    </button>
  );
}