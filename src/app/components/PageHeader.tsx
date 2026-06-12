import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}

export function PageHeader({ title, onBack, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 px-4 md:px-6 py-4 bg-white/70 dark:bg-card/70 backdrop-blur-2xl border-b border-white/60 dark:border-border/60 shadow-sm">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              type="button"
              className="w-11 h-11 rounded-2xl bg-background/80 border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all duration-200 flex items-center justify-center active:scale-95 shadow-sm"
              title="بازگشت"
            >
              <ArrowRight size={20} />
            </button>

            <div className="min-w-0">
              <h1
                className="text-foreground truncate"
                style={{ fontSize: '1.15rem', fontWeight: 800 }}
              >
                {title}
              </h1>

              <p
                className="text-muted-foreground mt-0.5 hidden sm:block"
                style={{ fontSize: '0.75rem' }}
              >
                مدیریت اطلاعات و عملیات این بخش
              </p>
            </div>
          </div>

          {action && (
            <div className="flex items-center gap-2 shrink-0">
              {action}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}