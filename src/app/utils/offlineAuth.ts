export type OnlineRole =
  | 'national_admin'
  | 'province_admin'
  | 'province_staff';

export interface OnlineProfile {
  id: string;
  full_name: string;
  username: string;
  role: OnlineRole;
  province_id: string | null;
  province_name: string;
  province_code: string;
  access: string[];
  is_active: boolean;
}

interface OfflineUserRecord {
  username: string;
  passwordHash: string;
  profile: OnlineProfile;
  savedAt: string;
  lastLoginAt: string;
}

type OfflineUsersMap = Record<string, OfflineUserRecord>;

const OFFLINE_USERS_KEY = 'nafas_offline_auth_users_v1';
const LAST_USERNAME_KEY = 'nafas_last_offline_username';
const AUTH_MODE_KEY = 'nafas_auth_mode';

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(username: string, password: string) {
  const text = `${normalizeUsername(username)}::${password}::nafas-offline-v1`;

  if (
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof TextEncoder !== 'undefined'
  ) {
    const encoded = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return toHex(digest);
  }

  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  return `fallback-${Math.abs(hash)}`;
}

function getOfflineUsers(): OfflineUsersMap {
  try {
    const raw = localStorage.getItem(OFFLINE_USERS_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function saveOfflineUsers(users: OfflineUsersMap) {
  try {
    localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function getLastOfflineUsername() {
  try {
    return localStorage.getItem(LAST_USERNAME_KEY) || '';
  } catch {
    return '';
  }
}

export function hasOfflineUser(username: string) {
  const users = getOfflineUsers();
  return Boolean(users[normalizeUsername(username)]);
}

export function getAuthMode(): 'online' | 'offline' {
  try {
    return localStorage.getItem(AUTH_MODE_KEY) === 'offline'
      ? 'offline'
      : 'online';
  } catch {
    return 'online';
  }
}

export function markOnlineAuthMode() {
  try {
    localStorage.setItem(AUTH_MODE_KEY, 'online');
  } catch {
    // ignore
  }
}

export function markOfflineAuthMode() {
  try {
    localStorage.setItem(AUTH_MODE_KEY, 'offline');
  } catch {
    // ignore
  }
}

export async function saveOfflineLogin(
  profile: OnlineProfile,
  username: string,
  password: string,
) {
  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hashPassword(normalizedUsername, password);
  const users = getOfflineUsers();
  const now = new Date().toISOString();

  users[normalizedUsername] = {
    username: normalizedUsername,
    passwordHash,
    profile,
    savedAt: users[normalizedUsername]?.savedAt || now,
    lastLoginAt: now,
  };

  saveOfflineUsers(users);

  localStorage.setItem(LAST_USERNAME_KEY, normalizedUsername);
  localStorage.setItem('nafas_online_profile', JSON.stringify(profile));
}

export async function signInOffline(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const users = getOfflineUsers();
  const record = users[normalizedUsername];

  if (!record) {
    throw new Error(
      'این حساب هنوز برای ورود آفلاین روی این سیستم فعال نشده است. لطفاً یک‌بار با اینترنت وارد شوید.',
    );
  }

  const passwordHash = await hashPassword(normalizedUsername, password);

  if (passwordHash !== record.passwordHash) {
    throw new Error('نام کاربری یا رمز عبور آفلاین اشتباه است.');
  }

  if (!record.profile?.is_active) {
    throw new Error('حساب کاربری شما غیرفعال است.');
  }

  const now = new Date().toISOString();

  users[normalizedUsername] = {
    ...record,
    lastLoginAt: now,
  };

  saveOfflineUsers(users);

  localStorage.setItem(LAST_USERNAME_KEY, normalizedUsername);
  localStorage.setItem(AUTH_MODE_KEY, 'offline');
  localStorage.setItem('nafas_online_profile', JSON.stringify(record.profile));

  return record.profile;
}