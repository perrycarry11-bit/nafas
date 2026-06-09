import { useState } from 'react';
import { ArrowRight, Download, Upload, Sun, Moon, User, Shield, Database } from 'lucide-react';

interface Props {
  onBack: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
}

export function SettingsSection({ onBack, darkMode, setDarkMode, fontSize, setFontSize }: Props) {
  const [activeRole, setActiveRole] = useState('admin');
  const [users, setUsers] = useState([
    { id: '1', name: 'مدیر سیستم', username: 'admin', role: 'admin' },
    { id: '2', name: 'کارمند', username: 'staff1', role: 'staff' },
  ]);

  function exportBackup() {
    const data = { exportDate: new Date().toISOString(), version: '1.0.0', mothers: [], benefactors: [], doctors: [] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `nafas-backup-${Date.now()}.json`; a.click();
  }

  function importBackup() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      // In a real app, parse and restore data
      alert('فایل بکاپ با موفقیت بارگذاری شد');
    };
    input.click();
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={onBack} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><ArrowRight size={18} /></button>
          <h2 className="text-foreground" style={{fontSize:'1.1rem', fontWeight:700}}>تنظیمات</h2>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Appearance */}
        <SettingCard icon={darkMode ? Moon : Sun} title="ظاهر و نمایش">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground" style={{fontWeight:500}}>حالت نمایش</p>
                <p className="text-muted-foreground text-sm">تغییر بین حالت روشن و تاریک</p>
              </div>
              <div className="flex gap-1 bg-muted p-1 rounded-xl">
                <button onClick={() => setDarkMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${!darkMode ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Sun size={13} /> روشن
                </button>
                <button onClick={() => setDarkMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${darkMode ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Moon size={13} /> تاریک
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-foreground" style={{fontWeight:500}}>اندازه فونت</p>
                <span className="text-primary text-sm" style={{fontWeight:600}}>{fontSize}px</span>
              </div>
              <input type="range" min="12" max="20" step="1" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>کوچک (۱۲)</span>
                <span>متوسط (۱۵)</span>
                <span>بزرگ (۲۰)</span>
              </div>
            </div>
            <div>
              <p className="text-foreground mb-2" style={{fontWeight:500}}>فونت متن</p>
              <div className="flex gap-2">
                {['Vazirmatn', 'IRANSans', 'Shabnam'].map(f => (
                  <button key={f} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${f === 'Vazirmatn' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>{f}</button>
                ))}
              </div>
            </div>
          </div>
        </SettingCard>

        {/* Access Management */}
        <SettingCard icon={Shield} title="مدیریت دسترسی">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-foreground" style={{fontWeight:500}}>کاربران سیستم</p>
              <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"><User size={12} /> افزودن کاربر</button>
            </div>
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm" style={{fontWeight:500}}>{u.name}</p>
                    <p className="text-muted-foreground text-xs">{u.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {u.role === 'admin' ? 'مدیر' : 'کارمند'}
                  </span>
                  <button className="text-xs text-muted-foreground hover:text-primary transition-colors">ویرایش</button>
                  {u.role !== 'admin' && <button onClick={() => setUsers(prev => prev.filter(x => x.id !== u.id))} className="text-xs text-destructive hover:underline">حذف</button>}
                </div>
              </div>
            ))}
          </div>
        </SettingCard>

        {/* Backup */}
        <SettingCard icon={Database} title="بکاپ و بازیابی">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="text-foreground" style={{fontWeight:500}}>خروجی بکاپ</p>
                <p className="text-muted-foreground text-sm">صدور کامل داده‌ها به فرمت JSON</p>
              </div>
              <button onClick={exportBackup} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors">
                <Download size={14} /> دریافت بکاپ
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="text-foreground" style={{fontWeight:500}}>بازیابی بکاپ</p>
                <p className="text-muted-foreground text-sm">بارگذاری فایل JSON بکاپ</p>
              </div>
              <button onClick={importBackup} className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-xl text-sm hover:bg-primary/10 transition-colors">
                <Upload size={14} /> بارگذاری
              </button>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-yellow-800 text-sm">⚠️ بازیابی بکاپ، داده‌های فعلی را جایگزین می‌کند. حتماً قبل از بازیابی یک بکاپ جدید بگیرید.</p>
            </div>
          </div>
        </SettingCard>

        {/* About */}
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🌿</span>
          </div>
          <h3 className="text-foreground mb-1" style={{fontWeight:700}}>مرکز نفس</h3>
          <p className="text-muted-foreground text-sm mb-1">سیستم مدیریت جامع</p>
          <p className="text-muted-foreground text-xs">نسخه ۱.۰.۰</p>
        </div>
      </div>
    </div>
  );
}

function SettingCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={16} className="text-primary" />
        </div>
        <h3 className="text-foreground" style={{fontWeight:600}}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
