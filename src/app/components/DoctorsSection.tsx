import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, ChevronDown } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { JalaliDatePicker } from './JalaliDatePicker';
import { todayJalali, toPersianNumber } from '../utils/jalali';

interface DoctorService {
  id: string;
  title: string;
  desc: string;
}

interface DoctorReferral {
  id: string;
  motherName: string;
  date: string;
  result: string;
  followDate: string;
  notes: string;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  specialty: string;
  medicalCode: string;
  clinicName: string;
  phone: string;
  secretaryPhone: string;
  city: string;
  province: string;
  cooperationStatus: string;
  cooperationType: string;
  visitFee: string;
  workingHours: string;
  address: string;
  notes: string;
  services: DoctorService[];
  referrals: DoctorReferral[];
}

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'nafas_doctors';

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SPECIALTIES = [
  'متخصص زنان و زایمان',
  'ماما',
  'متخصص نازایی',
  'متخصص کودکان',
  'متخصص نوزادان',
  'روانشناس',
  'مشاور خانواده',
  'روانپزشک',
  'مددکار اجتماعی',
  'کارشناس تغذیه',
  'پزشک عمومی',
  'سونوگرافیست',
  'متخصص داخلی',
  'سایر',
];

const emptyDoctor = (): Doctor => ({
  id: makeId(),
  firstName: '',
  lastName: '',
  gender: 'خانم',
  specialty: 'متخصص زنان و زایمان',
  medicalCode: '',
  clinicName: '',
  phone: '',
  secretaryPhone: '',
  city: '',
  province: '',
  cooperationStatus: 'فعال',
  cooperationType: 'همکار افتخاری',
  visitFee: '',
  workingHours: '',
  address: '',
  notes: '',
  services: [],
  referrals: [],
});

function loadDoctors(): Doctor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveDoctors(items: Doctor[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function DoctorsSection({ onBack }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setDoctors(loadDoctors());
  }, []);

  const updateList = (next: Doctor[]) => {
    setDoctors(next);
    saveDoctors(next);
  };

  const openNew = () => {
    setEditing(emptyDoctor());
    setView('form');
  };

  const openEdit = (doctor: Doctor) => {
    setEditing({
      ...doctor,
      services: [...doctor.services],
      referrals: [...doctor.referrals],
    });
    setView('form');
  };

  const saveDoctor = () => {
    if (!editing) return;

    const next = doctors.find(item => item.id === editing.id)
      ? doctors.map(item => (item.id === editing.id ? editing : item))
      : [...doctors, editing];

    updateList(next);
    setEditing(null);
    setView('list');
  };

  const deleteDoctor = (id: string) => {
    updateList(doctors.filter(item => item.id !== id));
  };

  const goBackDashboard = () => {
    saveDoctors(doctors);
    onBack();
  };

  const filtered = doctors.filter(item => {
    const text = [
      item.firstName,
      item.lastName,
      item.specialty,
      item.medicalCode,
      item.phone,
      item.city,
      item.province,
    ].join(' ');

    return text.includes(search);
  });

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title="پزشکان و متخصصین"
          onBack={goBackDashboard}
          action={
            <button type="button" onClick={openNew} className="btn-primary flex items-center gap-2">
              <Plus size={15} />
              ثبت پزشک جدید
            </button>
          }
        />

        <div className="p-6 max-w-6xl mx-auto">
          <div className="relative mb-4">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام، تخصص، کد نظام پزشکی، شهر یا شماره تماس..."
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['نام پزشک', 'تخصص', 'کد نظام پزشکی', 'شماره تماس', 'شهر', 'وضعیت همکاری', 'ارجاع‌ها', 'عملیات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-muted-foreground font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((doctor, index) => (
                  <tr
                    key={doctor.id}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      index % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3">{doctor.firstName} {doctor.lastName}</td>
                    <td className="px-4 py-3">{doctor.specialty}</td>
                    <td className="px-4 py-3">{toPersianNumber(doctor.medicalCode)}</td>
                    <td className="px-4 py-3">{toPersianNumber(doctor.phone)}</td>
                    <td className="px-4 py-3">{doctor.city}</td>
                    <td className="px-4 py-3">{doctor.cooperationStatus}</td>
                    <td className="px-4 py-3">{toPersianNumber(doctor.referrals.length)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(doctor)} className="text-primary hover:underline text-xs">
                          ویرایش
                        </button>
                        <button type="button" onClick={() => deleteDoctor(doctor.id)} className="text-destructive hover:underline text-xs">
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader
        title={editing.firstName || editing.lastName ? `${editing.firstName} ${editing.lastName}`.trim() : 'ثبت پزشک جدید'}
        onBack={() => setView('list')}
        action={
          <button type="button" onClick={saveDoctor} className="btn-primary">
            ذخیره پزشک
          </button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h3 className="text-primary" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            اطلاعات پزشک
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <TextInput label="نام" value={editing.firstName} onChange={v => setEditing({ ...editing, firstName: v })} />
            <TextInput label="نام خانوادگی" value={editing.lastName} onChange={v => setEditing({ ...editing, lastName: v })} />

            <div>
              <Label text="جنسیت" />
              <SelectField value={editing.gender} onChange={v => setEditing({ ...editing, gender: v })} options={['خانم', 'آقا']} />
            </div>

            <div>
              <Label text="تخصص" />
              <SelectField value={editing.specialty} onChange={v => setEditing({ ...editing, specialty: v })} options={SPECIALTIES} />
            </div>

            <TextInput label="کد نظام پزشکی" value={editing.medicalCode} onChange={v => setEditing({ ...editing, medicalCode: v })} />
            <TextInput label="نام مطب / مرکز" value={editing.clinicName} onChange={v => setEditing({ ...editing, clinicName: v })} />
            <TextInput label="شماره تماس" value={editing.phone} onChange={v => setEditing({ ...editing, phone: v })} />
            <TextInput label="شماره منشی" value={editing.secretaryPhone} onChange={v => setEditing({ ...editing, secretaryPhone: v })} />
            <TextInput label="شهر" value={editing.city} onChange={v => setEditing({ ...editing, city: v })} />
            <TextInput label="استان" value={editing.province} onChange={v => setEditing({ ...editing, province: v })} />

            <div>
              <Label text="وضعیت همکاری" />
              <SelectField value={editing.cooperationStatus} onChange={v => setEditing({ ...editing, cooperationStatus: v })} options={['فعال', 'غیرفعال', 'در حال مذاکره']} />
            </div>

            <div>
              <Label text="نوع همکاری" />
              <SelectField value={editing.cooperationType} onChange={v => setEditing({ ...editing, cooperationType: v })} options={['همکار افتخاری', 'تخفیف‌دار', 'ارجاع موردی', 'قراردادی', 'سایر']} />
            </div>

            <TextInput label="هزینه ویزیت" value={editing.visitFee} onChange={v => setEditing({ ...editing, visitFee: v })} />
            <TextInput label="ساعات مراجعه" value={editing.workingHours} onChange={v => setEditing({ ...editing, workingHours: v })} />
          </div>

          <TextAreaInput label="آدرس" value={editing.address} onChange={v => setEditing({ ...editing, address: v })} rows={2} />
          <TextAreaInput label="توضیحات" value={editing.notes} onChange={v => setEditing({ ...editing, notes: v })} rows={2} />

          <h3 className="text-primary" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            خدمات پزشک
          </h3>

          <div className="space-y-4">
            {editing.services.map((service, index) => (
              <div key={service.id} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 style={{ fontWeight: 700 }}>خدمت {toPersianNumber(index + 1)}</h4>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, services: editing.services.filter(s => s.id !== service.id) })}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <TextInput
                  label="عنوان خدمت"
                  value={service.title}
                  onChange={v =>
                    setEditing({
                      ...editing,
                      services: editing.services.map(s =>
                        s.id === service.id ? { ...s, title: v } : s,
                      ),
                    })
                  }
                />

                <TextAreaInput
                  label="توضیحات خدمت"
                  value={service.desc}
                  onChange={v =>
                    setEditing({
                      ...editing,
                      services: editing.services.map(s =>
                        s.id === service.id ? { ...s, desc: v } : s,
                      ),
                    })
                  }
                  rows={2}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setEditing({
                  ...editing,
                  services: [...editing.services, { id: makeId(), title: '', desc: '' }],
                })
              }
              className="w-full py-3 border border-dashed border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              افزودن خدمت پزشک
            </button>
          </div>

          <h3 className="text-primary" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            ارجاع مادران
          </h3>

          <div className="space-y-4">
            {editing.referrals.map((referral, index) => (
              <div key={referral.id} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 style={{ fontWeight: 700 }}>ارجاع {toPersianNumber(index + 1)}</h4>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, referrals: editing.referrals.filter(r => r.id !== referral.id) })}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextInput
                    label="نام مادر"
                    value={referral.motherName}
                    onChange={v =>
                      setEditing({
                        ...editing,
                        referrals: editing.referrals.map(r =>
                          r.id === referral.id ? { ...r, motherName: v } : r,
                        ),
                      })
                    }
                  />

                  <JalaliDatePicker
                    label="تاریخ ارجاع"
                    value={referral.date}
                    onChange={v =>
                      setEditing({
                        ...editing,
                        referrals: editing.referrals.map(r =>
                          r.id === referral.id ? { ...r, date: v } : r,
                        ),
                      })
                    }
                  />

                  <JalaliDatePicker
                    label="تاریخ پیگیری"
                    value={referral.followDate}
                    onChange={v =>
                      setEditing({
                        ...editing,
                        referrals: editing.referrals.map(r =>
                          r.id === referral.id ? { ...r, followDate: v } : r,
                        ),
                      })
                    }
                  />
                </div>

                <TextAreaInput
                  label="نتیجه مراجعه"
                  value={referral.result}
                  onChange={v =>
                    setEditing({
                      ...editing,
                      referrals: editing.referrals.map(r =>
                        r.id === referral.id ? { ...r, result: v } : r,
                      ),
                    })
                  }
                  rows={2}
                />

                <TextAreaInput
                  label="توضیحات"
                  value={referral.notes}
                  onChange={v =>
                    setEditing({
                      ...editing,
                      referrals: editing.referrals.map(r =>
                        r.id === referral.id ? { ...r, notes: v } : r,
                      ),
                    })
                  }
                  rows={2}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setEditing({
                  ...editing,
                  referrals: [
                    ...editing.referrals,
                    {
                      id: makeId(),
                      motherName: '',
                      date: todayJalali(),
                      result: '',
                      followDate: '',
                      notes: '',
                    },
                  ],
                })
              }
              className="w-full py-3 border border-dashed border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              افزودن ارجاع مادر
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