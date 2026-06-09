import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { jalaliMonths, toPersianNumber } from '../utils/jalali';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}

export function JalaliDatePicker({ value, onChange, placeholder = 'انتخاب تاریخ', label }: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [jy, jm, jd] = toJalaliArr(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('/')[0]) : jy);
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.split('/')[1]) - 1 : jm - 1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth + 1);
  const firstDayOfWeek = getJalaliFirstDayOfWeek(viewYear, viewMonth + 1);

  const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  function select(d: number) {
    const dateStr = `${viewYear}/${String(viewMonth + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    onChange(dateStr);
    setOpen(false);
  }

  const selectedDay = value && value.split('/')[0] === String(viewYear) && parseInt(value.split('/')[1]) - 1 === viewMonth
    ? parseInt(value.split('/')[2]) : null;

  return (
    <div className="relative" ref={ref}>
      {label && <label className="block text-sm text-muted-foreground mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-input-background text-foreground hover:border-primary transition-colors text-sm"
      >
        <Calendar size={15} className="text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-right">{value ? `${toPersianNumber(value.split('/')[2])} ${jalaliMonths[parseInt(value.split('/')[1])-1]} ${toPersianNumber(value.split('/')[0])}` : <span className="text-muted-foreground">{placeholder}</span>}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-64" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} className="p-1 rounded hover:bg-muted text-foreground">›</button>
            <span className="text-sm font-semibold text-foreground">{jalaliMonths[viewMonth]} {toPersianNumber(viewYear)}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} className="p-1 rounded hover:bg-muted text-foreground">‹</button>
          </div>
          {/* Week days */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map(d => <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>)}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const isSelected = d === selectedDay;
              const isToday = viewYear === jy && viewMonth === jm - 1 && d === jd;
              return (
                <button key={d} onClick={() => select(d)}
                  className={`text-center text-xs py-1 rounded transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'border border-primary text-primary' : 'hover:bg-muted text-foreground'}`}>
                  {toPersianNumber(d)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function toJalaliArr(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_no = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const j_d_no = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  if (gy > 1600) { gy -= 1600; } else { gy -= 1; }
  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
  for (let i = 0; i < gm - 1; ++i) g_day_no += g_d_no[i];
  if (gm > 2 && ((gy + 1) % 4 === 0 && ((gy + 1) % 100 !== 0 || (gy + 1) % 400 === 0))) ++g_day_no;
  g_day_no += gd - 1;
  let j_day_no = g_day_no - 79;
  const j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;
  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;
  if (j_day_no >= 366) { jy += Math.floor((j_day_no - 1) / 365); j_day_no = (j_day_no - 1) % 365; }
  let jm = 0, jd = 0;
  for (let i = 0; i < 11 && j_day_no >= j_d_no[i]; ++i) { j_day_no -= j_d_no[i]; ++jm; }
  jd = j_day_no + 1;
  return [jy, jm + 1, jd];
}

function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

function isJalaliLeap(jy: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0], jm2 = 0;
  for (let i = 1; i < breaks.length; i++) {
    const jb = breaks[i];
    const diff = jb - jp;
    let leaps = Math.floor((diff / 33) * 8 + (diff % 33) / 4);
    if (jy - jp < diff) { const n = jy - jp; return ((n * 8 + 29) % 33) < 8; }
    jm2 += leaps;
    jp = jb;
  }
  return false;
}

function getJalaliFirstDayOfWeek(jy: number, jm: number): number {
  // Convert Jalali to Gregorian to find the day of week
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const date = new Date(gy, gm - 1, gd);
  const dow = date.getDay(); // 0=Sun,1=Mon,...,6=Sat
  // Jalali week starts on Saturday (6 in JS)
  return (dow + 1) % 7; // Sat=0, Sun=1, Mon=2...
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355779 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  if (jm <= 6) days += (jm - 1) * 31;
  else days += (jm - 7) * 30 + 186;
  days += jd;
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const sal_a = [0, 31, 59 + (gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0) ? 1 : 0), 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gm = 0;
  for (let i = 11; i >= 0 && sal_a[i] > days; i--) gm = i;
  const gd2 = days - sal_a[gm] + 1;
  return [gy, gm + 1, gd2];
}
