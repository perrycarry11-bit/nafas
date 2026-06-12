const { app, BrowserWindow, Menu, shell, screen } = require('electron');
const path = require('path');
const os = require('os');

const isWindows = process.platform === 'win32';

function isLegacyWindows() {
  if (!isWindows) return false;
  const [major] = os.release().split('.').map(Number);
  // Windows 7 / 8 / 8.1 kernel versions are below 10
  return major < 10;
}

/*
  برای ویندوزهای قدیمی و گرافیک‌های ضعیف‌تر:
  فلگ‌های تکمیلی اضافه شد تا مشکل صفحه سفید، پرش تصویر و رندر در سیستم‌های بدون گرافیک 100% حل شود.
*/
if (isWindows) {
  app.disableHardwareAcceleration();
  
  // تیر خلاص به مشکلات گرافیکی سیستم‌های قدیمی
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');

  app.commandLine.appendSwitch('high-dpi-support', '1');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
}

app.setAppUserModelId('com.nafas.app');

let mainWindow = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

function getWindowSize() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  return {
    width: Math.min(1366, Math.max(1000, Math.floor(width * 0.96))),
    height: Math.min(850, Math.max(680, Math.floor(height * 0.94))),
  };
}

function createWindow() {
  const size = getWindowSize();

  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: 980,
    minHeight: 640,
    center: true,
    show: false,
    backgroundColor: '#eef7f5',
    autoHideMenuBar: true,
    title: 'Nafas',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: false, // در نسخه نهایی بهتر است خاموش باشد
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) return;

    mainWindow.webContents.setZoomFactor(1);
    mainWindow.webContents
      .setVisualZoomLevelLimits(1, 1)
      .catch(() => {});

    const legacyClass = isLegacyWindows() ? 'legacy-windows' : 'modern-windows';

    mainWindow.webContents
      .executeJavaScript(`
        try {
          document.documentElement.classList.add('electron-app', '${legacyClass}');
          document.body.classList.add('electron-app', '${legacyClass}');
          document.body.style.zoom = '1';
        } catch (e) {}
      `)
      .catch(() => {});
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key || '').toLowerCase();
    const isZoomShortcut =
      (input.control || input.meta) &&
      ['+', '=', '-', '_', '0'].includes(key);

    if (isZoomShortcut) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (url !== currentUrl && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('second-instance', () => {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// سپر ضد کرش: جلوگیری از بسته شدن ناگهانی برنامه در صورت بروز خطای ناشناخته در سیستم عامل
process.on('uncaughtException', (error) => {
  console.error('خطای سیستمی مدیریت نشده:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('رد وعده مدیریت نشده:', promise, 'دلیل:', reason);
});