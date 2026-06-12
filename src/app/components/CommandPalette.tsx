import { useState, useEffect, useRef } from 'react';
import { Search, Home, Users, Heart, Stethoscope, Settings, Moon, Sun, FileText, Sparkles, MessageSquare, UserCircle, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  onNavigate: (section: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentRole: 'admin' | 'staff';
  activeUser: any;
}

export function CommandPalette({ isOpen, setIsOpen, onNavigate, darkMode, setDarkMode, currentRole, activeUser }: Props) {
  const [query, setQuery] = useState('');
  const [dynamicItems, setDynamicItems] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);

      const loadPeople = (key: string, typeLabel: string, icon: any, sectionId: string) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              return parsed.map((item: any) => {
                const searchableText = JSON.stringify(item).toLowerCase();
                const finalName = item.name || item.fullName || item.firstName || item.motherName || item.doctorName || item.benefactorName || item.title || (item.username ? `@${item.username}` : 'بدون نام');
                
                return {
                  id: `${sectionId}-${item.id || Math.random()}`,
                  personId: item.id,
                  icon: icon,
                  label: finalName,
                  subtitle: typeLabel,
                  type: 'person',
                  section: sectionId,
                  searchableText: searchableText
                };
              });
            }
          }
        } catch (e) {}
        return [];
      };

      const mothersList = loadPeople('nafas_mothers', 'پرونده مادر', Users, 'mothers');
      const benefactorsList = loadPeople('nafas_benefactors', 'پرونده خیر', Heart, 'benefactors');
      const doctorsList = loadPeople('nafas_doctors', 'همکار پزشک', Stethoscope, 'doctors');
      const staffList = loadPeople('nafas_users_list', 'همکار سیستم', Shield, 'settings');

      setDynamicItems([...mothersList, ...benefactorsList, ...doctorsList, ...staffList]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const staticCommands = [
    { id: 'dashboard', icon: Home, label: 'داشبورد اصلی', type: 'page', searchableText: 'داشبورد خانه اصلی' },
    { id: 'mothers', icon: Users, label: 'مدیریت مادران', type: 'page', searchableText: 'مادران ثبت' },
    { id: 'benefactors', icon: Heart, label: 'مدیریت خیرین', type: 'page', searchableText: 'خیرین مالی' },
    { id: 'doctors', icon: Stethoscope, label: 'پزشکان', type: 'page', searchableText: 'پزشکان دکتر' },
    { id: 'reports', icon: FileText, label: 'گزارش‌ها', type: 'page', searchableText: 'گزارش اکسل' },
    { id: 'settings', icon: Settings, label: 'تنظیمات سیستم', type: 'page', searchableText: 'تنظیمات کاربر دسترسی' },
    { id: 'toggleTheme', icon: darkMode ? Sun : Moon, label: darkMode ? 'حالت روشن' : 'حالت تاریک', type: 'action', searchableText: 'تم رنگی تاریک روشن' },
  ];

  const allCommands = [...staticCommands, ...dynamicItems];

  const availableCommands = allCommands.filter(cmd => {
    if (cmd.type === 'action') return true;
    if (currentRole === 'admin') return true;
    const targetSection = cmd.section || cmd.id;
    if (targetSection === 'dashboard' || targetSection === 'settings') return true;
    return activeUser && Array.isArray(activeUser.access) && activeUser.access.includes(targetSection);
  });

  const filteredCommands = availableCommands.filter(cmd => 
    cmd.searchableText.includes(query.toLowerCase()) || cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd: any) => {
    if (cmd.type === 'page' || cmd.type === 'person') {
      if (cmd.type === 'person') {
        localStorage.setItem('nafas_focus_id', cmd.personId);
      }
      onNavigate(cmd.section || cmd.id);
    } else if (cmd.id === 'toggleTheme') {
      setDarkMode(!darkMode);
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 px-4" onClick={() => setIsOpen(false)} dir="rtl">
      <div className="w-full max-w-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-4 border-b border-border/50">
          <Search size={20} className="text-primary ml-3 animate-pulse" />
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی نام، تلفن، کدملی و بخش‌ها..." className="flex-1 bg-transparent border-none outline-none text-foreground text-lg placeholder:text-muted-foreground/60" />
          <kbd className="hidden sm:inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-[10px] font-medium text-muted-foreground font-sans" dir="ltr">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            <div className="grid gap-1">
              {filteredCommands.map((cmd) => (
                <button key={cmd.id} onClick={() => handleSelect(cmd)} className={`flex items-center justify-between w-full p-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-right group ${cmd.type === 'person' ? 'bg-muted/30 border border-transparent hover:border-primary/20' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${cmd.type === 'person' ? 'bg-background shadow-sm border border-border text-primary group-hover:bg-primary group-hover:text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'}`}>
                      {cmd.type === 'person' ? <UserCircle size={18} /> : <cmd.icon size={18} />}
                    </div>
                    <div>
                      <span className="font-bold text-foreground group-hover:text-primary block">{cmd.label}</span>
                      {cmd.subtitle && <span className="text-[10px] font-medium text-muted-foreground mt-0.5 block">{cmd.subtitle}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground opacity-0 group-hover:opacity-100 flex items-center gap-1">{cmd.type === 'person' ? 'ورود به بخش' : 'ورود'} ←</span>
                </button>
              ))}
            </div>
          ) : (<div className="py-10 text-center flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center"><Search size={24} className="text-muted-foreground/50" /></div><p className="text-muted-foreground font-medium text-sm">هیچ اطلاعاتی برای «{query}» یافت نشد.</p></div>)}
        </div>
      </div>
    </div>
  );
}