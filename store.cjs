// Kunden und Links: eine JSON-Datei im Benutzerordner (%APPDATA%\getontop Linkrad\links.json).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const COLORS = ['#173359', '#70FFCF', '#FF6A3D', '#3B82F6', '#8B5CF6', '#E11D48', '#0E9F6E', '#CA8A04', '#94A3B8'];
const id = () => crypto.randomUUID().slice(0, 8);

const EXAMPLE = {
  version: 1,
  clients: [
    { id: id(), name: 'Beispiel GmbH', color: '#70FFCF', links: [
      { id: id(), label: 'Projekt-Board', url: 'https://app.asana.com/' },
      { id: id(), label: 'Drive-Ordner', url: 'https://drive.google.com/' },
      { id: id(), label: 'Website', url: 'https://example.com/' },
      { id: id(), label: 'Mail', url: 'mailto:kontakt@example.com' },
    ] },
  ],
};

// Eingabe aufräumen: "asana.com/x" → https://asana.com/x, "C:\Projekte" bleibt ein Ordnerpfad
function normalizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('\\\\')) return s; // Windows-Pfad oder Netzlaufwerk
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s;               // hat schon ein Schema
  if (/^[^\s/]+\.[^\s/]+/.test(s)) return 'https://' + s;          // sieht aus wie eine Domain
  return s;
}

// Gefährliche Schemata nie öffnen
const blocked = (u) => /^(javascript|data|vbscript):/i.test(u);

function clean(data) {
  const clients = Array.isArray(data?.clients) ? data.clients : [];
  return {
    version: 1,
    clients: clients.map((c, i) => ({
      id: String(c.id || id()),
      name: String(c.name || 'Ohne Namen').slice(0, 60),
      color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : COLORS[i % COLORS.length],
      links: (Array.isArray(c.links) ? c.links : []).map((l) => ({
        id: String(l.id || id()),
        label: String(l.label || 'Link').slice(0, 60),
        url: normalizeUrl(l.url),
      })).filter((l) => l.url && !blocked(l.url)),
    })),
  };
}

function createStore(dir) {
  const file = path.join(dir, 'links.json');
  let data;
  function load() {
    try { data = clean(JSON.parse(fs.readFileSync(file, 'utf8'))); }
    catch (e) {
      if (fs.existsSync(file)) {
        // Kaputte Datei nicht überschreiben, sondern beiseitelegen
        fs.copyFileSync(file, file.replace(/\.json$/, ` (defekt ${Date.now()}).json`));
      }
      data = clean(EXAMPLE);
      save(data);
    }
    return data;
  }
  function save(next) {
    data = clean(next);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file); // atomar: nie eine halbe Datei
    return data;
  }
  return { file, load, save, get: () => data ?? load() };
}

module.exports = { createStore, clean, normalizeUrl, blocked, COLORS };
