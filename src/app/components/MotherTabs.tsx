import type { Dispatch, SetStateAction } from 'react';
import { Plus, Trash2, ChevronDown, Copy } from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';
import { ImageUploader } from './ImageUploader';
import { todayJalali, toPersianNumber } from '../utils/jalali';

interface Child {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  disease: string;
  photo: string;
}

interface Cost {
  id: string;
  title: string;
  amount: string;
  date: string;
  receipt: string;
}

interface Service {
  id: string;
  type: string;
  desc: string;
  date: string;
  photo: string;
}

interface Mother {
  id: string;
  remoteId?: string;
  deviceId?: string;

  provinceId?: string;
  provinceName?: string;
  provinceCode?: string;

  countyId?: string;
  countyName?: string;
  countyCode?: string;

  syncStatus?: 'synced' | 'pending' | 'pending_delete' | 'error';
  syncError?: string;
  updatedAt?: string;
  deletedAt?: string | null;

  trackingCode: string;

  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: string;
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

interface TabsProps {
  mother: Mother;
  setMother: Dispatch<SetStateAction<Mother | null>>;
  tab: number;
  setTab: Dispatch<SetStateAction<number>>;
  totalCosts: number;
}

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatRial = (value: number) => {
  return `${toPersianNumber(value.toLocaleString('en-US'))} ریال`;
};

export function Tabs({ mother, setMother, tab, totalCosts }: TabsProps) {
  const updateMother = (patch: Partial<Mother>) => {
    setMother(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const updateChild = (id: string, patch: Partial<Child>) => {
    updateMother({
      children: mother.children.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };

  const updateCost = (id: string, patch: Partial<Cost>) => {
    updateMother({
      costs: mother.costs.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };

  const updateService = (id: string, patch: Partial<Service>) => {
    updateMother({
      services: mother.services.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };

  async function copyTrackingCode() {
    if (!mother.trackingCode) return;

    try {
      await navigator.clipboard.writeText(mother.trackingCode);
      alert('کد پرونده کپی شد');
    } catch {
      alert('کپی کد پرونده انجام نشد');
    }
  }

  if (tab === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h3
              className="text-primary mb-1"
              style={{ fontSize: '1rem', fontWeight: 700 }}
            >
              اطلاعات فردی، همسر، سکونت و بارداری
            </h3>

            <p className="text-xs text-muted-foreground">
              اطلاعات اصلی پرونده مادر، وضعیت بارداری و سکونت را در این بخش ثبت کنید.
            </p>
          </div>

          <button
            type="button"
            onClick={copyTrackingCode}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary border border-primary/20 px-3 py-2 text-xs font-bold hover:bg-primary/15"
          >
            <Copy size={14} />
            <span dir="ltr">{mother.trackingCode || 'بدون کد'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadOnlyField
            label="کد رهگیری پرونده"
            value={mother.trackingCode || 'در حال ساخت'}
          />

          <ReadOnlyField
            label="استان پرونده"
            value={mother.provinceName || mother.province || '-'}
          />

          <ReadOnlyField
            label="شهرستان پرونده"
            value={mother.countyName || '-'}
          />

          <TextInput
            label="نام"
            value={mother.firstName}
            onChange={v => updateMother({ firstName: v })}
          />

          <TextInput
            label="نام خانوادگی"
            value={mother.lastName}
            onChange={v => updateMother({ lastName: v })}
          />

          <TextInput
            label="نام پدر"
            value={mother.fatherName}
            onChange={v => updateMother({ fatherName: v })}
          />

          <JalaliDatePicker
            label="تاریخ تولد"
            value={mother.birthDate}
            onChange={v => updateMother({ birthDate: v })}
          />

          <TextInput
            label="کد ملی"
            value={mother.nationalId}
            onChange={v => updateMother({ nationalId: v })}
          />

          <TextInput
            label="شماره تماس"
            value={mother.phone}
            onChange={v => updateMother({ phone: v })}
          />

          <TextInput
            label="شماره تماس دوم"
            value={mother.phone2}
            onChange={v => updateMother({ phone2: v })}
          />

          <TextInput
            label="شماره تماس همسر"
            value={mother.husbandPhone}
            onChange={v => updateMother({ husbandPhone: v })}
          />

          <TextInput
            label="شماره کارت"
            value={mother.cardNumber}
            onChange={v => updateMother({ cardNumber: v })}
          />

          <TextInput
            label="شهر / محل سکونت"
            value={mother.city}
            onChange={v => updateMother({ city: v })}
          />

          <TextInput
            label="استان متنی"
            value={mother.province}
            onChange={v => updateMother({ province: v })}
          />

          <div>
            <Label text="وضعیت تأهل" />
            <SelectField
              value={mother.marital}
              onChange={v => updateMother({ marital: v })}
              options={['متأهل', 'مجرد', 'مطلقه', 'بیوه']}
            />
          </div>

          <TextInput
            label="تحصیلات"
            value={mother.education}
            onChange={v => updateMother({ education: v })}
          />

          <TextInput
            label="شغل"
            value={mother.job}
            onChange={v => updateMother({ job: v })}
          />

          <TextInput
            label="شغل همسر"
            value={mother.spouseJob}
            onChange={v => updateMother({ spouseJob: v })}
          />

          <TextInput
            label="تحصیلات همسر"
            value={mother.spouseEducation}
            onChange={v => updateMother({ spouseEducation: v })}
          />

          <div>
            <Label text="نوع بیمه" />
            <SelectField
              value={mother.insurance}
              onChange={v => updateMother({ insurance: v })}
              options={[
                'بدون بیمه',
                'تأمین اجتماعی',
                'خدمات درمانی',
                'سلامت',
                'نیروهای مسلح',
                'بیمه تکمیلی',
                'سایر',
              ]}
            />
          </div>

          <div>
            <Label text="نوع ملک سکونت" />
            <SelectField
              value={mother.propertyType}
              onChange={v => updateMother({ propertyType: v })}
              options={[
                'اجاره‌ای',
                'ملک شخصی',
                'منزل خانواده',
                'رهن کامل',
                'سایر',
              ]}
            />
          </div>

          <div>
            <Label text="آیا نسبت فامیلی دارند؟" />
            <SelectField
              value={mother.kinship}
              onChange={v =>
                updateMother({
                  kinship: v,
                  kinshipType: v === 'بله' ? mother.kinshipType : '',
                })
              }
              options={['خیر', 'بله']}
            />
          </div>

          <TextInput
            label="نوع نسبت فامیلی"
            value={mother.kinshipType}
            onChange={v => updateMother({ kinshipType: v })}
            placeholder="مثلاً دخترعمو / پسرعمو"
          />

          <JalaliDatePicker
            label="تاریخ شروع بارداری"
            value={mother.pregnancyStart}
            onChange={v => updateMother({ pregnancyStart: v })}
          />

          <JalaliDatePicker
            label="تاریخ احتمالی زایمان"
            value={mother.dueDate}
            onChange={v => updateMother({ dueDate: v })}
          />

          <div className="md:col-span-2">
            <Label text="وضعیت پرونده" />
            <SelectField
              value={mother.pregnancyStatus}
              onChange={v => updateMother({ pregnancyStatus: v })}
              options={[
                'در حال پیگیری',
                'به دنیا آمده',
                'لغو',
                'سقط',
                'نیازمند پیگیری فوری',
                'ارجاع به پزشک',
                'نیازمند حمایت مالی',
                'مختومه',
              ]}
            />
          </div>
        </div>

        <TextAreaInput
          label="دلیل سقط"
          value={mother.abortionReason}
          onChange={v => updateMother({ abortionReason: v })}
          rows={3}
        />

        <TextAreaInput
          label="آدرس کامل"
          value={mother.address}
          onChange={v => updateMother({ address: v })}
          rows={3}
        />

        <TextAreaInput
          label="توضیحات پرونده"
          value={mother.notes}
          onChange={v => updateMother({ notes: v })}
          rows={3}
        />
      </div>
    );
  }

  if (tab === 1) {
    return (
      <div className="space-y-4">
        {mother.children.map((child, index) => (
          <div key={child.id} className="bg-card border border-border rounded-xl p-5">
            <CardHeader
              title={`فرزند ${toPersianNumber(index + 1)}`}
              onDelete={() =>
                updateMother({
                  children: mother.children.filter(item => item.id !== child.id),
                })
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="نام فرزند"
                value={child.name}
                onChange={v => updateChild(child.id, { name: v })}
              />

              <div>
                <Label text="جنسیت فرزند" />
                <SelectField
                  value={child.gender}
                  onChange={v => updateChild(child.id, { gender: v })}
                  options={['پسر', 'دختر']}
                />
              </div>

              <JalaliDatePicker
                label="تاریخ تولد شمسی"
                value={child.birthDate}
                onChange={v => updateChild(child.id, { birthDate: v })}
              />

              <TextInput
                label="بیماری یا شرایط خاص"
                value={child.disease}
                onChange={v => updateChild(child.id, { disease: v })}
              />

              <div className="md:col-span-2">
                <ImageUploader
                  label="عکس فرزند"
                  value={child.photo}
                  onChange={v => updateChild(child.id, { photo: v })}
                />
              </div>
            </div>
          </div>
        ))}

        {mother.children.length === 0 && (
          <EmptyState text="هنوز فرزندی ثبت نشده است." />
        )}

        <button
          type="button"
          onClick={() =>
            updateMother({
              children: [
                ...mother.children,
                {
                  id: makeId(),
                  name: '',
                  gender: 'دختر',
                  birthDate: '',
                  disease: '',
                  photo: '',
                },
              ],
            })
          }
          className="w-full py-3 border border-dashed border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} />
          افزودن فرزند جدید
        </button>
      </div>
    );
  }

  if (tab === 2) {
    return (
      <div className="space-y-4">
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-primary" style={{ fontWeight: 600 }}>
            جمع کل هزینه‌ها
          </span>

          <span className="text-primary" style={{ fontWeight: 700 }}>
            {formatRial(totalCosts)}
          </span>
        </div>

        {mother.costs.map((cost, index) => (
          <div key={cost.id} className="bg-card border border-border rounded-xl p-5">
            <CardHeader
              title={`هزینه ${toPersianNumber(index + 1)}`}
              onDelete={() =>
                updateMother({
                  costs: mother.costs.filter(item => item.id !== cost.id),
                })
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="توضیح هزینه"
                value={cost.title}
                onChange={v => updateCost(cost.id, { title: v })}
                placeholder="مثلاً ویزیت پزشک، دارو، آزمایش، سونوگرافی"
              />

              <TextInput
                label="مبلغ به ریال"
                value={cost.amount}
                onChange={v => updateCost(cost.id, { amount: v })}
                placeholder="مثال: 2500000"
              />

              <JalaliDatePicker
                label="تاریخ شمسی"
                value={cost.date}
                onChange={v => updateCost(cost.id, { date: v })}
              />

              <ImageUploader
                label="رسید / عکس هزینه"
                value={cost.receipt}
                onChange={v => updateCost(cost.id, { receipt: v })}
              />
            </div>
          </div>
        ))}

        {mother.costs.length === 0 && (
          <EmptyState text="هنوز هزینه‌ای ثبت نشده است." />
        )}

        <button
          type="button"
          onClick={() =>
            updateMother({
              costs: [
                ...mother.costs,
                {
                  id: makeId(),
                  title: '',
                  amount: '',
                  date: todayJalali(),
                  receipt: '',
                },
              ],
            })
          }
          className="w-full py-3 border border-dashed border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} />
          افزودن هزینه جدید
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mother.services.map((service, index) => (
        <div key={service.id} className="bg-card border border-border rounded-xl p-5">
          <CardHeader
            title={`خدمت ${toPersianNumber(index + 1)}`}
            onDelete={() =>
              updateMother({
                services: mother.services.filter(item => item.id !== service.id),
              })
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label text="نوع خدمت" />

              <SelectField
                value={service.type}
                onChange={v => updateService(service.id, { type: v })}
                options={[
                  'جهیزیه',
                  'دارو',
                  'روانشناسی',
                  'مشاوره خانواده',
                  'کمک مالی',
                  'مواد غذایی',
                  'درمان',
                  'آزمایش',
                  'سونوگرافی',
                  'حمایت حقوقی',
                  'بسته معیشتی',
                  'لباس و پوشاک',
                  'حمل‌ونقل',
                  'ویزیت پزشک',
                  'سایر',
                ]}
              />
            </div>

            <JalaliDatePicker
              label="تاریخ شمسی"
              value={service.date}
              onChange={v => updateService(service.id, { date: v })}
            />

            <div className="md:col-span-2">
              <TextAreaInput
                label="توضیحات خدمت"
                value={service.desc}
                onChange={v => updateService(service.id, { desc: v })}
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="عکس خدمت"
                value={service.photo}
                onChange={v => updateService(service.id, { photo: v })}
              />
            </div>
          </div>
        </div>
      ))}

      {mother.services.length === 0 && (
        <EmptyState text="هنوز خدمتی ثبت نشده است." />
      )}

      <button
        type="button"
        onClick={() =>
          updateMother({
            services: [
              ...mother.services,
              {
                id: makeId(),
                type: 'دارو',
                desc: '',
                date: todayJalali(),
                photo: '',
              },
            ],
          })
        }
        className="w-full py-3 border border-dashed border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Plus size={16} />
        افزودن خدمت جدید
      </button>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <label className="block text-sm text-muted-foreground mb-1">
      {text}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label text={label} />

      <div className="form-input bg-muted/40 text-primary font-bold" dir="rtl">
        {value || '-'}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label text={label} />

      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input"
      />
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

      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="form-input resize-none"
      />
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="form-input appearance-none pr-3 pl-8 cursor-pointer w-full"
      >
        <option value="">انتخاب کنید...</option>

        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={14}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}

function CardHeader({
  title,
  onDelete,
}: {
  title: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-foreground" style={{ fontWeight: 600 }}>
        {title}
      </h4>

      <button
        onClick={onDelete}
        type="button"
        className="text-destructive hover:bg-destructive/10 p-1 rounded"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
      {text}
    </div>
  );
}