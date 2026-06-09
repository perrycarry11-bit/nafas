import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Image as ImageIcon,
  Activity,
  ChevronDown,
} from 'lucide-react';

import { PageHeader } from '../PageHeader';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { ImageUploader } from '../ImageUploader';
import { todayJalali, toPersianNumber } from '../../utils/jalali';

interface NafasActivity {
  id: string;
  title: string;
  type: string;
  targetGroup: string;
  relatedTo: string;
  date: string;
  location: string;
  organizer: string;
  participantsCount: string;
  description: string;
  result: string;
  photos: string[];
}

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'nafas_activities';

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const ACTIVITY_TYPES = [
  'آموزشی',
  'فرهنگی',
  'تفریحی',
  'حمایتی',
  'درمانی',
  'روانشناسی',
  'مشاوره خانواده',
  'مذهبی',
  'مناسبتی',
  'رسانه‌ای',
  'اشتغال‌زایی',
  'مهارت‌آموزی',
  'کمک معیشتی',
  'پویش مردمی',
  'جلسه گروهی مادران',
  'کارگاه مادر و کودک',
  'بازدید میدانی',
  'جشن تولد نوزادان',
  'توزیع بسته حمایتی',
  'سایر',
];

const TARGET_GROUPS = [
  'مادران',
  'فرزندان',
  'خانواده‌ها',
  'خیرین',
  'کارکنان مرکز',
  'عموم مردم',
  'مادران در حال پیگیری',
  'مادران نجات‌یافته',
  'کودکان',
  'سایر',
];

const emptyActivity = (): NafasActivity => ({
  id: makeId(),
  title: '',
  type: 'آموزشی',
  targetGroup: 'مادران',
  relatedTo: '',
  date: todayJalali(),
  location: '',
  organizer: '',
  participantsCount: '',
  description: '',
  result: '',
  photos: [],
});

function loadActivities(): NafasActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveActivities(items: NafasActivity[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function ActivitiesSection({ onBack }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [activities, setActivities] = useState<NafasActivity[]>([]);
  const [editing, setEditing] = useState<NafasActivity | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setActivities(loadActivities());
  }, []);

  const updateActivities = (next: NafasActivity[]) => {
    setActivities(next);
    saveActivities(next);
  };

  const openNew = () => {
    setEditing(emptyActivity());
    setView('form');
  };

  const openEdit = (item: NafasActivity) => {
    setEditing({
      ...item,
      photos: [...item.photos],
    });
    setView('form');
  };

  const saveActivity = () => {
    if (!editing) return;

    const next = activities.find(item => item.id === editing.id)
      ? activities.map(item => (item.id === editing.id ? editing : item))
      : [...activities, editing];

    updateActivities(next);
    setEditing(null);
    setView('list');
  };

  const deleteActivity = (id: string) => {
    const next = activities.filter(item => item.id !== id);
    updateActivities(next);
  };

  const goBackToDashboard = () => {
    saveActivities(activities);
    onBack();
  };

  const filtered = activities.filter(item => {
    const text = [
      item.title,
      item.type,
      item.targetGroup,
      item.relatedTo,
      item.date,
      item.location,
      item.organizer,
      item.description,
      item.result,
    ].join(' ');

    return text.includes(search);
  });

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader
          title="فعالیت‌های نفس"
          onBack={goBackToDashboard}
          action={
            <button
              onClick={openNew}
              type="button"
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} />
              ثبت فعالیت جدید
            </button>
          }
        />

        <div className="p-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard title="کل فعالیت‌ها" value={activities.length} />
            <StatCard
              title="فعالیت‌های آموزشی"
              value={activities.filter(item => item.type === 'آموزشی').length}
            />
            <StatCard
              title="فعالیت‌های فرهنگی"
              value={activities.filter(item => item.type === 'فرهنگی').length}
            />
            <StatCard
              title="دارای عکس"
              value={activities.filter(item => item.photos.length > 0).length}
            />
          </div>

          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو بر اساس عنوان، نوع فعالیت، تاریخ، مکان یا توضیحات..."
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    'عنوان فعالیت',
                    'نوع فعالیت',
                    'گروه هدف',
                    'تاریخ شمسی',
                    'مکان',
                    'تعداد عکس',
                    'عملیات',
                  ].map(header => (
                    <th
                      key={header}
                      className="px-4 py-3 text-right text-muted-foreground font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      index % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3 text-foreground">
                      {item.title || 'بدون عنوان'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{item.targetGroup}</td>
                    <td className="px-4 py-3 text-foreground">
                      {toPersianNumber(item.date)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{item.location}</td>
                    <td className="px-4 py-3 text-foreground">
                      {toPersianNumber(item.photos.length)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          type="button"
                          className="text-primary hover:underline text-xs flex items-center gap-1"
                        >
                          <Eye size={13} />
                          مشاهده / ویرایش
                        </button>

                        <button
                          onClick={() => deleteActivity(item.id)}
                          type="button"
                          className="text-destructive hover:underline text-xs flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      هنوز فعالیتی ثبت نشده است.
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
        title={editing.title || 'ثبت فعالیت جدید'}
        onBack={() => setView('list')}
        action={
          <button onClick={saveActivity} type="button" className="btn-primary">
            ذخیره فعالیت
          </button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto">
        <ActivityForm activityItem={editing} setActivityItem={setEditing} />
      </div>
    </div>
  );
}

function ActivityForm({
  activityItem,
  setActivityItem,
}: {
  activityItem: NafasActivity;
  setActivityItem: React.Dispatch<React.SetStateAction<NafasActivity | null>>;
}) {
  const update = (patch: Partial<NafasActivity>) => {
    setActivityItem(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const updatePhoto = (index: number, value: string) => {
    const nextPhotos = [...activityItem.photos];
    nextPhotos[index] = value;
    update({ photos: nextPhotos });
  };

  const addPhoto = () => {
    update({ photos: [...activityItem.photos, ''] });
  };

  const removePhoto = (index: number) => {
    update({
      photos: activityItem.photos.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div>
        <h3
          className="text-primary mb-1"
          style={{ fontSize: '1.1rem', fontWeight: 700 }}
        >
          اطلاعات فعالیت نفس
        </h3>
        <p className="text-sm text-muted-foreground">
          در این بخش می‌توانید فعالیت‌های آموزشی، فرهنگی، حمایتی، تفریحی و سایر اقدامات مرکز را ثبت کنید.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="عنوان فعالیت"
          value={activityItem.title}
          onChange={v => update({ title: v })}
          placeholder="مثلاً کارگاه آموزشی مراقبت از نوزاد"
        />

        <div>
          <Label text="نوع فعالیت" />
          <SelectField
            value={activityItem.type}
            onChange={v => update({ type: v })}
            options={ACTIVITY_TYPES}
          />
        </div>

        <div>
          <Label text="گروه هدف" />
          <SelectField
            value={activityItem.targetGroup}
            onChange={v => update({ targetGroup: v })}
            options={TARGET_GROUPS}
          />
        </div>

        <TextInput
          label="مرتبط با مادر / خانواده"
          value={activityItem.relatedTo}
          onChange={v => update({ relatedTo: v })}
          placeholder="نام مادر، خانواده یا گروه مرتبط"
        />

        <JalaliDatePicker
          label="تاریخ فعالیت"
          value={activityItem.date}
          onChange={v => update({ date: v })}
        />

        <TextInput
          label="مکان برگزاری"
          value={activityItem.location}
          onChange={v => update({ location: v })}
          placeholder="مثلاً مرکز نفس، مدرسه، مسجد، سالن اجتماعات"
        />

        <TextInput
          label="مسئول / برگزارکننده"
          value={activityItem.organizer}
          onChange={v => update({ organizer: v })}
          placeholder="نام مسئول یا تیم برگزارکننده"
        />

        <TextInput
          label="تعداد شرکت‌کنندگان"
          value={activityItem.participantsCount}
          onChange={v => update({ participantsCount: v })}
          placeholder="مثلاً 25"
        />
      </div>

      <TextAreaInput
        label="شرح فعالیت"
        value={activityItem.description}
        onChange={v => update({ description: v })}
        rows={4}
        placeholder="جزئیات کامل فعالیت، هدف، مخاطبان، روند برگزاری و نکات مهم"
      />

      <TextAreaInput
        label="نتیجه و دستاورد فعالیت"
        value={activityItem.result}
        onChange={v => update({ result: v })}
        rows={3}
        placeholder="نتیجه فعالیت، تعداد افراد بهره‌مند، بازخوردها و خروجی‌ها"
      />

      <div className="border border-border rounded-xl p-4 bg-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4
              className="text-foreground flex items-center gap-2"
              style={{ fontWeight: 700 }}
            >
              <ImageIcon size={16} />
              تصاویر فعالیت
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              امکان ثبت چند عکس برای هر فعالیت وجود دارد.
            </p>
          </div>

          <button
            onClick={addPhoto}
            type="button"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} />
            افزودن عکس
          </button>
        </div>

        <div className="space-y-4">
          {activityItem.photos.map((photo, index) => (
            <div
              key={`${index}-${photo}`}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-foreground" style={{ fontWeight: 600 }}>
                  عکس {toPersianNumber(index + 1)}
                </span>

                <button
                  onClick={() => removePhoto(index)}
                  type="button"
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <ImageUploader
                label="انتخاب / آپلود عکس"
                value={photo}
                onChange={v => updatePhoto(index, v)}
              />
            </div>
          ))}

          {activityItem.photos.length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
              هنوز عکسی برای این فعالیت ثبت نشده است.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-2">{title}</p>
      <div className="flex items-center justify-between">
        <span
          className="text-foreground"
          style={{ fontSize: '1.4rem', fontWeight: 800 }}
        >
          {toPersianNumber(value)}
        </span>
        <Activity size={20} className="text-primary" />
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <label className="block text-sm text-muted-foreground mb-1">{text}</label>;
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
        value={value}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <Label text={label} />
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
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
        value={value}
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