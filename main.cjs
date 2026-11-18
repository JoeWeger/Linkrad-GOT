// getontop Linkrad: Taskleisten-App ohne Hauptfenster.
// Zweimal kurz Shift → Rad mit Kunden am Mauszeiger → Kunde anklicken → Rad mit seinen Links → Link öffnet als neuer Tab in Chrome.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, globalShortcut, nativeImage, shell, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { createDoubleShift } = require('./trigger.cjs');
const { createStore, normalizeUrl, blocked } = require('./store.cjs');
const { spawn } = require('node:child_process');

const SIDE = 640;                          // Fenster um den Zeiger
const SHORTCUT = 'Control+Alt+Space';      // Ersatz, falls Doppel-Shift einmal nicht geht

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId('linkrad.getontop');
app.setName('getontop Linkrad');

let store, wheel, editor, tray;
let prefs = { doubleShift: true };
const prefsFile = () => path.join(app.getPath('userData'), 'einstellungen.json');
const logFile = () => path.join(app.getPath('userData'), 'linkrad.log');

function log(...a) {
  const line = `${new Date().toISOString()} ${a.join(' ')}\n`;
  if (!app.isPackaged) process.stdout.write(line);
  try { fs.appendFileSync(logFile(), line); } catch { /* egal */ }
}

// ---------- Rad-Fenster ----------
function createWheel() {
  wheel = new BrowserWindow({
    width: SIDE, height: SIDE, show: false, frame: false, transparent: true, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true, hasShadow: false,
    alwaysOnTop: true, backgroundColor: '#00000000', title: 'Linkrad',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, spellcheck: false },
  });
  wheel.setAlwaysOnTop(true, 'screen-saver');
  wheel.setVisibleOnAllWorkspaces(true);
  wheel.loadFile(path.join(__dirname, 'ui', 'rad.html'));
  wheel.webContents.on('will-navigate', (e) => e.preventDefault());
  wheel.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  wheel.on('blur', () => hideWheel()); // Klick woanders hin: Rad weg
}

let shownAt = 0;
function showWheel() {
  if (wheel.isVisible()) return hideWheel();
  const p = screen.getCursorScreenPoint();
  const wa = screen.getDisplayNearestPoint(p).workArea;
  const x = Math.min(Math.max(p.x - SIDE / 2, wa.x), wa.x + wa.width - SIDE);
  const y = Math.min(Math.max(p.y - SIDE / 2, wa.y), wa.y + wa.height - SIDE);
  wheel.setBounds({ x: Math.round(x), y: Math.round(y), width: SIDE, height: SIDE });
  wheel.webContents.send('show', store.get());
  wheel.show();
  wheel.focus();
  // Windows lässt Hintergrund-Apps manchmal nicht nach vorn: kurz "ganz oben" erzwingen
  wheel.moveTop();
  shownAt = Date.now();
}
function hideWheel() {
  if (!wheel?.isVisible()) return;
  wheel.webContents.send('hide');
  wheel.hide();
}

// ---------- Bearbeiten-Fenster ----------
function openEditor() {
  hideWheel();
  if (editor && !editor.isDestroyed()) { editor.show(); editor.focus(); return; }
  editor = new BrowserWindow({
    width: 980, height: 680, minWidth: 720, minHeight: 480, show: false, title: 'Kunden & Links · getontop Linkrad',
    backgroundColor: '#F2F5F9', autoHideMenuBar: true, icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  });
  editor.setMenu(null);
  editor.loadFile(path.join(__dirname, 'ui', 'editor.html'));
  editor.webContents.on('will-navigate', (e) => e.preventDefault());
  editor.webContents.setWindowOpenHandler(({ url }) => { openTarget(url); return { action: 'deny' }; });
  editor.once('ready-to-show', () => editor.show());
}

// ---------- Links öffnen ----------
// Webadressen immer als neuer Tab in Chrome (läuft Chrome schon, landet der Tab im zuletzt benutzten Fenster).
// Ist Chrome nicht installiert, nimmt Windows den Standard-Browser.
function findChrome() {
  if (process.env.LR_CHROME && fs.existsSync(process.env.LR_CHROME)) return process.env.LR_CHROME;
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA || '';
  return [path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    local && path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe')].filter(Boolean).find((p) => fs.existsSync(p)) || null;
}
function openInChrome(url) {
  const chrome = findChrome();
  if (!chrome) return false;
  // Ohne Shell, die Adresse ist ein einzelnes Argument: & und Leerzeichen in Links sind harmlos
  spawn(chrome, [url], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
  return true;
}

async function openTarget(raw) {
  const url = normalizeUrl(raw);
  if (!url || blocked(url)) return { error: 'Dieser Link lässt sich nicht öffnen.' };
  try {
    if (/^[a-zA-Z]:[\\/]/.test(url) || url.startsWith('\\\\')) {
      const err = await shell.openPath(url); // Ordner oder Datei, z. B. auf dem Netzlaufwerk
      if (err) return { error: err };
    } else if (/^https?:/i.test(url) && openInChrome(url)) {
      log('Chrome:', url);
    } else {
      await shell.openExternal(url); // mailto:, msteams: … oder kein Chrome da
    }
    log('geöffnet', url);
    return { ok: true };
  } catch (e) {
    log('Fehler beim Öffnen', url, e.message);
    return { error: `Öffnen ging nicht: ${e.message}` };
  }
}

// ---------- IPC ----------
ipcMain.handle('data', () => store.get());
ipcMain.handle('save', (_, next) => {
  const saved = store.save(next);
  log('gespeichert,', saved.clients.length, 'Kunden');
  return saved;
});
ipcMain.handle('open', async (_, url) => {
  hideWheel();
  return openTarget(url);
});
ipcMain.on('hide', () => hideWheel());
ipcMain.on('edit', () => openEditor());
ipcMain.on('try', () => setTimeout(showWheel, 80));
ipcMain.handle('export', async () => {
  const r = await dialog.showSaveDialog(editor, { title: 'Links exportieren', defaultPath: 'Linkrad Kunden.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { canceled: true };
  fs.writeFileSync(r.filePath, JSON.stringify(store.get(), null, 2));
  return { ok: true, path: r.filePath };
});
ipcMain.handle('import', async () => {
  const r = await dialog.showOpenDialog(editor, { title: 'Links importieren', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  try { return { data: JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')) }; } catch (e) { return { error: `Die Datei ist kein gültiges JSON: ${e.message}` }; }
});
ipcMain.on('show-file', () => shell.showItemInFolder(store.file));

// ---------- Doppel-Shift ----------
let hook = null;
function startHook() {
  try {
    const { uIOhook, UiohookKey } = require('uiohook-napi');
    const SHIFTS = new Set([UiohookKey.Shift, UiohookKey.ShiftRight]);
    const ds = createDoubleShift(() => {
      if (!prefs.doubleShift) return;
      log('Doppel-Shift');
      showWheel();
    });
    uIOhook.on('keydown', (e) => ds.down(SHIFTS.has(e.keycode), Date.now()));
    uIOhook.on('keyup', (e) => ds.up(SHIFTS.has(e.keycode), Date.now()));
    uIOhook.on('mousedown', () => ds.mouse());
    uIOhook.start();
    hook = uIOhook;
    log('Tastatur-Hook läuft');
  } catch (e) {
    log('Tastatur-Hook geht nicht:', e.message);
    dialog.showMessageBox({ type: 'warning', title: 'getontop Linkrad', message: 'Zweimal Shift funktioniert auf diesem Rechner gerade nicht.', detail: `Das Rad öffnest du trotzdem mit Strg+Alt+Leertaste.\n\n${e.message}` });
  }
}

// ---------- Taskleiste ----------
function trayIcon() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'build', 'tray.png'));
  const hi = path.join(__dirname, 'build', 'tray@2x.png');
  if (fs.existsSync(hi)) img.addRepresentation({ scaleFactor: 2, buffer: fs.readFileSync(hi) });
  return img;
}
function buildMenu() {
  const login = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'getontop Linkrad', enabled: false },
    { label: 'Zweimal Shift öffnet das Rad', enabled: false },
    { type: 'separator' },
    { label: 'Rad öffnen (Strg+Alt+Leertaste)', click: () => setTimeout(showWheel, 150) },
    { label: 'Kunden & Links bearbeiten …', click: () => openEditor() },
    { type: 'separator' },
    { label: 'Zweimal Shift aktiv', type: 'checkbox', checked: prefs.doubleShift, click: (m) => { prefs.doubleShift = m.checked; savePrefs(); } },
    { label: 'Beim Anmelden starten', type: 'checkbox', checked: login, click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked }) },
    { type: 'separator' },
    { label: 'Beenden', click: () => app.quit() },
  ]));
}
// Links aus der ersten Version („Augenhöhe Linkrad“) übernehmen, falls hier noch keine liegen
function migrateOld() {
  const now = path.join(app.getPath('userData'), 'links.json');
  const old = path.join(app.getPath('appData'), 'Augenhöhe Linkrad', 'links.json');
  try {
    if (!fs.existsSync(now) && fs.existsSync(old)) {
      fs.mkdirSync(path.dirname(now), { recursive: true });
      fs.copyFileSync(old, now);
      prefs.seen = true; savePrefs(); // kennt die App schon
      log('Links aus der alten Version übernommen');
    }
  } catch (e) { log('Übernahme ging nicht:', e.message); }
}
function savePrefs() { try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs, null, 2)); } catch { /* egal */ } }

app.whenReady().then(() => {
  try { prefs = { ...prefs, ...JSON.parse(fs.readFileSync(prefsFile(), 'utf8')) }; } catch { /* Standard */ }
  migrateOld();
  store = createStore(app.getPath('userData'));
  store.load();
  createWheel();
  tray = new Tray(trayIcon());
  tray.setToolTip('getontop Linkrad · zweimal Shift');
  tray.on('click', () => tray.popUpContextMenu());
  tray.on('double-click', () => openEditor());
  buildMenu();
  if (!globalShortcut.register(SHORTCUT, showWheel)) log('Kürzel belegt:', SHORTCUT);
  startHook();
  // Beim ersten Start einmal das Bearbeiten-Fenster zeigen, damit man weiß, wo die Links hinkommen
  if (!prefs.seen) { prefs.seen = true; savePrefs(); if (!process.env.LR_SELFTEST) openEditor(); }
  if (process.env.LR_SELFTEST) selftest();
});

app.on('second-instance', () => openEditor());
app.on('window-all-closed', (e) => e.preventDefault()); // Tray-App läuft weiter
app.on('will-quit', () => { globalShortcut.unregisterAll(); try { hook?.stop(); } catch { /* egal */ } });

// Selbsttest (LR_SELFTEST=1): Rad und Bearbeiten-Fenster rendern, Bildschirmfotos ablegen.
// LR_SELFTEST_WAIT=1 wartet stattdessen auf echtes Doppel-Shift (für den Test mit xdotool).
async function selftest() {
  const out = process.env.LR_SELFTEST_OUT || app.getPath('temp');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shot = async (win, name) => fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());
  try {
    await new Promise((r) => (wheel.webContents.isLoading() ? wheel.webContents.once('did-finish-load', r) : r()));
    if (process.env.LR_SELFTEST_DATA) store.save(JSON.parse(fs.readFileSync(process.env.LR_SELFTEST_DATA, 'utf8')));
    if (process.env.LR_SELFTEST_WAIT) {
      log('warte auf Doppel-Shift');
      for (let i = 0; i < 100 && !wheel.isVisible(); i++) await wait(100);
      log(wheel.isVisible() ? 'Selbsttest: Rad durch Doppel-Shift geöffnet' : 'Selbsttest: kein Rad');
      await wait(300);
      if (wheel.isVisible()) await shot(wheel, 'rad-shift.png');
      return app.quit();
    }
    showWheel(); await wait(500);
    await wheel.webContents.executeJavaScript('window.__hover(1)'); await wait(200);
    await shot(wheel, 'rad-kunden.png');
    await wheel.webContents.executeJavaScript('window.__pick(0)'); await wait(450);
    await wheel.webContents.executeJavaScript('window.__hover(2)'); await wait(200);
    await shot(wheel, 'rad-links.png');
    openEditor();
    await new Promise((r) => editor.webContents.once('did-finish-load', r)); await wait(600);
    await shot(editor, 'editor.png');
    log('Selbsttest ok');
  } catch (e) { log('Selbsttest Fehler', e.stack); process.exitCode = 1; }
  app.quit();
}
