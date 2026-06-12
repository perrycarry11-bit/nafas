import { useState, useEffect } from 'react';
import { X, Bell, Users, Heart, Stethoscope, Calendar, Check } from 'lucide-react';
import { toPersianNumber } from '../utils/jalali';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRole: 'admin' | 'staff';
}

// تابع کمکی برای تبدیل تاریخ شمسی (که در دیتابیس ذخیره شده) به میلادی جهت محاسبه دقیق فاصله روزها
function jalaliToGregorian(jStr: string): Date | null {
  if (!jStr) return null;
  const parts = jStr.split('/').map(Number);
  if (parts.length !== 3) return null;
  
  let jy = parts[0];
  let jm = parts[1];
  let jd = parts[2];

  let jy2 = jy - 979;
  let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) j_day_no += [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i];
  j_day_no += jd - 1;

  let g_day_no = j_day_no + 79;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no %= 146097;

  let leap = 1;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no %= 36524;
    if (g_day_no >= 365) g_day_no++; else leap = 0;
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = 0;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no %= 365;
  }

  let i = 0;
  const g_days_in_month = [31, 28 + leap, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (i = 0; i < 12 && g_day_no >= g_days_in_month[i]; ++i) g_day_no -= g_days_in_month[i];
  let gm = i + 1;
  let gd = g_day_no + 1;

  return new Date(gy, gm - 1, gd);
}

export function NotificationCenter({ isOpen, onClose, currentRole }: Props) {
  const [remindDays, setRemindDays] = useState<number>(() => {
    return Number(localStorage.getItem('nafas_noti_days')) || 10;
  });

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    localStorage.setItem('nafas_noti_days', remindDays.toString());
  }, [remindDays]);

  useEffect(() => {
    if (isOpen) {
      const list: any[] = [];
      const now = new Date();
      // صفر کردن ساعت امروز برای محاسبه دقیق روزها
      now.setHours(0, 0, 0, 0);

      // ۱. اسکن کاملاً هوشمند دیتابیس مادران بر اساس تاریخ احتمالی زایمان (شمسی یا میلادی)
      try {
        const rawMothers = localStorage.getItem('nafas_mothers');
        if (rawMothers) {
          const mothers = JSON.parse(rawMothers);
          mothers.forEach((m: any) => {
            // فیلد تاریخ زایمان معمولا edd یا deliveryDate نام دارد
            const dateStr = m.edd || m.deliveryDate || m.birthDate; 
            if (dateStr) {
              // تشخیص نوع تاریخ و تبدیل آن به دیتِ استاندارد ریکت
              const eddDate = dateStr.includes('/') ? jalaliToGregorian(dateStr) : new Date(dateStr);
              
              if (eddDate) {
                eddDate.setHours(0, 0, 0, 0);
                const diffTime = eddDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // شرط بررسی بازه زمانی تعیین شده توسط کاربر (مثلاً کمتر از ۲۰ روز)
                if (diffDays >= 0 && diffDays <= remindDays) {
                  list.push({
                    id: `edd-${m.id || Math.random()}`,
                    type: 'mother',
                    title: 'نزدیک شدن به زمان زایمان',
                    desc: `حدود ${toPersianNumber(diffDays)} روز تا تاریخ احتمالی زایمان مادر «${m.name || m.fullName || m.motherName || 'ثبت‌نشده'}» باقی مانده است. وقت پیگیری وضعیت زایمان و حال مادر است.`,
                    time: 'فوری',
                    icon: Users,
                    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                  });
                }
              }
            }
          });
        }
      } catch (e) {}

      // ۲. اسکن دیتابیس خیرین (سررسید تعهدات حمایتی)
      try {
        const rawBenefactors = localStorage.getItem('nafas_benefactors');
        if (rawBenefactors) {
          const benefactors = JSON.parse(rawBenefactors);
          benefactors.forEach((b: any) => {
            if (b.dueDate || b.paymentDate) {
              const bDateStr = b.dueDate || b.paymentDate;
              const dueDate = bDateStr.includes('/') ? jalaliToGregorian(bDateStr) : new Date(bDateStr);
              
              if (dueDate && dueDate < now && !b.isPaid) {
                list.push({
                  id: `ben-${b.id || Math.random()}`,
                  type: 'benefactor',
                  title: 'سررسید تعهد خیر',
                  desc: `موعد واریز کمک حمایتی خیر گرامی «${b.name || b.benefactorName || 'نامشخص'}» گذشته است. لطفا جهت پیگیری تماس بگیرید.`,
                  time: 'معوقه',
                  icon: Heart,
                  color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                });
              }
            }
          });
        }
      } catch (e) {}

      // ۳. اعلان پزشکان سیستم
      try {
        const rawDoctors = localStorage.getItem('nafas_doctors');
        if (rawDoctors) {
          const docs = JSON.parse(rawDoctors);
          if (docs.length > 0) {
            const lastDoc = docs[docs.length - 1];
            list.push({
              id: `doc-${lastDoc.id || Math.random()}`,
              type: 'doctor',
              title: 'تایید همکار پزشک جدید',
              desc: `اطلاعات تخصصی پزشک داوطلب جدید «دکتر ${lastDoc.name || lastDoc.doctorName}» ثبت شد. لطفاً وضعیت نظام پزشکی را بررسی کنید.`,
              time: 'جدید',
              icon: Stethoscope,
              color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
            });
          }
        }
      } catch (e) {}

      // دیتای دمو و نمونه برای حفظ زیبایی گرافیکی در صورت نبود دیتا
      if (list.length === 0) {
        list.push(
          {
            id: 'demo-1',
            type: 'mother',
            title: 'یادآوری زایمان (نمونه سیستم)',
            desc: `۱۰ روز مانده تا تاریخ احتمالی زایمان مادر «مریم سادات حسینی». وقت پیگیری زایمان و حال مادر است.`,
            time: 'هم‌اکنون',
            icon: Users,
            color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
          },
          {
            id: 'demo-2',
            type: 'benefactor',
            title: 'تعهد مالی معوقه (نمونه سیستم)',
            desc: 'موعد واریز کمک هزینه ماهانه خیر «جناب آقای علوی» جهت تامین شیرخشک نوزادان تحت پوشش ۳ روز به تاخیر افتاده است.',
            time: 'دیروز',
            icon: Heart,
            color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
          }
        );
      }

      setNotifications(list);

      // ارسال هشدار بومی و رسمی به ویندوز (Desktop Push Notification)
      if (list.length > 0 && Notification.permission === 'granted') {
        new Notification('دستیار هوشمند مرکز نفس', {
          body: list[0].desc,
          dir: 'rtl'
        });
      }
    }
  }, [isOpen, remindDays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/20 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose} dir="rtl">
      <div className="w-full max-w-md bg-card/95 backdrop-blur-xl border-r border-border h-full shadow-2xl rounded-l-3xl overflow-hidden flex flex-col animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
        
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 font-extrabold text-foreground">
            <Bell size={20} className="text-primary animate-pulse" />
            <span>مرکز اعلان‌های هوشمند نفس</span>
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-sans">{toPersianNumber(notifications.length)}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><X size={18} /></button>
        </div>

        {/* بخش تنظیم داینامیک روزهای هشدار زایمان */}
        <div className="p-4 border-b border-border/40 bg-primary/5 mx-4 mt-4 rounded-2xl border border-primary/10 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              بازه زمانی پیگیری زایمان مادران:
            </span>
            <span className="text-xs font-black text-primary bg-background px-2 py-1 border border-border rounded-lg shadow-sm">
              {toPersianNumber(remindDays)} روز مانده
            </span>
          </div>
          <input 
            type="range" 
            min="3" 
            max="30" 
            value={remindDays} 
            onChange={(e) => setRemindDays(Number(e.target.value))}
            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mt-2"
          />
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">با تغییر این اسلایدر، سیستم به طور خودکار پرونده‌هایی که زمان احتمالی وضع حمل آن‌ها نزدیک است را شناسایی کرده و علاوه بر این منو، روی دسکتاپ ویندوز نیز هشدار صادر می‌کند.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((noti) => (
            <div key={noti.id} className="p-4 border border-border rounded-2xl flex gap-3 relative overflow-hidden bg-card/60 hover:border-primary/30 hover:shadow-sm transition-all group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${noti.color}`}>
                <noti.icon size={18} />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{noti.title}</h4>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{noti.time}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{noti.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
          <span>سرویس مانیتورینگ پس‌زمینه: فعال</span>
          <button className="text-primary font-bold flex items-center gap-1 hover:underline cursor-pointer"><Check size={14} /> خواندن همه</button>
        </div>
      </div>
    </div>
  );
}