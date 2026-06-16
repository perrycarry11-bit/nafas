import { useEffect, useState } from 'react';
import {
  ArrowRight,
  KeyRound,
  User,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Users,
  Edit,
  Trash2,
  Search,
  X
} from 'lucide-react';

import { supabase } from '../utils/supabaseClient';
import { addActivityLog } from '../utils/activityLog';

interface Props {
  onBack: () => void;
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
  county?: string;
  province?: string;
}

// ---------------- Helper Functions ----------------

function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('پاسخی از سرور دریافت نشد. وضعیت اینترنت را بررسی کنید.'));
    }, ms);

    promise
      .then(value => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function getOnlineProfile(): OnlineProfile | null {
  try {
    const raw = localStorage.getItem('nafas_online_profile');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function getRoleLabel(role: string) {
  if (
    role === 'national_admin' ||
    role === 'country_admin' ||
    role === 'super_admin' ||
    role === 'main_admin' ||
    role === 'central_admin'
  ) {
    return 'مدیر کشوری';
  }

  if (role === 'province_admin' || role === 'province_manager') {
    return 'مدیر استان';
  }

  if (
    role === 'province_staff' ||
    role === 'county_user' ||
    role === 'county_staff' ||
    role === 'staff'
  ) {
    return 'کاربر شهرستان / مرکز';
  }

  return role || '-';
}

function extractErrorMessage(error: any) {
  if (!error) return 'خطای نامشخص رخ داد.';
  const message = String(error?.message || '');

  if (message.includes('Failed to send a request to the Edge Function')) {
    return 'درخواست به سرور ارسال نشد. مطمئن شوید Edge Function ساخته شده است.';
  }
  if (message.includes('FunctionsHttpError')) {
    return 'خطای سرور رخ داد. لاگ فانکشن را بررسی کنید.';
  }
  if (message.includes('JWT') || message.includes('Unauthorized')) {
    return 'نشست شما منقضی شده است. لطفا مجددا وارد شوید.';
  }
  return message || 'خطا در پردازش اطلاعات';
}

async function extractFunctionInvokeError(error: any) {
  try {
    const context = error?.context;
    if (context && typeof context.clone === 'function') {
      const cloned = context.clone();
      if (typeof cloned.json === 'function') {
        const body = await cloned.json();
        if (body?.error) return String(body.error);
        if (body?.message) return String(body.message);
      }
    }
  } catch {
    // ignore
  }
  return extractErrorMessage(error);
}

// ---------------- Main Component ----------------

export function ProfileSection({ onBack }: Props) {
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [managementLevel, setManagementLevel] = useState('county');
  
  const [activeTab, setActiveTab] = useState<'self' | 'users'>('self');

  // Self State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingSelf, setLoadingSelf] = useState(false);
  const [messageSelf, setMessageSelf] = useState({ text: '', type: 'info' });

  // Users State
  const [users, setUsers] = useState<OnlineProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<OnlineProfile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState({ text: '', type: 'info' });

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<OnlineProfile | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    const currentProfile = getOnlineProfile();
    setProfile(currentProfile);
    setManagementLevel(localStorage.getItem('nafas_current_management_level') || 'county');
  }, []);

  const fetchUsers = async () => {
    if (!profile || managementLevel === 'county') return;
    setLoadingUsers(true);
    try {
      let query = supabase.from('profiles').select('*').neq('id', profile.id);
      
      if (managementLevel === 'province') {
        query = query.eq('province_id', profile.province_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  async function handleSaveSelf() {
    if (!profile) return;
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      alert('لطفاً رمز عبور جدید را وارد کنید.');
      return;
    }

    if (cleanPassword.length < 6) {
      alert('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    try {
      setLoadingSelf(true);
      setMessageSelf({ text: 'در حال ذخیره رمز عبور جدید...', type: 'info' });

      const { data, error } = await withTimeout(
        supabase.functions.invoke('update-nafas-user', {
          body: { target_user_id: 'self', password: cleanPassword },
        }),
      );

      if (error) throw new Error(await extractFunctionInvokeError(error));
      if (data?.error) throw new Error(data.error);

      addActivityLog({
        action: 'تغییر رمز عبور',
        section: 'حساب کاربری',
        targetType: 'حساب کاربری',
        targetName: profile.full_name || profile.username,
        targetId: profile.username,
        details: 'رمز عبور حساب کاربری شخصی تغییر یافت.',
      });

      setPassword('');
      setMessageSelf({ text: 'رمز عبور با موفقیت تغییر کرد.', type: 'success' });
    } catch (err: any) {
      const text = extractErrorMessage(err);
      setMessageSelf({ text, type: 'error' });
    } finally {
      setLoadingSelf(false);
    }
  }

  async function handleSaveSubUser() {
    if (!editingUser) return;
    const cleanUsername = normalizeUsername(editUsername);
    const cleanPassword = editPassword.trim();

    if (!cleanUsername && !cleanPassword) {
      setEditMessage({ text: 'حداقل یکی از موارد (نام کاربری یا رمز عبور) را وارد کنید.', type: 'error' });
      return;
    }

    try {
      setLoadingEdit(true);
      setEditMessage({ text: 'در حال اعمال تغییرات کاربر...', type: 'info' });

      const { data, error } = await withTimeout(
        supabase.functions.invoke('update-nafas-user', {
          body: {
            target_user_id: editingUser.id,
            username: cleanUsername || null,
            password: cleanPassword || null,
          },
        }),
      );

      if (error) throw new Error(await extractFunctionInvokeError(error));
      if (data?.error) throw new Error(data.error);

      addActivityLog({
        action: 'ویرایش کاربر',
        section: 'مدیریت کاربران',
        targetType: 'کاربر سیستم',
        targetName: editingUser.full_name || editingUser.username,
        targetId: editingUser.username,
        details: `اطلاعات ورود کاربر تغییر یافت.`,
      });

      setEditMessage({ text: 'اطلاعات کاربر با موفقیت تازه‌سازی شد.', type: 'success' });
      fetchUsers();
      setTimeout(() => setEditingUser(null), 1500);

    } catch (err: any) {
      setEditMessage({ text: extractErrorMessage(err), type: 'error' });
    } finally {
      setLoadingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingUser) return;
    
    try {
      setLoadingDelete(true);

      const { error: rpcError } = await supabase.functions.invoke('update-nafas-user', {
        body: { target_user_id: deletingUser.id, action: 'delete' }
      });

      if (rpcError) {
         await supabase.from('profiles').delete().eq('id', deletingUser.id);
      }

      addActivityLog({
        action: 'حذف کاربر',
        section: 'مدیریت کاربران',
        targetType: 'کاربر سیستم',
        targetName: deletingUser.full_name || deletingUser.username,
        targetId: deletingUser.username,
        details: `کاربر از سیستم حذف شد.`,
      });

      fetchUsers();
      setDeletingUser(null);
      alert('کاربر با موفقیت حذف شد.');

    } catch (err: any) {
      alert('خطا در حذف کاربر: ' + extractErrorMessage(err));
    } finally {
      setLoadingDelete(false);
    }
  }

  // بررسی اینکه رشته یک UUID هست یا نه (برای جلوگیری از چاپ آیدی‌های طولانی)
  const isUUID = (str: string) => {
    if (!str) return false;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(String(str));
  };

  // تابع هوشمند برای یافتن نام مکان و فیلتر کردن UUID ها
  const getLocationDisplay = (u: any) => {
    let county = u.county_name || u.countyName;
    if (!county && u.county && !isUUID(u.county)) county = u.county;
    
    let province = u.province_name || u.provinceName;
    if (!province && u.province && !isUUID(u.province)) province = u.province;

    const safeCounty = (county && String(county) !== 'null') ? String(county) : '';
    const safeProvince = (province && String(province) !== 'null') ? String(province) : '';

    // طبق خواسته شما: اگر شهرستان وجود داشت فقط اسم شهرستان نوشته شود
    if (safeCounty) return safeCounty;
    if (safeProvince) return `استان ${safeProvince}`; // اگر شهرستان نبود لااقل استان را بگوید
    
    return 'ثبت نشده';
  };

  const filteredUsers = users.filter(u => {
    const searchStr = searchQuery.toLowerCase();
    const fullName = (u.full_name || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const loc = getLocationDisplay(u).toLowerCase();
    
    return fullName.includes(searchStr) || 
           username.includes(searchStr) ||
           loc.includes(searchStr);
  });

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in duration-500" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={onBack} className="p-2 rounded-lg text-muted-foreground hover:text-primary" type="button">
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">حساب کاربری و تنظیمات امنیتی</h2>
            <p className="text-xs text-muted-foreground mt-1">مدیریت رمز عبور شخصی و پایش کاربران زیرمجموعه</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 mt-4">
        {!profile ? (
          <section className="bg-card border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-3 text-amber-700">
              <AlertCircle size={22} className="shrink-0 mt-1" />
              <div>
                <h3 className="font-bold mb-2">حساب برخط پیدا نشد</h3>
                <p className="text-sm leading-7">برای دسترسی به این بخش، باید با حساب برخط وارد سامانه شده باشید.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Tabs for Admins */}
            {managementLevel !== 'county' && (
              <div className="flex bg-muted/40 p-1 rounded-2xl mb-6 w-full max-w-sm border border-border/50">
                <button
                  onClick={() => setActiveTab('self')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'self' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <KeyRound size={16} /> حساب من
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'users' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users size={16} /> مدیریت کاربران
                </button>
              </div>
            )}

            {/* Self Account Tab */}
            {activeTab === 'self' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <ShieldCheck className="text-primary" size={22} />
                    <div>
                      <h3 className="text-lg font-bold text-foreground">اطلاعات کاربری شما</h3>
                      <p className="text-xs text-muted-foreground mt-1">مشخصات فعلی حساب کاربری متصل به سیستم</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-1">نام کاربر</p>
                      <p className="font-bold text-foreground">{profile.full_name || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-1">نام کاربری (غیرقابل تغییر)</p>
                      <p className="font-bold text-foreground" dir="ltr">{profile.username || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-1">شهرستان / مرکز</p>
                      <p className="font-bold text-foreground">{getLocationDisplay(profile)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-1">نقش دسترسی</p>
                      <p className="font-bold text-primary">{getRoleLabel(profile.role)}</p>
                    </div>
                  </div>
                </section>

                <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <KeyRound className="text-primary" size={22} />
                    <div>
                      <h3 className="text-lg font-bold text-foreground">تغییر رمز عبور</h3>
                      <p className="text-xs text-muted-foreground mt-1">برای حفظ امنیت، رمز عبور قوی انتخاب کنید.</p>
                    </div>
                  </div>

                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-2">رمز عبور جدید</label>
                      <div className="relative">
                        <KeyRound size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          className="form-input pr-9 pl-10 text-left"
                          dir="ltr"
                          placeholder="رمز عبور جدید را وارد کنید"
                          disabled={loadingSelf}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={loadingSelf}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {messageSelf.text && (
                      <div className={`rounded-2xl border p-4 text-xs leading-6 ${
                        messageSelf.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                        messageSelf.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                        'border-border bg-muted/40 text-muted-foreground'
                      }`}>
                        {messageSelf.text}
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button onClick={handleSaveSelf} disabled={loadingSelf} type="button" className="btn-primary w-full disabled:opacity-60">
                        {loadingSelf ? <><Loader2 size={17} className="animate-spin" /> در حال ذخیره...</> : <><Save size={17} /> تازه‌سازی رمز عبور</>}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Users Management Tab */}
            {activeTab === 'users' && managementLevel !== 'county' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6 border-b border-border pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">لیست کاربران زیرمجموعه</h3>
                      <p className="text-xs text-muted-foreground mt-1">مدیریت، تغییر نام کاربری، تغییر رمز و حذف کاربران</p>
                    </div>
                    
                    <div className="relative w-full md:w-72">
                      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="جستجو نام، یوزرنیم یا مکان..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-input pr-9 text-xs py-2.5"
                      />
                    </div>
                  </div>

                  {loadingUsers ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2 size={32} className="animate-spin mb-4 text-primary" />
                      <p className="text-sm font-medium">در حال دریافت لیست کاربران...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-border rounded-2xl">
                      <Users size={32} className="mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground font-medium">هیچ کاربری یافت نشد.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right border-collapse">
                        <thead>
                          <tr className="bg-muted/50 border-y border-border text-muted-foreground font-bold">
                            <th className="px-4 py-3">نام کاربر</th>
                            <th className="px-4 py-3">نام کاربری</th>
                            <th className="px-4 py-3">شهرستان</th>
                            <th className="px-4 py-3">نقش</th>
                            <th className="px-4 py-3 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => {
                            const locationStr = getLocationDisplay(u);
                            return (
                              <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-bold text-foreground">{u.full_name || '-'}</td>
                                <td className="px-4 py-3" dir="ltr">{u.username}</td>
                                <td className={`px-4 py-3 font-medium ${locationStr === 'ثبت نشده' ? 'text-amber-600/70 text-xs' : 'text-muted-foreground'}`}>
                                  {locationStr}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold whitespace-nowrap">
                                    {getRoleLabel(u.role)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => { setEditingUser(u); setEditUsername(''); setEditPassword(''); setEditMessage({text: '', type: 'info'}); }}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors tooltip"
                                    title="ویرایش کاربر"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingUser(u)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors tooltip"
                                    title="حذف کاربر"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Edit size={18} /> ویرایش {editingUser.full_name}
              </div>
              <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">نام کاربری جدید</label>
                <div className="relative">
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="form-input pr-9 text-left"
                    dir="ltr"
                    placeholder="در صورت عدم تغییر، خالی بگذارید"
                    autoComplete="off"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 px-1">نام کاربری فعلی: <span dir="ltr">{editingUser.username}</span></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">رمز عبور جدید</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="form-input pr-9 pl-10 text-left"
                    dir="ltr"
                    placeholder="در صورت عدم تغییر، خالی بگذارید"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {editMessage.text && (
                <div className={`rounded-xl p-3 text-xs leading-6 border ${
                  editMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                  editMessage.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                  'border-border bg-muted/40 text-muted-foreground'
                }`}>
                  {editMessage.text}
                </div>
              )}

              <button onClick={handleSaveSubUser} disabled={loadingEdit} className="w-full btn-primary mt-2">
                {loadingEdit ? <><Loader2 size={17} className="animate-spin" /> در حال ذخیره...</> : 'ذخیره تغییرات کاربر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">حذف دائمی کاربر</h3>
            <p className="text-sm text-muted-foreground leading-7 mb-6">
              آیا از حذف حساب کاربری «{deletingUser.full_name}» اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingUser(null)} 
                disabled={loadingDelete}
                className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={handleConfirmDelete} 
                disabled={loadingDelete}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
              >
                {loadingDelete ? <Loader2 size={16} className="animate-spin" /> : 'بله، حذف کن'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileSection;