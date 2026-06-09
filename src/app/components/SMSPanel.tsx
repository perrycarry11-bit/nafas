import { useState } from 'react';
import { ArrowRight, Send, MessageSquare, Clock } from 'lucide-react';
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
  { id: '2', recipient: 'مادران در حال پیگیری', message: 'با سلام، پیگیری وضعیت شما از طرف مرکز نفس', count: 12, date: '1402/09/05', status: 'ارسال شد' },
  { id: '3', recipient: 'خیرین شخص', message: 'سپاسگزاری از حمایت‌های ارزنده {name} عزیز', count: 8, date: '1402/08/28', status: 'ارسال شد' },
];

export function SMSPanel({ onBack }: Props) {
  const [recipient, setRecipient] = useState('all_mothers');
  const [manualNumbers, setManualNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<SMSHistory[]>(sampleHistory);

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 70) || 1;

  function sendSMS() {
    if (!message.trim()) return;
    const group = recipientGroups.find(r => r.value === recipient);
    const newSMS: SMSHistory = {
      id: Date.now().toString(),
      recipient: recipient === 'manual' ? 'شماره دستی' : (group?.label || ''),
      message,
      count: recipient === 'manual' ? manualNumbers.split('\n').filter(Boolean).length : Math.floor(Math.random() * 20) + 5,
      date: todayJalali(),
      status: 'ارسال شد'
    };
    setHistory(prev => [newSMS, ...prev]);
    setMessage('');
    setSent(true);
    setTimeout(() => setSent(false), 3000);
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
          <button onClick={sendSMS}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm transition-all ${sent ? 'bg-green-500 text-white' : 'btn-primary'}`}>
            <Send size={15} />
            {sent ? 'پیامک ارسال شد ✓' : 'ارسال پیامک'}
          </button>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-5 gap-6">
          {/* Compose */}
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
                    className="form-input resize-none" placeholder="09121234567&#10;09351234567" />
                </div>
              )}

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-muted-foreground">متن پیام</label>
                  <button onClick={insertName} className="text-xs text-primary hover:underline">درج {'{name}'}</button>
                </div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                  className="form-input resize-none mb-2" placeholder="متن پیام خود را اینجا بنویسید... از {name} برای شخصی‌سازی استفاده کنید" />
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

          {/* History */}
          <div className="col-span-2">
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
