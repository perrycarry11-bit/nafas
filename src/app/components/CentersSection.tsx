import { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  Building2,
  MapPin,
  Users,
  Baby,
  Search,
  ChevronDown,
  ShieldAlert,
  ShieldCheck,
  Network
} from 'lucide-react';
import { toPersianNumber } from '../utils/jalali';
import { supabase } from '../utils/supabaseClient';

interface Props {
  onBack: () => void;
}

// لیست کامل و دقیق ۳۱ استان ایران
const IRAN_PROVINCES = [
  "آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام", "بوشهر",
  "تهران", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان رضوی", "خراسان شمالی", "خوزستان",
  "زنجان", "سمنان", "سیستان و بلوچستان", "فارس", "قزوین", "قم", "کردستان", "کرمان",
  "کرمانشاه", "کهگیلویه و بویراحمد", "گلستان", "گیلان", "لرستان", "مازندران", "مرکزی",
  "هرمزگان", "همدان", "یزد"
];

// تابع نرمال‌سازی نام استان‌ها (برای جلوگیری از تداخل "تهران" و "استان تهران")
function normalizeProvinceName(name: string) {
  if (!name) return 'نامشخص';
  let clean = name.trim();
  if (clean.startsWith('استان ')) clean = clean.replace('استان ', '');
  return clean;
}

export function CentersSection({ onBack }: Props) {
  // دریافت سطح دسترسی و نام استان کاربر فعال از حافظه
  const managementLevel = localStorage.getItem('nafas_current_management_level') || 'county';
  const myProvinceName = normalizeProvinceName(localStorage.getItem('nafas_current_province_name') || '');
  
  const isCountryAdmin = managementLevel === 'country';

  // استیت‌های فیلتر و جستجو
  const [selectedProvince, setSelectedProvince] = useState<string | null>(isCountryAdmin ? null : myProvinceName);
  const [searchQuery, setSearchQuery] = useState('');
  
  // استیت نگهداری مراکز واقعی کشیده‌شده از دیتابیس
  const [dbCentersMap, setDbCentersMap] = useState<Record<string, string[]>>({});

  // 🌍 دریافت مستقیم شهرستان‌ها از دیتابیس (برای آمار دقیق مراکز)
  useEffect(() => {
    if (managementLevel === 'county') return;

    async function fetchRealCenters() {
      try {
        const { data: pData } = await supabase.from('provinces').select('id, name');
        const { data: cData } = await supabase.from('counties').select('id, province_id, name');

        if (pData && cData) {
          const map: Record<string, string[]> = {};
          cData.forEach(c => {
            const prov = pData.find(p => p.id === c.province_id);
            if (prov) {
              const pName = normalizeProvinceName(prov.name);
              if (!map[pName]) map[pName] = [];
              if (!map[pName].includes(c.name)) {
                map[pName].push(c.name);
              }
            }
          });
          setDbCentersMap(map);
        }
      } catch (err) {
        console.error('خطا در دریافت لیست مراکز از سرور:', err);
      }
    }

    fetchRealCenters();
  }, [managementLevel]);

  // ترکیب آمار مادران (آفلاین) با لیست واقعی مراکز (آنلاین)
  const realStats = useMemo(() => {
    const statsMap: Record<string, { mothers: number; babies: number; counties: Record<string, { mothers: number; babies: number }> }> = {};
    
    // مقداردهی اولیه استان‌ها
    IRAN_PROVINCES.forEach(p => {
      statsMap[p] = { mothers: 0, babies: 0, counties: {} };
    });

    // ۱. خواندن آمار مادران ثبت‌شده
    try {
      const rawMothers = localStorage.getItem('nafas_mothers');
      const mothers = rawMothers ? JSON.parse(rawMothers) : [];

      mothers.forEach((m: any) => {
        const pName = normalizeProvinceName(m.province || m.province_name || m.provinceName || 'نامشخص');
        const cName = m.county || m.county_name || m.countyName || 'نامشخص';
        
        const validProv = IRAN_PROVINCES.find(p => p === pName) || pName;

        let bCount = 0;
        if (Array.isArray(m.children)) bCount = m.children.length;
        else if (typeof m.children === 'number') bCount = m.children;
        else if (typeof m.childrenCount === 'number') bCount = m.childrenCount;
        else if (typeof m.childrenCount === 'string') bCount = parseInt(m.childrenCount) || 0;

        if (!statsMap[validProv]) statsMap[validProv] = { mothers: 0, babies: 0, counties: {} };

        statsMap[validProv].mothers += 1;
        statsMap[validProv].babies += bCount;

        if (!statsMap[validProv].counties[cName]) {
          statsMap[validProv].counties[cName] = { mothers: 0, babies: 0 };
        }
        statsMap[validProv].counties[cName].mothers += 1;
        statsMap[validProv].counties[cName].babies += bCount;
      });
    } catch (e) {
      console.error("خطا در پردازش آمار مادران", e);
    }

    // ۲. تزریق شهرستان‌های واقعی دیتابیس به نقشه (حتی اگر مادر ثبت نکرده باشند)
    Object.keys(dbCentersMap).forEach(prov => {
      const validProv = IRAN_PROVINCES.find(p => p === prov) || prov;
      if (!statsMap[validProv]) statsMap[validProv] = { mothers: 0, babies: 0, counties: {} };

      dbCentersMap[prov].forEach(cName => {
        if (!statsMap[validProv].counties[cName]) {
          statsMap[validProv].counties[cName] = { mothers: 0, babies: 0 };
        }
      });
    });

    return statsMap;
  }, [dbCentersMap]);

  // --- مسدود کردن دسترسی شهرستان‌ها ---
  if (managementLevel === 'county') {
    return (
      <div className="min-h-screen bg-background p-6" dir="rtl">
        <header className="flex items-center gap-4 mb-16 max-w-4xl mx-auto">
          <button onClick={onBack} className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-black text-foreground">مدیریت مراکز نفس</h1>
        </header>
        
        <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center bg-card border border-border p-10 rounded-[2rem] shadow-sm">
          <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
            <ShieldAlert size={48} className="text-rose-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-3">عدم دسترسی</h2>
          <p className="text-muted-foreground leading-8 font-medium">
            دسترسی این بخش فقط برای مدیر کشوری و استانی امکان‌پذیر است.
          </p>
          <button onClick={onBack} className="mt-8 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  // آماده‌سازی دیتای نمایشی
  const displayData = useMemo(() => {
    if (selectedProvince) {
      // لیست شهرستان‌های استان انتخاب‌شده
      const provinceData = realStats[selectedProvince];
      if (!provinceData) return [];
      
      const countiesArray = Object.keys(provinceData.counties).map(cName => ({
        name: cName,
        ...provinceData.counties[cName],
        isProvince: false
      }));
      
      return countiesArray.filter(c => c.name.includes(searchQuery));
    } else {
      // لیست تمامی استان‌ها (ویژه مدیر کشوری)
      const provincesArray = Object.keys(realStats).map(pName => ({
        name: pName,
        ...realStats[pName],
        centersCount: Object.keys(realStats[pName].counties).length,
        isProvince: true
      }));
      
      // مرتب‌سازی: استان‌های دارای مرکز بالاتر قرار می‌گیرند
      return provincesArray
        .filter(p => p.name.includes(searchQuery))
        .sort((a, b) => b.centersCount - a.centersCount);
    }
  }, [selectedProvince, searchQuery, realStats]);

  // محاسبه آمار کلان بالای صفحه
  const topStats = useMemo(() => {
    if (selectedProvince) {
      const provData = realStats[selectedProvince];
      const activeCountiesCount = provData ? Object.keys(provData.counties).length : 0;
      return {
        title: `آمار کل استان ${selectedProvince}`,
        mothers: provData?.mothers || 0,
        babies: provData?.babies || 0,
        centersLabel: 'مراکز ثبت‌شده استان',
        centersCount: activeCountiesCount
      };
    } else {
      let tMothers = 0;
      let tBabies = 0;
      let tCenters = 0;
      Object.values(realStats).forEach(p => {
        tMothers += p.mothers;
        tBabies += p.babies;
        tCenters += Object.keys(p.counties).length;
      });
      return {
        title: 'آمار کلان کشوری',
        mothers: tMothers,
        babies: tBabies,
        centersLabel: 'کل مراکز ثبت‌شده ایران',
        centersCount: tCenters
      };
    }
  }, [selectedProvince, realStats]);

  return (
    <div className="min-h-screen bg-background pb-12" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <ArrowRight size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-primary" />
                <h1 className="text-xl font-black text-foreground tracking-tight">
                  مدیریت و پایش مراکز نفس
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {isCountryAdmin ? 'دسترسی سطح اول: رصد کلان کشوری و استانی' : `دسترسی استانی: پایش شهرستان‌های استان ${myProvinceName}`}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl text-xs font-bold text-emerald-600">
            <ShieldCheck size={16} />
            سطح دسترسی شما: {isCountryAdmin ? 'مدیریت کشور' : 'مدیریت استان'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6 mt-2">
        {/* کارت‌های آماری بالا */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard 
            title="مادران ثبت‌شده" 
            value={topStats.mothers} 
            subtitle={topStats.title} 
            icon={<Users size={24} />} 
            color="text-blue-500" 
            bg="bg-blue-500/10" 
          />
          <StatCard 
            title="نوزادان متولد شده / نجات‌یافته" 
            value={topStats.babies} 
            subtitle={topStats.title} 
            icon={<Baby size={24} />} 
            color="text-amber-500" 
            bg="bg-amber-500/10" 
          />
          <StatCard 
            title={topStats.centersLabel} 
            value={topStats.centersCount} 
            subtitle="مراکز متصل به شبکه (شهرستان‌ها)" 
            icon={<Network size={24} />} 
            color="text-teal-500" 
            bg="bg-teal-500/10" 
          />
        </div>

        {/* نوار ابزار و فیلترها */}
        <div className="bg-card border border-border rounded-[2rem] p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={selectedProvince ? 'جستجوی نام شهرستان...' : 'جستجوی نام استان...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-2xl py-3 pr-12 pl-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {isCountryAdmin && (
              <>
                {selectedProvince && (
                  <button 
                    onClick={() => setSelectedProvince(null)}
                    className="px-4 py-3 rounded-2xl bg-muted text-muted-foreground text-sm font-bold hover:bg-muted/80 transition-colors whitespace-nowrap"
                  >
                    نمایش کل کشور
                  </button>
                )}
                <div className="relative w-full md:w-auto">
                  <select 
                    className="w-full md:w-56 appearance-none bg-primary/10 border border-primary/20 text-primary font-bold rounded-2xl py-3 px-4 pr-10 text-sm focus:outline-none cursor-pointer"
                    value={selectedProvince || ''}
                    onChange={(e) => setSelectedProvince(e.target.value || null)}
                  >
                    <option value="">همه استان‌ها (کشوری)</option>
                    {IRAN_PROVINCES.map(pName => (
                      <option key={pName} value={pName}>استان {pName}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* لیست گرید دیتا */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayData.length > 0 ? (
            displayData.map((item: any, idx) => {
              // تشخیص فعال بودن کارت: برای استان اگر مرکز داشت / برای شهرستان کلا فعاله چون ثبت شده
              const isActive = item.isProvince ? item.centersCount > 0 : true;
              
              return (
                <div key={idx} className={`bg-card border rounded-[2rem] p-6 shadow-sm transition-all group relative overflow-hidden ${isActive ? 'border-border hover:shadow-xl hover:-translate-y-1 cursor-pointer' : 'border-dashed border-border/60 opacity-70'}`}>
                  
                  {/* افکت پس‌زمینه کارت */}
                  {isActive && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors" />
                  )}
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {item.isProvince ? <MapPin size={20} /> : <Building2 size={20} />}
                      </div>
                      <div>
                        <h3 className={`font-extrabold text-lg ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{item.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {item.isProvince ? 'استان تحت پوشش' : 'شهرستان / مرکز ثبت‌شده'}
                        </p>
                      </div>
                    </div>
                    
                    {item.isProvince && (
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}>
                        {isActive ? 'دارای مرکز فعال' : 'فاقد مرکز'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* برای استان‌ها تعداد مراکز را هم در کارت بنویس */}
                    {item.isProvince && (
                      <div className={`flex justify-between items-center p-3 rounded-xl border ${isActive ? 'bg-muted/40 border-border/50' : 'bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <Network size={16} className={isActive ? "text-teal-500" : "text-muted-foreground"} />
                          مراکز (شهرستان‌ها)
                        </div>
                        <span className={`font-black text-lg ${isActive ? 'text-teal-600' : 'text-muted-foreground'}`}>
                          {toPersianNumber(item.centersCount)}
                        </span>
                      </div>
                    )}

                    <div className={`flex justify-between items-center p-3 rounded-xl border ${isActive ? 'bg-muted/40 border-border/50' : 'bg-transparent border-transparent'}`}>
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Users size={16} className={isActive ? "text-blue-500" : "text-muted-foreground"} />
                        مادران ثبت‌شده
                      </div>
                      <span className={`font-black text-lg ${isActive ? 'text-blue-600' : 'text-muted-foreground'}`}>
                        {toPersianNumber(item.mothers)}
                      </span>
                    </div>

                    <div className={`flex justify-between items-center p-3 rounded-xl border ${isActive ? 'bg-muted/40 border-border/50' : 'bg-transparent border-transparent'}`}>
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Baby size={16} className={isActive ? "text-amber-500" : "text-muted-foreground"} />
                        نوزادان نجات‌یافته
                      </div>
                      <span className={`font-black text-lg ${isActive ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {toPersianNumber(item.babies)}
                      </span>
                    </div>
                  </div>

                  {isCountryAdmin && item.isProvince && (
                    <button 
                      onClick={() => setSelectedProvince(item.name)}
                      className={`w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors ${isActive ? 'bg-primary/5 text-primary hover:bg-primary hover:text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                    >
                      ورود به شهرستان‌های استان
                      <ArrowRight size={16} className="rotate-180" />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center bg-card border-2 border-dashed border-border rounded-[2rem]">
              <Search size={40} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-bold">هیچ اطلاعاتی یافت نشد.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// کامپوننت داخلی کارت‌های آمار بالای صفحه
function StatCard({ title, value, subtitle, icon, color, bg }: any) {
  return (
    <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm relative overflow-hidden flex items-center gap-5">
      <div className={`w-16 h-16 rounded-2xl ${bg} ${color} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-muted-foreground mb-1">{title}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-foreground">{toPersianNumber(value)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 opacity-70">{subtitle}</p>
      </div>
    </div>
  );
}