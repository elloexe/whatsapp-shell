'use strict';

const {
  app, BrowserWindow, Menu, Tray, shell, nativeImage, session, dialog,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { Settings } = require('./settings');
const { THEMES, buildCss } = require('./themes');

const WA_URL = 'https://web.whatsapp.com/';
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');
const TRAY_ICON = path.join(__dirname, '..', 'assets', 'tray.png');

const settings = new Settings(app.getPath('userData'));
const customCssFile = path.join(app.getPath('userData'), 'custom.css');

// ---- Startup performance flags (must run before 'ready') ------------------
if (!settings.get('hardwareAcceleration')) app.disableHardwareAcceleration();
// Smoother scrolling & less memory on low-end machines.
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService,CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=1024');
if (process.platform === 'win32') app.setAppUserModelId('dev.local.whatsapp-shell');

// Only one instance: a second launch just focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}

let win = null;
let tray = null;
let cssKey = null;
let quitting = false;
let unread = 0;

// WhatsApp Web refuses "unknown" browsers; present as plain Chrome of the
// same version Electron ships, minus the Electron token.
function chromeUserAgent() {
  const chrome = process.versions.chrome;
  const os = process.platform === 'win32'
    ? 'Windows NT 10.0; Win64; x64'
    : process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`;
}

function currentCss() {
  let css = buildCss(settings.data);
  try { css += '\n/* custom.css */\n' + fs.readFileSync(customCssFile, 'utf8'); } catch { /* none */ }
  return css;
}

async function applyTheme() {
  if (!win || win.isDestroyed()) return;
  const wc = win.webContents;
  try {
    const next = await wc.insertCSS(currentCss());
    if (cssKey) await wc.removeInsertedCSS(cssKey);
    cssKey = next;
  } catch (err) {
    console.error('Theme injection failed:', err);
  }
  const t = THEMES[settings.get('theme')] || THEMES.graphite;
  win.setBackgroundColor(t.bg);
}

function createWindow() {
  const t = THEMES[settings.get('theme')] || THEMES.graphite;
  const b = settings.get('bounds') || {};

  win = new BrowserWindow({
    width: b.width || 1200,
    height: b.height || 800,
    x: b.x, y: b.y,
    minWidth: 640,
    minHeight: 480,
    show: false,
    backgroundColor: t.bg, // no white flash while loading
    icon: ICON,
    title: 'WhatsApp',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:whatsapp', // keeps you logged in
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
      backgroundThrottling: true,
      zoomFactor: settings.get('zoom') || 1,
    },
  });

  if (b.maximized) win.maximize();

  const wc = win.webContents;
  wc.setUserAgent(chromeUserAgent());

  // Inject the theme as early as possible, and again after in-page reloads.
  wc.on('dom-ready', () => { cssKey = null; applyTheme(); });

  win.once('ready-to-show', () => {
    if (!settings.get('startHidden')) win.show();
  });

  // External links open in the real browser, never inside the app.
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith(WA_URL)) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });

  // Unread count comes from the page title, e.g. "(3) WhatsApp".
  win.on('page-title-updated', (e, title) => {
    e.preventDefault();
    const m = /\((\d+)\)/.exec(title);
    const n = m ? parseInt(m[1], 10) : 0;
    if (n > unread && !win.isFocused()) win.flashFrame(true);
    unread = n;
    win.setTitle(n ? `(${n}) WhatsApp` : 'WhatsApp');
    app.setBadgeCount?.(n);
    if (tray) tray.setToolTip(n ? `WhatsApp — ${n} unread` : 'WhatsApp');
  });
  win.on('focus', () => win.flashFrame(false));

  // Remember window size/position.
  const saveBounds = () => {
    if (win.isMinimized()) return;
    settings.set('bounds', { ...win.getNormalBounds(), maximized: win.isMaximized() });
  };
  win.on('resize', saveBounds);
  win.on('move', saveBounds);

  win.on('close', (e) => {
    if (!quitting && settings.get('closeToTray') && tray) {
      e.preventDefault();
      win.hide();
    }
  });

  // If the renderer hangs or crashes, recover instead of freezing forever.
  wc.on('render-process-gone', (_e, details) => {
    console.error('Renderer gone:', details.reason);
    if (details.reason !== 'clean-exit') setTimeout(() => wc.reload(), 1000);
  });
  win.on('unresponsive', async () => {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Wait', 'Reload'],
      defaultId: 1,
      message: 'WhatsApp is not responding.',
      detail: 'Tip: turn on Lite mode (Ctrl+Shift+L) if this happens often.',
    });
    if (response === 1) wc.reload();
  });

  setupContextMenu(wc);
  wc.on('zoom-changed', (_e, dir) => setZoom(wc.getZoomFactor() + (dir === 'in' ? 0.1 : -0.1)));

  win.loadURL(WA_URL);
}

function setupContextMenu(wc) {
  wc.on('context-menu', (_e, p) => {
    const items = [];
    for (const s of p.dictionarySuggestions.slice(0, 5)) {
      items.push({ label: s, click: () => wc.replaceMisspelling(s) });
    }
    if (p.misspelledWord) {
      items.push({ label: 'Add to dictionary', click: () => wc.session.addWordToSpellCheckerDictionary(p.misspelledWord) });
      items.push({ type: 'separator' });
    }
    if (p.linkURL) {
      items.push({ label: 'Open link in browser', click: () => shell.openExternal(p.linkURL) });
      items.push({ type: 'separator' });
    }
    if (p.isEditable) items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' });
    else if (p.selectionText) items.push({ role: 'copy' });
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
}

function setZoom(z) {
  z = Math.min(2, Math.max(0.6, Math.round(z * 10) / 10));
  win.webContents.setZoomFactor(z);
  settings.set('zoom', z);
}

function toggle(key) {
  settings.set(key, !settings.get(key));
  applyTheme();
  buildMenu();
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function pickAccent() {
  const presets = {
    'Theme default': null, Blue: '#7c9cff', Teal: '#4fd1c5', Green: '#34d399', Orange: '#ff8a5c',
    Pink: '#f472b6', Purple: '#a78bfa', Red: '#f87171', Yellow: '#facc15',
  };
  return Object.entries(presets).map(([label, value]) => ({
    label,
    type: 'radio',
    checked: settings.get('accent') === value,
    click: () => { settings.set('accent', value); applyTheme(); },
  }));
}

function editCustomCss() {
  if (!fs.existsSync(customCssFile)) {
    fs.writeFileSync(customCssFile,
      '/* Your own CSS tweaks. Saved changes are applied when you choose\n' +
      '   View > Reload theme (Ctrl+Shift+T). Example:\n\n' +
      '   #side { min-width: 380px !important; }\n*/\n');
  }
  shell.openPath(customCssFile);
}

async function repair() {
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Cancel', 'Clear cache'],
    defaultId: 1,
    message: 'Clear cached files and service workers?',
    detail: 'Fixes endless loading or "update your browser" screens. You stay logged in.',
  });
  if (response !== 1) return;
  const s = session.fromPartition('persist:whatsapp');
  await s.clearCache();
  await s.clearStorageData({ storages: ['serviceworkers', 'cachestorage', 'shadercache'] });
  win.webContents.reloadIgnoringCache();
}

async function logOutCompletely() {
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Cancel', 'Log out'],
    defaultId: 0,
    message: 'Remove all WhatsApp data from this computer?',
    detail: 'You will need to scan the QR code again.',
  });
  if (response !== 1) return;
  await session.fromPartition('persist:whatsapp').clearStorageData();
  win.webContents.reload();
}

function buildMenu() {
  const mod = process.platform === 'darwin' ? 'Cmd' : 'Ctrl';
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Close to tray', type: 'checkbox', checked: settings.get('closeToTray'), click: () => toggle('closeToTray') },
        { label: 'Start hidden in tray', type: 'checkbox', checked: settings.get('startHidden'), click: () => toggle('startHidden') },
        {
          label: 'Start with Windows / at login',
          type: 'checkbox',
          checked: app.getLoginItemSettings().openAtLogin,
          click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
        },
        { type: 'separator' },
        { label: 'Log out and remove data…', click: logOutCompletely },
        { type: 'separator' },
        { label: 'Quit', accelerator: `${mod}+Q`, click: () => { quitting = true; app.quit(); } },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'Theme',
      submenu: [
        ...Object.entries(THEMES).map(([id, t]) => ({
          label: t.label,
          type: 'radio',
          checked: settings.get('theme') === id,
          click: () => { settings.set('theme', id); applyTheme(); },
        })),
        { type: 'separator' },
        { label: 'Accent color', submenu: pickAccent() },
        { type: 'separator' },
        { label: 'Hide chat wallpaper', type: 'checkbox', checked: settings.get('hideBackground'), click: () => toggle('hideBackground') },
        { label: 'Compact layout', type: 'checkbox', checked: settings.get('compact'), click: () => toggle('compact') },
        { type: 'separator' },
        { label: 'Edit custom CSS…', click: editCustomCss },
        { label: 'Reload theme', accelerator: `${mod}+Shift+T`, click: () => { cssKey && win.webContents.removeInsertedCSS(cssKey); cssKey = null; applyTheme(); } },
      ],
    },
    {
      label: 'Performance',
      submenu: [
        { label: 'Lite mode (no animations / blur)', type: 'checkbox', accelerator: `${mod}+Shift+L`, checked: settings.get('lite'), click: () => toggle('lite') },
        {
          label: 'Hardware acceleration (restart)',
          type: 'checkbox',
          checked: settings.get('hardwareAcceleration'),
          click: (item) => {
            settings.set('hardwareAcceleration', item.checked);
            settings.flush();
            quitting = true;
            app.relaunch();
            app.exit(0);
          },
        },
        { type: 'separator' },
        { label: 'Fix loading problems (clear cache)…', click: repair },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: `${mod}+R`, click: () => win.webContents.reload() },
        { type: 'separator' },
        { label: 'Zoom in', accelerator: `${mod}+=`, click: () => setZoom(win.webContents.getZoomFactor() + 0.1) },
        { label: 'Zoom out', accelerator: `${mod}+-`, click: () => setZoom(win.webContents.getZoomFactor() - 0.1) },
        { label: 'Actual size', accelerator: `${mod}+0`, click: () => setZoom(1) },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { label: 'Developer tools', accelerator: 'F12', click: () => win.webContents.toggleDevTools() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  let img = nativeImage.createFromPath(TRAY_ICON);
  if (img.isEmpty()) return;
  if (process.platform === 'darwin') img = img.resize({ width: 18, height: 18 });
  tray = new Tray(img);
  tray.setToolTip('WhatsApp');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open', click: showWindow },
    { label: 'Lite mode', type: 'checkbox', checked: settings.get('lite'), click: () => toggle('lite') },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', () => (win.isVisible() && win.isFocused() ? win.hide() : showWindow()));
}

app.whenReady().then(() => {
  const s = session.fromPartition('persist:whatsapp');
  s.setUserAgent(chromeUserAgent());
  // Allow what WhatsApp needs (notifications, mic for voice notes, camera,
  // clipboard); deny everything else.
  const allowed = new Set(['notifications', 'media', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen']);
  s.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.has(perm)));
  s.setPermissionCheckHandler((_wc, perm) => allowed.has(perm));

  buildMenu();
  createWindow();
  createTray();

  app.on('activate', showWindow);
});

app.on('before-quit', () => { quitting = true; settings.flush(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
