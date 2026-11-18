// Kunden & Links bearbeiten. Jede Änderung wird nach kurzer Pause gespeichert.
const $ = (s) => document.querySelector(s);
const COLORS = ['#173359', '#70FFCF', '#FF6A3D', '#3B82F6', '#8B5CF6', '#E11D48', '#0E9F6E', '#CA8A04', '#94A3B8'];
const COLOR_NAMES = { '#173359': 'Dunkelblau', '#70FFCF': 'Leucht-Mint', '#FF6A3D': 'Leucht-Koralle', '#3B82F6': 'Blau', '#8B5CF6': 'Violett', '#E11D48': 'Rot', '#0E9F6E': 'Grün', '#CA8A04': 'Senf', '#94A3B8': 'Grau' };
// Bekannte Dienste bekommen einen sprechenden Namen
const KNOWN = { 'asana.com': 'Asana', 'trello.com': 'Trello', 'monday.com': 'Monday', 'clickup.com': 'ClickUp', 'notion.so': 'Notion', 'notion.site': 'Notion',
  'atlassian.net': 'Jira', 'linear.app': 'Linear', 'basecamp.com': 'Basecamp', 'drive.google.com': 'Drive', 'docs.google.com': 'Google Docs',
  'sharepoint.com': 'SharePoint', 'dropbox.com': 'Dropbox', 'figma.com': 'Figma', 'miro.com': 'Miro', 'slack.com': 'Slack', 'teams.microsoft.com': 'Teams',
  'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'hubspot.com': 'HubSpot', 'frame.io': 'Frame.io', 'canva.com': 'Canva', 'wetransfer.com': 'WeTransfer' };
const uid = () => Math.random().toString(36).slice(2, 10);

let data = { clients: [] };
let sel = 0;

function guessLabel(url) {
  const u = url.trim();
  if (/^[a-z]:[\\/]|^\\\\/i.test(u)) return u.split(/[\\/]/).filter(Boolean).pop() || 'Ordner';
  if (/^mailto:/i.test(u)) return 'Mail';
  try {
    const h = new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, '');
    for (const [k, v] of Object.entries(KNOWN)) if (h === k || h.endsWith('.' + k)) return v;
    const base = h.split('.').slice(-2, -1)[0] || h;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch { return 'Link'; }
}

// ---------- Speichern ----------
let saveTimer;
const status = (t, err) => { $('#status').textContent = t; $('#status').classList.toggle('err', Boolean(err)); };
function changed(redrawList = true) {
  if (redrawList) drawList();
  status('Ungespeichert …');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}
async function save() {
  try {
    const saved = await window.linkrad.save(data);
    // IDs/Farben aus der gesäuberten Fassung übernehmen, Eingaben aber nicht unter dem Cursor umschreiben
    data.clients.forEach((c, i) => { c.id = saved.clients[i]?.id || c.id; });
    status('Gespeichert');
  } catch (e) { status('Speichern ging nicht', true); }
}
addEventListener('beforeunload', () => { if (saveTimer) { clearTimeout(saveTimer); window.linkrad.save(data); } });

// ---------- Liste der Kunden ----------
function drawList() {
  const ul = $('#clientList');
  ul.replaceChildren();
  data.clients.forEach((c, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sel));
    li.tabIndex = i === sel ? 0 : -1;
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = c.color;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = c.name || 'Ohne Namen';
    const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = c.links.length;
    const mv = document.createElement('span'); mv.className = 'mv';
    mv.append(btn('↑', 'Nach oben', () => move(data.clients, i, -1, true)), btn('↓', 'Nach unten', () => move(data.clients, i, 1, true)));
    li.append(dot, nm, ct, mv);
    li.onclick = (e) => { if (e.target.closest('.mv')) return; select(i); };
    li.onkeydown = (e) => {
      if (e.key === 'ArrowDown' && i < data.clients.length - 1) { e.preventDefault(); select(i + 1, true); }
      if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); select(i - 1, true); }
    };
    ul.append(li);
  });
  $('#empty').hidden = data.clients.length > 0;
  $('#form').hidden = data.clients.length === 0;
}
function btn(text, label, fn, cls = '') {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text; b.title = label; b.setAttribute('aria-label', label); b.className = cls;
  b.onclick = (e) => { e.stopPropagation(); fn(); };
  return b;
}
function move(arr, i, d, isClient) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  if (isClient) { sel = j; drawDetail(); }
  else drawLinks();
  changed();
}
function select(i, focusList = false) {
  sel = i; drawList(); drawDetail();
  if (focusList) $('#clientList').children[i]?.focus();
}

// ---------- Ein Kunde ----------
function drawDetail() {
  const c = data.clients[sel];
  if (!c) return;
  $('#name').value = c.name;
  const sw = $('#swatches');
  sw.replaceChildren();
  for (const col of COLORS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sw'; b.style.background = col;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(c.color.toUpperCase() === col)); b.setAttribute('aria-label', COLOR_NAMES[col]); b.title = COLOR_NAMES[col];
    b.onclick = () => { c.color = col; drawDetail(); changed(); };
    sw.append(b);
  }
  drawLinks();
}

function drawLinks() {
  const c = data.clients[sel];
  const ol = $('#links');
  ol.replaceChildren();
  c.links.forEach((l, i) => {
    const li = document.createElement('li');
    const label = document.createElement('input');
    label.type = 'text'; label.value = l.label; label.placeholder = 'Name'; label.maxLength = 60; label.setAttribute('aria-label', `Name von Link ${i + 1}`);
    const url = document.createElement('input');
    url.type = 'text'; url.value = l.url; url.placeholder = 'https://… oder \\\\server\\ordner'; url.spellcheck = false; url.setAttribute('aria-label', `Adresse von Link ${i + 1}`);
    label.oninput = () => { l.label = label.value; l.auto = false; changed(false); updateCount(); };
    url.oninput = () => {
      l.url = url.value;
      if (!label.value.trim() || l.auto) { l.label = guessLabel(url.value); label.value = l.label; l.auto = true; }
      changed(false);
    };
    const acts = document.createElement('span'); acts.className = 'acts';
    acts.append(
      btn('↗', 'Ausprobieren', () => l.url && window.linkrad.open(l.url), 'ic'),
      btn('↑', 'Nach oben', () => move(c.links, i, -1), 'ic'),
      btn('↓', 'Nach unten', () => move(c.links, i, 1), 'ic'),
      btn('×', 'Link löschen', () => { c.links.splice(i, 1); drawLinks(); changed(); }, 'ic del'),
    );
    li.append(label, url, acts);
    ol.append(li);
  });
  updateCount();
}
function updateCount() {
  const n = data.clients[sel]?.links.length || 0;
  $('#count').textContent = n > 11 ? `· ${n}, ab 12 wird im Rad geblättert` : n ? `· ${n}` : '';
}

$('#name').oninput = () => { data.clients[sel].name = $('#name').value; changed(); };
$('#addClient').onclick = () => {
  const used = new Set(data.clients.map((c) => c.color));
  data.clients.push({ id: uid(), name: 'Neuer Kunde', color: COLORS.find((c) => !used.has(c)) || COLORS[data.clients.length % COLORS.length], links: [] });
  select(data.clients.length - 1);
  changed();
  $('#name').focus(); $('#name').select();
};
$('#addLink').onclick = () => {
  const c = data.clients[sel];
  c.links.push({ id: uid(), label: '', url: '', auto: true });
  drawLinks();
  $('#links').lastElementChild.querySelectorAll('input')[1].focus(); // gleich die Adresse einfügen
};
$('#delClient').onclick = () => {
  const c = data.clients[sel];
  if (!confirm(`„${c.name}“ mit ${c.links.length} Link${c.links.length === 1 ? '' : 's'} löschen?`)) return;
  data.clients.splice(sel, 1);
  sel = Math.max(0, sel - 1);
  drawList(); drawDetail(); changed();
};
$('#export').onclick = async () => { await save(); const r = await window.linkrad.exportFile(); if (r?.ok) status('Exportiert'); };
$('#import').onclick = async () => {
  const r = await window.linkrad.importFile();
  if (r?.error) return status(r.error, true);
  if (!r?.data) return;
  const incoming = Array.isArray(r.data.clients) ? r.data.clients : [];
  const replace = data.clients.length && confirm(`${incoming.length} Kunden gefunden.\n\nOK = deine Liste ersetzen\nAbbrechen = hinten anhängen`);
  data.clients = replace ? incoming : [...data.clients, ...incoming];
  sel = 0; drawList(); drawDetail(); changed();
  status(`${incoming.length} Kunden importiert`);
};
$('#showFile').onclick = () => window.linkrad.showFile();
$('#tryWheel').onclick = async () => { await save(); window.linkrad.tryWheel(); };

(async () => {
  data = await window.linkrad.data();
  drawList(); drawDetail();
  status('Gespeichert');
})();
