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
  role: 'national_admin' | 'province_admin' | 'province_staff';
  province_id: string | null;
  county_id?: string | null;
  province_name?: string;
  province_code?: string;
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
];

const countyAccessModules = [
  { id: 'mothers', label: 'مادران' },
  { id: 'benefactors', label: 'خیرین' },
  { id: 'doctors', label: 'پزشکان' },
  { id: 'reports', label: 'گزارش‌ها' },
  { id: 'sms', label: 'پنل پیامکی' },
  { id: 'activities', label: 'فعالیت‌های نفس' },
  { id: 'referrals', label: 'معرفی‌نامه' },
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

function isOnlineManager(profile: OnlineProfile | null) {
  return profile?.role === 'national_admin' || profile?.role === 'province_admin';
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

export function SettingsSection({
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

  const canManageOnlineUsers = isOnlineManager(onlineProfile);
  const isNational = onlineProfile?.role === 'national_admin';
  const isProvinceAdmin = onlineProfile?.role === 'province_admin';

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
        setOnlineMessage('برای مدیریت آنلاین کاربران، ابتدا با حساب آنلاین وارد شوید.');
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

      if (profileToUse.role === 'province_admin') {
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

      if (profileToUse.role === 'province_admin') {
        usersQuery = usersQuery.eq('province_id', profileToUse.province_id);
      }

      const usersResult = await usersQuery;
      if (usersResult.error) throw usersResult.error;

      const rawUsers = (Array.isArray(usersResult.data)
        ? usersResult.data
        : []) as unknown as OnlineUserRow[];

      const visibleUsers =
        profileToUse.role === 'national_admin'
          ? rawUsers.filter(user => user.role === 'province_admin')
          : rawUsers.filter(user => user.role === 'province_staff');

      setOnlineUsers(visibleUsers);

      setOnlineMessage('اطلاعات کاربران به‌روزرسانی شد.');
    } catch (error: any) {
      console.error(error);
      setOnlineMessage(error?.message || 'خطا در دریافت اطلاعات آنلاین');
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
      username: newUserUsername.toLowerCase().trim(),
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
      alert('فقط مدیر تهران می‌تواند مدیر استان بسازد.');
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

      const { data, error } = await supabase.functions.invoke('create-nafas-user', {
        body: {
          role: 'province_admin',
          full_name: provinceAdminFullName.trim(),
          username: provinceAdminUsername.trim().toLowerCase(),
          password: provinceAdminPassword.trim(),
          province_id: provinceAdminProvinceId,
          is_active: provinceAdminActive,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      addActivityLog({
        action: 'ایجاد مدیر استان',
        section: 'تنظیمات',
        targetType: 'کاربر آنلاین',
        targetName: provinceAdminFullName.trim(),
        targetId: provinceAdminUsername.trim().toLowerCase(),
        details: `مدیر استان با نام کاربری ${provinceAdminUsername.trim().toLowerCase()} ایجاد شد.`,
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

      const { data, error } = await supabase.functions.invoke('create-nafas-user', {
        body: {
          role: 'province_staff',
          full_name: countyFullName.trim(),
          username: countyUsername.trim().toLowerCase(),
          password: countyPassword.trim(),
          province_id: provinceId,
          county_id: countyId || null,
          county_name: countyId ? '' : countyNameManual.trim(),
          access: countyAccess,
          is_active: countyUserActive,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      addActivityLog({
        action: 'ایجاد کاربر شهرستان',
        section: 'تنظیمات',
        targetType: 'کاربر آنلاین',
        targetName: countyFullName.trim(),
        targetId: countyUsername.trim().toLowerCase(),
        details: `کاربر ${countyFullName.trim()} با نام کاربری ${countyUsername.trim().toLowerCase()} ایجاد شد.`,
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
      (isNational && user.role === 'province_admin') ||
      (isProvinceAdmin && user.role === 'province_staff');

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
        targetType: 'کاربر آنلاین',
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

  const handleExportBackup = () => {
    const backupData: any = {};

    [
      'nafas_mothers',
      'nafas_benefactors',
      'nafas_doctors',
      'nafas_activities',
      'nafas_users_list',
      'nafas_activity_logs',
      'nafas_sms_history',
      'nafas_sms_username',
      'nafas_sms_password',
      'nafas_sms_sender',
      'nafas_openai_api_key',
      'nafas_openai_model',
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-500" size={22} />

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {isNational
                    ? 'مدیریت مدیران استان‌ها'
                    : isProvinceAdmin
                      ? 'مدیریت شهرستان‌ها و کاربران شهرستان'
                      : 'مدیریت کاربران'}
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  {isNational
                    ? 'مدیر تهران فقط می‌تواند برای هر استان مدیر استان بسازد.'
                    : isProvinceAdmin
                      ? 'مدیر استان می‌تواند شهرستان و کاربر شهرستان را با سطح دسترسی مشخص بسازد.'
                      : 'این بخش برای حساب شما فعال نیست.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => loadOnlineManagementData()}
              type="button"
              className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/15"
            >
              <RefreshCw size={15} className={onlineLoading ? 'animate-spin' : ''} />
              به‌روزرسانی
            </button>
          </div>

          {!canManageOnlineUsers ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 p-4 text-sm leading-7 flex gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              این بخش فقط برای مدیر تهران و مدیر استان فعال است.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                {onlineMessage || 'آماده مدیریت کاربران آنلاین.'}
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
                    مدیر استان ساخته‌شده دسترسی کامل دارد، اما فقط اطلاعات استان خودش را می‌بیند.
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
                        <label className="block text-xs font-bold text-foreground mb-3 flex items-center gap-2">
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
                <div className="px-4 py-3 border-b border-border bg-muted/40 font-bold text-foreground">
                  {tableTitle}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-muted/50">
                      <tr>
                        {[
                          'نام',
                          'نام کاربری',
                          'نقش',
                          'استان',
                          'شهرستان',
                          'دسترسی',
                          'وضعیت',
                          'عملیات',
                        ].map(h => (
                          <th key={h} className="px-4 py-3 text-right text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {onlineUsers.map(user => (
                        <tr key={user.id} className="border-t border-border">
                          <td className="px-4 py-3 font-bold text-foreground">
                            {user.full_name}
                          </td>

                          <td className="px-4 py-3" dir="ltr">
                            @{user.username}
                          </td>

                          <td className="px-4 py-3">
                            {user.role === 'national_admin'
                              ? 'مدیر تهران'
                              : user.role === 'province_admin'
                                ? 'مدیر استان'
                                : 'کاربر شهرستان'}
                          </td>

                          <td className="px-4 py-3">
                            {getRelationName(user.provinces)}
                          </td>

                          <td className="px-4 py-3">
                            {getRelationName(user.counties)}
                          </td>

                          <td className="px-4 py-3">
                            {Array.isArray(user.access)
                              ? `${user.access.length} بخش`
                              : '۰ بخش'}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                                user.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              <CheckCircle2 size={12} />
                              {user.is_active ? 'فعال' : 'غیرفعال'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {((isNational && user.role === 'province_admin') ||
                              (isProvinceAdmin && user.role === 'province_staff')) && (
                              <button
                                onClick={() => toggleOnlineUserActive(user)}
                                type="button"
                                className="text-primary hover:underline text-xs font-bold"
                              >
                                {user.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {onlineUsers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                            هنوز کاربری برای نمایش وجود ندارد.
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
          <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Shield className="text-emerald-500" size={20} />

              <h3 className="text-lg font-bold text-foreground">
                مدیریت محلی اعضا و کنترل سطح دسترسی
              </h3>
            </div>

            {safeRole === 'admin' && (
              <button
                onClick={() => handleActionRequest('add')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                type="button"
              >
                <UserPlus size={16} />
                افزودن کاربر همکار محلی
              </button>
            )}
          </div>

          <div className="space-y-4">
            {users.map(user => (
              <div
                key={user.id}
                className={`flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 border rounded-xl transition-all ${
                  safeRole === 'staff' && activeUser?.id === user.id
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                    <User size={24} />
                  </div>

                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      {user.name}

                      {user.role === 'admin' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/30">
                          مدیر اصلی
                        </span>
                      )}

                      {safeRole === 'staff' && activeUser?.id === user.id && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">
                          حساب فعلی شما
                        </span>
                      )}
                    </h4>

                    <p className="text-sm text-muted-foreground" dir="ltr">
                      @{user.username}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs bg-muted border border-border px-3 py-1 rounded-full text-foreground hidden sm:block">
                    {user.role === 'admin'
                      ? 'دسترسی کامل'
                      : `${user.access.length} بخش مجاز`}
                  </span>

                  {safeRole === 'admin' && user.role !== 'admin' && (
                    <>
                      <button
                        onClick={() =>
                          handleActionRequest('switchToStaff', undefined, user)
                        }
                        className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-primary/20"
                        type="button"
                      >
                        <UserCheck size={14} />
                        سوییچ به این کاربر
                      </button>

                      <button
                        onClick={() => handleActionRequest('delete', user.id, user)}
                        className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg"
                        title="حذف"
                        type="button"
                      >
                        <Trash size={18} />
                      </button>
                    </>
                  )}

                  {safeRole === 'staff' && activeUser?.id === user.id && (
                    <button
                      onClick={() => handleActionRequest('switchToAdmin')}
                      className="flex items-center gap-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-500/20"
                      type="button"
                    >
                      <LogOut size={14} />
                      بازگشت به مدیریت با رمز
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-primary" size={20} />

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  لاگ امنیتی و گزارش فعالیت کاربران
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  ثبت خودکار کارهای مدیر و کاربران همکار در سیستم
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportLogsCSV}
                type="button"
                className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-xl text-xs font-bold hover:bg-primary/15"
              >
                <FileDown size={15} />
                خروجی CSV
              </button>

              {safeRole === 'admin' && (
                <button
                  onClick={() => handleActionRequest('clearLogs')}
                  type="button"
                  className="flex items-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-500/15"
                >
                  <Eraser size={15} />
                  پاک کردن لاگ‌ها
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <div className="relative md:col-span-2">
              <Search
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <input
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="جستجو با نام کاربر، عملیات، بخش، کد پرونده..."
                className="form-input pr-9"
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <StatBox
              label="کل لاگ‌ها"
              value={activityLogs.length}
              color="text-primary"
            />

            <StatBox
              label="عملیات مدیر"
              value={activityLogs.filter(log => log.role === 'admin').length}
              color="text-emerald-600"
            />

            <StatBox
              label="عملیات کاربران"
              value={activityLogs.filter(log => log.role === 'staff').length}
              color="text-violet-600"
            />

            <StatBox
              label="نتایج فیلتر"
              value={filteredLogs.length}
              color="text-rose-600"
            />
          </div>

          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-muted/60">
                  <tr>
                    {[
                      'تاریخ',
                      'ساعت',
                      'کاربر',
                      'نقش',
                      'بخش',
                      'عملیات',
                      'موضوع',
                      'کد پرونده',
                      'توضیحات',
                    ].map(item => (
                      <th
                        key={item}
                        className="px-4 py-3 text-right text-muted-foreground font-bold"
                      >
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={`border-t border-border hover:bg-muted/30 ${
                        index % 2 === 0 ? '' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{log.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{log.time}</td>

                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-foreground">{log.userName}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">
                            @{log.username}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                            log.role === 'admin'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          <ShieldCheck size={12} />
                          {log.role === 'admin' ? 'مدیر' : 'کارمند'}
                        </span>
                      </td>

                      <td className="px-4 py-3">{log.section}</td>
                      <td className="px-4 py-3 font-bold text-primary">{log.action}</td>
                      <td className="px-4 py-3">{log.targetName}</td>

                      <td className="px-4 py-3">
                        {log.trackingCode ? (
                          <span
                            dir="ltr"
                            className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-bold"
                          >
                            {log.trackingCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground max-w-[260px]">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        هنوز گزارشی برای نمایش وجود ندارد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <Sun className="text-primary" size={20} />

            <h3 className="text-lg font-bold text-foreground">
              ظاهر و نمایش
            </h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">حالت نمایش</p>

              <div className="flex bg-muted p-1 rounded-xl border border-border">
                <button
                  onClick={() => handleThemeChange(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    !darkMode
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                  type="button"
                >
                  <Sun size={16} />
                  روشن
                </button>

                <button
                  onClick={() => handleThemeChange(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    darkMode
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                  type="button"
                >
                  <Moon size={16} />
                  تاریک
                </button>
              </div>
            </div>

            <div className="pt-4">
              <p className="font-semibold text-foreground mb-4">
                اندازه فونت نرم‌افزار
              </p>

              <input
                type="range"
                min="12"
                max="20"
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <Download className="text-primary" size={20} />

            <h3 className="text-lg font-bold text-foreground">
              بکاپ و بازیابی اطلاعات سیستم
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl hover:border-primary/50 text-right"
              type="button"
            >
              <div>
                <p className="font-bold text-foreground">پشتیبان‌گیری</p>
                <p className="text-xs text-muted-foreground mt-1">
                  دانلود فایل جامع داده‌ها همراه با لاگ فعالیت‌ها
                </p>
              </div>

              <Download className="text-primary" size={20} />
            </button>

            <label className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl hover:border-primary/50 text-right cursor-pointer">
              <div>
                <p className="font-bold text-foreground">بازیابی اطلاعات</p>
                <p className="text-xs text-muted-foreground mt-1">
                  بارگذاری فایل JSON بکاپ
                </p>
              </div>

              <Upload className="text-primary" size={20} />

              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </section>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Lock size={18} />
                تاییدیه امنیتی
              </div>

              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-muted-foreground hover:text-foreground"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              برای انجام این عملیات، رمز عبور ارشد را وارد کنید.
            </p>

            <input
              type="password"
              placeholder="••••"
              value={passwordInput}
              onChange={e => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              className={`w-full text-center tracking-widest text-lg p-3 rounded-xl border bg-input-background focus:outline-none transition-all ${
                passwordError
                  ? 'border-rose-500'
                  : 'border-border focus:border-primary'
              }`}
              autoFocus
            />

            {passwordError && (
              <p className="text-xs text-rose-500 text-center mt-2 font-medium">
                رمز وارد شده اشتباه است.
              </p>
            )}

            <button
              onClick={verifyPassword}
              className="w-full mt-5 bg-primary text-white font-bold py-3 rounded-xl"
              type="button"
            >
              تایید و ادامه
            </button>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus size={20} />
                تعریف کاربر محلی جدید
              </h3>

              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-2 rounded-full hover:bg-muted"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                placeholder="نام و نام خانوادگی"
                className="w-full p-3 rounded-xl border border-border bg-input-background text-foreground outline-none text-sm"
              />

              <input
                type="text"
                dir="ltr"
                value={newUserUsername}
                onChange={e => setNewUserUsername(e.target.value)}
                placeholder="نام کاربری"
                className="w-full p-3 rounded-xl border border-border bg-input-background text-foreground outline-none text-sm text-left"
              />

              <div className="pt-2">
                <label className="block text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                  <Shield size={14} className="text-emerald-500" />
                  تعیین بخش‌های مجاز:
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {appModules.map(mod => {
                    const hasAccess = newUserAccess.includes(mod.id);

                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggleAccess(mod.id)}
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

              <button
                onClick={handleAddUser}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl"
                type="button"
              >
                ثبت کاربر محلی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-muted/40 border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}