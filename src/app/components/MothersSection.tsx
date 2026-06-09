import { useEffect, useState } from 'react';
import { Plus, Search, User, Baby, DollarSign, Heart } from 'lucide-react';

import { PageHeader } from './PageHeader';
import { Tabs } from './MotherTabs';
import { toPersianNumber } from '../utils/jalali';

export interface Child {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  disease: string;
  photo: string;
}

export interface Cost {
  id: string;
  title: string;
  amount: string;
  date: string;
  receipt: string;
}

export interface Service {
  id: string;
  type: string;
  desc: string;
  date: string;
  photo: string;
}

export interface Mother {
  id: string;

  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  nationalId: string;

  phone: string;
  phone2: string;
  husbandPhone: string;
  cardNumber: string;

  city: string;
  province: string;

  marital: string;
  education: string;
  job: string;
  spouseJob: string;
  spouseEducation: string;

  insurance: string;
  kinship: string;
  kinshipType: string;
  propertyType: string;

  pregnancyStart: string;
  dueDate: string;
  pregnancyStatus: string;
  abortionReason: string;

  address: string;
  notes: string;

  children: Child[];
  costs: Cost[];
  services: Service[];
}

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'nafas_mothers';

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyMother = (): Mother => ({
  id: makeId(),

  firstName: '',
  lastName: '',
  fatherName: '',
  motherName: '',
  nationalId: '',

  phone: '',
  phone2: '',
  husbandPhone: '',
  cardNumber: '',

  city: '',
  province: '',

  marital: 'متأهل',
  education: '',
  job: '',
  spouseJob: '',
  spouseEducation: '',

  insurance: 'بدون بیمه',
  kinship: 'خیر',
  kinshipType: '',
  propertyType: 'اجاره‌ای',

  pregnancyStart: '',
  dueDate: '',
  pregnancyStatus: 'در حال پیگیری',
  abortionReason: '',

  address: '',
  notes: '',

  children: [],
  costs: [],
  services: [],
});

function loadMothers(): Mother[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveMothers(items: Mother[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function amountToNumber(value: string) {
  const cleaned = String(value || '')
    .replace(/,/g, '')
    .replace(/[^\d۰-۹٠-٩]/g, '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const result = parseInt(cleaned || '0', 10);
  return Number.isFinite(result) ? result : 0;
}

function formatRial(value: number) {
  return `${toPersianNumber(value.toLocaleString('en-US'))} ریال`;
}

export function MothersSection({ onBack }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [editing, setEditing] = useState<Mother | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    setMothers(loadMothers());
  }, []);

  const updateMothers = (next: Mother[]) => {
    setMothers(next);
    saveMothers(next);
  };

  const openNew = () => {
    setEditing(emptyMother());
    setView('form');
    setTab(0);
  };

  const openEdit = (mother: Mother) => {
    setEditing({
      ...mother,
      children: [...mother.children],
      costs: [...mother.costs],
      services: [...mother.services],
    });
    setView('form');
    setTab(0);
  };

  const save = () => {
    if (!editing) return;

    const next = mothers.find(m => m.id === editing.id)
      ? mothers.map(m => (m.id === editing.id ? editing : m))
      : [...mothers, editing];

    updateMothers(next);
    setEditing(null);
    setView('list');
  };

  const del = (id: string) => {
    updateMothers(mothers.filter(m => m.id !== id));
  };

  const goBackDashboard = () => {
    saveMothers(mothers);
    onBack();
  };

  const filtered = mothers.filter(m => {
    const text = [
      m.firstName,
      m.lastName,
      m.nationalId,
      m.phone,
      m.phone2,
      m.city,
      m.province,
      m.pregnancyStatus,
    ].join(' ');

    return text.includes(search);
  });

  const totalCosts =
    editing?.costs.reduce((sum, c) => sum + amountToNumber(c.amount), 0) || 0;

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title="مادران"
          onBack={goBackDashboard}
          action={
            <button
              onClick={openNew}
              className="btn-primary flex items-center gap-2"
              type="button"
            >
              <Plus size={15} />
              اضافه کردن مادر جدید
            </button>
          }
        />

        <div className="p-6 max-w-6xl mx-auto">
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو با نام، کد ملی، شماره تماس، شهر یا وضعیت پرونده..."
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    'نام',
                    'نام خانوادگی',
                    'کد ملی',
                    'شماره تماس',
                    'وضعیت پرونده',
                    'تعداد فرزندان',
                    'جمع هزینه‌ها',
                    'تعداد خدمات',
                    'عملیات',
                  ].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-right text-muted-foreground font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((m, i) => {
                  const rowTotal = m.costs.reduce(
                    (sum, c) => sum + amountToNumber(c.amount),
                    0,
                  );

                  return (
                    <tr
                      key={m.id}
                      className={`border-t border-border hover:bg-muted/30 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-4 py-3">{m.firstName}</td>
                      <td className="px-4 py-3">{m.lastName}</td>
                      <td className="px-4 py-3">{toPersianNumber(m.nationalId)}</td>
                      <td className="px-4 py-3">{toPersianNumber(m.phone)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                          {m.pregnancyStatus || 'نامشخص'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{toPersianNumber(m.children.length)}</td>
                      <td className="px-4 py-3">{formatRial(rowTotal)}</td>
                      <td className="px-4 py-3">{toPersianNumber(m.services.length)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="text-primary hover:underline text-xs"
                            type="button"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => del(m.id)}
                            className="text-destructive hover:underline text-xs"
                            type="button"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      موردی یافت نشد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!editing) return null;

  const tabs = [
    { label: 'اطلاعات مادر', icon: User },
    { label: 'فرزندان', icon: Baby },
    { label: 'هزینه‌ها', icon: DollarSign },
    { label: 'خدمات ارائه‌شده', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader
        title={
          editing.firstName || editing.lastName
            ? `${editing.firstName} ${editing.lastName}`.trim()
            : 'ثبت مادر جدید'
        }
        onBack={() => setView('list')}
        action={
          <button onClick={save} className="btn-primary" type="button">
            ذخیره کل پرونده مادر
          </button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${
                tab === i
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <Tabs
          mother={editing}
          setMother={setEditing}
          tab={tab}
          setTab={setTab}
          totalCosts={totalCosts}
        />
      </div>
    </div>
  );
}