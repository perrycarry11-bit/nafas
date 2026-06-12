import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './styles/fonts.css';
import './styles/globals.css';

function BootLoader() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    import('./app/App.tsx')
      .then(module => {
        setAppComponent(() => module.default);
      })
      .catch(error => {
        console.error('خطا در لود App:', error);
        setErrorText(error?.message || String(error));
      });
  }, []);

  if (errorText) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          background: '#fff1f2',
          color: '#9f1239',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'Tahoma, Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 850,
            background: 'white',
            border: '1px solid #fecdd3',
            borderRadius: 18,
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
            خطا در اجرای نرم‌افزار
          </h1>

          <p style={{ lineHeight: 2, fontSize: 14, marginBottom: 16 }}>
            برنامه اجرا شد، ولی فایل App یا یکی از فایل‌های وابسته مشکل دارد. متن خطا:
          </p>

          <pre
            dir="ltr"
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 12,
              padding: 16,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 13,
              color: '#be123c',
            }}
          >
            {errorText}
          </pre>
        </div>
      </div>
    );
  }

  if (!AppComponent) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-[#eef7f5] text-primary font-bold text-xl"
      >
        در حال بارگذاری نرم‌افزار نفس...
      </div>
    );
  }

  return <AppComponent />;
}

let rootElement = document.getElementById('root');

if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

createRoot(rootElement).render(
  <React.StrictMode>
    <BootLoader />
  </React.StrictMode>,
);