import { useEffect, useState, useMemo, useRef } from 'react';
import {
  ArrowRight,
  LibraryBig,
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  BookOpen,
  Scale,
  Baby,
  PlusCircle,
  Search,
  AlertCircle,
  RefreshCw,
  Pin,
  Download,
  Building2,
  MapPin,
  Loader2,
  CheckCheck,
  Clock,
  User,
  Trash2,
  Pencil,
  UploadCloud,
  Link,
  FileUp,
} from 'lucide-react';

import { supabase } from '../utils/supabaseClient';
import { addActivityLog } from '../utils/activityLog';

interface Props {
  onBack: () => void;
}

type ManagementLevel = 'country' | 'province' | 'county';

interface OnlineProfile {
  id: string;
  full_name: string;
  username: string;
  role: string;
  province_id: string | null;
  county_id?: string | null;
  province_name?: string;
  county_name?: string;
  access: string[];
  is_active: boolean;
}

interface CulturalResource {
  id: string;
  local_id?: string;
  category: string;
  title: string;
  description: string | null;
  file_url: string | null;
  cover_url: string | null;
  visibility: 'all' | 'province' | 'county';
  province_id: string | null;
  county_id: string | null;
  created_by: string;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
  sync_status?: 'synced' | 'pending';
  
  profiles?: { full_name: string } | null;
  provinces?: { name: string } | null;
  counties?: { name: string } | null;
}

const CATEGORIES = [
  { id: 'بخش‌نامه‌ها', icon: FileText },
  { id: 'آموزشی', icon: BookOpen },
  { id: 'پوستر', icon: ImageIcon },
  { id: 'موشن‌کلیپ', icon: Video },
  { id: 'موسیقی', icon: Music },
  { id: 'موارد قانونی', icon: Scale },
  { id: 'قانون جوانی جمعیت', icon: Baby },
];

const CACHE_KEY_CULTURAL = 'nafas_cultural_resources_v1';
const PENDING_CULTURAL_KEY = 'nafas_pending_cultural_resources';
const CACHE_KEY_CENTERS = 'nafas_centers_cache_v1';

function getOnlineProfile(): OnlineProfile | null {
  try {
    const raw = localStorage.getItem('nafas_online_profile');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getManagementLevel(profile: OnlineProfile | null): ManagementLevel {
  if (!profile) return 'county';
  const role = String(profile.role || '').trim();

  if (role === 'national_admin' || role === 'country_admin' || role === 'super_admin' || role === 'main_admin' || role === 'central_admin') {
    return 'country';
  }
  if (role === 'province_admin' || role === 'province_manager') {
    return 'province';
  }
  return 'county';
}

function generateLocalId() {
  return `local_cult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getFileType(url?: string | null) {
  if (!url) return 'none';
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  return 'document';
}

function CulturalResourcesSection({ onBack }: Props) {
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [managementLevel, setManagementLevel] = useState<ManagementLevel>('county');

  const [activeTab, setActiveTab] = useState<'browse' | 'add'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [resources, setResources] = useState<CulturalResource[]>([]);
  const [pendingResources, setPendingResources] = useState<CulturalResource[]>([]);

  const [provinces, setProvinces] = useState<{id: string, name: string}[]>([]);
  const [counties, setCounties] = useState<{id: string, province_id: string, name: string}[]>([]);

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [source, setSource] = useState<'online' | 'cache' | 'local'>('local');

  // متغیرهای فرم
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0].id);
  const [formDescription, setFormDescription] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);

  // متغیرهای مربوط به فایل و آپلود
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coverUploadMethod, setCoverUploadMethod] = useState<'file' | 'link'>('link');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentProfile = getOnlineProfile();
    setProfile(currentProfile);
    const level = getManagementLevel(currentProfile);
    setManagementLevel(level);

    loadCentersCache();
    loadPendingResources();
    loadResourcesData(currentProfile);
  }, []);

  function loadCentersCache() {
    try {
      const cache = localStorage.getItem(CACHE_KEY_CENTERS);
      if (cache) {
        const parsed = JSON.parse(cache);
        setProvinces(parsed.provinces || []);
        setCounties(parsed.counties || []);
      }
    } catch {
      // ignore
    }
  }

  function loadPendingResources() {
    try {
      const raw = localStorage.getItem(PENDING_CULTURAL_KEY);
      if (raw) {
        setPendingResources(JSON.parse(raw));
      }
    } catch {
      setPendingResources([]);
    }
  }

  function savePendingResources(items: CulturalResource[]) {
    localStorage.setItem(PENDING_CULTURAL_KEY, JSON.stringify(items));
    setPendingResources(items);
  }

  async function syncPendingResources() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (pendingResources.length === 0) return;

    const remainingPending: CulturalResource[] = [];

    for (const item of pendingResources) {
      try {
        const { error } = await supabase.from('cultural_resources').insert({
          category: item.category,
          title: item.title,
          description: item.description,
          file_url: item.file_url,
          cover_url: item.cover_url,
          visibility: 'all',
          province_id: item.province_id,
          county_id: item.county_id,
          created_by: item.created_by,
          is_active: item.is_active,
          is_pinned: item.is_pinned,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      } catch (err) {
        console.error('Error syncing pending resource:', err);
        remainingPending.push(item);
      }
    }

    savePendingResources(remainingPending);
    if (remainingPending.length === 0) {
      loadResourcesData();
    }
  }

  async function loadResourcesData(currentProfile = profile) {
    if (!currentProfile) return;

    const fallbackLocal = () => {
      try {
        const cache = localStorage.getItem(CACHE_KEY_CULTURAL);
        if (cache) {
          setResources(JSON.parse(cache));
          setSource('cache');
        }
      } catch {
        setResources([]);
        setSource('local');
      }
      setMessageText('اتصال برخط برقرار نشد. در حال نمایش آخرین فایل‌های ذخیره‌شده.');
    };

    try {
      setLoading(true);
      setMessageText('در حال دریافت اطلاعات مرکز اسناد...');

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        fallbackLocal();
        return;
      }

      await syncPendingResources();

      const { data, error } = await supabase
        .from('cultural_resources')
        .select(`
          *,
          profiles (full_name),
          provinces (name),
          counties (name)
        `)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(r => ({ 
        ...r, 
        sync_status: 'synced',
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
        provinces: Array.isArray(r.provinces) ? r.provinces[0] : r.provinces,
        counties: Array.isArray(r.counties) ? r.counties[0] : r.counties,
      }));
      
      setResources(formatted);
      localStorage.setItem(CACHE_KEY_CULTURAL, JSON.stringify(formatted));
      setSource('online');
      setMessageText('فایل‌ها با موفقیت دریافت شدند.');
    } catch (err) {
      console.error(err);
      fallbackLocal();
    } finally {
      setLoading(false);
    }
  }

  // تابع آپلود مستقیم فایل به Storage
  async function uploadFileToSupabase(file: File, folder: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('nafas_media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`خطا در آپلود فایل: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('nafas_media')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  async function handleSaveResource() {
    if (!profile) return;
    if (!formTitle.trim()) {
      alert('عنوان محتوا الزامی است.');
      return;
    }

    if (uploadMethod === 'file' && !selectedFile && !formFileUrl && !editingId) {
      alert('لطفاً فایلی را برای آپلود انتخاب کنید یا روش را روی وارد کردن لینک قرار دهید.');
      return;
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline && ((uploadMethod === 'file' && selectedFile) || (coverUploadMethod === 'file' && selectedCoverFile))) {
      alert('برای آپلود مستقیم فایل از سیستم، باید به اینترنت متصل باشید. در حالت برون خط (آفلاین) فقط می‌توانید لینک مستقیم را وارد کنید.');
      return;
    }

    setIsSaving(true);
    setMessageText('در حال آماده‌سازی و آپلود فایل...');

    try {
      let finalFileUrl = formFileUrl.trim();
      let finalCoverUrl = formCoverUrl.trim();

      if (uploadMethod === 'file' && selectedFile) {
        setMessageText('در حال آپلود فایل اصلی (ممکن است چند دقیقه طول بکشد)...');
        finalFileUrl = await uploadFileToSupabase(selectedFile, 'files');
      }

      if (coverUploadMethod === 'file' && selectedCoverFile) {
        setMessageText('در حال آپلود تصویر کاور...');
        finalCoverUrl = await uploadFileToSupabase(selectedCoverFile, 'covers');
      }

      const resourceData = {
        category: formCategory,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        file_url: finalFileUrl || null,
        cover_url: finalCoverUrl || null,
        visibility: 'all',
        province_id: profile.province_id || null,
        county_id: profile.county_id || null,
        created_by: profile.id,
        is_active: true,
        is_pinned: formIsPinned,
        updated_at: new Date().toISOString(),
      };

      if (!isOffline) {
        if (editingId) {
          const { error } = await supabase
            .from('cultural_resources')
            .update(resourceData)
            .eq('id', editingId)
            .eq('created_by', profile.id);

          if (error) throw error;
          
          addActivityLog({
            action: 'ویرایش فایل در مرکز اسناد',
            section: 'مرکز اسناد',
            targetType: 'محتوا',
            targetName: resourceData.title,
            details: `فایل با عنوان ${resourceData.title} ویرایش شد.`,
          });
          
          alert('فایل با موفقیت ویرایش شد.');
        } else {
          const { error } = await supabase.from('cultural_resources').insert({
            ...resourceData,
            created_at: new Date().toISOString(),
          });

          if (error) throw error;

          addActivityLog({
            action: 'آپلود فایل در مرکز اسناد',
            section: 'مرکز اسناد',
            targetType: 'محتوا',
            targetName: resourceData.title,
            details: `یک فایل جدید در دسته ${resourceData.category} آپلود شد.`,
          });
          
          alert('فایل با موفقیت ثبت شد.');
        }

        resetForm();
        setActiveTab('browse');
        loadResourcesData();
      } else {
        // Offline Saving logic
        const newResource: CulturalResource = {
          id: generateLocalId(),
          local_id: generateLocalId(),
          ...resourceData,
          visibility: 'all',
          created_at: new Date().toISOString(),
          sync_status: 'pending',
          profiles: { full_name: profile.full_name },
          provinces: profile.province_name ? { name: profile.province_name } : null,
          counties: profile.county_name ? { name: profile.county_name } : null,
        };

        const newPending = [newResource, ...pendingResources];
        savePendingResources(newPending);
        setResources([newResource, ...resources]);

        alert('شما برون خط (آفلاین) هستید. فایل ذخیره شد و پس از اتصال به اینترنت خودکار آپلود می‌شود.');
        resetForm();
        setActiveTab('browse');
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'خطا در ثبت اطلاعات.');
      setMessageText('خطا در عملیات!');
    } finally {
      setIsSaving(false);
      setMessageText('');
    }
  }

  async function handleDeleteResource(id: string) {
    if (!profile) return;
    if (!window.confirm('آیا از حذف این فایل اطمینان دارید؟')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('cultural_resources')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('created_by', profile.id);

      if (error) throw error;

      addActivityLog({
        action: 'حذف فایل از مرکز اسناد',
        section: 'مرکز اسناد',
        targetType: 'محتوا',
        targetName: 'فایل حذف شده',
        details: 'یک فایل توسط سازنده آن حذف شد.',
      });

      alert('فایل با موفقیت حذف شد.');
      loadResourcesData();
    } catch (err: any) {
      console.error(err);
      alert('خطا در حذف فایل.');
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(resource: CulturalResource) {
    setEditingId(resource.id);
    setFormTitle(resource.title);
    setFormCategory(resource.category);
    setFormDescription(resource.description || '');
    setFormFileUrl(resource.file_url || '');
    setFormCoverUrl(resource.cover_url || '');
    setFormIsPinned(resource.is_pinned);
    setUploadMethod('link'); // Default to link when editing so they don't have to reupload
    setCoverUploadMethod('link');
    setActiveTab('add');
  }

  function resetForm() {
    setEditingId(null);
    setFormTitle('');
    setFormCategory(CATEGORIES[0].id);
    setFormDescription('');
    setFormFileUrl('');
    setFormCoverUrl('');
    setFormIsPinned(false);
    setSelectedFile(null);
    setSelectedCoverFile(null);
    setUploadMethod('file');
    setCoverUploadMethod('link');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  const allDisplayedResources = useMemo(() => {
    const onlineRes = resources;
    const offlineRes = pendingResources.filter(pr => !onlineRes.find(or => or.local_id === pr.local_id));
    
    let combined = [...offlineRes, ...onlineRes].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (selectedCategory !== 'all') {
      combined = combined.filter(r => r.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      combined = combined.filter(r => r.title.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)));
    }

    return combined;
  }, [resources, pendingResources, selectedCategory, searchQuery]);

  const MediaViewer = ({ url, cover }: { url: string, cover?: string | null }) => {
    const type = getFileType(url);
    
    if (type === 'video') {
      return (
        <video controls poster={cover || undefined} className="w-full h-40 object-cover bg-black" preload="metadata">
          <source src={url} />
          مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
        </video>
      );
    }
    if (type === 'audio') {
      return (
        <div className="w-full h-40 bg-muted/30 flex flex-col items-center justify-center p-4 border-b border-border relative">
          {cover && <img src={cover} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
          <Music size={40} className="text-primary/60 mb-3 z-10" />
          <audio controls className="w-full h-10 z-10">
            <source src={url} />
          </audio>
        </div>
      );
    }
    if (type === 'image') {
      return (
        <div className="h-40 w-full overflow-hidden bg-muted/20 border-b border-border">
          <img src={url} alt="تصویر" className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      );
    }
    
    return (
      <div className="h-40 w-full overflow-hidden bg-muted/30 border-b border-border relative flex items-center justify-center">
        {cover ? (
          <img src={cover} alt="کاور" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="text-center text-muted-foreground/40 flex flex-col items-center gap-2">
            <FileText size={40} />
            <span className="text-[10px] font-bold">فایل سند</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in duration-500" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg text-muted-foreground hover:text-primary" type="button">
              <ArrowRight size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-foreground">مرکز اسناد و چندرسانه‌ای</h2>
              <p className="text-xs text-muted-foreground mt-1">مشاهده و اشتراک‌گذاری عمومی فایل‌ها، ویدیوها و اسناد بین مراکز</p>
            </div>
          </div>

          <button onClick={() => loadResourcesData()} disabled={loading} className="btn-secondary disabled:opacity-60">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تازه‌سازی
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 mt-4">
        {messageText && (
          <div className={`mb-6 rounded-2xl border p-4 text-xs font-bold flex items-center gap-2 ${
            source === 'online' || isSaving ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
            {messageText}
          </div>
        )}

        <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden mb-6">
          <div className="flex border-b border-border bg-muted/20">
            <button
              onClick={() => { setActiveTab('browse'); setEditingId(null); }}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'browse' ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <LibraryBig size={18} />
              آرشیو فایل‌ها
            </button>
            <button
              onClick={() => { setActiveTab('add'); resetForm(); }}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'add' ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <PlusCircle size={18} />
              {editingId ? 'ویرایش فایل' : 'آپلود و انتشار فایل جدید'}
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'browse' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${selectedCategory === 'all' ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                    >
                      همه موارد
                    </button>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-colors ${selectedCategory === cat.id ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                      >
                        <cat.icon size={14} />
                        {cat.id}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="جستجو در عنوان یا توضیحات..."
                      className="form-input pr-9 w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {allDisplayedResources.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-muted-foreground text-sm border-2 border-dashed border-border rounded-2xl">
                      <LibraryBig size={40} className="mx-auto mb-4 opacity-20" />
                      فایلی در این دسته یافت نشد.
                    </div>
                  ) : (
                    allDisplayedResources.map(resource => {
                      const CatIcon = CATEGORIES.find(c => c.id === resource.category)?.icon || FileText;
                      
                      const uploaderName = resource.profiles?.full_name || 'کاربر سیستم';
                      const locationName = resource.counties?.name 
                        ? `شهرستان ${resource.counties.name}`
                        : resource.provinces?.name 
                          ? `استان ${resource.provinces.name}`
                          : 'مدیریت کشوری';
                      
                      const isOwner = profile?.id === resource.created_by;
                      
                      return (
                        <div key={resource.id} className="group border border-border rounded-2xl overflow-hidden bg-card hover:border-primary/30 transition-all flex flex-col h-full shadow-sm hover:shadow-md relative">
                          {resource.is_pinned && <div className="absolute top-3 right-3 z-10 bg-rose-500 text-white p-1.5 rounded-full shadow-md"><Pin size={14} /></div>}
                          
                          <MediaViewer url={resource.file_url || ''} cover={resource.cover_url} />
                          
                          <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                              <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1">
                                <CatIcon size={12} /> {resource.category}
                              </span>
                              
                              {isOwner && (
                                <div className="flex gap-1">
                                  <button onClick={() => handleEditClick(resource)} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="ویرایش">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => handleDeleteResource(resource.id)} className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors" title="حذف">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <h4 className="font-bold text-foreground text-sm mb-2 line-clamp-2 leading-7">{resource.title}</h4>
                            <p className="text-xs text-muted-foreground leading-6 line-clamp-3 mb-4 flex-1">{resource.description || 'بدون توضیحات'}</p>
                            
                            <div className="bg-muted/40 p-3 rounded-xl mb-4">
                              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><User size={12}/> آپلود توسط: {uploaderName}</p>
                              <p className="text-[10px] font-bold text-foreground flex items-center gap-1"><MapPin size={12} className="text-primary"/> {locationName}</p>
                            </div>
                            
                            <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
                              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                <Clock size={11} /> {new Date(resource.created_at).toLocaleDateString('fa-IR')}
                              </span>
                              
                              {resource.file_url ? (
                                <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1 shadow-sm transition-all cursor-pointer">
                                  <Download size={13} /> دریافت فایل
                                </a>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/50">فایلی پیوست نشده</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'add' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-primary/5 text-primary border border-primary/20 rounded-2xl p-4 text-xs leading-6 mb-4">
                  <strong>نکته مهم:</strong> فایلی که آپلود می‌کنید در آرشیو مرکزی قرار می‌گیرد و تمام استان‌ها و شهرستان‌ها می‌توانند از آن استفاده کنند. نام مرکز شما به عنوان تهیه‌کننده نمایش داده می‌شود.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-muted-foreground mb-2">عنوان فایل *</label>
                    <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="form-input" placeholder="مثال: موشن گرافیک آموزشی روش‌های نوین" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-2">دسته‌بندی *</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="form-input">
                      {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.id}</option>)}
                    </select>
                  </div>

                  <div className="flex items-end pb-2">
                    {(managementLevel === 'country' || managementLevel === 'province') && (
                      <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer bg-muted/40 p-3 rounded-xl border border-border w-full">
                        <input type="checkbox" checked={formIsPinned} onChange={e => setFormIsPinned(e.target.checked)} className="accent-primary w-4 h-4" />
                        <Pin size={16} className="text-rose-500" />
                        پین در بالای لیست
                      </label>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-muted-foreground mb-2">توضیحات و جزئیات</label>
                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className="form-input min-h-[100px] resize-y" placeholder="شرح مختصری درباره این فایل یا ویدیو بنویسید..." />
                  </div>
                  
                  {/* بخش آپلود فایل اصلی */}
                  <div className="md:col-span-2 border border-border rounded-2xl p-4 bg-muted/10">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-xs font-bold text-foreground">بارگذاری فایل اصلی (ویدیو، تصویر، صوت یا سند) *</label>
                      <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => setUploadMethod('file')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${uploadMethod === 'file' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          <UploadCloud size={14} /> انتخاب از سیستم
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMethod('link')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${uploadMethod === 'link' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          <Link size={14} /> وارد کردن لینک
                        </button>
                      </div>
                    </div>

                    {uploadMethod === 'file' ? (
                      <div className="relative border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-background hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <FileUp size={30} className="text-muted-foreground/50" />
                        {selectedFile ? (
                          <div className="text-center">
                            <p className="text-sm font-bold text-primary" dir="ltr">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} مگابایت</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm font-bold text-foreground mb-1">برای انتخاب فایل کلیک کنید</p>
                            <p className="text-xs text-muted-foreground">پشتیبانی از فیلم، عکس، صدا و اسناد (PDF, Word)</p>
                          </div>
                        )}
                        <input type="file" className="hidden" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                      </div>
                    ) : (
                      <div className="relative">
                        <Download size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="url" value={formFileUrl} onChange={e => setFormFileUrl(e.target.value)} className="form-input text-left pl-9" dir="ltr" placeholder="https://domain.com/file.mp4" />
                      </div>
                    )}
                  </div>

                  {/* بخش آپلود کاور */}
                  <div className="md:col-span-2 border border-border rounded-2xl p-4 bg-muted/10">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-xs font-bold text-foreground">کاور فایل یا ویدیو (اختیاری)</label>
                      <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => setCoverUploadMethod('file')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${coverUploadMethod === 'file' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          <UploadCloud size={14} /> از سیستم
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverUploadMethod('link')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${coverUploadMethod === 'link' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          <Link size={14} /> لینک مستقیم
                        </button>
                      </div>
                    </div>

                    {coverUploadMethod === 'file' ? (
                      <div className="flex items-center gap-4">
                        <button type="button" onClick={() => coverInputRef.current?.click()} className="btn-secondary px-4 py-2 flex items-center gap-2">
                          <ImageIcon size={16} /> انتخاب عکس کاور
                        </button>
                        <span className="text-xs text-muted-foreground font-bold" dir="ltr">{selectedCoverFile ? selectedCoverFile.name : 'عکسی انتخاب نشده'}</span>
                        <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={e => setSelectedCoverFile(e.target.files?.[0] || null)} />
                      </div>
                    ) : (
                      <div className="relative">
                        <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="url" value={formCoverUrl} onChange={e => setFormCoverUrl(e.target.value)} className="form-input text-left pl-9" dir="ltr" placeholder="https://..." />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  {editingId && (
                    <button onClick={() => { setActiveTab('browse'); resetForm(); }} type="button" className="btn-secondary">
                      انصراف
                    </button>
                  )}
                  <button onClick={handleSaveResource} disabled={isSaving || !formTitle.trim()} className="btn-primary px-8 disabled:opacity-60 flex items-center gap-2">
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCheck size={18} />}
                    {editingId ? 'ثبت تغییرات' : 'آپلود و انتشار در مرکز اسناد'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { CulturalResourcesSection };
export default CulturalResourcesSection;