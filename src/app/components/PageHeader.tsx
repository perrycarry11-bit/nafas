import { ArrowRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  action?: React.ReactNode;
}

export function PageHeader({ title, onBack, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {title}
          </h1>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
