import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Heart, Building2, User, ChevronDown } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { JalaliDatePicker } from './JalaliDatePicker';
import { ImageUploader } from './ImageUploader';
import { todayJalali, toPersianNumber } from '../utils/jalali';

interface Donation {
  id: string;
  type: string;
  title: string;
  amount: string;
  date: string;
  receipt: string;
  desc: string;
}

interface Benefactor {
  id: string;
  donorType: string;
  displayName: string;
  firstName: string;
  lastName: string;
  nationalCode: string;
  companyName: string;
  managerName: string;
  phone: string;
  phone2: string;
  city: string;
  province: string;
  address: string;
  notes: string;
  donations: Donation[];
}

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'nafas_benefactors';

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DONATION_TYPES = [
  'مالی',
  'دارو',
  'فرهنگی',
  'آموزشی',
  'ایجاد شغل',
  'مواد غذایی',
  'پوشاک',
  'جهیزیه',
  'حمایت حقوقی',
  'مشاوره',
  'درمانی',
  'سایر',
];

const emptyBenefactor = (): Benefactor => ({
  id: makeId(),
  donorType: 'شخص',
  displayName: '',
  firstName: '',
  lastName: '',
  nationalCode: '',
  companyName: '',
  managerName: '',
  phone: '',
  phone2: '',
  city: '',
  province: '',
  address: '',
  notes: '',
  donations: [],
});

function loadItems(): Benefactor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveItems(items: Benefactor[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function amountToNumber(value: string): number {
  const cleaned = String(value || '')
    .replace(/,/g, '')
    .replace(/[^\d۰-۹٠-٩]/g, '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const n = parseInt(cleaned || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

function formatRial(value: number) {
  return `${toPersianNumber(value.toLocaleString('en-US'))} ریال`;
}

export function BenefactorsSection({ onBack }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [benefactors, setBenefactors] = useState<Benefactor[]>([]);
  const [editing, setEditing] = useState<Benefactor | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setBenefactors(loadItems());
  }, []);

  const updateList = (next: Benefactor[]) => {
    setBenefactors(next);
    saveItems(next);
  };

  const openNew = () => {
    setEditing(emptyBenefactor());
    setView('form');
  };

  const openEdit = (item: Benefactor) => {
    setEditing({
      ...item,
      donations: [...item.donations],
    });
    setView('form');
  };

  const saveBenefactor = () => {
    if (!editing) return;

    const name =
      editing.donorType === 'شرکت'
        ? editing.companyName || editing.managerName
        : `${editing.firstName} ${editing.lastName}`.trim();

    const fixed = {
      ...editing,
      displayName: name || 'بدون نام',
    };

    const next = benefactors.find(item => item.id === fixed.id)
      ? benefactors.map(item => (item.id === fixed.id ? fixed : item))
      : [...benefactors, fixed];

    updateList(next);
    setEditing(null);
    setView('list');
  };

  const deleteBenefactor = (id: string) => {
    updateList(benefactors.filter(item => item.id !== id));
  };

  const goBackDashboard = () => {
    saveItems(benefactors);
    onBack();
  };

  const filtered = benefactors.filter(item => {
    const text = [
      item.displayName,
      item.donorType,
      item.phone,
      item.city,
      item.province,
      item.notes,
    ].join(' ');

    return text.includes(search);
  });

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title="خیرین"
          onBack={goBackDashboard}
          action={
            <button type="button" onClick={openNew} className="btn-primary flex items-center gap-2">
              <Plus size={15} />
              ثبت خیر جدید
            </button>
          }
        />

        <div className="p-6 max-w-6xl mx-auto">
          <div className="relative mb-4">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام خیر، نوع خیر، شهر یا شماره تماس..."
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['نام / عنوان خیر', 'نوع خیر', 'شماره تماس', 'شهر', 'تعداد کمک', 'جمع کمک‌ها', 'عملیات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-muted-foreground font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((item, index) => {
                  const total = item.donations.reduce((s, d) => s + amountToNumber(d.amount), 0);

                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-border hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? '' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-4 py-3">{item.displayName}</td>
                      <td className="px-4 py-3">{item.donorType}</td>
                      <td className="px-4 py-3">{toPersianNumber(item.phone)}</td>
                      <td className="px-4 py-3">{item.city}</td>
                      <td className="px-4 py-3">{toPersianNumber(item.donations.length)}</td>
                      <td className="px-4 py-3">{formatRial(total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => openEdit(item)} className="text-primary hover:underline text-xs">
                            ویرایش
                          </button>
                          <button type="button" onClick={() => deleteBenefactor(item.id)} className="text-destructive hover:underline text-xs">
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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

  const totalDonations = editing.donations.reduce((s, d) => s + amountToNumber(d.amount), 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader
        title={editing.displayName || 'ثبت خیر جدید'}
        onBack={() => setView('list')}
        action={
          <button type="button" onClick={saveBenefactor} className="btn-primary">
            ذخیره خیر
          </button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h3 className="text-primary" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            اطلاعات خیر
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label text="نوع خیر" />
              <SelectField
                value={editing.donorType}
                onChange={v => setEditing({ ...editing, donorType: v })}
                options={['شخص', 'شرکت']}
              />
            </div>

            {editing.donorType === 'شخص' ? (
              <>
                <TextInput label="نام" value={editing.firstName} onChange={v => setEditing({ ...editing, firstName: v })} />
                <TextInput label="نام خانوادگی" value={editing.lastName} onChange={v => setEditing({ ...editing, lastName: v })} />
                <TextInput label="کد ملی" value={editing.nationalCode} onChange={v => setEditing({ ...editing, nationalCode: v })} />
              </>
            ) : (
              <>
                <TextInput label="نام شرکت" value={editing.companyName} onChange={v => setEditing({ ...editing, companyName: v })} />
                <TextInput label="نام مسئول" value={editing.managerName} onChange={v => setEditing({ ...editing, managerName: v })} />
              </>
            )}

            <TextInput label="شماره تماس" value={editing.phone} onChange={v => setEditing({ ...editing, phone: v })} />
            <TextInput label="شماره تماس دوم" value={editing.phone2} onChange={v => setEditing({ ...editing, phone2: v })} />
            <TextInput label="شهر" value={editing.city} onChange={v => setEditing({ ...editing, city: v })} />
            <TextInput label="استان" value={editing.province} onChange={v => setEditing({ ...editing, province: v })} />
          </div>

          <TextAreaInput label="آدرس" value={editing.address} onChange={v => setEditing({ ...editing, address: v })} rows={2} />
          <TextAreaInput label="توضیحات" value={editing.notes} onChange={v => setEditing({ ...editing, notes: v })} rows={2} />

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <span className="text-primary" style={{ fontWeight: 700 }}>
              جمع کل کمک‌ها
            </span>
            <span className="text-primary" style={{ fontWeight: 800 }}>
              {formatRial(totalDonations)}
            </span>
          </div>

          <h3 className="text-primary" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            کمک‌ها
          </h3>

          <div className="space-y-4">
            {editing.donations.map((donation, index) => (
              <div key={donation.id} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 style={{ fontWeight: 700 }}>کمک {toPersianNumber(index + 1)}</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        donations: editing.donations.filter(d => d.id !== donation.id),
                      })
                    }
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label text="نوع کمک" />
                    <SelectField
                      value={donation.type}
                      onChange={v =>
                        setEditing({
                          ...editing,
                          donations: editing.donations.map(d =>
                            d.id === donation.id ? { ...d, type: v } : d,
                          ),
                        })
                      }
                      options={DONATION_TYPES}
                    />
                  </div>

                  <TextInput
                    label="عنوان کمک"
                    value={donation.title}
                    onChange={v =>
                      setEditing({
                        ...editing,
                        donations: editing.donations.map(d =>
                          d.id === donation.id ? { ...d, title: v } : d,
                        ),
                      })
                    }
                  />

                  <TextInput
                    label="مبلغ / ارزش ریالی"
                    value={donation.amount}
                    onChange={v =>
                      setEditing({
                        ...editing,
                        donations: editing.donations.map(d =>
                          d.id === donation.id ? { ...d, amount: v } : d,
                        ),
                      })
                    }
                  />

                  <JalaliDatePicker
                    label="تاریخ شمسی"
                    value={donation.date}
                    onChange={v =>
                      setEditing({
                        ...editing,
                        donations: editing.donations.map(d =>
                          d.id === donation.id ? { ...d, date: v } : d,
                        ),
                      })
                    }
                  />

                  <div className="col-span-2">
                    <ImageUploader
                      label="رسید کمک"
                      value={donation.receipt}
                      onChange={v =>
                        setEditing({
                          ...editing,
                          donations: editing.donations.map(d =>
                            d.id === donation.id ? { ...d, receipt: v } : d,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setEditing({
                  ...editing,
                  donations: [
                    ...editing.donations,
                    {
                      id: makeId(),
                      type: 'مالی',
                      title: '',
                      amount: '',
                      date: todayJalali(),
                      receipt: '',
                      desc: '',
                    },
                  ],
                })
              }
              className="w-full py-3 border border-dashed border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              افزودن کمک جدید
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <label className="block text-sm text-muted-foreground mb-1">{text}</label>;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label text={label} />
      <input value={value} onChange={e => onChange(e.target.value)} className="form-input" />
    </div>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <Label text={label} />
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className="form-input resize-none" />
    </div>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className="form-input appearance-none pr-3 pl-8 cursor-pointer w-full">
        <option value="">انتخاب کنید...</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}