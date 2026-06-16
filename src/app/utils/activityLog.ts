export interface ActivityLogItem {
  id: string;
  date: string;
  time: string;

  userId: string;
  userName: string;
  username: string;
  role: 'admin' | 'staff';

  action: string;
  section: string;
  targetType: string;
  targetName: string;
  targetId?: string;
  trackingCode?: string;
  details?: string;
}

export interface AddActivityLogInput {
  action: string;
  section: string;
  targetType: string;
  targetName: string;
  targetId?: string;
  trackingCode?: string;
  details?: string;
}

const STORAGE_KEY = 'nafas_activity_logs';

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toPersianNumber(input: string | number) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  return String(input).replace(/\d/g, digit => persianDigits[Number(digit)]);
}

function getJalaliDate() {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function getTime() {
  try {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return toPersianNumber(`${hours}:${minutes}:${seconds}`);
  } catch {
    return '';
  }
}

function getCurrentUserInfo(): {
  userId: string;
  userName: string;
  username: string;
  role: 'admin' | 'staff';
} {
  try {
    const onlineRaw = localStorage.getItem('nafas_online_profile');

    if (onlineRaw) {
      const onlineProfile = JSON.parse(onlineRaw);

      const onlineRole = onlineProfile?.role;

      return {
        userId: onlineProfile?.id || 'online-user',
        userName:
          onlineProfile?.full_name ||
          onlineProfile?.username ||
          'کاربر برخط',
        username: onlineProfile?.username || 'online',
        role:
          onlineRole === 'province_staff'
            ? 'staff'
            : 'admin',
      };
    }
  } catch {
    // ignore
  }

  try {
    const activeUserRaw = localStorage.getItem('nafas_active_user');
    const currentRole = localStorage.getItem('nafas_current_role') || 'admin';

    if (activeUserRaw) {
      const activeUser = JSON.parse(activeUserRaw);

      return {
        userId: activeUser?.id || 'local-user',
        userName: activeUser?.name || activeUser?.full_name || 'کاربر محلی',
        username: activeUser?.username || 'local',
        role: currentRole === 'staff' ? 'staff' : 'admin',
      };
    }

    return {
      userId: 'admin',
      userName: 'مدیر سیستم',
      username: 'admin',
      role: currentRole === 'staff' ? 'staff' : 'admin',
    };
  } catch {
    return {
      userId: 'unknown',
      userName: 'کاربر نامشخص',
      username: 'unknown',
      role: 'admin',
    };
  }
}

export function getActivityLogs(): ActivityLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export function saveActivityLogs(logs: ActivityLogItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function addActivityLog(input: AddActivityLogInput) {
  try {
    const user = getCurrentUserInfo();

    const newLog: ActivityLogItem = {
      id: makeId(),
      date: getJalaliDate(),
      time: getTime(),

      userId: user.userId,
      userName: user.userName,
      username: user.username,
      role: user.role,

      action: input.action,
      section: input.section,
      targetType: input.targetType,
      targetName: input.targetName,
      targetId: input.targetId,
      trackingCode: input.trackingCode,
      details: input.details || '',
    };

    const currentLogs = getActivityLogs();

    const nextLogs = [newLog, ...currentLogs].slice(0, 1000);

    saveActivityLogs(nextLogs);

    return newLog;
  } catch {
    return null;
  }
}

export function clearActivityLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function removeActivityLog(id: string) {
  const logs = getActivityLogs();
  const nextLogs = logs.filter(log => log.id !== id);
  saveActivityLogs(nextLogs);
}

export function getActivityLogsBySection(section: string) {
  const logs = getActivityLogs();

  if (!section || section === 'همه بخش‌ها') {
    return logs;
  }

  return logs.filter(log => log.section === section);
}