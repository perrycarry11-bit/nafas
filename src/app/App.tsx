import { useState, useEffect } from 'react';

import { Dashboard } from './components/Dashboard';
import { MothersSection } from './components/MothersSection';
import { BenefactorsSection } from './components/BenefactorsSection';
import { DoctorsSection } from './components/DoctorsSection';
import { ReportsSection } from './components/ReportsSection';
import { SMSPanel } from './components/SMSPanel';
import { SettingsSection } from './components/SettingsSection';
import { ActivitiesSection } from './components/ui/ActivitiesSection';

type Section =
  | 'dashboard'
  | 'mothers'
  | 'benefactors'
  | 'doctors'
  | 'reports'
  | 'sms'
  | 'settings'
  | 'activities';

type Stats = {
  mothers: number;
  benefactors: number;
  doctors: number;
  activities: number;
};

function readArrayCount(key: string): number {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return 0;
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.length;
    }

    return 0;
  } catch {
    return 0;
  }
}

function getStats(): Stats {
  return {
    mothers: readArrayCount('nafas_mothers'),
    benefactors: readArrayCount('nafas_benefactors'),
    doctors: readArrayCount('nafas_doctors'),
    activities: readArrayCount('nafas_activities'),
  };
}

export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [stats, setStats] = useState<Stats>(getStats());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
  }, [fontSize]);

  function refreshStats() {
    setStats(getStats());
  }

  function goDashboard() {
    refreshStats();
    setSection('dashboard');
  }

  function navigate(sectionName: string) {
    if (
      sectionName === 'dashboard' ||
      sectionName === 'mothers' ||
      sectionName === 'benefactors' ||
      sectionName === 'doctors' ||
      sectionName === 'reports' ||
      sectionName === 'sms' ||
      sectionName === 'settings' ||
      sectionName === 'activities'
    ) {
      if (sectionName === 'dashboard') {
        refreshStats();
      }

      setSection(sectionName);
    }
  }

  return (
    <div className="size-full overflow-auto bg-background" dir="rtl">
      {section === 'dashboard' && (
        <Dashboard
          onNavigate={navigate}
          stats={stats}
          darkMode={darkMode}
        />
      )}

      {section === 'mothers' && (
        <MothersSection onBack={goDashboard} />
      )}

      {section === 'benefactors' && (
        <BenefactorsSection onBack={goDashboard} />
      )}

      {section === 'doctors' && (
        <DoctorsSection onBack={goDashboard} />
      )}

      {section === 'reports' && (
        <ReportsSection onBack={goDashboard} />
      )}

      {section === 'sms' && (
        <SMSPanel onBack={goDashboard} />
      )}

      {section === 'activities' && (
        <ActivitiesSection onBack={goDashboard} />
      )}

      {section === 'settings' && (
        <SettingsSection
          onBack={goDashboard}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          fontSize={fontSize}
          setFontSize={setFontSize}
        />
      )}
    </div>
  );
}