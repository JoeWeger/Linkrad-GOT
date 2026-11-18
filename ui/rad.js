// Linkrad: erster Ring Kunden, zweiter Ring deren Links.
// Maus: anklicken. Tastatur: Pfeile, Enter, Ziffern 1–9, Anfangsbuchstabe, Esc/Rücktaste = zurück.
const NS = 'http://www.w3.org/2000/svg';
const C = 320, R0 = 92, R1 = 236, GAP = 0.028, PAGE = 12;
const svg = document.getElementById('wheel');
const backBtn = document.getElementById('back');
const editBtn = document.getElementById('edit');
const toastEl = document.getElementById('toast');

const S = { data: { clients: [] }, client: null, page: 0, hover: -1, anim: 'enter' };

const el = (name, attrs = {}, text) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
};
function segPath(a0, a1) {
  const p = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)].map((n) => n.toFixed(2));
  const [x0, y0] = p(R1, a0), [x1, y1] = p(R1, a1), [x2, y2] = p(R0, a1), [x3, y3] = p(R0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0}A${R1} ${R1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 ${large} 0 ${x3} ${y3}Z`;
}
// Label auf höchstens zwei Zeilen à ~13 Zeichen bringen
function wrap(label, n) {
  const max = n === 12 ? 12 : n > 8 ? 11 : 14;
  if (label.length <= max) return [label];
  const words = label.split(/\s+/);
  let a = '', i = 0;
  while (i < words.length && (a + ' ' + words[i]).trim().length <= max) a = (a + ' ' + words[i++]).trim();
  if (!a) { a = label.slice(0, max); return [a, cut(label.slice(max), max)]; }
  return [a, cut(words.slice(i).join(' '), max)].filter(Boolean);
}
const cut = (s, max) => (s.length > max ? s.slice(0, max - 1) + '…' : s);
const host = (url) => { try { const u = new URL(url); return u.protocol.startsWith('http') ? u.hostname.replace(/^www\./, '') : u.protocol.replace(':', ''); } catch { return /^[a-z]:|^\\\\/i.test(url) ? 'Ordner' : ''; } };

// Einträge der aktuellen Ebene, mit Seiten bei mehr als 12
function entries() {
  const all = S.client
    ? S.client.links.map((l) => ({ kind: 'link', label: l.label, sub: host(l.url), url: l.url }))
    : S.data.clients.map((c) => ({ kind: 'client', label: c.name, sub: `${c.links.length} Link${c.links.length === 1 ? '' : 's'}`, client: c, color: c.color }));
  if (all.length <= PAGE) return all;
  const per = PAGE - 1, pages = Math.ceil(all.length / per);
  const page = S.page % pages;
  return [...all.slice(page * per, page * per + per), { kind: 'more', label: 'Weitere …', sub: `${page + 1} / ${pages}` }];
}

function draw() {
  const list = entries();
  S.list = list;
  svg.setAttribute('aria-label', S.client ? `Links von ${S.client.name}` : 'Kunden');
  svg.replaceChildren();
  const g = el('g', { class: 'g' + (S.anim ? ' ' + S.anim : '') });
  S.anim = '';
  g.append(el('circle', { cx: C, cy: C, r: R1 + 14, class: 'ring' }));
  const n = list.length;
  if (n) {
    const step = (Math.PI * 2) / n;
    list.forEach((it, i) => {
      const a0 = -Math.PI / 2 + i * step + GAP / 2, a1 = -Math.PI / 2 + (i + 1) * step - GAP / 2;
      const w = el('g', { class: `item ${it.kind}` + (i === S.hover ? ' on' : ''), role: 'menuitem', tabindex: 0, 'data-i': i, 'aria-label': it.kind === 'link' ? `${it.label}, ${it.sub}` : it.label });
      w.append(el('path', { class: 'seg', d: segPath(a0, a1) }));
      const mid = (a0 + a1) / 2, rr = (R0 + R1) / 2 + 6;
      const x = C + rr * Math.cos(mid), y = C + rr * Math.sin(mid);
      const lines = wrap(it.label, n);
      const t = el('text', { x: x.toFixed(1), y: (y - (it.sub ? 7 : 0)).toFixed(1) });
      lines.forEach((ln, li) => t.append(el('tspan', { x: x.toFixed(1), dy: li === 0 ? `${-(lines.length - 1) * 0.55}em` : '1.12em' }, ln)));
      w.append(t);
      if (it.sub) w.append(el('text', { class: 'tag', x: x.toFixed(1), y: (y + 9 + (lines.length - 1) * 9).toFixed(1) }, cut(it.sub, 18)));
      if (it.kind === 'client') {
        // Farbpunkt direkt über dem Namen
        const top = y - 7 - (lines.length - 1) * 9 - 20;
        w.append(el('circle', { class: 'dot', cx: x.toFixed(1), cy: top.toFixed(1), r: 5, fill: it.color }));
      }
      w.addEventListener('click', () => choose(i));
      w.addEventListener('mouseenter', () => { if (S.hover !== i) { S.hover = i; draw(); } });
      w.addEventListener('focus', () => { if (S.hover !== i) { S.hover = i; drawHub(); mark(); } });
      g.append(w);
    });
  }
  const hub = el('circle', { cx: C, cy: C, r: R0 - 10, class: 'hub', role: 'button', 'aria-label': S.client ? 'Zurück zu den Kunden' : 'Schließen' });
  hub.addEventListener('click', () => (S.client ? back() : window.linkrad.hide()));
  g.append(hub, el('g', { id: 'hubtext' }));
  svg.append(g);
  drawHub();
  backBtn.hidden = !S.client;
}

function drawHub() {
  const box = svg.querySelector('#hubtext');
  if (!box) return;
  box.replaceChildren();
  const it = S.list?.[S.hover];
  let small, big;
  if (it) { small = it.kind === 'link' ? (it.sub || 'öffnen') : it.kind === 'more' ? 'nächste Seite' : 'Links zeigen'; big = it.label; }
  else if (S.client) { small = S.client.links.length ? 'Links von' : 'Noch keine Links'; big = S.client.name; }
  else { small = S.data.clients.length ? 'zweimal Shift' : 'Noch keine Kunden'; big = S.data.clients.length ? 'Kunden' : 'Bearbeiten'; }
  // Punkt in der Mitte: Farbe des Kunden, sonst Leucht-Koralle als Akzent
  const color = it?.color || S.client?.color || '#FF6A3D';
  box.append(el('circle', { cx: C, cy: C - 44, r: 4, fill: color.toUpperCase() === '#173359' ? '#fff' : color }));
  // Langer Name: zwei Zeilen, kleinere Schrift
  const lines = big.length <= 11 ? [big] : wrap(big, 12).map((l) => cut(l, 12));
  box.append(el('text', { class: 'hub-s', x: C, y: C - (lines.length > 1 ? 22 : 16) }, cut(small, 18)));
  const t = el('text', { class: 'hub-t' + (big.length <= 9 ? ' big' : lines.length > 1 ? ' two' : ''), x: C, y: C + (lines.length > 1 ? 4 : 12) });
  lines.forEach((ln, i) => t.append(el('tspan', { x: C, dy: i ? '1.15em' : '0' }, ln)));
  box.append(t);
}
function mark() { svg.querySelectorAll('.item').forEach((n) => n.classList.toggle('on', Number(n.dataset.i) === S.hover)); }

async function choose(i) {
  const it = S.list?.[i];
  if (!it) return;
  if (it.kind === 'more') { S.page++; S.hover = -1; S.anim = 'enter'; draw(); return focusFirst(); }
  if (it.kind === 'client') { S.client = it.client; S.page = 0; S.hover = -1; S.anim = 'deeper'; draw(); return focusFirst(); }
  const r = await window.linkrad.open(it.url);
  if (r?.error) toast(r.error);
}
function back() { S.client = null; S.page = 0; S.hover = -1; S.anim = 'enter'; draw(); focusFirst(); }
function focusFirst() { svg.querySelector('.item')?.focus({ preventScroll: true }); }

let toastTimer;
function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.hidden = true), 3000); }

// Tastatur
addEventListener('keydown', (e) => {
  const items = [...svg.querySelectorAll('.item')];
  const cur = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); return S.client ? back() : window.linkrad.hide(); }
  if (e.key === 'Backspace' && S.client) { e.preventDefault(); return back(); }
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Tab'].includes(e.key) && items.length) {
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1;
    items[(Math.max(cur, dir > 0 ? -1 : 0) + dir + items.length) % items.length].focus();
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && cur >= 0) { e.preventDefault(); return choose(cur); }
  if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) { e.preventDefault(); return choose(Number(e.key) - 1); }
  if (e.key.length === 1 && /\p{L}/u.test(e.key)) {
    // Anfangsbuchstabe springt zum nächsten passenden Eintrag
    const k = e.key.toLowerCase();
    for (let s = 1; s <= items.length; s++) {
      const j = (cur + s + items.length) % items.length;
      if (S.list[j]?.label.toLowerCase().startsWith(k)) { items[j].focus(); break; }
    }
  }
});

backBtn.addEventListener('click', back);
editBtn.addEventListener('click', () => window.linkrad.edit());

window.linkrad.onShow((data) => {
  S.data = data; S.client = null; S.page = 0; S.hover = -1; S.anim = 'enter';
  toastEl.hidden = true;
  draw();
  svg.focus({ preventScroll: true }); // Tastatur bereit, aber noch nichts markiert
});
window.linkrad.onHide(() => { S.client = null; });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);

// Für den Selbsttest
window.__hover = (i) => { S.hover = i; draw(); };
window.__pick = (i) => choose(i);
