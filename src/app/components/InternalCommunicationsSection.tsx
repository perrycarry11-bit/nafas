import { useEffect, useState, useMemo } from 'react';
import {
  ArrowRight,
  MessagesSquare,
  Send,
  Inbox,
  PenSquare,
  RefreshCw,
  AlertCircle,
  Building2,
  MapPin,
  Globe,
  Loader2,
  CheckCheck,
  User,
  Clock,
  ShieldAlert,
  MessageCircle,
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

interface InternalMessage {
  id: string;
  local_id?: string;
  sender_id: string;
  sender_role: string;
  sender_province_id: string | null;
  sender_county_id: string | null;
  target_type: 'global' | 'country' | 'province' | 'province_admin' | 'county';
  target_province_id: string | null;
  target_county_id: string | null;
  title: string;
  body: string;
  is_global: boolean;
  created_at: string;
  sender_name?: string;
  sync_status?: 'synced' | 'pending';
}

interface InternalMessageReply {
  id: string;
  message_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string } | null;
  sender_name?: string;
}

interface Province {
  id: string;
  name: string;
}

interface County {
  id: string;
  province_id: string;
  name: string;
}

const CACHE_KEY_MESSAGES = 'nafas_internal_messages_v1';
const PENDING_MESSAGES_KEY = 'nafas_pending_internal_messages';
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

  if (
    role === 'national_admin' ||
    role === 'country_admin' ||
    role === 'super_admin' ||
    role === 'main_admin' ||
    role === 'central_admin'
  ) {
    return 'country';
  }

  if (role === 'province_admin' || role === 'province_manager') {
    return 'province';
  }

  return 'county';
}

function generateLocalId() {
  return `local_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function InternalCommunicationsSection({ onBack }: Props) {
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [managementLevel, setManagementLevel] = useState<ManagementLevel>('county');

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<InternalMessage[]>([]);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [source, setSource] = useState<'online' | 'cache' | 'local'>('local');

  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [targetType, setTargetType] = useState<'global' | 'country' | 'province' | 'province_admin' | 'county'>('province_admin');
  const [targetProvinceId, setTargetProvinceId] = useState('');
  const [targetCountyId, setTargetCountyId] = useState('');

  useEffect(() => {
    const currentProfile = getOnlineProfile();
    setProfile(currentProfile);
    const level = getManagementLevel(currentProfile);
    setManagementLevel(level);

    if (level === 'country') setTargetType('global');
    else if (level === 'province') setTargetType('province');
    else setTargetType('province_admin');

    loadCentersCache();
    loadPendingMessages();
    loadMessagesData(currentProfile);
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

  function loadPendingMessages() {
    try {
      const raw = localStorage.getItem(PENDING_MESSAGES_KEY);
      if (raw) {
        setPendingMessages(JSON.parse(raw));
      }
    } catch {
      setPendingMessages([]);
    }
  }

  function savePendingMessages(msgs: InternalMessage[]) {
    localStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(msgs));
    setPendingMessages(msgs);
  }

  async function syncPendingMessages() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (pendingMessages.length === 0) return;

    const remainingPending: InternalMessage[] = [];

    for (const msg of pendingMessages) {
      try {
        const { error } = await supabase.from('internal_messages').insert({
          sender_id: msg.sender_id,
          sender_role: msg.sender_role,
          sender_province_id: msg.sender_province_id,
          sender_county_id: msg.sender_county_id,
          target_type: msg.target_type,
          target_province_id: msg.target_province_id,
          target_county_id: msg.target_county_id,
          title: msg.title,
          body: msg.body,
          is_global: msg.is_global,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      } catch (err) {
        console.error('Error syncing pending message:', err);
        remainingPending.push(msg);
      }
    }

    savePendingMessages(remainingPending);
    if (remainingPending.length === 0) {
      loadMessagesData(); 
    }
  }

  async function loadMessagesData(currentProfile = profile) {
    if (!currentProfile) return;

    const fallbackLocal = () => {
      try {
        const cache = localStorage.getItem(CACHE_KEY_MESSAGES);
        if (cache) {
          setMessages(JSON.parse(cache));
          setSource('cache');
        }
      } catch {
        setMessages([]);
        setSource('local');
      }
      setMessageText('ارتباط با سرور برقرار نشد. در حال نمایش آخرین پیام‌های ذخیره‌شده.');
    };

    try {
      setLoading(true);
      setMessageText('در حال دریافت پیام‌ها...');

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        fallbackLocal();
        return;
      }

      await syncPendingMessages();

      const level = getManagementLevel(currentProfile);
      
      const { data, error } = await supabase
        .from('internal_messages')
        .select(`
          *,
          profiles (full_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rawMessages = (data || []).map((m: any) => {
        let fullName = 'کاربر نامشخص';
        if (m.profiles) {
          fullName = Array.isArray(m.profiles) ? (m.profiles[0]?.full_name || fullName) : (m.profiles.full_name || fullName);
        }

        return {
          ...m,
          sender_name: fullName,
          sync_status: 'synced' as const,
        };
      });

      const filtered = rawMessages.filter(msg => {
        if (msg.sender_id === currentProfile.id) return true;
        if (msg.target_type === 'global' || msg.is_global) return true;

        if (level === 'country') {
          if (msg.target_type === 'country') return true;
        }

        if (level === 'province') {
          if (msg.target_province_id === currentProfile.province_id) {
            if (msg.target_type === 'province') return true;
            if (msg.target_type === 'province_admin') return true;
            if (msg.target_type === 'county') return true;
          }
        }

        if (level === 'county') {
          if (msg.target_province_id === currentProfile.province_id) {
            if (msg.target_type === 'province') return true;
            if (msg.target_type === 'county' && msg.target_county_id === currentProfile.county_id) return true;
          }
        }

        return false;
      });

      setMessages(filtered);
      localStorage.setItem(CACHE_KEY_MESSAGES, JSON.stringify(filtered));
      setSource('online');
      setMessageText('پیام‌ها تازه‌سازی شدند.');
    } catch (err) {
      console.error(err);
      fallbackLocal();
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!profile) return;
    if (!composeTitle.trim() || !composeBody.trim()) {
      alert('عنوان و متن پیام نمی‌تواند خالی باشد.');
      return;
    }

    if ((targetType === 'province' || targetType === 'province_admin') && !targetProvinceId && managementLevel === 'country') {
      alert('لطفاً استان مقصد را انتخاب کنید.');
      return;
    }

    if (targetType === 'county' && !targetCountyId) {
      alert('لطفاً شهرستان مقصد را انتخاب کنید.');
      return;
    }

    setIsSending(true);

    let finalTargetProvince = targetProvinceId;
    let finalTargetCounty = targetCountyId;
    let isGlobal = false;

    if (managementLevel === 'country') {
      if (targetType === 'global') {
        isGlobal = true;
        finalTargetProvince = '';
        finalTargetCounty = '';
      } else if (targetType === 'province' || targetType === 'province_admin') {
        finalTargetCounty = '';
      }
    } else if (managementLevel === 'province') {
      if (targetType === 'global' || targetType === 'country') {
        if (targetType === 'global') isGlobal = true;
        finalTargetProvince = '';
        finalTargetCounty = '';
      } else if (targetType === 'county') {
        finalTargetProvince = profile.province_id || '';
      } else if (targetType === 'province') {
        finalTargetProvince = profile.province_id || '';
        finalTargetCounty = '';
      }
    } else if (managementLevel === 'county') {
      finalTargetProvince = profile.province_id || '';
      finalTargetCounty = ''; 
    }

    const newMessage: InternalMessage = {
      id: generateLocalId(),
      local_id: generateLocalId(),
      sender_id: profile.id,
      sender_role: profile.role,
      sender_province_id: profile.province_id,
      sender_county_id: profile.county_id || null,
      target_type: targetType,
      target_province_id: finalTargetProvince || null,
      target_county_id: finalTargetCounty || null,
      title: composeTitle.trim(),
      body: composeBody.trim(),
      is_global: isGlobal,
      created_at: new Date().toISOString(),
      sender_name: profile.full_name,
      sync_status: 'pending',
    };

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { error } = await supabase.from('internal_messages').insert({
          sender_id: newMessage.sender_id,
          sender_role: newMessage.sender_role,
          sender_province_id: newMessage.sender_province_id,
          sender_county_id: newMessage.sender_county_id,
          target_type: newMessage.target_type,
          target_province_id: newMessage.target_province_id,
          target_county_id: newMessage.target_county_id,
          title: newMessage.title,
          body: newMessage.body,
          is_global: newMessage.is_global,
        });

        if (error) throw error;
        
        addActivityLog({
          action: 'ارسال پیام داخلی',
          section: 'ارتباطات داخلی',
          targetType: 'پیام',
          targetName: composeTitle.trim(),
          details: 'یک پیام داخلی با موفقیت ارسال شد.',
        });

        alert('پیام با موفقیت ارسال شد.');
        setComposeTitle('');
        setComposeBody('');
        setActiveTab('sent');
        loadMessagesData();
      } catch (err: any) {
        console.error(err);
        alert(err?.message || 'خطا در ارسال پیام.');
      }
    } else {
      const newPending = [newMessage, ...pendingMessages];
      savePendingMessages(newPending);
      setMessages([newMessage, ...messages]);
      
      alert('شما برون خط (آفلاین) هستید. پیام ذخیره شد و پس از اتصال به اینترنت خودکار ارسال می‌شود.');
      setComposeTitle('');
      setComposeBody('');
      setActiveTab('sent');
    }

    setIsSending(false);
  }

  const inboxMessages = useMemo(() => {
    return messages.filter(m => m.sender_id !== profile?.id);
  }, [messages, profile]);

  const sentMessages = useMemo(() => {
    const onlineSent = messages.filter(m => m.sender_id === profile?.id);
    const offlineSent = pendingMessages.filter(m => !onlineSent.find(om => om.local_id === m.local_id));
    return [...offlineSent, ...onlineSent].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [messages, pendingMessages, profile]);

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  }

  // --- کامپوننت پیام (کارت) شامل بخش چت ---
  function MessageCard({ message, type }: { message: InternalMessage, type: 'inbox' | 'sent' }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [replies, setReplies] = useState<InternalMessageReply[]>([]);
    const [replyText, setReplyText] = useState('');
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [sendingReply, setSendingReply] = useState(false);

    const sProv = provinces.find(p => p.id === message.sender_province_id)?.name;
    const sCount = counties.find(c => c.id === message.sender_county_id)?.name;
    
    let locationStr = 'مدیریت کشوری';
    if (sCount) locationStr = `شهرستان ${sCount}`;
    else if (sProv) locationStr = `استان ${sProv}`;

    let targetStr = '';
    if (message.target_type === 'global' || message.is_global) targetStr = 'عمومی (همه کشور)';
    else if (message.target_type === 'country') targetStr = 'فقط مدیریت کشوری';
    else if (message.target_type === 'province_admin') {
      const pName = provinces.find(p => p.id === message.target_province_id)?.name || 'همان استان';
      targetStr = `فقط مدیریت استان ${pName}`;
    }
    else if (message.target_type === 'province') {
      const pName = provinces.find(p => p.id === message.target_province_id)?.name || 'همان استان';
      targetStr = `عمومی در استان ${pName}`;
    }
    else if (message.target_type === 'county') {
      const cName = counties.find(c => c.id === message.target_county_id)?.name || 'همان شهرستان';
      targetStr = `شهرستان ${cName}`;
    }

    // منطق تشخیص اجازه پاسخ‌دهی بر اساس قوانین خواسته شده
    const isCountrySender = message.target_type === 'global' || message.is_global || message.sender_role?.includes('country') || message.sender_role?.includes('national');
    let canReply = true;
    let cantReplyReason = '';

    if (managementLevel === 'county' && isCountrySender && message.sender_id !== profile?.id) {
      canReply = false;
      cantReplyReason = 'کاربران شهرستان مجاز به ثبت نظر در پیام‌های کشوری نیستند.';
    }

    async function loadReplies() {
      if (!navigator.onLine) return;
      try {
        setLoadingReplies(true);
        const { data, error } = await supabase
          .from('internal_message_replies')
          .select('*, profiles(full_name)')
          .eq('message_id', message.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formatted = (data || []).map((r: any) => {
          let name = 'کاربر نامشخص';
          if (r.profiles) {
            name = Array.isArray(r.profiles) ? r.profiles[0]?.full_name : r.profiles.full_name;
          }
          return { ...r, sender_name: name };
        });

        setReplies(formatted);
      } catch (err) {
        console.error('Error loading replies:', err);
      } finally {
        setLoadingReplies(false);
      }
    }

    function toggleExpand() {
      const nextState = !isExpanded;
      setIsExpanded(nextState);
      if (nextState && message.id && !message.id.startsWith('local_')) {
        loadReplies();
      }
    }

    async function handleSendReply() {
      if (!profile || !replyText.trim()) return;
      if (!navigator.onLine) {
        alert('برای ثبت پاسخ باید به اینترنت متصل باشید.');
        return;
      }

      try {
        setSendingReply(true);
        const { data, error } = await supabase.from('internal_message_replies').insert({
          message_id: message.id,
          sender_id: profile.id,
          body: replyText.trim()
        }).select('*, profiles(full_name)').single();

        if (error) throw error;

        let name = profile.full_name;
        if (data && data.profiles) {
          name = Array.isArray(data.profiles) ? data.profiles[0]?.full_name : data.profiles.full_name;
        }

        setReplies([...replies, { ...data, sender_name: name }]);
        setReplyText('');
      } catch (err: any) {
        console.error(err);
        alert('خطا در ثبت پاسخ.');
      } finally {
        setSendingReply(false);
      }
    }

    return (
      <div className="border border-border rounded-2xl bg-background/50 hover:bg-muted/10 transition-colors overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-bold text-foreground text-base mb-2">{message.title}</h4>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {type === 'inbox' ? (
                  <span className="flex items-center gap-1.5 font-bold text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                    <User size={13} /> فرستنده: {message.sender_name} <span className="opacity-60 text-[10px]">({locationStr})</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-bold bg-muted/50 px-2 py-1 rounded-md border border-border">
                    <Globe size={13} className="text-muted-foreground" /> گیرنده: {' '}
                    <span className="text-foreground">{targetStr}</span>
                  </span>
                )}
                <span className="flex items-center gap-1"><Clock size={13} /> {formatDate(message.created_at)}</span>
              </div>
            </div>
            
            {type === 'sent' && (
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${
                message.sync_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {message.sync_status === 'pending' ? <Clock size={11} /> : <CheckCheck size={11} />}
                {message.sync_status === 'pending' ? 'در صف ارسال' : 'ارسال‌شده'}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-7 whitespace-pre-wrap bg-card p-4 rounded-xl border border-border/50 mb-3">
            {message.body}
          </p>

          {!message.id.startsWith('local_') && (
            <button
              onClick={toggleExpand}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              <MessageCircle size={14} />
              {isExpanded ? 'بستن پیام‌ها' : 'مشاهده پاسخ‌ها و چت'}
            </button>
          )}
        </div>

        {/* بخش چت و پاسخ‌ها (Expansion) */}
        {isExpanded && (
          <div className="bg-muted/30 border-t border-border p-4">
            {loadingReplies ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-2">
                <Loader2 size={16} className="animate-spin" /> در حال دریافت پاسخ‌ها...
              </div>
            ) : (
              <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pl-2">
                {replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">هیچ پاسخی برای این پیام ثبت نشده است.</p>
                ) : (
                  replies.map(reply => {
                    const isMe = reply.sender_id === profile?.id;
                    return (
                      <div key={reply.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-card border border-border rounded-tl-none'}`}>
                          {!isMe && <p className="text-[10px] font-bold text-primary mb-1">{reply.sender_name}</p>}
                          <p className="text-xs leading-6 whitespace-pre-wrap">{reply.body}</p>
                          <span className={`text-[9px] mt-1 block ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}>{formatDate(reply.created_at)}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {canReply ? (
              <div className="flex gap-2 items-end">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="پاسخ خود را اینجا بنویسید..."
                  className="form-input flex-1 min-h-[45px] max-h-[120px] resize-y py-3 text-sm"
                  rows={1}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="bg-primary text-white p-3 rounded-xl disabled:opacity-60 hover:bg-primary/90 transition-colors"
                  title="ارسال پاسخ"
                >
                  {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            ) : (
              <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl p-3 text-xs font-bold text-center flex items-center justify-center gap-2">
                <ShieldAlert size={16} />
                {cantReplyReason}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in duration-500" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary"
              type="button"
            >
              <ArrowRight size={20} />
            </button>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                ارتباطات داخلی
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                صندوق پیام‌ها و ارتباط بین مدیران کشوری، استانی و شهرستانی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadMessagesData()}
            disabled={loading}
            className="btn-secondary disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تازه‌سازی
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 mt-4">
        {messageText && (
          <div className={`mb-6 rounded-2xl border p-4 text-xs font-bold flex items-center gap-2 ${
            source === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <AlertCircle size={16} />
            {messageText}
            {pendingMessages.length > 0 && (
              <span className="mr-auto bg-amber-200 text-amber-800 px-2 py-1 rounded-md">
                {pendingMessages.length} پیام در انتظار ارسال
              </span>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden">
          <div className="flex border-b border-border bg-muted/20">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'inbox' ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <Inbox size={18} />
              صندوق ورودی
              {inboxMessages.length > 0 && (
                <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{inboxMessages.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'sent' ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <Send size={18} />
              ارسال‌شده
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'compose' ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <PenSquare size={18} />
              پیام جدید
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'inbox' && (
              <div className="space-y-4">
                {inboxMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-2xl">
                    <MessagesSquare size={40} className="mx-auto mb-4 opacity-20" />
                    پیامی در صندوق ورودی وجود ندارد.
                  </div>
                ) : (
                  inboxMessages.map(msg => (
                    <MessageCard key={msg.id} message={msg} type="inbox" />
                  ))
                )}
              </div>
            )}

            {activeTab === 'sent' && (
              <div className="space-y-4">
                {sentMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-2xl">
                    <Send size={40} className="mx-auto mb-4 opacity-20" />
                    تاکنون پیامی ارسال نکرده‌اید.
                  </div>
                ) : (
                  sentMessages.map((msg, idx) => (
                    <MessageCard key={msg.id || idx} message={msg} type="sent" />
                  ))
                )}
              </div>
            )}

            {activeTab === 'compose' && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-primary/5 text-primary border border-primary/20 rounded-2xl p-4 text-xs leading-6 mb-6">
                  <strong>دسترسی و گیرندگان مجاز:</strong>
                  {managementLevel === 'country' && ' شما می‌توانید به همه کشور، فقط مدیر یک استان، یک استان به صورت عمومی، یا یک شهرستان خاص پیام دهید.'}
                  {managementLevel === 'province' && ' شما می‌توانید به مدیریت کشوری، همه کشور، کل استان خودتان، یا یک شهرستان زیرمجموعه پیام دهید.'}
                  {managementLevel === 'county' && ' شما فقط می‌توانید پیام محرمانه به مدیر استان، یا پیام عمومی برای کل استان (همه شهرستان‌ها) ارسال کنید.'}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-2">گیرنده پیام را مشخص کنید</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {managementLevel === 'country' && (
                        <>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'global' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'global'} onChange={() => setTargetType('global')} className="accent-primary" />
                            <Globe size={16} /> اطلاعیه عمومی (همه کشور)
                          </label>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'province_admin' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'province_admin'} onChange={() => setTargetType('province_admin')} className="accent-primary" />
                            <ShieldAlert size={16} /> فقط مدیریت یک استان خاص
                          </label>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'province' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'province'} onChange={() => setTargetType('province')} className="accent-primary" />
                            <Building2 size={16} /> اطلاعیه برای یک استان (مدیریت و شهرستان‌ها)
                          </label>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'county' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'county'} onChange={() => setTargetType('county')} className="accent-primary" />
                            <MapPin size={16} /> یک شهرستان خاص
                          </label>
                        </>
                      )}

                      {managementLevel === 'province' && (
                        <>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'global' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'global'} onChange={() => setTargetType('global')} className="accent-primary" />
                            <Globe size={16} /> اطلاعیه عمومی (همه کشور)
                          </label>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'country' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'country'} onChange={() => setTargetType('country')} className="accent-primary" />
                            <ShieldAlert size={16} /> اختصاصی فقط به مدیریت کشوری
                          </label>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'province' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'province'} onChange={() => setTargetType('province')} className="accent-primary" />
                            <Building2 size={16} /> عمومی در استان من (همه شهرستان‌ها)
                          </label>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'county' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'county'} onChange={() => setTargetType('county')} className="accent-primary" />
                            <MapPin size={16} /> یک شهرستان خاص در استان من
                          </label>
                        </>
                      )}

                      {managementLevel === 'county' && (
                        <>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'province_admin' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'province_admin'} onChange={() => setTargetType('province_admin')} className="accent-primary" />
                            <ShieldAlert size={16} /> اختصاصی فقط به مدیریت استان
                          </label>
                          <label className={`flex items-center gap-2 border p-3 rounded-xl cursor-pointer transition-all ${targetType === 'province' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}>
                            <input type="radio" checked={targetType === 'province'} onChange={() => setTargetType('province')} className="accent-primary" />
                            <Building2 size={16} /> عمومی در استان من (قابل مشاهده برای سایر شهرستان‌ها)
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {managementLevel === 'country' && (targetType === 'province' || targetType === 'province_admin' || targetType === 'county') && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-2">انتخاب استان</label>
                      <select className="form-input" value={targetProvinceId} onChange={e => setTargetProvinceId(e.target.value)}>
                        <option value="">انتخاب کنید...</option>
                        {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}

                  {((managementLevel === 'country' && targetType === 'county') || (managementLevel === 'province' && targetType === 'county')) && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-2">انتخاب شهرستان</label>
                      <select className="form-input" value={targetCountyId} onChange={e => setTargetCountyId(e.target.value)}>
                        <option value="">انتخاب کنید...</option>
                        {counties
                          .filter(c => managementLevel === 'province' ? c.province_id === profile?.province_id : c.province_id === targetProvinceId)
                          .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-2">عنوان پیام</label>
                    <input
                      type="text"
                      value={composeTitle}
                      onChange={e => setComposeTitle(e.target.value)}
                      className="form-input"
                      placeholder="موضوع پیام را وارد کنید"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-2">متن پیام</label>
                    <textarea
                      value={composeBody}
                      onChange={e => setComposeBody(e.target.value)}
                      className="form-input min-h-[150px] resize-y"
                      placeholder="متن کامل پیام خود را اینجا بنویسید..."
                    />
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end">
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !composeTitle.trim() || !composeBody.trim()}
                      className="btn-primary px-8 disabled:opacity-60"
                    >
                      {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                      ارسال پیام
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { InternalCommunicationsSection };
export default InternalCommunicationsSection;