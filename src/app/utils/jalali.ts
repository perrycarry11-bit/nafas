// Simple Jalali (Shamsi) date conversion utility
export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
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

export function todayJalali(): string {
  const now = new Date();
  const [jy, jm, jd] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export const jalaliMonths = [
  'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
  'مهر','آبان','آذر','دی','بهمن','اسفند'
];

export function formatJalaliDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const month = parseInt(parts[1]) - 1;
  return `${parts[2]} ${jalaliMonths[month]} ${parts[0]}`;
}

export function toPersianNumber(n: number | string): string {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

export function formatCurrency(amount: number): string {
  return toPersianNumber(amount.toLocaleString('fa-IR')) + ' ریال';
}
