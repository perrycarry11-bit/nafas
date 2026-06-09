import { useState, useRef } from 'react';
import { Upload, Eye, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  label?: string;
  value?: string;
  onChange?: (base64: string) => void;
}

export function ImageUploader({ label, value, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [viewing, setViewing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
      onChange?.(result);
    };
    reader.readAsDataURL(file);
  }

  function remove() {
    setPreview(null);
    onChange?.('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      {label && <label className="block text-sm text-muted-foreground mb-1">{label}</label>}
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {!preview ? (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Upload size={14} />
            <span>آپلود تصویر</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border">
              <img src={preview} className="w-full h-full object-cover" alt="uploaded" />
            </div>
            <button type="button" onClick={() => setViewing(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-primary hover:text-primary-foreground transition-colors">
              <Eye size={12} /> مشاهده
            </button>
            <button type="button" onClick={remove}
              className="flex items-center gap-1 px-2 py-1.5 text-xs bg-destructive/10 text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors">
              <X size={12} /> حذف
            </button>
          </div>
        )}
        {!preview && (
          <div className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
            <ImageIcon size={16} />
          </div>
        )}
      </div>

      {viewing && preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewing(false)}>
          <div className="relative max-w-2xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <img src={preview} className="max-w-full max-h-[80vh] rounded-xl object-contain" alt="preview" />
            <button onClick={() => setViewing(false)}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/80">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
