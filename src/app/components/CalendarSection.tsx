import { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Bell,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Baby,
  Stethoscope,
  Users,
  Settings2,
  CheckCircle2,
  Plus,
  Trash2,
  User,
  X,
  AlignLeft,
} from 'lucide-react';
import { toPersianNumber, todayJalali } from '../utils/jalali';

interface Props {
  onBack: () => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  month: number;
  day: number;
  category: 'medical' | 'mother' | 'population' | 'general' | 'personal';
  description: string;
  isCustom?: boolean;
  reminderDays?: number;
}

// لیست جامع مناسبت‌های هدف برای سال ۱۴۰۵ (عمومی)
const NAFAS_EVENTS: CalendarEvent[] = [
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

const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function CalendarSection({ onBack }: Props) {
  const [currentMonth, setCurrentMonth] = useState(1);
  const [selectedDate, setSelectedDate] = useState<{ month: number; day: number } | null>(null);
  
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // فرم افزودن رویداد شخصی
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventReminder, setNewEventReminder] = useState(3);

  // شناسه کاربر فعال جهت حریم خصوصی رویدادها
  const currentUserId = localStorage.getItem('nafas_current_online_user_id') || 'local_user';

  // دریافت تنظیمات هشدارهای سیستمی و رویدادهای شخصی از حافظه
  const [reminderDays, setReminderSettings] = useState<{ [key: string]: number }>(() => {
    const saved = localStorage.getItem('nafas_calendar_reminders_v1');
    if (saved) return JSON.parse(saved);
    return {
      '1': 7, '2': 3, '3': 30, '6': 1, '9': 7,
    };
  });

  useEffect(() => {
    localStorage.setItem('nafas_calendar_reminders_v1', JSON.stringify(reminderDays));
  }, [reminderDays]);

  useEffect(() => {
    // لود کردن رویدادهای اختصاصیِ همین کاربر
    const savedCustomEvents = localStorage.getItem(`nafas_custom_events_${currentUserId}`);
    if (savedCustomEvents) {
      try {
        setCustomEvents(JSON.parse(savedCustomEvents));
      } catch (e) {
        setCustomEvents([]);
      }
    }
  }, [currentUserId]);

  const saveCustomEvents = (events: CalendarEvent[]) => {
    setCustomEvents(events);
    localStorage.setItem(`nafas_custom_events_${currentUserId}`, JSON.stringify(events));
  };

  const todayStr = todayJalali(); 
  const [tYear, tMonth, tDay] = useMemo(() => {
    const parts = todayStr.split('/').map(num => parseInt(num) || 0);
    return [parts[0] || 1405, parts[1] || 1, parts[2] || 1];
  }, [todayStr]);

  const daysInMonth = useMemo(() => {
    if (currentMonth <= 6) return 31;
    if (currentMonth <= 11) return 30;
    return 29; 
  }, [currentMonth]);

  const startDayOffset = useMemo(() => {
    let totalDays = 0;
    for (let m = 1; m < currentMonth; m++) {
      totalDays += m <= 6 ? 31 : 30;
    }
    return totalDays % 7; 
  }, [currentMonth]);

  const handleDaysChange = (eventId: string, days: number) => {
    setReminderSettings(prev => ({ ...prev, [eventId]: days }));
  };

  // ترکیب رویدادهای ملی و شخصی برای پردازش یکپارچه
  const ALL_EVENTS = useMemo(() => {
    return [...NAFAS_EVENTS, ...customEvents];
  }, [customEvents]);

  // محاسبه آلارم‌های فعال
  const activeAlerts = useMemo(() => {
    const getDayOfYear = (m: number, d: number) => {
      let days = d;
      for (let i = 1; i < m; i++) days += i <= 6 ? 31 : 30;
      return days;
    };

    const todayDayOfYear = getDayOfYear(tMonth, tDay);

    return ALL_EVENTS.map(event => {
      const configDays = event.isCustom ? (event.reminderDays || 0) : (reminderDays[event.id] || 0);
      const eventDayOfYear = getDayOfYear(event.month, event.day);
      let diff = eventDayOfYear - todayDayOfYear;
      
      // اگر از رویداد گذشته و وارد سال بعد شده‌ایم
      if (diff < 0) diff += 365;

      return { ...event, diff, configDays };
    }).filter(event => event.diff >= 0 && event.diff <= event.configDays)
      .sort((a, b) => a.diff - b.diff);
  }, [ALL_EVENTS, reminderDays, tMonth, tDay]);

  // ثبت رویداد شخصی جدید
  const handleAddCustomEvent = () => {
    if (!selectedDate) return;
    if (!newEventTitle.trim()) {
      alert('لطفاً عنوان رویداد را وارد کنید.');
      return;
    }

    const newEvent: CalendarEvent = {
      id: `custom_${Date.now()}`,
      title: newEventTitle.trim(),
      description: newEventDesc.trim() || 'یادداشت شخصی ندارد.',
      month: selectedDate.month,
      day: selectedDate.day,
      category: 'personal',
      isCustom: true,
      reminderDays: newEventReminder,
    };

    saveCustomEvents([...customEvents, newEvent]);
    setShowAddModal(false);
    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventReminder(3);
  };

  // حذف رویداد شخصی
  const handleDeleteCustomEvent = (id: string) => {
    if(window.confirm('آیا از حذف این یادداشت شخصی اطمینان دارید؟')) {
      const updated = customEvents.filter(e => e.id !== id);
      saveCustomEvents(updated);
    }
  };

  // رویدادهای روزِ انتخاب‌شده
  const dayEventsList = useMemo(() => {
    if (!selectedDate) return [];
    return ALL_EVENTS.filter(e => e.month === selectedDate.month && e.day === selectedDate.day);
  }, [selectedDate, ALL_EVENTS]);

  return (
    <div className="min-h-screen bg-background pb-12" dir="rtl">
      <PageHeader 
        title="تقویم ستادی و دستیار یادآوری من" 
        subtitle="برنامه‌ریزی رویدادهای کشوری و ثبت یادداشت‌ها و یادآوری‌های شخصی"
        onBack={onBack} 
      />

      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* سایدبار هشدارها و تنظیمات */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-[2rem] p-5 shadow-sm">
            <h3 className="font-black text-foreground text-base mb-4 flex items-center gap-2">
              <Bell size={18} className="text-amber-500 animate-bounce" />
              مرکز هشدارهای هوشمند (نزدیک)
            </h3>

            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl text-xs text-muted-foreground leading-6">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                  هیچ هشدار رویدادی برای بازه زمانی فعلی وجود ندارد. تقویم خلوت است.
                </div>
              ) : (
                activeAlerts.map(alert => (
                  <div key={alert.id} className={`p-4 rounded-2xl border flex flex-col gap-2 animate-in fade-in duration-300 ${
                    alert.isCustom ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-amber-500/10 border-amber-500/20'
                  }`}>
                    <div className="flex justify-between items-start">
                      <h4 className={`font-extrabold text-sm ${alert.isCustom ? 'text-indigo-800 dark:text-indigo-400' : 'text-amber-800 dark:text-amber-400'}`}>
                        {alert.title}
                        {alert.isCustom && <span className="ml-2 text-[9px] bg-indigo-500/20 text-indigo-600 px-1.5 py-0.5 rounded-md">یادداشت من</span>}
                      </h4>
                      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-md ${
                        alert.isCustom ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}>
                        {alert.diff === 0 ? 'امروز!' : `${toPersianNumber(alert.diff)} روز مانده`}
                      </span>
                    </div>
                    <p className={`text-xs leading-5 ${alert.isCustom ? 'text-indigo-900/80 dark:text-indigo-200' : 'text-amber-900/80 dark:text-amber-200'}`}>
                      {alert.description}
                    </p>
                    <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${alert.isCustom ? 'text-indigo-700 dark:text-indigo-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      <Clock size={12}/> تاریخ: {toPersianNumber(alert.day)} {MONTH_NAMES[alert.month - 1]}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2rem] p-5 shadow-sm">
            <h3 className="font-black text-foreground text-base mb-4 flex items-center gap-2">
              <Settings2 size={18} className="text-primary" />
              تنظیم یادآوری ملی
            </h3>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pl-1 pr-2 custom-scrollbar">
              {NAFAS_EVENTS.map(event => (
                <div key={event.id} className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{event.title}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{toPersianNumber(event.day)} {MONTH_NAMES[event.month - 1]}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground shrink-0">اعلام هشدار از:</span>
                    <input 
                      type="number" 
                      value={reminderDays[event.id] || 0} 
                      onChange={e => handleDaysChange(event.id, Math.max(0, parseInt(e.target.value) || 0))}
                      className="form-input text-center font-bold text-xs py-1 px-2 w-16"
                    />
                    <span className="text-[11px] text-muted-foreground">روز زودتر</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* تقویم اصلی */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">{MONTH_NAMES[currentMonth - 1]} ۱۴۰۵</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-bold">امروز: {toPersianNumber(todayStr)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setCurrentMonth(prev => Math.min(12, prev + 1));
                    setSelectedDate(null);
                  }}
                  disabled={currentMonth === 12}
                  className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => {
                    setCurrentMonth(prev => Math.max(1, prev - 1));
                    setSelectedDate(null);
                  }}
                  disabled={currentMonth === 1}
                  className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground mb-3 py-2">
              {WEEK_DAYS.map(day => <div key={day} className="py-1">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: startDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-muted/5 border border-dashed border-border/40" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const isToday = tMonth === currentMonth && tDay === dayNumber;
                const isSelected = selectedDate?.month === currentMonth && selectedDate?.day === dayNumber;
                
                // بررسی رویدادهای این روز
                const dayEvents = ALL_EVENTS.filter(e => e.month === currentMonth && e.day === dayNumber);
                const hasNational = dayEvents.some(e => !e.isCustom);
                const hasPersonal = dayEvents.some(e => e.isCustom);

                return (
                  <div 
                    key={dayNumber}
                    onClick={() => setSelectedDate({ month: currentMonth, day: dayNumber })}
                    className={`aspect-square rounded-2xl p-2 flex flex-col justify-between items-center border-2 transition-all cursor-pointer group relative ${
                      isSelected ? 'border-primary bg-primary/5 scale-105 shadow-md z-10' :
                      isToday ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90' : 
                      hasPersonal && hasNational ? 'border-indigo-500/40 bg-indigo-50/50 hover:bg-indigo-50' :
                      hasPersonal ? 'border-indigo-400/40 bg-indigo-50/30 hover:bg-indigo-50' :
                      hasNational ? 'border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10' : 
                      'border-border bg-background hover:border-primary/40'
                    }`}
                  >
                    <span className={`text-sm font-extrabold ${isToday ? 'text-white' : 'text-foreground'}`}>
                      {toPersianNumber(dayNumber)}
                    </span>

                    <div className="flex gap-1">
                      {hasNational && (
                        <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-white' : 'bg-teal-500'}`} title="مناسبت ملی" />
                      )}
                      {hasPersonal && (
                        <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-indigo-200' : 'bg-indigo-500'}`} title="یادداشت شخصی" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* پنل نمایش جزئیات روز و رویدادها */}
          {selectedDate && (
            <div className="bg-card border-2 border-primary/20 rounded-[2rem] p-6 shadow-lg animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <CalendarIcon size={20} className="text-primary" />
                  رویدادهای {toPersianNumber(selectedDate.day)} {MONTH_NAMES[selectedDate.month - 1]}
                </h3>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                >
                  <Plus size={16} /> ثبت یادداشت شخصی
                </button>
              </div>

              {dayEventsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">هیچ مناسبت ملی یا یادداشت شخصی برای این روز ثبت نشده است.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayEventsList.map(event => (
                    <div key={event.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${
                      event.isCustom ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-muted/30 border-border'
                    }`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        event.isCustom ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-300' :
                        event.category === 'medical' ? 'bg-purple-500/10 text-purple-600' :
                        event.category === 'mother' ? 'bg-rose-500/10 text-rose-600' :
                        'bg-teal-500/10 text-teal-600'
                      }`}>
                        {event.isCustom ? <User size={20} /> :
                         event.category === 'medical' ? <Stethoscope size={20} /> :
                         event.category === 'mother' ? <Baby size={20} /> :
                         event.category === 'population' ? <Users size={20} /> :
                         <Sparkles size={20} />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-foreground text-sm">{event.title}</h4>
                            {event.isCustom && <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded border border-indigo-600 shadow-sm">شخصی</span>}
                          </div>
                          {event.isCustom && (
                            <button 
                              onClick={() => handleDeleteCustomEvent(event.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors tooltip"
                              title="حذف یادداشت"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-6 mt-1.5">{event.description}</p>
                        
                        {event.isCustom && (
                          <div className="mt-2 text-[10px] font-bold text-indigo-600/80 bg-indigo-500/10 inline-block px-2 py-1 rounded-md">
                            یادآوری تنظیم شده: {toPersianNumber(event.reminderDays || 0)} روز قبل
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* مودال افزودن یادداشت شخصی */}
      {showAddModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-2 text-indigo-600 font-black text-lg">
                <Plus size={20} />
                افزودن یادداشت شخصی
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/40 p-3 rounded-xl border border-border/50 flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                <CalendarIcon size={16} className="text-indigo-500"/>
                تاریخ رویداد: {toPersianNumber(selectedDate.day)} {MONTH_NAMES[selectedDate.month - 1]}
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">عنوان رویداد یا یادداشت (الزامی)</label>
                <div className="relative">
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    className="form-input pr-9"
                    placeholder="مثال: جلسه هماهنگی استان"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">توضیحات تکمیلی</label>
                <div className="relative">
                  <AlignLeft size={16} className="absolute right-3 top-3 text-muted-foreground" />
                  <textarea
                    value={newEventDesc}
                    onChange={e => setNewEventDesc(e.target.value)}
                    className="form-input pr-9 py-2 min-h-[80px] resize-none"
                    placeholder="توضیحات مربوط به این روز را بنویسید..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">زمان یادآوری سیستم (بر اساس روز)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={14}
                    value={newEventReminder}
                    onChange={e => setNewEventReminder(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="shrink-0 bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-lg border border-indigo-200 min-w-[70px] text-center text-sm">
                    {newEventReminder === 0 ? 'همان روز' : `${toPersianNumber(newEventReminder)} روز`}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  سیستم در داشبورد از {newEventReminder === 0 ? 'صبح همان روز' : `${toPersianNumber(newEventReminder)} روز قبل`} به شما هشدار می‌دهد.
                </p>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors"
                >
                  انصراف
                </button>
                <button 
                  onClick={handleAddCustomEvent}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-md"
                >
                  ثبت در تقویم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4 shadow-sm">
      <div className="flex items-center gap-4 max-w-5xl mx-auto">
        <button onClick={onBack} className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors" type="button">
          <ArrowRight size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

export default CalendarSection;