import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Send,
  Clock,
  Settings,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  Wand2,
  Copy,
  RefreshCw,
  CheckCircle2,
  Wifi,
  WifiOff,
  Search,
  Users,
  Heart,
  Stethoscope,
  Building2,
  ShieldCheck,
} from 'lucide-react';

import {
  todayJalali,
  formatJalaliDisplay,
  toPersianNumber,
} from '../utils/jalali';

import { supabase } from '../utils/supabaseClient';
import { getCurrentOnlineUser } from '../utils/onlineAuth';

interface Props {
  onBack: () => void;
}

interface OnlineProfile {
  id: string;
  full_name: string;
  username: string;
  role: 'national_admin' | 'province_admin' | 'province_staff';

  province_id: string | null;
  province_name: string;
  province_code: string;

  county_id?: string | null;
  county_name?: string;
  county_code?: string;

  access: string[];
  is_active: boolean;
}

interface Province {
  id: string;
  code: string;
  name: string;
}

interface County {
  id: string;
  province_id: string;
  code: string;
  name: string;
  is_active?: boolean;
}

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  type: 'mother' | 'benefactor' | 'doctor' | 'manual';
  province_id: string;
  province_name: string;
  county_id: string;
  county_name: string;
  status?: string;
}

interface SMSHistory {
  id: string;
  recipient: string;
  message: string;
  count: number;
  date: string;
  status: string;
  provinceName?: string;
  countyName?: string;
}

type AISource = 'idle' | 'online' | 'offline';

/*
  کلید ChatGPT خودت را اینجا قرار بده.
  مثال:
  const DEFAULT_OPENAI_API_KEY = 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx';
*/
const DEFAULT_OPENAI_API_KEY = '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';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

const SELECTED_PROVINCE_KEY = 'nafas_sms_selected_province';
const SELECTED_COUNTY_KEY = 'nafas_sms_selected_county';

const recipientGroups = [
  { value: 'all_mothers', label: 'همه مادران' },
  { value: 'following', label: 'مادران در حال پیگیری' },
  { value: 'delivered', label: 'مادران نجات‌یافته / تولد یافته' },
  { value: 'benefactors_person', label: 'خیرین شخص' },
  { value: 'benefactors_company', label: 'خیرین شرکت' },
  { value: 'all_doctors', label: 'همه پزشکان و متخصصین' },
  { value: 'manual', label: 'شماره دستی' },
];

const aiPurposeOptions = [
  { value: 'followup_mother', label: 'پیگیری وضعیت مادر' },
  { value: 'doctor_reminder', label: 'یادآوری نوبت پزشک' },
  { value: 'birth_congrats', label: 'تبریک تولد فرزند' },
  { value: 'thanks_donor', label: 'تشکر از خیر' },
  { value: 'complete_file', label: 'درخواست تکمیل پرونده' },
  { value: 'meeting_invite', label: 'دعوت به جلسه' },
  { value: 'activity_invite', label: 'اطلاع‌رسانی فعالیت فرهنگی' },
  { value: 'custom', label: 'متن دلخواه' },
];

const aiToneOptions = [
  { value: 'friendly_official', label: 'رسمی و صمیمی' },
  { value: 'short', label: 'کوتاه و پیامکی' },
  { value: 'official', label: 'کاملاً رسمی' },
  { value: 'warm', label: 'گرم و احساسی' },
  { value: 'respectful', label: 'محترمانه و اداری' },
];

function getCurrentProfile(): OnlineProfile | null {
  try {
    const raw = localStorage.getItem('nafas_online_profile');

    if (!raw) return null;

    const profile = JSON.parse(raw);

    return {
      ...profile,

      province_id:
        profile.province_id ||
        localStorage.getItem('nafas_current_province_id') ||
        null,

      province_name:
        profile.province_name ||
        localStorage.getItem('nafas_current_province_name') ||
        '',

      province_code:
        profile.province_code ||
        localStorage.getItem('nafas_current_province_code') ||
        '',

      county_id:
        profile.county_id ||
        localStorage.getItem('nafas_current_county_id') ||
        null,

      county_name:
        profile.county_name ||
        localStorage.getItem('nafas_current_county_name') ||
        '',

      county_code:
        profile.county_code ||
        localStorage.getItem('nafas_current_county_code') ||
        '',
    };
  } catch {
    return null;
  }
}

function isNationalAdmin(profile: OnlineProfile | null) {
  return profile?.role === 'national_admin';
}

function isProvinceAdmin(profile: OnlineProfile | null) {
  return profile?.role === 'province_admin';
}

function isCountyUser(profile: OnlineProfile | null) {
  return profile?.role === 'province_staff';
}

function getRelationObject(relation: any) {
  if (!relation) return {};
  if (Array.isArray(relation)) return relation[0] || {};
  return relation || {};
}

function normalizePhone(value: string) {
  const digits = String(value || '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');

  if (!digits) return '';

  if (digits.startsWith('0098')) {
    return `0${digits.slice(4)}`;
  }

  if (digits.startsWith('98') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

function isValidMobile(value: string) {
  return /^09\d{9}$/.test(normalizePhone(value));
}

function uniqueContacts(items: ContactItem[]) {
  const map = new Map<string, ContactItem>();

  items.forEach(item => {
    const phone = normalizePhone(item.phone);

    if (!phone) return;

    if (!map.has(phone)) {
      map.set(phone, {
        ...item,
        phone,
      });
    }
  });

  return Array.from(map.values());
}

function getRecipientLabel(value: string) {
  return recipientGroups.find(item => item.value === value)?.label || 'گیرنده';
}

function getPurposeLabel(value: string) {
  return aiPurposeOptions.find(item => item.value === value)?.label || 'متن پیامک';
}

function getToneLabel(value: string) {
  return aiToneOptions.find(item => item.value === value)?.label || 'رسمی و صمیمی';
}

function buildLocalSuggestion(aiPurpose: string, aiTone: string, aiDetails: string) {
  const details = aiDetails.trim();

  if (aiPurpose === 'followup_mother') {
    return `سلام خانم {name}
برای پیگیری وضعیت شما و تکمیل روند حمایتی مرکز نفس، لطفاً در اولین فرصت با مرکز تماس بگیرید.
با آرزوی سلامتی برای شما و فرزند عزیزتان.`;
  }

  if (aiPurpose === 'doctor_reminder') {
    return `خانم {name} گرامی
یادآوری می‌شود جهت پیگیری وضعیت سلامت مادر و جنین، لطفاً نوبت مراجعه پزشکی خود را فراموش نفرمایید.
مرکز مردمی نفس`;
  }

  if (aiPurpose === 'birth_congrats') {
    return `خانم {name} عزیز
تولد فرزند دلبندتان را صمیمانه تبریک می‌گوییم.
امیدواریم این قدم نورانی، آغاز روزهای پر از آرامش و برکت برای خانواده شما باشد.
مرکز مردمی نفس`;
  }

  if (aiPurpose === 'thanks_donor') {
    return `خیر گرامی {name}
از همراهی ارزشمند و کمک انسان‌دوستانه شما در حمایت از مادران و نجات فرزندان سقط صمیمانه سپاسگزاریم.
مرکز مردمی نفس`;
  }

  if (aiPurpose === 'complete_file') {
    return `خانم {name} گرامی
برای تکمیل پرونده حمایتی شما در مرکز نفس، لطفاً مدارک و اطلاعات باقی‌مانده را در اولین فرصت تکمیل فرمایید.
با تشکر، مرکز مردمی نفس`;
  }

  if (aiPurpose === 'meeting_invite') {
    return `خانم {name} گرامی
از شما دعوت می‌شود جهت حضور در جلسه مشاوره و پیگیری مرکز نفس در زمان اعلام‌شده حضور داشته باشید.
حضور شما برای ادامه روند حمایت ضروری است.`;
  }

  if (aiPurpose === 'activity_invite') {
    return `خانم {name} گرامی
مرکز مردمی نفس از شما برای حضور در برنامه آموزشی و فرهنگی پیش‌رو دعوت می‌کند.
حضور شما موجب دلگرمی و همراهی بیشتر خانواده نفس خواهد بود.`;
  }

  if (aiTone === 'short') {
    return `سلام {name}
پیام مرکز نفس: لطفاً برای پیگیری وضعیت خود با مرکز تماس بگیرید.`;
  }

  if (details) {
    return `سلام خانم {name}
لطفاً برای پیگیری موضوع اعلام‌شده با مرکز مردمی نفس در ارتباط باشید.
با احترام، مرکز مردمی نفس`;
  }

  return `سلام خانم {name}
لطفاً برای پیگیری وضعیت پرونده خود با مرکز مردمی نفس در ارتباط باشید.
با احترام، مرکز مردمی نفس`;
}

function getAISourceBox(aiSource: AISource) {
  if (aiSource === 'online') {
    return {
      label: 'متن آنلاین با ChatGPT ساخته شد',
      icon: Wifi,
      className: 'bg-green-100 text-green-700 border-green-200',
    };
  }

  if (aiSource === 'offline') {
    return {
      label: 'متن آفلاین پیشنهادی ساخته شد',
      icon: WifiOff,
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'هنوز متنی تولید نشده است',
    icon: Sparkles,
    className: 'bg-muted text-muted-foreground border-border',
  };
}

function applyScopeFilter<T extends { province_id: string; county_id: string }>(
  items: T[],
  profile: OnlineProfile | null,
  selectedProvinceId: string,
  selectedCountyId: string,
) {
  let list = [...items];

  if (!profile) return [];

  if (isNationalAdmin(profile) && selectedProvinceId !== 'all') {
    list = list.filter(item => item.province_id === selectedProvinceId);
  }

  if (isProvinceAdmin(profile)) {
    list = list.filter(item => item.province_id === profile.province_id);
  }

  if ((isNationalAdmin(profile) || isProvinceAdmin(profile)) && selectedCountyId !== 'all') {
    if (selectedCountyId === 'province') {
      list = list.filter(item => !item.county_id);
    } else {
      list = list.filter(item => item.county_id === selectedCountyId);
    }
  }

  if (isCountyUser(profile)) {
    list = list.filter(
      item =>
        item.province_id === profile.province_id &&
        item.county_id === profile.county_id,
    );
  }

  return list;
}

function resolveSmsScope(
  profile: OnlineProfile | null,
  selectedProvinceId: string,
  selectedCountyId: string,
) {
  if (!profile) {
    return {
      provinceId: null,
      countyId: null,
      provinceName: '',
      countyName: '',
    };
  }

  if (isNationalAdmin(profile)) {
    return {
      provinceId: selectedProvinceId === 'all' ? null : selectedProvinceId,
      countyId:
        selectedCountyId === 'all' || selectedCountyId === 'province'
          ? null
          : selectedCountyId,
      provinceName: '',
      countyName: '',
    };
  }

  if (isProvinceAdmin(profile)) {
    return {
      provinceId: profile.province_id,
      countyId:
        selectedCountyId === 'all' || selectedCountyId === 'province'
          ? null
          : selectedCountyId,
      provinceName: profile.province_name,
      countyName: '',
    };
  }

  return {
    provinceId: profile.province_id,
    countyId: profile.county_id || null,
    provinceName: profile.province_name,
    countyName: profile.county_name || '',
  };
}

export function SMSPanel({ onBack }: Props) {
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState(() => {
    return localStorage.getItem(SELECTED_PROVINCE_KEY) || 'all';
  });

  const [selectedCountyId, setSelectedCountyId] = useState(() => {
    return localStorage.getItem(SELECTED_COUNTY_KEY) || 'all';
  });

  const [recipient, setRecipient] = useState('all_mothers');
  const [manualNumbers, setManualNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SMSHistory[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsMessage, setContactsMessage] = useState('در حال آماده‌سازی گیرندگان...');

  const [username, setUsername] = useState(
    () => localStorage.getItem('nafas_sms_username') || '',
  );
  const [password, setPassword] = useState(
    () => localStorage.getItem('nafas_sms_password') || '',
  );
  const [senderNumber, setSenderNumber] = useState(
    () => localStorage.getItem('nafas_sms_sender') || '',
  );

  const [showPassword, setShowPassword] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const openaiApiKey = DEFAULT_OPENAI_API_KEY;

  const [aiModel, setAiModel] = useState(
    () => localStorage.getItem('nafas_openai_model') || DEFAULT_OPENAI_MODEL,
  );

  const [showAiKey, setShowAiKey] = useState(false);
  const [aiSettingsSaved, setAiSettingsSaved] = useState(false);

  const [aiPurpose, setAiPurpose] = useState('followup_mother');
  const [aiTone, setAiTone] = useState('friendly_official');
  const [aiDetails, setAiDetails] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSource, setAiSource] = useState<AISource>('idle');

  const [contactSearch, setContactSearch] = useState('');

  const national = isNationalAdmin(profile);
  const provinceAdmin = isProvinceAdmin(profile);
  const countyUser = isCountyUser(profile);

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 70) || 1;
  const aiSourceBox = getAISourceBox(aiSource);
  const AISourceIcon = aiSourceBox.icon;

  useEffect(() => {
    async function init() {
      let currentProfile = getCurrentProfile();

      try {
        if (navigator.onLine) {
          const fresh = await getCurrentOnlineUser();
          if (fresh) currentProfile = fresh as any;
        }
      } catch {
        // استفاده از پروفایل ذخیره‌شده
      }

      currentProfile = currentProfile
        ? {
            ...currentProfile,
            province_id:
              currentProfile.province_id ||
              localStorage.getItem('nafas_current_province_id') ||
              null,
            province_name:
              currentProfile.province_name ||
              localStorage.getItem('nafas_current_province_name') ||
              '',
            province_code:
              currentProfile.province_code ||
              localStorage.getItem('nafas_current_province_code') ||
              '',
            county_id:
              currentProfile.county_id ||
              localStorage.getItem('nafas_current_county_id') ||
              null,
            county_name:
              currentProfile.county_name ||
              localStorage.getItem('nafas_current_county_name') ||
              '',
            county_code:
              currentProfile.county_code ||
              localStorage.getItem('nafas_current_county_code') ||
              '',
          }
        : null;

      setProfile(currentProfile);

      if (currentProfile?.role === 'province_admin') {
        setSelectedProvinceId(currentProfile.province_id || 'all');
      }

      if (currentProfile?.role === 'province_staff') {
        setSelectedProvinceId(currentProfile.province_id || 'all');
        setSelectedCountyId(currentProfile.county_id || 'all');
      }

      await loadBaseData(currentProfile);
    }

    init();
  }, []);

  useEffect(() => {
    localStorage.setItem(SELECTED_PROVINCE_KEY, selectedProvinceId);
  }, [selectedProvinceId]);

  useEffect(() => {
    localStorage.setItem(SELECTED_COUNTY_KEY, selectedCountyId);
  }, [selectedCountyId]);

  useEffect(() => {
    if (profile) {
      loadContacts();
      loadSmsHistory();
    }
  }, [profile, selectedProvinceId, selectedCountyId, recipient]);

  useEffect(() => {
    if (recipient === 'manual') {
      loadContacts();
    }
  }, [manualNumbers]);

  async function loadBaseData(currentProfile = profile) {
    try {
      const [provincesResult, countiesResult] = await Promise.all([
        supabase.from('provinces').select('id, code, name').order('name', { ascending: true }),
        supabase.from('counties').select('id, province_id, code, name, is_active').order('name', { ascending: true }),
      ]);

      if (provincesResult.error) throw provincesResult.error;
      if (countiesResult.error) throw countiesResult.error;

      const allProvinces = Array.isArray(provincesResult.data) ? provincesResult.data : [];
      const allCounties = Array.isArray(countiesResult.data) ? countiesResult.data : [];

      if (isNationalAdmin(currentProfile)) {
        setProvinces(allProvinces);
        setCounties(allCounties);
      } else {
        setProvinces(allProvinces.filter(p => p.id === currentProfile?.province_id));
        setCounties(allCounties.filter(c => c.province_id === currentProfile?.province_id));
      }
    } catch (error: any) {
      setContactsMessage(error?.message || 'خطا در دریافت اطلاعات استان‌ها و شهرستان‌ها');
    }
  }

  const countyOptions = useMemo(() => {
    if (national) {
      if (selectedProvinceId === 'all') return counties;
      return counties.filter(county => county.province_id === selectedProvinceId);
    }

    if (profile?.province_id) {
      return counties.filter(county => county.province_id === profile.province_id);
    }

    return counties;
  }, [counties, national, selectedProvinceId, profile]);

  async function loadSmsHistory() {
    if (!profile) return;

    try {
      let query = supabase
        .from('sms_logs')
        .select(
          `
          id,
          province_id,
          county_id,
          recipient_label,
          message_text,
          numbers_count,
          sms_count,
          status,
          client_created_at,
          created_at,
          provinces (
            name,
            code
          ),
          counties (
            name,
            code
          )
        `,
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!national && profile.province_id) {
        query = query.eq('province_id', profile.province_id);
      }

      if (countyUser && profile.county_id) {
        query = query.eq('county_id', profile.county_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows: SMSHistory[] = Array.isArray(data)
        ? data.map((row: any) => {
            const province = getRelationObject(row.provinces);
            const county = getRelationObject(row.counties);

            return {
              id: row.id,
              recipient: row.recipient_label || 'گیرندگان',
              message: row.message_text || '',
              count: Number(row.numbers_count || 0),
              date: row.client_created_at
                ? new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })
                    .format(new Date(row.client_created_at))
                    .replace(/\u200e/g, '')
                : todayJalali(),
              status: row.status || 'ثبت شد',
              provinceName: province.name || '',
              countyName: county.name || '',
            };
          })
        : [];

      setHistory(rows);
    } catch {
      try {
        const savedHistory = localStorage.getItem('nafas_sms_history');
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed)) setHistory(parsed);
        }
      } catch {
        // ignore
      }
    }
  }

  async function loadContacts() {
    if (!profile) return;

    try {
      setContactsLoading(true);
      setContactsMessage('در حال دریافت گیرندگان مجاز بر اساس سطح دسترسی...');

      const [mothersResult, benefactorsResult, doctorsResult] = await Promise.all([
        supabase
          .from('mothers')
          .select(
            `
            id,
            province_id,
            county_id,
            first_name,
            last_name,
            phone,
            phone2,
            pregnancy_status,
            deleted_at,
            provinces ( name, code ),
            counties ( name, code )
          `,
          )
          .is('deleted_at', null),

        supabase
          .from('benefactors')
          .select(
            `
            id,
            province_id,
            county_id,
            donor_type,
            display_name,
            first_name,
            last_name,
            company_name,
            phone,
            phone2,
            deleted_at,
            provinces ( name, code ),
            counties ( name, code )
          `,
          )
          .is('deleted_at', null),

        supabase
          .from('doctors')
          .select(
            `
            id,
            province_id,
            county_id,
            full_name,
            phone,
            phone2,
            specialty,
            deleted_at,
            provinces ( name, code ),
            counties ( name, code )
          `,
          )
          .is('deleted_at', null),
      ]);

      if (mothersResult.error) throw mothersResult.error;
      if (benefactorsResult.error) throw benefactorsResult.error;
      if (doctorsResult.error) throw doctorsResult.error;

      const mothersRaw = Array.isArray(mothersResult.data) ? mothersResult.data : [];
      const benefactorsRaw = Array.isArray(benefactorsResult.data) ? benefactorsResult.data : [];
      const doctorsRaw = Array.isArray(doctorsResult.data) ? doctorsResult.data : [];

      const scopedMothers = applyScopeFilter(
        mothersRaw.map((row: any) => ({
          ...row,
          province_id: row.province_id || '',
          county_id: row.county_id || '',
        })),
        profile,
        selectedProvinceId,
        selectedCountyId,
      );

      const scopedBenefactors = applyScopeFilter(
        benefactorsRaw.map((row: any) => ({
          ...row,
          province_id: row.province_id || '',
          county_id: row.county_id || '',
        })),
        profile,
        selectedProvinceId,
        selectedCountyId,
      );

      const scopedDoctors = applyScopeFilter(
        doctorsRaw.map((row: any) => ({
          ...row,
          province_id: row.province_id || '',
          county_id: row.county_id || '',
        })),
        profile,
        selectedProvinceId,
        selectedCountyId,
      );

      let nextContacts: ContactItem[] = [];

      if (recipient === 'all_mothers' || recipient === 'following' || recipient === 'delivered') {
        nextContacts = scopedMothers
          .filter((row: any) => {
            const status = row.pregnancy_status || '';

            if (recipient === 'following') {
              return status.includes('پیگیری') || status.includes('در حال');
            }

            if (recipient === 'delivered') {
              return (
                status.includes('نجات') ||
                status.includes('تولد') ||
                status.includes('به دنیا') ||
                status.includes('زایمان')
              );
            }

            return true;
          })
          .flatMap((row: any) => {
            const province = getRelationObject(row.provinces);
            const county = getRelationObject(row.counties);
            const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'مادر';

            return [row.phone, row.phone2]
              .map((phone: string) => normalizePhone(phone))
              .filter(isValidMobile)
              .map((phone: string) => ({
                id: `${row.id}-${phone}`,
                name,
                phone,
                type: 'mother' as const,
                province_id: row.province_id || '',
                province_name: province.name || '',
                county_id: row.county_id || '',
                county_name: county.name || '',
                status,
              }));
          });
      }

      if (recipient === 'benefactors_person' || recipient === 'benefactors_company') {
        nextContacts = scopedBenefactors
          .filter((row: any) => {
            if (recipient === 'benefactors_person') {
              return row.donor_type !== 'شرکت';
            }

            return row.donor_type === 'شرکت';
          })
          .flatMap((row: any) => {
            const province = getRelationObject(row.provinces);
            const county = getRelationObject(row.counties);

            const name =
              row.display_name ||
              row.company_name ||
              `${row.first_name || ''} ${row.last_name || ''}`.trim() ||
              'خیر';

            return [row.phone, row.phone2]
              .map((phone: string) => normalizePhone(phone))
              .filter(isValidMobile)
              .map((phone: string) => ({
                id: `${row.id}-${phone}`,
                name,
                phone,
                type: 'benefactor' as const,
                province_id: row.province_id || '',
                province_name: province.name || '',
                county_id: row.county_id || '',
                county_name: county.name || '',
              }));
          });
      }

      if (recipient === 'all_doctors') {
        nextContacts = scopedDoctors.flatMap((row: any) => {
          const province = getRelationObject(row.provinces);
          const county = getRelationObject(row.counties);
          const name = row.full_name || 'پزشک';

          return [row.phone, row.phone2]
            .map((phone: string) => normalizePhone(phone))
            .filter(isValidMobile)
            .map((phone: string) => ({
              id: `${row.id}-${phone}`,
              name,
              phone,
              type: 'doctor' as const,
              province_id: row.province_id || '',
              province_name: province.name || '',
              county_id: row.county_id || '',
              county_name: county.name || '',
              status: row.specialty || '',
            }));
        });
      }

      if (recipient === 'manual') {
        nextContacts = manualNumbers
          .split('\n')
          .map(line => normalizePhone(line))
          .filter(isValidMobile)
          .map((phone, index) => ({
            id: `manual-${index}-${phone}`,
            name: `شماره دستی ${index + 1}`,
            phone,
            type: 'manual' as const,
            province_id: profile.province_id || '',
            province_name: profile.province_name || '',
            county_id: profile.county_id || '',
            county_name: profile.county_name || '',
          }));
      }

      const cleaned = uniqueContacts(nextContacts);
      setContacts(cleaned);

      setContactsMessage(
        `${toPersianNumber(cleaned.length)} شماره مجاز برای ارسال آماده است.`,
      );
    } catch (error: any) {
      setContacts([]);
      setContactsMessage(error?.message || 'خطا در دریافت گیرندگان');
    } finally {
      setContactsLoading(false);
    }
  }

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;

    return contacts.filter(item => {
      const text = [
        item.name,
        item.phone,
        item.province_name,
        item.county_name,
        item.status,
      ].join(' ');

      return text.includes(contactSearch.trim());
    });
  }, [contacts, contactSearch]);

  function handleSaveSettings() {
    localStorage.setItem('nafas_sms_username', username);
    localStorage.setItem('nafas_sms_password', password);
    localStorage.setItem('nafas_sms_sender', senderNumber);

    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  function handleSaveAISettings() {
    localStorage.setItem('nafas_openai_model', aiModel);

    setAiSettingsSaved(true);
    setTimeout(() => setAiSettingsSaved(false), 2000);
  }

  async function saveSmsLog(
    status: string,
    numbersCount: number,
    providerResponse: any,
  ) {
    const scope = resolveSmsScope(profile, selectedProvinceId, selectedCountyId);
    const group = recipientGroups.find(r => r.value === recipient);

    const payload = {
      province_id: scope.provinceId,
      county_id: scope.countyId,
      recipient_group: recipient,
      recipient_label: group?.label || 'گیرندگان',
      message_text: message,
      numbers_count: numbersCount,
      sms_count: smsCount,
      status,
      provider_response: providerResponse || null,
      sent_by: profile?.id || null,
      client_created_at: new Date().toISOString(),
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('sms_logs').insert(payload);

      if (error) throw error;
    } catch {
      // اگر آنلاین ثبت نشد، حداقل در حافظه محلی ذخیره می‌شود
    }

    const newSMS: SMSHistory = {
      id: Date.now().toString(),
      recipient: group?.label || 'گیرندگان',
      message,
      count: numbersCount,
      date: todayJalali(),
      status,
      provinceName: profile?.province_name || '',
      countyName: profile?.county_name || '',
    };

    setHistory(prev => [newSMS, ...prev]);

    try {
      localStorage.setItem('nafas_sms_history', JSON.stringify([newSMS, ...history]));
    } catch {
      // ignore
    }
  }

  async function sendSMS() {
    if (!username || !password || !senderNumber) {
      alert('لطفاً ابتدا تنظیمات اتصال به پنل پیامکی را در ستون سمت چپ تکمیل و ذخیره کنید.');
      return;
    }

    if (!message.trim()) {
      alert('لطفاً متن پیام را وارد کنید.');
      return;
    }

    await loadContacts();

    const recipients = recipient === 'manual'
      ? manualNumbers
          .split('\n')
          .map(line => normalizePhone(line))
          .filter(isValidMobile)
          .map((phone, index) => ({
            id: `manual-send-${index}`,
            name: `مخاطب ${index + 1}`,
            phone,
            type: 'manual' as const,
            province_id: profile?.province_id || '',
            province_name: profile?.province_name || '',
            county_id: profile?.county_id || '',
            county_name: profile?.county_name || '',
          }))
      : contacts;

    const cleanedRecipients = uniqueContacts(recipients);

    if (cleanedRecipients.length === 0) {
      alert('هیچ شماره موبایل مجازی برای ارسال پیدا نشد.');
      return;
    }

    const confirmed = confirm(
      `آیا پیامک برای ${cleanedRecipients.length} نفر ارسال شود؟`,
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      let providerResult: any = null;

      if (message.includes('{name}')) {
        let successCount = 0;
        let failCount = 0;
        const details: any[] = [];

        for (const item of cleanedRecipients) {
          const text = message.replaceAll('{name}', item.name || 'مخاطب');

          try {
            const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username,
                password,
                to: item.phone,
                from: senderNumber,
                text,
              }),
            });

            const data = await response.json();

            if (data.RetStatus === 1) {
              successCount += 1;
            } else {
              failCount += 1;
            }

            details.push({
              phone: item.phone,
              status: data.RetStatus,
              message: data.StrRetStatus,
            });
          } catch (error: any) {
            failCount += 1;
            details.push({
              phone: item.phone,
              status: 'error',
              message: error?.message || 'خطا',
            });
          }
        }

        providerResult = {
          mode: 'personalized',
          successCount,
          failCount,
          details,
        };

        await saveSmsLog(
          failCount === 0 ? 'ارسال شد' : `ارسال ناقص: ${successCount} موفق، ${failCount} ناموفق`,
          cleanedRecipients.length,
          providerResult,
        );
      } else {
        const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            to: cleanedRecipients.map(item => item.phone).join(','),
            from: senderNumber,
            text: message,
          }),
        });

        const data = await response.json();
        providerResult = data;

        if (data.RetStatus !== 1) {
          await saveSmsLog('خطا در ارسال', cleanedRecipients.length, data);
          alert('خطا از سمت سرور پیامک: ' + (data.StrRetStatus || 'نامشخص'));
          return;
        }

        await saveSmsLog('ارسال شد', cleanedRecipients.length, data);
      }

      setMessage('');
      setManualNumbers('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);

      await loadSmsHistory();
    } catch (error) {
      console.error(error);
      await saveSmsLog('خطا در ارتباط با پنل پیامکی', contacts.length, {
        error: String(error),
      });
      alert('خطا در برقراری ارتباط با اینترنت یا سرور پیامک.');
    } finally {
      setLoading(false);
    }
  }

  function insertName() {
    setMessage(m => m + '{name}');
  }

  async function generateAIText() {
    setAiError('');
    setAiCopied(false);
    setAiLoading(true);
    setAiSource('idle');

    const localSuggestion = buildLocalSuggestion(aiPurpose, aiTone, aiDetails);

    if (!openaiApiKey.trim() || openaiApiKey.includes('اینجا کلید')) {
      setAiResult(localSuggestion);
      setAiSource('offline');
      setAiLoading(false);
      return;
    }

    const prompt = `
یک متن پیامک فارسی برای سامانه مرکز مردمی نفس بنویس.

موضوع پیامک: ${getPurposeLabel(aiPurpose)}
لحن پیامک: ${getToneLabel(aiTone)}
گروه گیرنده: ${getRecipientLabel(recipient)}
توضیحات کاربر برای راهنمایی تو: ${aiDetails || 'توضیح خاصی داده نشده است.'}

قوانین:
- متن کوتاه و مناسب پیامک باشد.
- محترمانه، انسانی و گرم باشد.
- اگر مخاطب مادر است از عبارت خانم {name} استفاده کن.
- اگر مخاطب خیر است از عبارت خیر گرامی {name} استفاده کن.
- فقط متن نهایی پیامک را بده.
`;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel || DEFAULT_OPENAI_MODEL,
          instructions:
            'تو یک دستیار فارسی برای نگارش پیامک‌های رسمی، انسانی، کوتاه و مناسب مرکز حمایتی مادران هستی.',
          input: prompt,
          max_output_tokens: 350,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'خطا در پاسخ ChatGPT');
      }

      const outputText =
        data?.output_text ||
        data?.output
          ?.flatMap((item: any) => item.content || [])
          ?.map((content: any) => content.text || '')
          ?.join('')
          ?.trim() ||
        '';

      if (!outputText) {
        throw new Error('متنی از ChatGPT دریافت نشد.');
      }

      setAiResult(outputText.trim());
      setAiSource('online');
    } catch (error) {
      console.error(error);
      setAiError('اتصال به ChatGPT انجام نشد؛ متن پیشنهادی آفلاین ساخته شد.');
      setAiResult(localSuggestion);
      setAiSource('offline');
    } finally {
      setAiLoading(false);
    }
  }

  function useAIText() {
    if (!aiResult.trim()) return;
    setMessage(aiResult.trim());
  }

  function appendAIText() {
    if (!aiResult.trim()) return;

    setMessage(prev => {
      if (!prev.trim()) return aiResult.trim();
      return `${prev.trim()}\n${aiResult.trim()}`;
    });
  }

  async function copyAIText() {
    if (!aiResult.trim()) return;

    try {
      await navigator.clipboard.writeText(aiResult);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 1800);
    } catch {
      setAiCopied(false);
    }
  }

  const previewName =
    contacts[0]?.name ||
    (recipient.includes('benefactors') ? 'خیر گرامی' : 'فاطمه محمدی');

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ArrowRight size={18} />
            </button>

            <div>
              <h2 className="text-foreground font-bold text-lg">
                پنل پیامکی
              </h2>

              <p className="text-xs text-muted-foreground mt-1">
                {national
                  ? 'تهران: ارسال به همه کشور، استان یا شهرستان مشخص'
                  : provinceAdmin
                    ? `مدیر استان ${profile?.province_name || ''}: ارسال به همه شهرستان‌ها یا شهرستان مشخص`
                    : `کاربر شهرستان ${profile?.county_name || ''}: فقط مخاطبین همین شهرستان`}
              </p>
            </div>
          </div>

          <button
            onClick={sendSMS}
            disabled={loading}
            type="button"
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm transition-all ${
              sent ? 'bg-green-500 text-white' : 'btn-primary'
            } ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            <Send size={15} />
            {loading
              ? 'در حال ارسال...'
              : sent
                ? 'پیامک ارسال شد ✓'
                : 'ارسال پیامک'}
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-700 px-4 py-3 text-xs font-bold flex items-center gap-2">
            <ShieldCheck size={15} />
            گیرندگان فقط طبق سطح دسترسی شما بارگذاری می‌شوند.
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {contactsMessage}
          </div>

          <button
            type="button"
            onClick={loadContacts}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-foreground font-bold flex items-center gap-2 justify-center"
          >
            <RefreshCw size={14} className={contactsLoading ? 'animate-spin' : ''} />
            به‌روزرسانی گیرندگان
          </button>
        </div>

        {(national || provinceAdmin) && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {national && (
              <div>
                <label className="block text-xs text-muted-foreground mb-2 font-bold">
                  فیلتر استان
                </label>

                <select
                  value={selectedProvinceId}
                  onChange={e => {
                    setSelectedProvinceId(e.target.value);
                    setSelectedCountyId('all');
                  }}
                  className="form-input"
                >
                  <option value="all">همه کشور / همه استان‌ها</option>

                  {provinces.map(province => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-bold">
                فیلتر شهرستان / مرکز
              </label>

              <select
                value={selectedCountyId}
                onChange={e => setSelectedCountyId(e.target.value)}
                className="form-input"
              >
                <option value="all">همه شهرستان‌ها و خود استان</option>
                <option value="province">فقط ثبت‌شده توسط خود استان</option>

                {countyOptions.map(county => (
                  <option key={county.id} value={county.id}>
                    {county.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <StatCard title="گیرندگان آماده" value={contacts.length} icon={<Users size={20} />} />
          <StatCard title="مادران" value={contacts.filter(c => c.type === 'mother').length} icon={<Heart size={20} />} />
          <StatCard title="خیرین" value={contacts.filter(c => c.type === 'benefactor').length} icon={<Building2 size={20} />} />
          <StatCard title="پزشکان" value={contacts.filter(c => c.type === 'doctor').length} icon={<Stethoscope size={20} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-foreground mb-4 font-bold">
                ارسال پیامک
              </h3>

              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  گیرندگان
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {recipientGroups.map(r => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        recipient === r.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recipient"
                        checked={recipient === r.value}
                        onChange={() => setRecipient(r.value)}
                        className="accent-primary"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              {recipient === 'manual' && (
                <div className="mb-4">
                  <label className="block text-sm text-muted-foreground mb-1">
                    شماره‌ها، هر خط یک شماره
                  </label>

                  <textarea
                    value={manualNumbers}
                    onChange={e => setManualNumbers(e.target.value)}
                    rows={4}
                    className="form-input resize-none w-full"
                    placeholder={'09121234567\n09351234567'}
                  />
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-muted-foreground">
                    متن پیام
                  </label>

                  <button
                    onClick={insertName}
                    type="button"
                    className="text-xs text-primary hover:underline"
                  >
                    درج {'{name}'}
                  </button>
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  className="form-input resize-none mb-2 w-full"
                  placeholder="متن پیام خود را اینجا بنویسید... از {name} برای شخصی‌سازی استفاده کنید"
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{toPersianNumber(charCount)} کاراکتر</span>
                  <span>{toPersianNumber(smsCount)} پیامک</span>
                </div>
              </div>

              <div className="bg-muted rounded-xl p-4">
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
                  {(message || 'پیش‌نمایش پیام اینجا نمایش داده می‌شود.').replaceAll(
                    '{name}',
                    previewName,
                  )}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles size={17} />
                  </div>

                  <div>
                    <h3 className="text-foreground font-bold">
                      متن‌یار نفس
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      تولید متن پیامک با ChatGPT ثابت داخل کد
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generateAIText}
                  disabled={aiLoading}
                  className="flex items-center gap-2 btn-primary disabled:opacity-60"
                >
                  {aiLoading ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Wand2 size={15} />
                  )}
                  {aiLoading ? 'در حال تولید...' : 'تولید متن'}
                </button>
              </div>

              <div
                className={`mb-4 inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs font-bold ${aiSourceBox.className}`}
              >
                <AISourceIcon size={14} />
                {aiSourceBox.label}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    نوع پیام
                  </label>

                  <select
                    value={aiPurpose}
                    onChange={e => setAiPurpose(e.target.value)}
                    className="form-input"
                  >
                    {aiPurposeOptions.map(item => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    لحن متن
                  </label>

                  <select
                    value={aiTone}
                    onChange={e => setAiTone(e.target.value)}
                    className="form-input"
                  >
                    {aiToneOptions.map(item => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-muted-foreground mb-1">
                  توضیح کوتاه برای ChatGPT
                </label>

                <textarea
                  value={aiDetails}
                  onChange={e => setAiDetails(e.target.value)}
                  rows={3}
                  className="form-input resize-none"
                  placeholder="مثلاً: مادر باید فردا برای سونوگرافی مراجعه کند..."
                />
              </div>

              {aiError && (
                <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-xs p-3">
                  {aiError}
                </div>
              )}

              <textarea
                value={aiResult}
                onChange={e => setAiResult(e.target.value)}
                rows={5}
                className="form-input resize-none"
                placeholder="بعد از زدن دکمه تولید متن، خروجی اینجا نمایش داده می‌شود."
              />

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={useAIText}
                  disabled={!aiResult.trim()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  استفاده به عنوان متن پیامک
                </button>

                <button
                  type="button"
                  onClick={appendAIText}
                  disabled={!aiResult.trim()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold disabled:opacity-50 hover:border-primary/40"
                >
                  افزودن به انتهای پیام
                </button>

                <button
                  type="button"
                  onClick={copyAIText}
                  disabled={!aiResult.trim()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold disabled:opacity-50 hover:border-primary/40"
                >
                  <Copy size={14} />
                  {aiCopied ? 'کپی شد' : 'کپی متن'}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-bold">
                  مخاطبین قابل ارسال
                </h3>

                <span className="text-xs text-muted-foreground">
                  {toPersianNumber(filteredContacts.length)} نفر
                </span>
              </div>

              <div className="relative mb-3">
                <Search
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  className="form-input pr-9"
                  placeholder="جستجو در نام، شماره، استان یا شهرستان..."
                />
              </div>

              <div className="max-h-72 overflow-auto border border-border rounded-xl">
                {filteredContacts.slice(0, 80).map(item => (
                  <div
                    key={item.id}
                    className="px-3 py-2 border-b border-border last:border-b-0 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-muted-foreground mt-1">
                        {item.county_name || item.province_name || '-'}
                      </p>
                    </div>

                    <span dir="ltr" className="text-primary font-bold">
                      {item.phone}
                    </span>
                  </div>
                ))}

                {filteredContacts.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    مخاطبی پیدا نشد.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <SettingsBox
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              senderNumber={senderNumber}
              setSenderNumber={setSenderNumber}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              settingsSaved={settingsSaved}
              handleSaveSettings={handleSaveSettings}
            />

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <Sparkles size={16} />
                <h3 className="text-foreground font-bold">
                  تنظیمات ChatGPT
                </h3>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    API Key داخل کد
                  </label>

                  <div className="relative">
                    <input
                      type={showAiKey ? 'text' : 'password'}
                      value={openaiApiKey}
                      readOnly
                      className="form-input text-xs pl-8 bg-muted/40 cursor-not-allowed"
                      placeholder="کلید داخل کد قرار داده شده است"
                    />

                    <button
                      type="button"
                      onClick={() => setShowAiKey(!showAiKey)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-1 leading-5">
                    کلید از بالای فایل SMSPanel.tsx خوانده می‌شود و از داخل نرم‌افزار قابل تغییر نیست.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    مدل ChatGPT
                  </label>

                  <input
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value)}
                    className="form-input text-xs"
                    placeholder="gpt-4.1-mini"
                  />
                </div>

                <button
                  onClick={handleSaveAISettings}
                  type="button"
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    aiSettingsSaved
                      ? 'bg-green-500 text-white'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  <Save size={14} />
                  {aiSettingsSaved ? 'تنظیمات ذخیره شد ✓' : 'ذخیره مدل ChatGPT'}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-primary" />
                <h3 className="text-foreground font-bold">
                  تاریخچه پیام‌ها
                </h3>
              </div>

              <div className="space-y-3">
                {history.map(h => (
                  <div
                    key={h.id}
                    className="border border-border rounded-lg p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">
                        {h.recipient}
                      </span>

                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          h.status === 'ارسال شد'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>

                    <p className="text-foreground text-xs mb-2 line-clamp-2">
                      {h.message}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatJalaliDisplay(h.date)}</span>
                      <span>{toPersianNumber(h.count)} نفر</span>
                    </div>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6">
                    هنوز پیامکی ثبت نشده است.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsBox({
  username,
  setUsername,
  password,
  setPassword,
  senderNumber,
  setSenderNumber,
  showPassword,
  setShowPassword,
  settingsSaved,
  handleSaveSettings,
}: {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  senderNumber: string;
  setSenderNumber: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  settingsSaved: boolean;
  handleSaveSettings: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4 text-primary">
        <Settings size={16} />
        <h3 className="text-foreground font-bold">
          تنظیمات اتصال به پنل
        </h3>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            نام کاربری ملی‌پیامک
          </label>

          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="form-input text-xs"
            placeholder="مثلاً: 9107430716"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            رمز عبور پنل
          </label>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input text-xs pl-8"
              placeholder="رمز عبور پنل"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            شماره خط اختصاصی ارسال
          </label>

          <input
            type="text"
            value={senderNumber}
            onChange={e => setSenderNumber(e.target.value)}
            className="form-input text-xs"
            placeholder="مثلاً: 50004001430716"
          />
        </div>

        <button
          onClick={handleSaveSettings}
          type="button"
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
            settingsSaved
              ? 'bg-green-500 text-white'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          <Save size={14} />
          {settingsSaved ? 'تنظیمات ذخیره شد ✓' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xl font-extrabold text-foreground">
          {toPersianNumber(value)}
        </p>

        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}