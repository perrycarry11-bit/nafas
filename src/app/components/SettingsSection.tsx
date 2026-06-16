import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  ArrowRight,
  Sun,
  Moon,
  UserPlus,
  User,
  Trash,
  Download,
  Upload,
  Lock,
  Shield,
  X,
  Check,
  UserCheck,
  LogOut,
  Search,
  ClipboardList,
  ShieldCheck,
  Eraser,
  FileDown,
  Building2,
  MapPin,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Pencil,
} from 'lucide-react';

import {
  addActivityLog,
  clearActivityLogs,
  getActivityLogs,
  type ActivityLogItem,
} from '../utils/activityLog';

import { supabase } from '../utils/supabaseClient';

interface Props {
  onBack: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  fontSize: number;
  setFontSize: (val: number) => void;
  currentRole?: any;
  activeUser?: any;
  onUserSwitched?: any;
}

interface OnlineProfile {
  id: string;
  full_name: string;
  username: string;
  role: string;
  province_id: string | null;
  county_id?: string | null;
  province_name?: string;
  province_code?: string;
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
  is_active: boolean;
}

type SupabaseRelation =
  | {
      name?: string;
      code?: string;
    }
  | {
      name?: string;
      code?: string;
    }[]
  | null;

interface OnlineUserRow {
  id: string;
  full_name: string;
  username: string;
  role: string;
  province_id: string | null;
  county_id: string | null;
  access: string[];
  is_active: boolean;
  provinces?: SupabaseRelation;
  counties?: SupabaseRelation;
}

const appModules = [
  { id: 'mothers', label: 'مادران' },
  { id: 'benefactors', label: 'خیرین' },
  { id: 'doctors', label: 'پزشکان' },
  { id: 'reports', label: 'گزارش‌ها' },
  { id: 'sms', label: 'پنل پیامکی' },
  { id: 'activities', label: 'فعالیت‌ها' },
  { id: 'referrals', label: 'معرفی‌نامه' },
  { id: 'centers', label: 'مدیریت مراکز نفس' },
  { id: 'communications', label: 'ارتباطات داخلی' },
  { id: 'cultural', label: 'بانک محتوای فرهنگی' },
  { id: 'profile', label: 'حساب کاربری' },
];

const countyAccessModules = [
  { id: 'mothers', label: 'مادران' },
  { id: 'benefactors', label: 'خیرین' },
  { id: 'doctors', label: 'پزشکان' },
  { id: 'reports', label: 'گزارش‌ها' },
  { id: 'sms', label: 'پنل پیامکی' },
  { id: 'activities', label: 'فعالیت‌های نفس' },
  { id: 'referrals', label: 'معرفی‌نامه' },
  { id: 'centers', label: 'مدیریت مراکز نفس' },
  { id: 'communications', label: 'ارتباطات داخلی' },
  { id: 'cultural', label: 'بانک محتوای فرهنگی' },
  { id: 'profile', label: 'حساب کاربری' },
];

const logSections = [
  'همه بخش‌ها',
  'تنظیمات',
  'مادران',
  'خیرین',
  'پزشکان',
  'پنل پیامکی',
  'معرفی‌نامه',
  'فعالیت‌ها',
  'مدیریت مراکز نفس',
  'ارتباطات داخلی',
  'بانک محتوای فرهنگی',
  'حساب کاربری',
  'بکاپ',
  'ظاهر',
];

function getOnlineProfile(): OnlineProfile | null {
  try {
    const raw = localStorage.getItem('nafas_online_profile');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isNationalRole(role?: string | null) {
  return (
    role === 'national_admin' ||
    role === 'country_admin' ||
    role === 'super_admin' ||
    role === 'main_admin' ||
    role === 'central_admin'
  );
}

function isProvinceAdminRole(role?: string | null) {
  return role === 'province_admin' || role === 'province_manager';
}

function isProvinceStaffRole(role?: string | null) {
  return role === 'province_staff' || role === 'county_user' || role === 'county_staff';
}

function isOnlineManager(profile: OnlineProfile | null) {
  return isNationalRole(profile?.role) || isProvinceAdminRole(profile?.role);
}

function makeCountyCode(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\u0600-\u06FFa-z0-9_]/g, '')
    .slice(0, 60);
}

function getRelationName(relation?: SupabaseRelation) {
  if (!relation) return '-';
  if (Array.isArray(relation)) return relation[0]?.name || '-';
  return relation.name || '-';
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function updateCachedOnlineProfile(nextProfile: OnlineProfile) {
  localStorage.setItem('nafas_online_profile', JSON.stringify(nextProfile));
  localStorage.setItem('nafas_current_online_user_id', nextProfile.id || '');
  localStorage.setItem('nafas_current_province_id', nextProfile.province_id || '');
  localStorage.setItem('nafas_current_province_name', nextProfile.province_name || '');
  localStorage.setItem('nafas_current_province_code', nextProfile.province_code || '');
  localStorage.setItem('nafas_current_county_id', nextProfile.county_id || '');
  localStorage.setItem('nafas_current_county_name', nextProfile.county_name || '');
  localStorage.setItem('nafas_current_county_code', nextProfile.county_code || '');
  localStorage.setItem('nafas_current_online_role', nextProfile.role || '');
}

function SettingsSection({
  onBack,
  darkMode,
  setDarkMode,
  fontSize,
  setFontSize,
  currentRole,
  activeUser,
  onUserSwitched,
}: Props) {
  const safeRole = currentRole || 'admin';

  const [users, setUsers] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    userId?: string;
    targetUser?: any;
  } | null>(null);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserAccess, setNewUserAccess] = useState<string[]>([]);

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logRoleFilter, setLogRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');
  const [logSectionFilter, setLogSectionFilter] = useState('همه بخش‌ها');

  const [onlineProfile, setOnlineProfile] = useState<OnlineProfile | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserRow[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineMessage, setOnlineMessage] = useState('');

  const [provinceAdminFullName, setProvinceAdminFullName] = useState('');
  const [provinceAdminUsername, setProvinceAdminUsername] = useState('');
  const [provinceAdminPassword, setProvinceAdminPassword] = useState('');
  const [provinceAdminProvinceId, setProvinceAdminProvinceId] = useState('');
  const [provinceAdminActive, setProvinceAdminActive] = useState(true);
  const [showProvinceAdminPassword, setShowProvinceAdminPassword] = useState(false);

  const [newCountyName, setNewCountyName] = useState('');

  const [countyFullName, setCountyFullName] = useState('');
  const [countyUsername, setCountyUsername] = useState('');
  const [countyPassword, setCountyPassword] = useState('');
  const [countyId, setCountyId] = useState('');
  const [countyNameManual, setCountyNameManual] = useState('');
  const [countyAccess, setCountyAccess] = useState<string[]>([
    'mothers',
    'activities',
    'reports',
  ]);
  const [countyUserActive, setCountyUserActive] = useState(true);
  const [showCountyPassword, setShowCountyPassword] = useState(false);

  const [selfFullName, setSelfFullName] = useState('');
  const [selfUsername, setSelfUsername] = useState('');
  const [selfPassword, setSelfPassword] = useState('');
  const [showSelfPassword, setShowSelfPassword] = useState(false);

  const [showEditOnlineUserModal, setShowEditOnlineUserModal] = useState(false);
  const [editingOnlineUser, setEditingOnlineUser] = useState<OnlineUserRow | null>(null);
  const [editOnlineFullName, setEditOnlineFullName] = useState('');
  const [editOnlineUsername, setEditOnlineUsername] = useState('');
  const [editOnlinePassword, setEditOnlinePassword] = useState('');
  const [editOnlineAccess, setEditOnlineAccess] = useState<string[]>([]);
  const [editOnlineActive, setEditOnlineActive] = useState(true);
  const [showEditOnlinePassword, setShowEditOnlinePassword] = useState(false);

  const canManageOnlineUsers = isOnlineManager(onlineProfile);
  const isNational = isNationalRole(onlineProfile?.role);
  const isProvinceAdmin = isProvinceAdminRole(onlineProfile?.role);

  useEffect(() => {
    const savedUsers = localStorage.getItem('nafas_users_list');

    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        setUsers(Array.isArray(parsed) ? parsed : []);
      } catch {
        setUsers([]);
      }
    } else {
      const defaultAdmin = {
        id: 'admin-1',
        name: 'مدیر سیستم',
        username: 'admin',
        role: 'admin',
        access: appModules.map(m => m.id),
      };

      setUsers([defaultAdmin]);
      localStorage.setItem('nafas_users_list', JSON.stringify([defaultAdmin]));
    }

    setActivityLogs(getActivityLogs());

    const profile = getOnlineProfile();
    setOnlineProfile(profile);

    if (profile) {
      setSelfFullName(profile.full_name || '');
      setSelfUsername(profile.username || '');
    }

    loadOnlineManagementData(profile);
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('nafas_users_list', JSON.stringify(users));
    }
  }, [users]);

  function refreshLogs() {
    setActivityLogs(getActivityLogs());
  }

  async function loadOnlineManagementData(profile = onlineProfile) {
    try {
      setOnlineLoading(true);
      setOnlineMessage('در حال دریافت اطلاعات کاربران...');

      const profileToUse = profile || getOnlineProfile();

      if (!profileToUse) {
        setOnlineMessage('برای مدیریت برخط کاربران، ابتدا با حساب برخط وارد شوید.');
        return;
      }

      const provincesResult = await supabase
        .from('provinces')
        .select('id, code, name')
        .order('name', { ascending: true });

      if (provincesResult.error) throw provincesResult.error;

      setProvinces(
        (Array.isArray(provincesResult.data) ? provincesResult.data : []) as Province[],
      );

      let countiesQuery = supabase
        .from('counties')
        .select('id, province_id, code, name, is_active')
        .order('name', { ascending: true });

      if (isProvinceAdminRole(profileToUse.role)) {
        countiesQuery = countiesQuery.eq('province_id', profileToUse.province_id);
      }

      const countiesResult = await countiesQuery;
      if (countiesResult.error) throw countiesResult.error;

      setCounties(
        (Array.isArray(countiesResult.data) ? countiesResult.data : []) as County[],
      );

      let usersQuery = supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          username,
          role,
          province_id,
          county_id,
          access,
          is_active,
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
        .order('full_name', { ascending: true });

      if (isProvinceAdminRole(profileToUse.role)) {
        usersQuery = usersQuery.eq('province_id', profileToUse.province_id);
      }

      const usersResult = await usersQuery;
      if (usersResult.error) throw usersResult.error;

      const rawUsers = (Array.isArray(usersResult.data)
        ? usersResult.data
        : []) as unknown as OnlineUserRow[];

      const visibleUsers = isNationalRole(profileToUse.role)
        ? rawUsers.filter(user => isProvinceAdminRole(user.role))
        : rawUsers.filter(user => isProvinceStaffRole(user.role));

      setOnlineUsers(visibleUsers);
      setOnlineMessage('اطلاعات کاربران تازه‌سازی شد.');
    } catch (error: any) {
      console.error(error);
      setOnlineMessage(error?.message || 'خطا در دریافت اطلاعات برخط');
    } finally {
      setOnlineLoading(false);
    }
  }

  const handleActionRequest = (actionType: string, userId?: string, targetUser?: any) => {
    if (actionType === 'delete' && userId === 'admin-1') {
      alert('شما نمی‌توانید مدیر اصلی را حذف کنید!');
      return;
    }

    setPendingAction({ type: actionType, userId, targetUser });
    setPasswordInput('');
    setPasswordError(false);
    setShowPasswordModal(true);
  };

  const verifyPassword = () => {
    if (passwordInput === '6405' || passwordInput === '۶۴۰۵') {
      setShowPasswordModal(false);

      const action = pendingAction?.type;

      if (action === 'add') {
        setShowAddUserModal(true);

        addActivityLog({
          action: 'درخواست افزودن کاربر',
          section: 'تنظیمات',
          targetType: 'کاربر',
          targetName: 'کاربر جدید',
          details: 'مدیر وارد فرم افزودن کاربر جدید شد.',
        });

        refreshLogs();
      }

      if (action === 'delete' && pendingAction?.userId) {
        const targetUser = users.find(u => u.id === pendingAction.userId);

        setUsers(prev => prev.filter(u => u.id !== pendingAction.userId));

        addActivityLog({
          action: 'حذف کاربر',
          section: 'تنظیمات',
          targetType: 'کاربر',
          targetName: targetUser?.name || pendingAction?.targetUser?.name || '-',
          targetId: pendingAction.userId,
          details: `کاربر ${targetUser?.name || '-'} از سیستم حذف شد.`,
        });

        refreshLogs();
      }

      if (action === 'switchToStaff' && pendingAction?.targetUser) {
        addActivityLog({
          action: 'ورود آزمایشی با حساب کارمند',
          section: 'تنظیمات',
          targetType: 'کاربر',
          targetName: pendingAction.targetUser.name,
          targetId: pendingAction.targetUser.id,
          details: `مدیر به حساب کاربر ${pendingAction.targetUser.name} سوییچ کرد.`,
        });

        refreshLogs();

        if (onUserSwitched) {
          onUserSwitched('staff', pendingAction.targetUser);
        }
      }

      if (action === 'switchToAdmin') {
        addActivityLog({
          action: 'بازگشت به پنل مدیریت',
          section: 'تنظیمات',
          targetType: 'نقش کاربری',
          targetName: 'مدیر سیستم',
          targetId: 'admin',
          details: 'کاربر با رمز ارشد به پنل مدیریت برگشت.',
        });

        refreshLogs();

        if (onUserSwitched) {
          onUserSwitched('admin', null);
        }
      }

      if (action === 'clearLogs') {
        clearActivityLogs();
        setActivityLogs([]);

        addActivityLog({
          action: 'پاکسازی گزارش فعالیت‌ها',
          section: 'تنظیمات',
          targetType: 'لاگ فعالیت',
          targetName: 'همه لاگ‌ها',
          targetId: 'nafas_activity_logs',
          details: 'گزارش فعالیت کاربران توسط مدیر پاکسازی شد.',
        });

        refreshLogs();
      }

      setPendingAction(null);
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleAddUser = () => {
    if (!newUserName || !newUserUsername || newUserAccess.length === 0) {
      alert('لطفاً همه فیلدها را پر کنید و حداقل یک دسترسی بدهید.');
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name: newUserName,
      username: normalizeUsername(newUserUsername),
      role: 'staff',
      access: newUserAccess,
    };

    const nextUsers = [...users, newUser];

    setUsers(nextUsers);
    localStorage.setItem('nafas_users_list', JSON.stringify(nextUsers));

    addActivityLog({
      action: 'ایجاد کاربر جدید',
      section: 'تنظیمات',
      targetType: 'کاربر',
      targetName: newUser.name,
      targetId: newUser.id,
      details: `کاربر ${newUser.name} با دسترسی به ${newUserAccess.length} بخش ایجاد شد.`,
    });

    refreshLogs();

    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserAccess([]);
  };

  const toggleAccess = (moduleId: string) => {
    setNewUserAccess(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const toggleCountyAccess = (moduleId: string) => {
    setCountyAccess(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  async function handleCreateProvinceAdmin() {
    if (!isNational) {
      alert('فقط مدیر کشور می‌تواند مدیر استان بسازد.');
      return;
    }

    if (
      !provinceAdminFullName.trim() ||
      !provinceAdminUsername.trim() ||
      !provinceAdminPassword.trim()
    ) {
      alert('نام کامل، نام کاربری و رمز عبور مدیر استان را وارد کنید.');
      return;
    }

    if (!provinceAdminProvinceId) {
      alert('استان مدیر را انتخاب کنید.');
      return;
    }

    if (provinceAdminPassword.trim().length < 6) {
      alert('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    try {
      setOnlineLoading(true);
      setOnlineMessage('در حال ساخت مدیر استان...');

      // یافتن نام واقعی استان جهت ثبت صحیح در دیتابیس
      const selectedProv = provinces.find(p => p.id === provinceAdminProvinceId);
      const provName = selectedProv ? selectedProv.name : '';

      const { data, error } = await supabase.functions.invoke('create-nafas-user', {
        body: {
          role: 'province_admin',
          full_name: provinceAdminFullName.trim(),
          username: normalizeUsername(provinceAdminUsername),
          password: provinceAdminPassword.trim(),
          province_id: provinceAdminProvinceId,
          province_name: provName,
          is_active: provinceAdminActive,
          access: appModules.map(m => m.id),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      addActivityLog({
        action: 'ایجاد مدیر استان',
        section: 'تنظیمات',
        targetType: 'کاربر برخط',
        targetName: provinceAdminFullName.trim(),
        targetId: normalizeUsername(provinceAdminUsername),
        details: `مدیر استان با نام کاربری ${normalizeUsername(provinceAdminUsername)} ایجاد شد.`,
      });

      refreshLogs();

      setProvinceAdminFullName('');
      setProvinceAdminUsername('');
      setProvinceAdminPassword('');
      setProvinceAdminProvinceId('');
      setProvinceAdminActive(true);

      await loadOnlineManagementData();

      setOnlineMessage(data?.message || 'مدیر استان با موفقیت ساخته شد.');
      alert('مدیر استان با موفقیت ساخته شد.');
    } catch (error: any) {
      console.error(error);
      const message = error?.message || 'خطا در ساخت مدیر استان';
      setOnlineMessage(message);
      alert(message);
    } finally {
      setOnlineLoading(false);
    }
  }

  async function handleCreateCounty() {
    if (!isProvinceAdmin) {
      alert('فقط مدیر استان می‌تواند شهرستان بسازد.');
      return;
    }

    const name = newCountyName.trim();

    if (!name) {
      alert('نام شهرستان را وارد کنید.');
      return;
    }

    const provinceId = onlineProfile?.province_id || '';

    if (!provinceId) {
      alert('استان شما مشخص نیست.');
      return;
    }

    try {
      setOnlineLoading(true);
      setOnlineMessage('در حال ساخت شهرستان...');

      const { error } = await supabase.from('counties').insert({
        province_id: provinceId,
        name,
        code: makeCountyCode(name),
        is_active: true,
        created_by: onlineProfile?.id || null,
      });

      if (error) throw error;

      addActivityLog({
        action: 'ایجاد شهرستان',
        section: 'تنظیمات',
        targetType: 'شهرستان',
        targetName: name,
        targetId: provinceId,
        details: `شهرستان ${name} برای استان ایجاد شد.`,
      });

      refreshLogs();

      setNewCountyName('');
      await loadOnlineManagementData();
      setOnlineMessage('شهرستان با موفقیت ساخته شد.');
    } catch (error: any) {
      console.error(error);
      setOnlineMessage(error?.message || 'خطا در ساخت شهرستان');
      alert(error?.message || 'خطا در ساخت شهرستان');
    } finally {
      setOnlineLoading(false);
    }
  }

  async function handleCreateCountyUser() {
    if (!isProvinceAdmin) {
      alert('فقط مدیر استان می‌تواند کاربر شهرستان بسازد.');
      return;
    }

    if (!countyFullName.trim() || !countyUsername.trim() || !countyPassword.trim()) {
      alert('نام کامل، نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    if (countyPassword.trim().length < 6) {
      alert('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    if (countyAccess.length === 0) {
      alert('حداقل یک دسترسی برای کاربر انتخاب کنید.');
      return;
    }

    const provinceId = onlineProfile?.province_id || '';
    const provinceName = onlineProfile?.province_name || '';

    if (!provinceId) {
      alert('استان شما مشخص نیست.');
      return;
    }

    if (!countyId && !countyNameManual.trim()) {
      alert('شهرستان را انتخاب کنید یا نام شهرستان جدید را وارد کنید.');
      return;
    }

    try {
      setOnlineLoading(true);
      setOnlineMessage('در حال ساخت کاربر شهرستان...');

      // یافتن نام واقعی شهرستان جهت ثبت در دیتابیس
      let finalCountyName = countyNameManual.trim();
      if (countyId) {
        const selectedCounty = counties.find(c => c.id === countyId);
        if (selectedCounty) {
          finalCountyName = selectedCounty.name;
        }
      }

      const { data, error } = await supabase.functions.invoke('create-nafas-user', {
        body: {
          role: 'province_staff',
          full_name: countyFullName.trim(),
          username: normalizeUsername(countyUsername),
          password: countyPassword.trim(),
          province_id: provinceId,
          province_name: provinceName,
          county_id: countyId || null,
          county_name: finalCountyName,
          access: countyAccess,
          is_active: countyUserActive,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      addActivityLog({
        action: 'ایجاد کاربر شهرستان',
        section: 'تنظیمات',
        targetType: 'کاربر برخط',
        targetName: countyFullName.trim(),
        targetId: normalizeUsername(countyUsername),
        details: `کاربر ${countyFullName.trim()} با نام کاربری ${normalizeUsername(countyUsername)} برای شهرستان ${finalCountyName} ایجاد شد.`,
      });

      refreshLogs();

      setCountyFullName('');
      setCountyUsername('');
      setCountyPassword('');
      setCountyId('');
      setCountyNameManual('');
      setCountyAccess(['mothers', 'activities', 'reports']);
      setCountyUserActive(true);

      await loadOnlineManagementData();

      setOnlineMessage(data?.message || 'کاربر شهرستان با موفقیت ساخته شد.');
      alert('کاربر شهرستان با موفقیت ساخته شد.');
    } catch (error: any) {
      console.error(error);
      const message = error?.message || 'خطا در ساخت کاربر شهرستان';
      setOnlineMessage(message);
      alert(message);
    } finally {
      setOnlineLoading(false);
    }
  }

  async function toggleOnlineUserActive(user: OnlineUserRow) {
    if (!canManageOnlineUsers) return;

    const canToggle =
      (isNational && isProvinceAdminRole(user.role)) ||
      (isProvinceAdmin && isProvinceStaffRole(user.role));

    if (!canToggle) {
      alert('شما اجازه تغییر وضعیت این کاربر را ندارید.');
      return;
    }

    if (user.id === onlineProfile?.id) {
      alert('نمی‌توانید حساب خودتان را غیرفعال کنید.');
      return;
    }

    try {
      setOnlineLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      addActivityLog({
        action: user.is_active ? 'غیرفعال کردن کاربر' : 'فعال کردن کاربر',
        section: 'تنظیمات',
        targetType: 'کاربر برخط',
        targetName: user.full_name,
        targetId: user.username,
        details: `وضعیت کاربر ${user.full_name} تغییر کرد.`,
      });

      refreshLogs();

      await loadOnlineManagementData();
    } catch (error: any) {
      alert(error?.message || 'خطا در تغییر وضعیت کاربر');
    } finally {
      setOnlineLoading(false);
    }
  }

  function canEditOnlineUser(user: OnlineUserRow) {
    if (!onlineProfile) return false;

    if (user.id === onlineProfile.id) return true;

    if (isNational && isProvinceAdminRole(user.role)) return true;

    if (
      isProvinceAdmin &&
      isProvinceStaffRole(user.role) &&
      user.province_id === onlineProfile.province_id
    ) {
      return true;
    }

    return false;
  }

  function openEditOnlineUser(user: OnlineUserRow) {
    if (!canEditOnlineUser(user)) {
      alert('شما اجازه ویرایش این کاربر را ندارید.');
      return;
    }

    setEditingOnlineUser(user);
    setEditOnlineFullName(user.full_name || '');
    setEditOnlineUsername(user.username || '');
    setEditOnlinePassword('');
    setEditOnlineAccess(Array.isArray(user.access) ? user.access : []);
    setEditOnlineActive(Boolean(user.is_active));
    setShowEditOnlinePassword(false);
    setShowEditOnlineUserModal(true);
  }

  function toggleEditOnlineAccess(moduleId: string) {
    setEditOnlineAccess(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId],
    );
  }

  async function updateOnlineUserCredentials() {
    if (!editingOnlineUser) return;

    if (!editOnlineFullName.trim() || !editOnlineUsername.trim()) {
      alert('نام کامل و نام کاربری را وارد کنید.');
      return;
    }

    if (editOnlinePassword.trim() && editOnlinePassword.trim().length < 6) {
      alert('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    try {
      setOnlineLoading(true);
      setOnlineMessage('در حال تازه‌سازی کاربر...');

      const { data, error } = await supabase.functions.invoke('update-nafas-user', {
        body: {
          target_user_id: editingOnlineUser.id,
          full_name: editOnlineFullName.trim(),
          username: normalizeUsername(editOnlineUsername),
          password: editOnlinePassword.trim() || null,
          access: isProvinceStaffRole(editingOnlineUser.role)
            ? editOnlineAccess
            : appModules.map(m => m.id),
          is_active: editOnlineActive,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      addActivityLog({
        action: 'ویرایش کاربر برخط',
        section: 'تنظیمات',
        targetType: 'کاربر برخط',
        targetName: editOnlineFullName.trim(),
        targetId: normalizeUsername(editOnlineUsername),
        details: editOnlinePassword.trim()
          ? 'نام، نام کاربری، دسترسی‌ها و رمز عبور کاربر تغییر کرد.'
          : 'نام، نام کاربری و دسترسی‌های کاربر تغییر کرد.',
      });

      refreshLogs();

      setShowEditOnlineUserModal(false);
      setEditingOnlineUser(null);
      setEditOnlinePassword('');

      await loadOnlineManagementData();

      setOnlineMessage(data?.message || 'کاربر با موفقیت تازه‌سازی شد.');
      alert('کاربر با موفقیت تازه‌سازی شد.');
    } catch (error: any) {
      console.error(error);
      const message = error?.message || 'خطا در ویرایش کاربر';
      setOnlineMessage(message);
      alert(message);
    } finally {
      setOnlineLoading(false);
    }
  }

  async function updateSelfAccount() {
    if (!onlineProfile) {
      alert('ابتدا با حساب برخط وارد شوید.');
      return;
    }

    if (!selfFullName.trim() || !selfUsername.trim()) {
      alert('نام کامل و نام کاربری را وارد کنید.');
      return;
    }

    if (selfPassword.trim() && selfPassword.trim().length < 6) {
      alert('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    try {
      setOnlineLoading(true);
      setOnlineMessage('در حال تازه‌سازی حساب کاربری...');

      const { data, error } = await supabase.functions.invoke('update-nafas-user', {
        body: {
          target_user_id: onlineProfile.id,
          full_name: selfFullName.trim(),
          username: normalizeUsername(selfUsername),
          password: selfPassword.trim() || null,
          access: onlineProfile.access || [],
          is_active: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const nextProfile: OnlineProfile = {
        ...onlineProfile,
        full_name: selfFullName.trim(),
        username: normalizeUsername(selfUsername),
      };

      setOnlineProfile(nextProfile);
      updateCachedOnlineProfile(nextProfile);

      addActivityLog({
        action: 'ویرایش حساب کاربری',
        section: 'حساب کاربری',
        targetType: 'حساب کاربری',
        targetName: selfFullName.trim(),
        targetId: normalizeUsername(selfUsername),
        details: selfPassword.trim()
          ? 'کاربر نام، نام کاربری و رمز عبور خود را تغییر داد.'
          : 'کاربر نام و نام کاربری خود را تغییر داد.',
      });

      refreshLogs();

      setSelfPassword('');
      setOnlineMessage(data?.message || 'حساب کاربری با موفقیت تازه‌سازی شد.');
      alert('حساب کاربری با موفقیت تازه‌سازی شد. برای ورود بعدی از نام کاربری جدید استفاده کنید.');
    } catch (error: any) {
      console.error(error);
      const message = error?.message || 'خطا در ویرایش حساب کاربری';
      setOnlineMessage(message);
      alert(message);
    } finally {
      setOnlineLoading(false);
    }
  }

  const handleExportBackup = () => {
    const backupData: any = {};

    [
      'nafas_mothers',
      'nafas_benefactors',
      'nafas_doctors',
      'nafas_activities',
      'nafas_referrals',
      'nafas_users_list',
      'nafas_activity_logs',
      'nafas_sms_history',
      'nafas_sms_username',
      'nafas_sms_password',
      'nafas_sms_sender',
      'nafas_openai_api_key',
      'nafas_openai_model',
      'nafas_online_profile',
      'nafas_active_user',
      'nafas_current_role',
      'nafas_current_section',
      'nafas_current_online_user_id',
      'nafas_current_province_id',
      'nafas_current_province_name',
      'nafas_current_province_code',
      'nafas_current_county_id',
      'nafas_current_county_name',
      'nafas_current_county_code',
      'nafas_current_online_role',
    ].forEach(k => {
      backupData[k] = localStorage.getItem(k);
    });

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(backupData, null, 2));

    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `nafas_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    addActivityLog({
      action: 'دریافت بکاپ',
      section: 'بکاپ',
      targetType: 'فایل پشتیبان',
      targetName: 'بکاپ جامع سیستم',
      targetId: 'backup',
      details: 'فایل پشتیبان اطلاعات سیستم دریافت شد.',
    });

    refreshLogs();
  };

  const handleImportBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);

        Object.keys(parsed).forEach(k => {
          if (parsed[k] !== null) {
            localStorage.setItem(k, parsed[k]);
          }
        });

        addActivityLog({
          action: 'بازیابی بکاپ',
          section: 'بکاپ',
          targetType: 'فایل پشتیبان',
          targetName: file.name,
          targetId: 'backup-import',
          details: 'اطلاعات سیستم از فایل بکاپ بازیابی شد.',
        });

        alert('اطلاعات بازیابی شد. سیستم رفرش می‌شود.');
        window.location.reload();
      } catch {
        alert('فایل بکاپ نامعتبر است.');
      }
    };

    reader.readAsText(file);
  };

  const filteredLogs = activityLogs.filter(log => {
    const searchText = [
      log.userName,
      log.username,
      log.role,
      log.action,
      log.section,
      log.targetType,
      log.targetName,
      log.trackingCode,
      log.details,
      log.date,
      log.time,
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch = searchText.includes(logSearch.toLowerCase().trim());
    const matchesRole = logRoleFilter === 'all' || log.role === logRoleFilter;
    const matchesSection =
      logSectionFilter === 'همه بخش‌ها' || log.section === logSectionFilter;

    return matchesSearch && matchesRole && matchesSection;
  });

  function exportLogsCSV() {
    const header = [
      'تاریخ',
      'ساعت',
      'کاربر',
      'نام کاربری',
      'نقش',
      'بخش',
      'عملیات',
      'موضوع',
      'کد پرونده',
      'توضیحات',
    ];

    const rows = filteredLogs.map(log => [
      log.date,
      log.time,
      log.userName,
      log.username,
      log.role === 'admin' ? 'مدیر' : 'کارمند',
      log.section,
      log.action,
      log.targetName,
      log.trackingCode || '',
      log.details,
    ]);

    const csv = [header, ...rows]
      .map(row =>
        row
          .map(cell => `"${String(cell || '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);

    addActivityLog({
      action: 'خروجی گزارش فعالیت‌ها',
      section: 'تنظیمات',
      targetType: 'لاگ فعالیت',
      targetName: 'CSV',
      targetId: 'activity_logs_csv',
      details: 'خروجی CSV از گزارش فعالیت کاربران دریافت شد.',
    });

    refreshLogs();
  }

  function handleThemeChange(value: boolean) {
    setDarkMode(value);

    addActivityLog({
      action: 'تغییر حالت نمایش',
      section: 'ظاهر',
      targetType: 'تنظیمات ظاهری',
      targetName: value ? 'حالت تاریک' : 'حالت روشن',
      targetId: 'theme',
      details: value
        ? 'حالت نمایش به تاریک تغییر کرد.'
        : 'حالت نمایش به روشن تغییر کرد.',
    });

    refreshLogs();
  }

  function handleFontSizeChange(value: number) {
    setFontSize(value);

    addActivityLog({
      action: 'تغییر اندازه فونت',
      section: 'ظاهر',
      targetType: 'تنظیمات ظاهری',
      targetName: `${value}px`,
      targetId: 'font-size',
      details: `اندازه فونت سامانه به ${value}px تغییر کرد.`,
    });

    refreshLogs();
  }

  const availableCountiesForUser = counties.filter(c => {
    return onlineProfile?.province_id
      ? c.province_id === onlineProfile.province_id
      : true;
  });

  const tableTitle = isNational ? 'مدیران استان‌ها' : 'کاربران شهرستان‌های استان';

  return (
    <div
      className="min-h-screen bg-background pb-20 animate-in fade-in duration-500"
      dir="rtl"
    >
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary"
            type="button"
          >
            <ArrowRight size={20} />
          </button>

          <h2 className="text-xl font-bold text-foreground">
            تنظیمات سیستم
          </h2>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8 mt-4">
        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound className="text-primary" size={22} />

            <div>
              <h3 className="text-lg font-bold text-foreground">
                حساب کاربری من
              </h3>

              <p className="text-xs text-muted-foreground mt-1">
                هر کاربر می‌تواند نام، نام کاربری و رمز عبور خودش را تغییر دهد.
              </p>
            </div>
          </div>

          {!onlineProfile ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 p-4 text-sm leading-7">
              برای ویرایش حساب کاربری، ابتدا باید با حساب برخط وارد شوید.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={selfFullName}
                onChange={e => setSelfFullName(e.target.value)}
                className="form-input"
                placeholder="نام کامل"
              />

              <input
                value={selfUsername}
                onChange={e => setSelfUsername(e.target.value)}
                className="form-input text-left"
                dir="ltr"
                placeholder="نام کاربری"
              />

              <div className="relative md:col-span-2">
                <input
                  value={selfPassword}
                  onChange={e => setSelfPassword(e.target.value)}
                  type={showSelfPassword ? 'text' : 'password'}
                  className="form-input text-left pl-10"
                  dir="ltr"
                  placeholder="رمز عبور جدید؛ اگر نمی‌خواهید تغییر کند خالی بگذارید"
                />

                <button
                  type="button"
                  onClick={() => setShowSelfPassword(!showSelfPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showSelfPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={updateSelfAccount}
                  disabled={onlineLoading}
                  type="button"
                  className="bg-primary text-white font-bold px-5 py-3 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  ذخیره تغییرات حساب من
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-500" size={22} />

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {isNational
                    ? 'مدیریت مدیران استان‌ها'
                    : isProvinceAdmin
                      ? 'مدیریت شهرستان‌ها و کاربران شهرستان'
                      : 'مدیریت کاربران برخط'}
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  {isNational
                    ? 'مدیر کشور می‌تواند برای هر استان مدیر استان بسازد و وضعیت کاربران استانی را مدیریت کند.'
                    : isProvinceAdmin
                      ? 'مدیر استان می‌تواند شهرستان و کاربر شهرستان را با سطح دسترسی مشخص بسازد.'
                      : 'این بخش فقط برای مدیر کشور و مدیر استان فعال است.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => loadOnlineManagementData()}
              type="button"
              className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/15"
            >
              <RefreshCw size={15} className={onlineLoading ? 'animate-spin' : ''} />
              تازه‌سازی
            </button>
          </div>

          {!canManageOnlineUsers ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 p-4 text-sm leading-7 flex gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              این بخش فقط برای مدیر کشور و مدیر استان فعال است.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                {onlineMessage || 'آماده مدیریت کاربران برخط.'}
              </div>

              {isNational && (
                <div className="border border-blue-200 rounded-2xl p-5 bg-blue-50/60">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={17} className="text-blue-600" />

                    <h4 className="font-bold text-foreground">
                      افزودن مدیر استان
                    </h4>
                  </div>

                  <p className="text-xs text-muted-foreground leading-6 mb-4">
                    مدیر استان ساخته‌شده دسترسی مدیریتی دارد، اما فقط اطلاعات استان خودش را می‌بیند.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={provinceAdminFullName}
                      onChange={e => setProvinceAdminFullName(e.target.value)}
                      className="form-input"
                      placeholder="نام کامل مدیر استان"
                    />

                    <input
                      value={provinceAdminUsername}
                      onChange={e => setProvinceAdminUsername(e.target.value)}
                      className="form-input text-left"
                      dir="ltr"
                      placeholder="نام کاربری مدیر استان"
                    />

                    <div className="relative">
                      <input
                        value={provinceAdminPassword}
                        onChange={e => setProvinceAdminPassword(e.target.value)}
                        type={showProvinceAdminPassword ? 'text' : 'password'}
                        className="form-input text-left pl-10"
                        dir="ltr"
                        placeholder="رمز عبور مدیر استان"
                      />

                      <button
                        type="button"
                        onClick={() => setShowProvinceAdminPassword(!showProvinceAdminPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showProvinceAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <select
                      value={provinceAdminProvinceId}
                      onChange={e => setProvinceAdminProvinceId(e.target.value)}
                      className="form-input"
                    >
                      <option value="">انتخاب استان...</option>
                      {provinces.map(province => (
                        <option key={province.id} value={province.id}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={provinceAdminActive}
                        onChange={e => setProvinceAdminActive(e.target.checked)}
                        className="accent-primary"
                      />
                      مدیر استان فعال باشد
                    </label>

                    <button
                      onClick={handleCreateProvinceAdmin}
                      disabled={onlineLoading}
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <KeyRound size={16} />
                      ساخت مدیر استان
                    </button>
                  </div>
                </div>
              )}

              {isProvinceAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="border border-border rounded-2xl p-5 bg-muted/20">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin size={17} className="text-primary" />

                      <h4 className="font-bold text-foreground">
                        افزودن شهرستان
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div className="form-input bg-muted/50 text-primary font-bold">
                        استان شما: {onlineProfile?.province_name || 'استان شما'}
                      </div>

                      <input
                        value={newCountyName}
                        onChange={e => setNewCountyName(e.target.value)}
                        className="form-input"
                        placeholder="نام شهرستان، مثلاً شاهرود"
                      />

                      <button
                        onClick={handleCreateCounty}
                        disabled={onlineLoading}
                        type="button"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl disabled:opacity-60"
                      >
                        ثبت شهرستان
                      </button>
                    </div>
                  </div>

                  <div className="border border-border rounded-2xl p-5 bg-muted/20">
                    <div className="flex items-center gap-2 mb-4">
                      <UserPlus size={17} className="text-primary" />

                      <h4 className="font-bold text-foreground">
                        افزودن کاربر شهرستان
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <input
                        value={countyFullName}
                        onChange={e => setCountyFullName(e.target.value)}
                        className="form-input"
                        placeholder="نام کامل مسئول شهرستان"
                      />

                      <input
                        value={countyUsername}
                        onChange={e => setCountyUsername(e.target.value)}
                        className="form-input text-left"
                        dir="ltr"
                        placeholder="username"
                      />

                      <div className="relative">
                        <input
                          value={countyPassword}
                          onChange={e => setCountyPassword(e.target.value)}
                          type={showCountyPassword ? 'text' : 'password'}
                          className="form-input text-left pl-10"
                          dir="ltr"
                          placeholder="رمز عبور حداقل ۶ کاراکتر"
                        />

                        <button
                          type="button"
                          onClick={() => setShowCountyPassword(!showCountyPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showCountyPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      <div className="form-input bg-muted/50 text-primary font-bold">
                        استان: {onlineProfile?.province_name || 'استان شما'}
                      </div>

                      <select
                        value={countyId}
                        onChange={e => {
                          setCountyId(e.target.value);
                          if (e.target.value) setCountyNameManual('');
                        }}
                        className="form-input"
                      >
                        <option value="">انتخاب شهرستان موجود...</option>
                        {availableCountiesForUser.map(county => (
                          <option key={county.id} value={county.id}>
                            {county.name}
                          </option>
                        ))}
                      </select>

                      <input
                        value={countyNameManual}
                        onChange={e => {
                          setCountyNameManual(e.target.value);
                          if (e.target.value.trim()) setCountyId('');
                        }}
                        className="form-input"
                        placeholder="یا نام شهرستان جدید را وارد کنید"
                      />

                      <div>
                        <label className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                          <Shield size={14} className="text-emerald-500" />
                          دسترسی‌های کاربر شهرستان:
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          {countyAccessModules.map(mod => {
                            const hasAccess = countyAccess.includes(mod.id);

                            return (
                              <button
                                key={mod.id}
                                onClick={() => toggleCountyAccess(mod.id)}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                  hasAccess
                                    ? 'bg-primary text-white'
                                    : 'bg-muted border-border text-muted-foreground'
                                }`}
                                type="button"
                              >
                                {hasAccess && <Check size={12} />}
                                {mod.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={countyUserActive}
                          onChange={e => setCountyUserActive(e.target.checked)}
                          className="accent-primary"
                        />
                        کاربر فعال باشد
                      </label>

                      <button
                        onClick={handleCreateCountyUser}
                        disabled={onlineLoading}
                        type="button"
                        className="w-full bg-primary hover:opacity-90 text-white font-bold py-3 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        <KeyRound size={16} />
                        ساخت کاربر با نام کاربری و رمز عبور
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                  <h4 className="font-bold text-foreground">
                    {tableTitle}
                  </h4>

                  <span className="text-xs text-muted-foreground">
                    {onlineUsers.length} کاربر
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-right">نام</th>
                        <th className="px-4 py-3 text-right">نام کاربری</th>
                        <th className="px-4 py-3 text-right">استان</th>
                        <th className="px-4 py-3 text-right">شهرستان</th>
                        <th className="px-4 py-3 text-right">وضعیت</th>
                        <th className="px-4 py-3 text-right">عملیات</th>
                      </tr>
                    </thead>

                    <tbody>
                      {onlineUsers.map(user => (
                        <tr key={user.id} className="border-t border-border">
                          <td className="px-4 py-3 font-bold text-foreground">
                            {user.full_name}
                          </td>

                          <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                            {user.username}
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            {getRelationName(user.provinces)}
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            {getRelationName(user.counties)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                user.is_active
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              <CheckCircle2 size={12} />
                              {user.is_active ? 'فعال' : 'غیرفعال'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleOnlineUserActive(user)}
                                type="button"
                                className="text-primary hover:underline text-xs font-bold"
                              >
                                {user.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                              </button>

                              <button
                                onClick={() => openEditOnlineUser(user)}
                                type="button"
                                className="text-blue-600 hover:underline text-xs font-bold"
                              >
                                تغییر یوزر/رمز
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {onlineUsers.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            کاربری برای نمایش وجود ندارد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="text-primary" size={22} />

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  کاربران محلی / برون خط (آفلاین)
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  این بخش برای دسترسی‌های محلی و تست برون خط (آفلاین) حفظ شده است.
                </p>
              </div>
            </div>

            {safeRole === 'admin' && (
              <button
                onClick={() => handleActionRequest('add')}
                type="button"
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold"
              >
                <UserPlus size={16} />
                افزودن کاربر محلی
              </button>
            )}
          </div>

          {safeRole === 'staff' ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 p-4 text-sm leading-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                شما اکنون با حساب کارمند فعال هستید:{' '}
                <span className="font-bold">
                  {activeUser?.name || activeUser?.username || 'کارمند'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleActionRequest('switchToAdmin')}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 justify-center"
              >
                <LogOut size={14} />
                بازگشت به مدیریت
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-right">نام</th>
                    <th className="px-4 py-3 text-right">نام کاربری</th>
                    <th className="px-4 py-3 text-right">نقش</th>
                    <th className="px-4 py-3 text-right">دسترسی‌ها</th>
                    <th className="px-4 py-3 text-right">عملیات</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t border-border">
                      <td className="px-4 py-3 font-bold text-foreground">
                        {user.name}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                        {user.username}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                            user.role === 'admin'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {user.role === 'admin' ? 'مدیر' : 'کارمند'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {Array.isArray(user.access) ? user.access.length : 0} بخش
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleActionRequest('switchToStaff', user.id, user)}
                              className="text-blue-600 hover:underline text-xs font-bold"
                            >
                              ورود آزمایشی
                            </button>
                          )}

                          {user.id !== 'admin-1' && (
                            <button
                              type="button"
                              onClick={() => handleActionRequest('delete', user.id, user)}
                              className="text-rose-600 hover:underline text-xs font-bold"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        کاربر محلی وجود ندارد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            {darkMode ? (
              <Moon className="text-primary" size={22} />
            ) : (
              <Sun className="text-primary" size={22} />
            )}

            <div>
              <h3 className="text-lg font-bold text-foreground">
                ظاهر سامانه
              </h3>

              <p className="text-xs text-muted-foreground mt-1">
                تنظیم حالت روشن/تاریک و اندازه فونت.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-border p-4 bg-muted/20">
              <p className="font-bold text-foreground mb-3">
                حالت نمایش
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleThemeChange(false)}
                  className={`rounded-xl p-4 border flex items-center justify-center gap-2 font-bold ${
                    !darkMode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <Sun size={17} />
                  روشن
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange(true)}
                  className={`rounded-xl p-4 border flex items-center justify-center gap-2 font-bold ${
                    darkMode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <Moon size={17} />
                  تاریک
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4 bg-muted/20">
              <p className="font-bold text-foreground mb-3">
                اندازه فونت: {fontSize}px
              </p>

              <input
                type="range"
                min={13}
                max={19}
                value={fontSize}
                onChange={e => handleFontSizeChange(Number(e.target.value))}
                className="w-full accent-primary"
              />

              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>کوچک</span>
                <span>متوسط</span>
                <span>بزرگ</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <FileDown className="text-primary" size={22} />

            <div>
              <h3 className="text-lg font-bold text-foreground">
                بکاپ و بازیابی
              </h3>

              <p className="text-xs text-muted-foreground mt-1">
                اطلاعات محلی سامانه را خروجی بگیرید یا از فایل بکاپ بازیابی کنید.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleExportBackup}
              className="rounded-2xl border border-border bg-muted/30 p-5 text-right hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <Download size={18} />
                دریافت بکاپ
              </div>

              <p className="text-xs text-muted-foreground leading-6">
                یک فایل JSON از داده‌های ذخیره‌شده روی همین سیستم دریافت می‌شود.
              </p>
            </button>

            <label className="rounded-2xl border border-border bg-muted/30 p-5 text-right hover:border-primary/40 transition-all cursor-pointer">
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <Upload size={18} />
                بازیابی بکاپ
              </div>

              <p className="text-xs text-muted-foreground leading-6">
                فایل بکاپ قبلی را انتخاب کنید تا اطلاعات محلی بازیابی شود.
              </p>

              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-primary" size={22} />

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  گزارش فعالیت کاربران
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  ثبت عملیات مهم کاربران در بخش‌های مختلف سامانه.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportLogsCSV}
                className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <FileDown size={14} />
                خروجی CSV
              </button>

              <button
                type="button"
                onClick={() => handleActionRequest('clearLogs')}
                className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Eraser size={14} />
                پاکسازی لاگ‌ها
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="relative">
              <Search
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <input
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="form-input pr-9"
                placeholder="جستجو در لاگ‌ها..."
              />
            </div>

            <select
              value={logRoleFilter}
              onChange={e => setLogRoleFilter(e.target.value as any)}
              className="form-input"
            >
              <option value="all">همه نقش‌ها</option>
              <option value="admin">مدیر</option>
              <option value="staff">کارمند</option>
            </select>

            <select
              value={logSectionFilter}
              onChange={e => setLogSectionFilter(e.target.value)}
              className="form-input"
            >
              {logSections.map(section => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto border border-border rounded-2xl">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-right">تاریخ</th>
                  <th className="px-3 py-3 text-right">ساعت</th>
                  <th className="px-3 py-3 text-right">کاربر</th>
                  <th className="px-3 py-3 text-right">بخش</th>
                  <th className="px-3 py-3 text-right">عملیات</th>
                  <th className="px-3 py-3 text-right">موضوع</th>
                  <th className="px-3 py-3 text-right">توضیحات</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={`${log.date}-${log.time}-${index}`} className="border-t border-border">
                    <td className="px-3 py-3 text-muted-foreground">
                      {log.date}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground">
                      {log.time}
                    </td>

                    <td className="px-3 py-3 font-bold text-foreground">
                      {log.userName || log.username || '-'}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground">
                      {log.section}
                    </td>

                    <td className="px-3 py-3 text-primary font-bold">
                      {log.action}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground">
                      {log.targetName || '-'}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground max-w-[320px]">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      گزارشی برای نمایش وجود ندارد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showEditOnlineUserModal && editingOnlineUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Pencil size={18} />
                تغییر نام کاربری و رمز
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEditOnlineUserModal(false);
                  setEditingOnlineUser(null);
                  setEditOnlinePassword('');
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={editOnlineFullName}
                onChange={e => setEditOnlineFullName(e.target.value)}
                className="form-input"
                placeholder="نام کامل"
              />

              <input
                value={editOnlineUsername}
                onChange={e => setEditOnlineUsername(e.target.value)}
                className="form-input text-left"
                dir="ltr"
                placeholder="نام کاربری"
              />

              <div className="relative md:col-span-2">
                <input
                  value={editOnlinePassword}
                  onChange={e => setEditOnlinePassword(e.target.value)}
                  type={showEditOnlinePassword ? 'text' : 'password'}
                  className="form-input text-left pl-10"
                  dir="ltr"
                  placeholder="رمز عبور جدید؛ اگر نمی‌خواهید تغییر کند خالی بگذارید"
                />

                <button
                  type="button"
                  onClick={() => setShowEditOnlinePassword(!showEditOnlinePassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showEditOnlinePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <label className="md:col-span-2 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={editOnlineActive}
                  onChange={e => setEditOnlineActive(e.target.checked)}
                  className="accent-primary"
                  disabled={editingOnlineUser.id === onlineProfile?.id}
                />
                کاربر فعال باشد
              </label>
            </div>

            {isProvinceStaffRole(editingOnlineUser.role) && (
              <div className="mt-5">
                <p className="text-xs font-bold text-muted-foreground mb-3">
                  سطح دسترسی کاربر شهرستان
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {countyAccessModules.map(module => (
                    <label
                      key={module.id}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-xs cursor-pointer ${
                        editOnlineAccess.includes(module.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editOnlineAccess.includes(module.id)}
                        onChange={() => toggleEditOnlineAccess(module.id)}
                        className="accent-primary"
                      />
                      {module.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditOnlineUserModal(false);
                  setEditingOnlineUser(null);
                  setEditOnlinePassword('');
                }}
                className="btn-secondary"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={updateOnlineUserCredentials}
                disabled={onlineLoading}
                className="btn-primary disabled:opacity-60"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <Lock size={18} />
                تأیید رمز مدیریت
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError(false);
                  setPasswordInput('');
                  setPendingAction(null);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="password"
              placeholder="رمز مدیریت"
              value={passwordInput}
              onChange={e => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              className={`w-full text-center tracking-widest text-lg p-3 rounded-xl border bg-input-background focus:outline-none transition-all ${
                passwordError
                  ? 'border-rose-500 bg-rose-500/5'
                  : 'border-border focus:border-rose-500'
              }`}
              autoFocus
            />

            {passwordError && (
              <p className="text-xs text-rose-500 text-center mt-2 font-medium">
                رمز اشتباه است.
              </p>
            )}

            <button
              type="button"
              onClick={verifyPassword}
              className="w-full mt-5 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl cursor-pointer"
            >
              تأیید
            </button>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <UserPlus size={18} />
                افزودن کاربر محلی
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserName('');
                  setNewUserUsername('');
                  setNewUserAccess([]);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                className="form-input"
                placeholder="نام کاربر"
              />

              <input
                value={newUserUsername}
                onChange={e => setNewUserUsername(e.target.value)}
                className="form-input text-left"
                dir="ltr"
                placeholder="نام کاربری"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold text-muted-foreground mb-3">
                دسترسی‌های کاربر محلی
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {appModules.map(module => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => toggleAccess(module.id)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
                      newUserAccess.includes(module.id)
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    {newUserAccess.includes(module.id) && <Check size={13} />}
                    {module.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserName('');
                  setNewUserUsername('');
                  setNewUserAccess([]);
                }}
                className="btn-secondary"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleAddUser}
                className="btn-primary"
              >
                ثبت کاربر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// اکسپورت دوگانه در انتهای فایل
export { SettingsSection };
export default SettingsSection;