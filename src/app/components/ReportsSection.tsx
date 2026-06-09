import { useState } from 'react';
import { ArrowRight, Download, Search, Filter } from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';
import { toPersianNumber, formatJalaliDisplay } from '../utils/jalali';

interface Props { onBack: () => void; }

type ReportType = 'mothers' | 'children' | 'costs' | 'services' | 'aids';

const sampleMotherRows = [
  { name: 'فاطمه محمدی', nationalId: '0012345678', phone: '09121234567', marital: 'متأهل', children: 2, joinDate: '1402/06/15', status: 'فعال' },
  { name: 'زهرا احمدی', nationalId: '0098765432', phone: '09351234567', marital: 'مجرد', children: 1, joinDate: '1402/08/20', status: 'در پیگیری' },
  { name: 'مریم رضایی', nationalId: '0054321987', phone: '09121231231', marital: 'متأهل', children: 3, joinDate: '1401/12/01', status: 'تولد شده' },
];

const sampleCostRows = [
  { mother: 'فاطمه محمدی', title: 'هزینه ویزیت', amount: '500,000', date: '1402/09/01' },
  { mother: 'زهرا احمدی', title: 'هزینه دارو', amount: '1,200,000', date: '1402/09/10' },
  { mother: 'مریم رضایی', title: 'هزینه آزمایش', amount: '850,000', date: '1402/09/15' },
];

const sampleAidRows = [
  { name: 'احمد رضایی', type: 'person', aidType: 'مالی', amount: '5,000,000', date: '1402/09/05' },
  { name: 'شرکت نوین', type: 'company', aidType: 'مواد غذایی', amount: '-', date: '1402/09/12' },
  { name: 'محمد کریمی', type: 'person', aidType: 'پوشاک', amount: '-', date: '1402/09/18' },
];

export function ReportsSection({ onBack }: Props) {
  const [reportType, setReportType] = useState<ReportType>('mothers');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  function exportCSV() {
    const rows = [['نام', 'کد ملی', 'شماره تماس', 'وضعیت تأهل', 'تعداد فرزندان', 'تاریخ ثبت', 'وضعیت']];
    sampleMotherRows.forEach(r => rows.push([r.name, r.nationalId, r.phone, r.marital, String(r.children), r.joinDate, r.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'report.csv'; a.click();
  }

  const reportTabs: { key: ReportType; label: string }[] = [
    { key: 'mothers', label: 'مادران' },
    { key: 'children', label: 'فرزندان' },
    { key: 'costs', label: 'هزینه‌ها' },
    { key: 'services', label: 'خدمات' },
    { key: 'aids', label: 'کمک‌های خیرین' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader title="گزارش‌ها" onBack={onBack}
        action={
          <button onClick={exportCSV} className="btn-primary flex items-center gap-2">
            <Download size={15} /> خروجی CSV
          </button>
        }
      />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Report Type Tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 overflow-x-auto">
          {reportTabs.map(t => (
            <button key={t.key} onClick={() => setReportType(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm whitespace-nowrap transition-all ${reportType === t.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..."
                className="w-full pr-9 pl-4 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              <Filter size={14} /> فیلتر
            </button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
              <JalaliDatePicker label="از تاریخ" value={fromDate} onChange={setFromDate} placeholder="تاریخ شروع" />
              <JalaliDatePicker label="تا تاریخ" value={toDate} onChange={setToDate} placeholder="تاریخ پایان" />
            </div>
          )}
        </div>

        {/* Table */}
        {reportType === 'mothers' && (
          <ReportTable headers={['نام و نام خانوادگی', 'کد ملی', 'شماره تماس', 'وضعیت تأهل', 'تعداد فرزندان', 'تاریخ ثبت', 'وضعیت']}>
            {sampleMotherRows.map((r, i) => (
              <tr key={i} className={`border-t border-border hover:bg-muted/30 transition-colors ${i % 2 ? 'bg-muted/10' : ''}`}>
                <td className="px-4 py-3 text-foreground">{r.name}</td>
                <td className="px-4 py-3 text-foreground">{toPersianNumber(r.nationalId)}</td>
                <td className="px-4 py-3 text-foreground">{toPersianNumber(r.phone)}</td>
                <td className="px-4 py-3 text-foreground">{r.marital}</td>
                <td className="px-4 py-3 text-foreground">{toPersianNumber(r.children)}</td>
                <td className="px-4 py-3 text-foreground">{formatJalaliDisplay(r.joinDate)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'فعال' ? 'bg-green-100 text-green-700' : r.status === 'در پیگیری' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </ReportTable>
        )}

        {reportType === 'costs' && (
          <ReportTable headers={['نام مادر', 'عنوان هزینه', 'مبلغ (ریال)', 'تاریخ']}>
            {sampleCostRows.map((r, i) => (
              <tr key={i} className={`border-t border-border hover:bg-muted/30 transition-colors ${i % 2 ? 'bg-muted/10' : ''}`}>
                <td className="px-4 py-3 text-foreground">{r.mother}</td>
                <td className="px-4 py-3 text-foreground">{r.title}</td>
                <td className="px-4 py-3 text-foreground">{toPersianNumber(r.amount)}</td>
                <td className="px-4 py-3 text-foreground">{formatJalaliDisplay(r.date)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-primary/30 bg-primary/5">
              <td colSpan={2} className="px-4 py-3 text-primary" style={{fontWeight:700}}>جمع کل</td>
              <td className="px-4 py-3 text-primary" style={{fontWeight:700}}>{toPersianNumber('2,550,000')} ریال</td>
              <td></td>
            </tr>
          </ReportTable>
        )}

        {reportType === 'aids' && (
          <ReportTable headers={['نام', 'نوع', 'نوع کمک', 'مبلغ (ریال)', 'تاریخ']}>
            {sampleAidRows.map((r, i) => (
              <tr key={i} className={`border-t border-border hover:bg-muted/30 transition-colors ${i % 2 ? 'bg-muted/10' : ''}`}>
                <td className="px-4 py-3 text-foreground">{r.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.type === 'person' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.type === 'person' ? 'شخص' : 'شرکت'}</span>
                </td>
                <td className="px-4 py-3 text-foreground">{r.aidType}</td>
                <td className="px-4 py-3 text-foreground">{r.amount !== '-' ? toPersianNumber(r.amount) + ' ریال' : '-'}</td>
                <td className="px-4 py-3 text-foreground">{formatJalaliDisplay(r.date)}</td>
              </tr>
            ))}
          </ReportTable>
        )}

        {(reportType === 'children' || reportType === 'services') && (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            <p>برای مشاهده این گزارش، داده‌ها را از بخش‌های مربوطه وارد کنید</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{headers.map(h => <th key={h} className="px-4 py-3 text-right text-muted-foreground" style={{fontWeight:600, whiteSpace:'nowrap'}}>{h}</th>)}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function PageHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><ArrowRight size={18} /></button>
          <h2 className="text-foreground" style={{fontSize:'1.1rem', fontWeight:700}}>{title}</h2>
        </div>
        {action}
      </div>
    </header>
  );
}
