import { useState, useEffect } from 'react';
import { ArrowRight, Send, MessageSquare, Clock, Settings, Save, Eye, EyeOff } from 'lucide-react';
import { todayJalali, formatJalaliDisplay, toPersianNumber } from '../utils/jalali';

interface Props { onBack: () => void; }

interface SMSHistory {
  id: string; recipient: string; message: string; count: number; date: string; status: string;
}

const recipientGroups = [
  { value: 'all_mothers', label: 'همه مادران' },
  { value: 'following', label: 'مادران در حال پیگیری' },
  { value: 'delivered', label: 'مادران به دنیا آمده' },
  { value: 'benefactors_person', label: 'خیرین شخص' },
  { value: 'benefactors_company', label: 'خیرین شرکت' },
  { value: 'manual', label: 'شماره دستی' },
];

const sampleHistory: SMSHistory[] = [
  { id: '1', recipient: 'همه مادران', message: 'خانم محترم {name}، یادآوری ویزیت دوره‌ای در تاریخ ۱۵ دی', count: 32, date: '1402/09/10', status: 'ارسال شد' },
];

export function SMSPanel({ onBack }: Props) {
  const [recipient, setRecipient] = useState('all_mothers');
  const [manualNumbers, setManualNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SMSHistory[]>(sampleHistory);

  // اِستیت‌های مربوط به تنظیمات پنل پیامکی (خواندن اولیه از حافظه سیستم)
  const [username, setUsername] = useState(() => localStorage.getItem('nafas_sms_username') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('nafas_sms_password') || '');
  const [senderNumber, setSenderNumber] = useState(() => localStorage.getItem('nafas_sms_sender') || '');
  
  const [showPassword, setShowPassword] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 70) || 1;

  // تابع ذخیره تنظیمات در حافظه دستگاه
  function handleSaveSettings() {
    localStorage.setItem('nafas_sms_username', username);
    localStorage.setItem('nafas_sms_password', password);
    localStorage.setItem('nafas_sms_sender', senderNumber);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  async function sendSMS() {
    // بررسی پر بودن تنظیمات پنل
    if (!username || !password || !senderNumber) {
      alert("لطفاً ابتدا تنظیمات اتصال به پنل پیامکی را در ستون سمت چپ تکمیل و ذخیره کنید.");
      return;
    }

    if (!message.trim()) {
      alert("لطفاً متن پیام را وارد کنید.");
      return;
    }

    let numbersList: string[] = [];
    
    if (recipient === 'manual') {
      numbersList = manualNumbers.split('\n').map(n => n.trim()).filter(Boolean);
      if (numbersList.length === 0) {
        alert("لطفاً حداقل یک شماره موبایل وارد کنید.");
        return;
      }
    } else {
      alert("ارسال پیام به گروه‌ها نیاز به اتصال به دیتابیس مرکز دارد. فعلاً برای تست، از گزینه 'شماره دستی' استفاده کنید.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
          to: numbersList.join(','),
          from: senderNumber,
          text: message
        })
      });

      const data = await response.json();

      if (data.RetStatus === 1) {
        const group = recipientGroups.find(r => r.value === recipient);
        const newSMS: SMSHistory = {
          id: Date.now().toString(),
          recipient: recipient === 'manual' ? 'شماره دستی' : (group?.label || ''),
          message,
          count: numbersList.length,
          date: todayJalali(),
          status: 'ارسال شد'
        };
        setHistory(prev => [newSMS, ...prev]);
        setMessage('');
        setManualNumbers('');
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } else {
        alert("خطا از سمت سرور پیامک: " + data.StrRetStatus);
      }
    } catch (error) {
      alert("خطا در برقراری ارتباط با اینترنت یا سرور پیامک.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function insertName() { setMessage(m => m + '{name}'); }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><ArrowRight size={18} /></button>
            <h2 className="text-foreground" style={{fontSize:'1.1rem', fontWeight:700}}>پنل پیامکی</h2>
          </div>
          <button onClick={sendSMS} disabled={loading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm transition-all ${sent ? 'bg-green-500 text-white' : 'btn-primary'} ${loading ? 'opacity-50 cursor-wait' : ''}`}>
            <Send size={15} />
            {loading ? 'در حال ارسال...' : sent ? 'پیامک ارسال شد ✓' : 'ارسال پیامک'}
          </button>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-5 gap-6">
          {/* کادر سمت راست: بخش نوشتن پیامک */}
          <div className="col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-foreground mb-4" style={{fontWeight:600}}>ارسال پیامک</h3>

              {/* Recipient */}
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">گیرندگان</label>
                <div className="grid grid-cols-2 gap-2">
                  {recipientGroups.map(r => (
                    <label key={r.value} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${recipient === r.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                      <input type="radio" name="recipient" checked={recipient === r.value} onChange={() => setRecipient(r.value)} className="accent-primary" />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              {recipient === 'manual' && (
                <div className="mb-4">
                  <label className="block text-sm text-muted-foreground mb-1">شماره‌ها (هر خط یک شماره)</label>
                  <textarea value={manualNumbers} onChange={e => setManualNumbers(e.target.value)} rows={4}
                    className="form-input resize-none w-full border border-border rounded-lg p-3 bg-background" placeholder="09121234567&#10;09351234567" />
                </div>
              )}

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-muted-foreground">متن پیام</label>
                  <button onClick={insertName} className="text-xs text-primary hover:underline">درج {'{name}'}</button>
                </div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                  className="form-input resize-none mb-2 w-full border border-border rounded-lg p-3 bg-background" placeholder="متن پیام خود را اینجا بنویسید... از {name} برای شخصی‌سازی استفاده کنید" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{toPersianNumber(charCount)} کاراکتر</span>
                  <span>{toPersianNumber(smsCount)} پیامک</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            {message && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-foreground mb-3" style={{fontSize:'0.9rem', fontWeight:600}}>پیش‌نمایش</h4>
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-foreground text-sm leading-relaxed">{message.replace('{name}', 'فاطمه محمدی')}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">نمونه پیش‌نمایش با نام "فاطمه محمدی"</p>
              </div>
            )}
          </div>

          {/* کادر سمت چپ: بخش تنظیمات پپامک و تاریخچه */}
          <div className="col-span-2 space-y-4">
            
            {/* کارت جدید تنظیمات اختصاصی پنل */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <Settings size={16} />
                <h3 className="text-foreground" style={{fontWeight:600, fontSize:'0.95rem'}}>تنظیمات اتصال به پنل</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">نام کاربری ملی‌پیامک</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 bg-background text-foreground text-xs" placeholder="مثلا: 9107430716" />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">رمز عبور پنل</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full border border-border rounded-lg p-2 bg-background text-foreground text-xs pl-8" placeholder="رمز عبور پنل" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">شماره خط اختصاصی ارسال</label>
                  <input type="text" value={senderNumber} onChange={e => setSenderNumber(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 bg-background text-foreground text-xs" placeholder="مثلا: 50004001430716" />
                </div>

                <button onClick={handleSaveSettings}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${settingsSaved ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                  <Save size={14} />
                  {settingsSaved ? 'تنظیمات ذخیره شد ✓' : 'ذخیره تنظیمات'}
                </button>
              </div>
            </div>

            {/* تاریخچه پیام‌ها */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-primary" />
                <h3 className="text-foreground" style={{fontWeight:600}}>تاریخچه پیام‌ها</h3>
              </div>
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="border border-border rounded-lg p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">{h.recipient}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${h.status === 'ارسال شد' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{h.status}</span>
                    </div>
                    <p className="text-foreground text-xs mb-2 line-clamp-2">{h.message}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatJalaliDisplay(h.date)}</span>
                      <span>{toPersianNumber(h.count)} نفر</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}