'use strict';

/* =========================================================
   Veri saklama
   ========================================================= */
const STORE_KEY = 'yks-calisma-v1';

const DEFAULT_STATE = {
  settings: {
    field: null,
    examDate: '2027-06-19T10:15',
    pomoWork: 25,
    pomoBreak: 5,
    pomoLongBreak: 15,
    goalMinutes: 300,
    goalQuestions: 200,
    theme: 'auto',
  },
  topics: {},      // "konuId|konu adı" -> 0..3
  sessions: [],    // {id, date, subject, minutes}
  questions: [],   // {id, date, subject, d, y, b}
  exams: [],       // {id, date, type, name, sections:{key:{d,y}}}
  plan: { week: '', days: [[], [], [], [], [], [], []] }, // {id, subject, note, done}
  mistakes: [],    // {id, date, subject, topic, note, img, solved}
  calc: { type: null, nets: {}, diploma: '', placed: false }, // puan hesaplama girdileri
  camps: null,     // YouTube kampları (ilk açılışta hazır kamplarla doldurulur)
  cards: [],       // bilgi kartları {id, subject, front, back, box, due, created}
  cardLog: {},     // tarih -> tekrar edilen kart sayısı
  examSession: null, // süren deneme modu
  target: {},      // hedef bölüm {name, type, score, rank}
  reminders: { enabled: true, time: '20:00', pomodoro: true },
  sound: { type: 'rain', volume: 0.5, auto: false },
  lastReportWeek: '',
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const s = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE), ...s,
      settings: { ...DEFAULT_STATE.settings, ...(s.settings || {}) },
      plan: s.plan && Array.isArray(s.plan.days) ? s.plan : structuredClone(DEFAULT_STATE.plan),
      calc: { ...DEFAULT_STATE.calc, ...(s.calc || {}) },
      camps: Array.isArray(s.camps) ? s.camps : null,
      cards: Array.isArray(s.cards) ? s.cards : [],
      reminders: { ...DEFAULT_STATE.reminders, ...(s.reminders || {}) },
      sound: { ...DEFAULT_STATE.sound, ...(s.sound || {}) },
    };
  } catch (e) {
    return structuredClone(DEFAULT_STATE);
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('⚠️ Kayıt alanı doldu. Yanlış defterinden bazı fotoğrafları silmeyi dene.');
  }
}

/* =========================================================
   Yardımcılar
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dateStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(str, n) {
  const d = new Date(str + 'T12:00');
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
function fmtDate(str) {
  const d = new Date(str + 'T12:00');
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const weekdayIdx = (d = new Date()) => (d.getDay() + 6) % 7; // Pazartesi = 0

function fmtMin(m) {
  m = Math.round(m);
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} dk`;
  return r ? `${h} sa ${r} dk` : `${h} sa`;
}
const net = (d, y) => (Number(d) || 0) - (Number(y) || 0) / 4;
const fmtNet = n => (Math.round(n * 100) / 100).toLocaleString('tr-TR');

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

function openModal(html) {
  $('#modalBox').innerHTML = html;
  $('#modal').hidden = false;
}
function closeModal() {
  $('#modal').hidden = true;
  $('#modalBox').innerHTML = '';
}
$('#modal').addEventListener('click', e => {
  if (e.target.id === 'modal' && state.settings.field) closeModal();
});

/* ---------- Ders yardımcıları ---------- */
const subjectById = id => SUBJECTS.find(s => s.id === id);
function subjectLabel(id) {
  const s = subjectById(id);
  return s ? `${s.exam} ${s.name}` : 'Diğer';
}
// Her derse sabit bir renk
const SUBJECT_COLORS = {
  tr: '#ef4444', edb: '#e11d48', mat: '#5b4cf0', geo: '#0ea5e9', fiz: '#f59e0b', kim: '#10b981', bio: '#22c55e',
  tar: '#b45309', tar1: '#b45309', tar2: '#92400e', cog: '#0d9488', cog1: '#0d9488', cog2: '#0f766e',
  fel: '#a855f7', din: '#64748b', ydt: '#ec4899',
};
function subjectColor(id) {
  if (!id || id === 'other') return '#8b8fa8';
  return SUBJECT_COLORS[id.replace(/^(tyt|ayt)-/, '')] || '#5b4cf0';
}
const subjectTag = id => `<span class="tag" style="--c:${subjectColor(id)}">${esc(subjectLabel(id))}</span>`;
const stepper = (name, cls = '', max = '') => `<div class="stepper ${cls}"><button type="button" data-step="-1" aria-label="Azalt">−</button>
  <input type="number" min="0" ${max ? `max="${max}"` : ''} name="${name}" value="0" inputmode="numeric">
  <button type="button" data-step="1" aria-label="Arttır">+</button></div>`;
const emptyBox = (ico, msg) => `<div class="empty"><span class="e-ico">${ico}</span>${msg}</div>`;
const pageHead = (title, sub, right = '') =>
  `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right}</div>`;
function ringSvg(pct, size = 110, stroke = 10, grad = 'ringGrad') {
  const r = (size - stroke) / 2, len = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--bg-2)" stroke-width="${stroke}"></circle>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${grad})" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - Math.min(pct, 100) / 100)}"></circle></svg>`;
}

function activeSubjects() {
  const f = FIELDS[state.settings.field] || FIELDS.SAY;
  return SUBJECTS.filter(s => s.exam === 'TYT' || f.ayt.includes(s.id));
}
function subjectOptions(selected) {
  const groups = {};
  activeSubjects().forEach(s => (groups[s.exam] ||= []).push(s));
  return Object.entries(groups).map(([exam, list]) =>
    `<optgroup label="${exam}">${list.map(s =>
      `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${esc(s.exam + ' ' + s.name)}</option>`).join('')}</optgroup>`
  ).join('') + `<option value="other" ${selected === 'other' ? 'selected' : ''}>Diğer / Genel</option>`;
}
function defaultExamType() {
  const f = state.settings.field;
  return f === 'DIL' ? 'YDT' : 'TYT';
}
function aytTypeForField() {
  const f = state.settings.field;
  return f === 'DIL' ? 'YDT' : `AYT-${f || 'SAY'}`;
}

/* ---------- Konu ilerlemesi ---------- */
const STATUS = ['Başlanmadı', 'Çalışılıyor', 'Bitti', 'Tekrar Edildi'];
const topicKey = (sid, t) => `${sid}|${t}`;
const topicStatus = (sid, t) => state.topics[topicKey(sid, t)] || 0;

function subjectProgress(s) {
  const counts = [0, 0, 0, 0];
  s.topics.forEach(t => counts[topicStatus(s.id, t)]++);
  const total = s.topics.length;
  const pct = total ? Math.round(((counts[2] + counts[3]) / total) * 100) : 0;
  return { counts, total, pct };
}
function groupProgress(subjects) {
  const counts = [0, 0, 0, 0];
  let total = 0;
  subjects.forEach(s => {
    const p = subjectProgress(s);
    p.counts.forEach((c, i) => (counts[i] += c));
    total += p.total;
  });
  return { counts, total, pct: total ? Math.round(((counts[2] + counts[3]) / total) * 100) : 0 };
}
function progressBar({ counts, total }) {
  if (!total) return '<div class="bar"></div>';
  return `<div class="bar">${[3, 2, 1].map(i =>
    `<span style="width:${(counts[i] / total) * 100}%;background:var(--s${i})"></span>`).join('')}</div>`;
}

/* ---------- İstatistikler ---------- */
const minutesOn = date => state.sessions.filter(s => s.date === date).reduce((a, s) => a + s.minutes, 0);
const questionsOn = date => state.questions.filter(q => q.date === date).reduce((a, q) => a + q.d + q.y + q.b, 0);

function streak() {
  const active = new Set([...state.sessions.map(s => s.date), ...state.questions.map(q => q.date)]);
  let day = dateStr();
  if (!active.has(day)) day = addDays(day, -1);
  let n = 0;
  while (active.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

function examTotalNet(ex) {
  return (EXAM_SECTIONS[ex.type] || []).reduce((a, sec) => {
    const v = ex.sections[sec.key] || {};
    return a + net(v.d, v.y);
  }, 0);
}

function countdownParts() {
  const target = new Date(state.settings.examDate);
  const diff = target - new Date();
  if (isNaN(diff)) return null;
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, past: true };
  return {
    days: Math.floor(diff / 864e5),
    hours: Math.floor((diff % 864e5) / 36e5),
    mins: Math.floor((diff % 36e5) / 6e4),
  };
}

/* =========================================================
   Grafikler (bağımlılıksız SVG)
   ========================================================= */
function barChart(data, { height = 200, unit = '' } = {}) {
  const W = 400, H = height, pad = { t: 20, r: 6, b: 24, l: 6 };
  const max = Math.max(1, ...data.map(d => d.value));
  const bw = (W - pad.l - pad.r) / data.length;
  const full = H - pad.t - pad.b;
  const bars = data.map((d, i) => {
    const h = (full * d.value) / max;
    const x = pad.l + i * bw + bw * 0.2;
    const w = bw * 0.6;
    const y = H - pad.b - h;
    const isLast = i === data.length - 1;
    return `<rect class="bar-bg" x="${x}" y="${pad.t}" width="${w}" height="${full}" rx="${w / 2.6}"></rect>
      ${h > 0 ? `<rect class="barr ${isLast ? 'today' : ''}" x="${x}" y="${y}" width="${w}" height="${Math.max(h, w / 1.3)}" rx="${w / 2.6}"></rect>` : ''}
      ${d.value ? `<text class="val" x="${x + w / 2}" y="${Math.min(y, H - pad.b - w / 1.3) - 5}" text-anchor="middle">${esc(d.display ?? d.value)}${unit}</text>` : ''}
      <text x="${x + w / 2}" y="${H - 6}" text-anchor="middle" ${isLast ? 'style="font-weight:700;fill:var(--text)"' : ''}>${esc(d.label)}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${bars}</svg>`;
}

function lineChart(data, { height = 240, maxY } = {}) {
  if (!data.length) return emptyBox('📈', 'Deneme ekledikçe net grafiğin burada oluşacak.');
  const W = 400, H = height, pad = { t: 22, r: 18, b: 26, l: 32 };
  const vals = data.map(d => d.value);
  const top = maxY ?? Math.max(...vals);
  const hi = Math.ceil(Math.max(top, 1) / 10) * 10 || 10;
  const lo = 0;
  const x = i => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => lo + (hi - lo) * f);
  const grid = ticks.map(t => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"></line>
    <text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${Math.round(t)}</text>`).join('');
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const every = Math.ceil(data.length / 5);
  const area = `${path} L${x(data.length - 1)},${y(lo)} L${x(0)},${y(lo)} Z`;
  const pts = data.map((d, i) => `<circle class="dot" cx="${x(i)}" cy="${y(d.value)}" r="4.5"><title>${esc(d.label)}: ${fmtNet(d.value)}</title></circle>
    <text class="val" x="${x(i)}" y="${y(d.value) - 8}" text-anchor="middle">${fmtNet(d.value)}</text>
    ${i % every === 0 || i === data.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>` : ''}`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${grid}${data.length > 1 ? `<path class="area" d="${area}"></path>` : ''}<path class="line" d="${path}"></path>${pts}</svg>`;
}

function last7(fn) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(dateStr(), -i);
    out.push({ date: d, label: DAY_SHORT[weekdayIdx(new Date(d + 'T12:00'))], value: fn(d) });
  }
  return out;
}

/* =========================================================
   Yönlendirme
   ========================================================= */
const VIEWS = {};
let currentView = 'home';

let viewParam = null;
function route() {
  const [v, param] = (location.hash || '#home').slice(1).split('/');
  currentView = VIEWS[v] ? v : 'home';
  viewParam = param ? decodeURIComponent(param) : null;
  destroyCampPlayer();
  $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === currentView));
  $$('[data-view-group]').forEach(b => b.classList.toggle('active', b.dataset.viewGroup.split(' ').includes(currentView)));
  if (!$('#modal').hidden && state.settings.field) closeModal();
  render(true);
  window.scrollTo(0, 0);
}
function render(animate = false) {
  destroyCampPlayer();
  $('#app').innerHTML = `<div class="${animate ? 'view' : ''}">${VIEWS[currentView](viewParam)}</div>`;
  if (VIEWS[currentView].after) VIEWS[currentView].after();
  updateTopbar();
}
window.addEventListener('hashchange', route);

function updateTopbar() {
  const c = countdownParts();
  $('#topCountdown').textContent = c ? (c.past ? 'Sınav geçti' : `⏳ ${c.days} gün`) : '';
  $('#sideCount').innerHTML = c ? `<span>YKS'ye kalan</span><b>${c.days} gün</b><span>${c.hours} saat ${c.mins} dakika</span>` : '';
  $('#sideField').textContent = FIELDS[state.settings.field] ? `${FIELDS[state.settings.field].name} alanı` : '';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'İyi geceler 🌙';
  if (h < 12) return 'Günaydın ☀️';
  if (h < 18) return 'İyi çalışmalar 💪';
  return 'İyi akşamlar 🌆';
}

/* =========================================================
   ANA SAYFA
   ========================================================= */
VIEWS.home = () => {
  const today = dateStr();
  const c = countdownParts();
  const mins = minutesOn(today);
  const qs = questionsOn(today);
  const lastExam = [...state.exams].sort((a, b) => b.date.localeCompare(a.date))[0];
  const { goalMinutes, goalQuestions } = state.settings;
  const subs = activeSubjects();
  const tyt = groupProgress(subs.filter(s => s.exam === 'TYT'));
  const ayt = groupProgress(subs.filter(s => s.exam !== 'TYT'));
  const todayPlan = state.plan.days[weekdayIdx()] || [];
  const quote = QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];
  const pct = (a, b) => Math.min(100, Math.round((a / Math.max(b, 1)) * 100));
  const aytName = state.settings.field === 'DIL' ? 'YDT' : 'AYT';

  const st = streak();
  const openMistakes = state.mistakes.filter(m => !m.solved).length;
  const todayLong = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return `
  <section class="hero">
    <div class="hero-top"><span>📅 ${esc(todayLong)}</span><span>${esc(FIELDS[state.settings.field]?.name || '')} alanı</span></div>
    <div class="hero-greet">${greeting()}</div>
    ${c ? (c.past ? '<div class="count-blocks"><div><b>🎉</b><span>Sınav tarihi geçti</span></div></div>' : `
    <div class="count-blocks" id="bigCountdown">
      <div><b>${c.days}</b><span>gün</span></div>
      <div><b>${c.hours}</b><span>saat</span></div>
      <div><b>${c.mins}</b><span>dakika</span></div>
    </div>`) : ''}
    <div class="hero-quote">“${esc(quote)}”</div>
  </section>

  <div class="grid grid-4">
    <div class="card stat"><div class="ic violet">⏱️</div><div><div class="val">${fmtMin(mins)}</div><div class="lbl">Bugün çalışma</div></div></div>
    <div class="card stat"><div class="ic green">✏️</div><div><div class="val">${qs}</div><div class="lbl">Bugün soru</div></div></div>
    <div class="card stat"><div class="ic orange">🔥</div><div><div class="val">${st} gün</div><div class="lbl">Çalışma serisi</div></div></div>
    <div class="card stat"><div class="ic blue">📝</div><div><div class="val">${lastExam ? fmtNet(examTotalNet(lastExam)) : '–'}</div>
      <div class="lbl">Son net${lastExam ? ` · ${esc(EXAM_LABELS[lastExam.type])}` : ''}</div></div></div>
  </div>

  ${state.examSession && state.examSession.phase === 'running' ? `<a href="#exammode" class="card list-item" style="text-decoration:none;color:inherit;border-color:var(--primary)">
    <div class="ic violet" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center">⏱️</div>
    <div class="grow"><b>Süren bir denemen var</b><div class="sub">Devam etmek için dokun</div></div><span class="muted">→</span></a>` : ''}

  ${targetCardHtml()}

  <div class="grid grid-2">
    <div class="card">
      <div class="card-head"><h3>🎯 Bugünkü Hedefler</h3><a class="btn sm" href="#timer">▶ Çalışmaya başla</a></div>
      <div class="rings">
        <div class="ring-sm"><div class="wrap">${ringSvg(pct(mins, goalMinutes))}
          <div class="in"><div><b>%${pct(mins, goalMinutes)}</b><span>${fmtMin(mins)}</span></div></div></div>
          <div class="t">Çalışma</div><div class="muted small">Hedef ${fmtMin(goalMinutes)}</div></div>
        <div class="ring-sm"><div class="wrap">${ringSvg(pct(qs, goalQuestions), 110, 10, 'ringGradOk')}
          <div class="in"><div><b>%${pct(qs, goalQuestions)}</b><span>${qs} soru</span></div></div></div>
          <div class="t">Soru</div><div class="muted small">Hedef ${goalQuestions}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>📖 Konu İlerlemesi</h3><a class="btn sm secondary" href="#topics">Tümü →</a></div>
      <div class="goal-row"><span>TYT</span><span>${tyt.counts[2] + tyt.counts[3]}/${tyt.total} konu · %${tyt.pct}</span></div>${progressBar(tyt)}
      <div class="goal-row"><span>${aytName}</span><span>${ayt.counts[2] + ayt.counts[3]}/${ayt.total} konu · %${ayt.pct}</span></div>${progressBar(ayt)}
      <div class="legend" style="margin-top:14px">
        <span><i style="background:var(--s3)"></i>Tekrar edildi</span>
        <span><i style="background:var(--s2)"></i>Bitti</span>
        <span><i style="background:var(--s1)"></i>Çalışılıyor</span>
      </div>
      ${dueCards().length ? `<a href="#cards" class="list-item" style="text-decoration:none;color:inherit;margin-top:10px;border-top:1px solid var(--border)">
        <div class="ic orange" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center">🃏</div>
        <div class="grow"><b>${dueCards().length} kart</b><div class="sub">bugün tekrar edilmeyi bekliyor</div></div><span class="muted">→</span></a>` : ''}
      ${openMistakes ? `<a href="#mistakes" class="list-item" style="text-decoration:none;color:inherit;margin-top:10px;border-top:1px solid var(--border)">
        <div class="ic red" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center">❌</div>
        <div class="grow"><b>${openMistakes} yanlış soru</b><div class="sub">tekrar edilmeyi bekliyor</div></div><span class="muted">→</span></a>` : ''}
    </div>
  </div>

  <div class="grid grid-2">
    <div class="card">
      <div class="card-head"><h3>⏱️ Son 7 Gün Çalışma</h3><a class="btn sm secondary" href="#stats">📊 Rapor</a></div>
      <div class="muted small" style="margin:-6px 0 6px">Toplam ${fmtMin(last7(minutesOn).reduce((a, d) => a + d.value, 0))}</div>
      ${barChart(last7(minutesOn).map(d => ({ ...d, display: d.value >= 60 ? (d.value / 60).toFixed(1) + 'sa' : d.value + 'dk' })))}
    </div>
    <div class="card">
      <div class="card-head"><h3>✏️ Son 7 Gün Soru</h3><span class="muted small">Toplam ${last7(questionsOn).reduce((a, d) => a + d.value, 0)}</span></div>
      ${barChart(last7(questionsOn))}
    </div>
  </div>

  ${state.camps.length ? `<div class="card">
    <div class="card-head"><h3>🏕️ Kamplarım</h3><a class="btn sm secondary" href="#camps">Tümü →</a></div>
    ${state.camps.slice(0, 4).map(c => { const s2 = campStats(c); return `<a href="#camp/${c.id}" class="list-item" style="text-decoration:none;color:inherit">
      <span class="dot" style="--c:${subjectColor(c.subject)}"></span>
      <div class="grow"><b>${esc(c.name)}</b><div class="sub">${s2.total ? `${s2.done}/${s2.total} video · bugün ${s2.doneToday}/${c.perDay}` : 'Başlamak için aç'}</div>
        <div class="bar" style="margin-top:6px;height:6px"><span style="width:${s2.pct}%;background:${subjectColor(c.subject)}"></span></div></div>
      <span class="pill ${s2.total && s2.doneToday >= c.perDay ? 'ok' : 'warn'}">${s2.total && s2.doneToday >= c.perDay ? '✓ Hedef' : '▶ Devam'}</span></a>`; }).join('')}
  </div>` : ''}

  <div class="card">
    <div class="card-head"><h3>📅 Bugünün Programı · ${DAY_LONG[weekdayIdx()]}</h3><a class="btn sm secondary" href="#plan">Düzenle</a></div>
    ${todayPlan.length ? todayPlan.map(p => `
      <label class="plan-item ${p.done ? 'done' : ''}" style="--c:${subjectColor(p.subject)}">
        <input type="checkbox" data-plan-toggle="${weekdayIdx()}|${p.id}" ${p.done ? 'checked' : ''}>
        <span class="txt"><b>${esc(subjectLabel(p.subject))}</b>${p.note ? ' – ' + esc(p.note) : ''}</span>
      </label>`).join('') : emptyBox('🗓️', 'Bugün için plan yok. <a href="#plan">Program ekle</a>')}
  </div>`;
};

/* =========================================================
   KONULAR
   ========================================================= */
let topicFilter = 'TYT';
VIEWS.topics = () => {
  const subs = activeSubjects();
  const aytName = state.settings.field === 'DIL' ? 'YDT' : 'AYT';
  const shown = subs.filter(s => topicFilter === 'ALL' || (topicFilter === 'TYT' ? s.exam === 'TYT' : s.exam !== 'TYT'));
  const g = groupProgress(shown);
  return `
  ${pageHead('📖 Konu Takibi', 'Durumu değiştirmek için düğmeye dokun: Başlanmadı → Çalışılıyor → Bitti → Tekrar Edildi',
    `<div class="seg">${[['TYT', 'TYT'], ['AYT', aytName], ['ALL', 'Tümü']].map(([k, l]) =>
      `<button data-topic-filter="${k}" class="${topicFilter === k ? 'active' : ''}">${l}</button>`).join('')}</div>`)}
  <div class="grid grid-4" style="margin-bottom:16px">
    <div class="card stat center"><div class="val">%${g.pct}</div><div class="lbl">Tamamlanan</div></div>
    <div class="card stat center"><div class="val" style="color:var(--ok)">${g.counts[3]}</div><div class="lbl">Tekrar edildi</div></div>
    <div class="card stat center"><div class="val" style="color:var(--info)">${g.counts[2]}</div><div class="lbl">Bitti</div></div>
    <div class="card stat center"><div class="val" style="color:var(--warn)">${g.counts[1]}</div><div class="lbl">Çalışılıyor</div></div>
  </div>
  ${shown.map(s => {
    const p = subjectProgress(s);
    return `<details class="subject card" style="--c:${subjectColor(s.id)}" data-subject="${s.id}" ${openSubjects.has(s.id) ? 'open' : ''}>
      <summary><span class="name">${esc(s.name)}<small>${s.exam} · ${p.counts[2] + p.counts[3]}/${p.total} konu</small></span>
        ${progressBar(p)}<span class="pct">%${p.pct}</span><span class="chev">›</span></summary>
      <div class="topic-list">
        ${s.topics.map(t => {
          const st = topicStatus(s.id, t);
          return `<div class="topic"><span>${esc(t)}</span>
            <button class="status-btn st${st}" data-topic="${esc(topicKey(s.id, t))}">${STATUS[st]}</button></div>`;
        }).join('')}
      </div></details>`;
  }).join('')}`;
};
const openSubjects = new Set();
VIEWS.topics.after = () => {
  $$('details.subject').forEach(d => d.addEventListener('toggle', () => {
    d.open ? openSubjects.add(d.dataset.subject) : openSubjects.delete(d.dataset.subject);
  }));
};

/* =========================================================
   SAYAÇ (Pomodoro)
   ========================================================= */
const timer = {
  mode: 'work',         // work | break
  running: false,
  endAt: 0,
  remaining: null,      // ms (duraklatıldığında)
  subject: null,
  cycles: 0,
};
function modeDuration(mode = timer.mode) {
  if (mode === 'work') return state.settings.pomoWork * 60000;
  return (timer.cycles > 0 && timer.cycles % 4 === 0 ? state.settings.pomoLongBreak : state.settings.pomoBreak) * 60000;
}
function timeLeft() {
  if (timer.running) return Math.max(0, timer.endAt - Date.now());
  return timer.remaining ?? modeDuration();
}
function fmtClock(ms) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function logSession(minutes, subject) {
  if (minutes < 1) return;
  state.sessions.push({ id: uid(), date: dateStr(), subject: subject || 'other', minutes: Math.round(minutes) });
  save();
  scheduleReminders();
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch (e) { /* ses desteklenmiyor */ }
}
function notify(msg) {
  toast(msg);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('YKS Çalışma', { body: msg }); } catch (e) { /* yoksay */ }
  }
}
function timerFinished() {
  timer.running = false;
  timer.remaining = null;
  beep();
  if (timer.mode === 'work') {
    logSession(state.settings.pomoWork, timer.subject);
    timer.cycles++;
    timer.mode = 'break';
    focusAuto(false);
    notify('🎉 Çalışma bitti! Mola zamanı.');
  } else {
    timer.mode = 'work';
    notify('💪 Mola bitti, çalışmaya dönelim!');
  }
  if (currentView === 'timer' || currentView === 'home') render();
}
setInterval(() => {
  if (timer.running && timeLeft() <= 0) timerFinished();
  const left = timeLeft();
  document.title = timer.running ? `${fmtClock(left)} · ${timer.mode === 'work' ? 'Çalışma' : 'Mola'}` : 'YKS Çalışma Platformu';
  if (currentView === 'timer') {
    const el = $('#timerTime');
    if (el) el.textContent = fmtClock(left);
    const ring = $('#timerRing');
    if (ring) ring.style.strokeDashoffset = String(ring.dataset.len * (1 - left / modeDuration()));
  }
  if (currentView === 'home' && $('#bigCountdown')) {
    const c = countdownParts();
    if (c && !c.past) $$('#bigCountdown b').forEach((b, i) => (b.textContent = [c.days, c.hours, c.mins][i]));
  }
}, 500);

VIEWS.timer = () => {
  if (!timer.subject) timer.subject = activeSubjects()[0].id;
  const left = timeLeft();
  const R = 112, len = 2 * Math.PI * R;
  const today = dateStr();
  const todays = state.sessions.filter(s => s.date === today);
  const bySubject = {};
  state.sessions.filter(s => s.date >= addDays(today, -6)).forEach(s => (bySubject[s.subject] = (bySubject[s.subject] || 0) + s.minutes));
  const sorted = Object.entries(bySubject).sort((a, b) => b[1] - a[1]);

  const inCycle = timer.cycles % 4 === 0 && timer.cycles > 0 && timer.mode === 'break' ? 4 : timer.cycles % 4;

  return `
  ${pageHead('⏱️ Pomodoro Sayacı', `${state.settings.pomoWork} dk çalışma · ${state.settings.pomoBreak} dk mola · her 4 turda ${state.settings.pomoLongBreak} dk uzun mola`)}
  <div class="grid grid-2">
    <div class="card">
      <label>Çalışılan ders</label>
      <select id="timerSubject" ${timer.running && timer.mode === 'work' ? 'disabled' : ''}>${subjectOptions(timer.subject)}</select>
      <div class="timer-face">
        <div class="ring">
          <svg width="250" height="250" viewBox="0 0 250 250">
            <circle cx="125" cy="125" r="${R}" fill="none" stroke="var(--bg-2)" stroke-width="12"></circle>
            <circle id="timerRing" cx="125" cy="125" r="${R}" fill="none" stroke="url(#${timer.mode === 'work' ? 'ringGrad' : 'ringGradOk'})"
              stroke-width="12" stroke-linecap="round" stroke-dasharray="${len}" data-len="${len}"
              style="stroke-dashoffset:${len * (1 - left / modeDuration())};transition:stroke-dashoffset .5s linear"></circle>
          </svg>
          <div class="inner">
            <div class="timer-mode ${timer.mode === 'break' ? 'break' : ''}">${timer.mode === 'work' ? '📘 Odaklan' : '☕ Mola'}</div>
            <div class="timer-time" id="timerTime">${fmtClock(left)}</div>
            <div class="cycle-dots" title="Tamamlanan turlar">${[0, 1, 2, 3].map(i => `<i class="${i < inCycle ? 'on' : ''}"></i>`).join('')}</div>
          </div>
        </div>
      </div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn lg" data-timer="${timer.running ? 'pause' : 'start'}">${timer.running ? '⏸ Duraklat' : '▶ Başlat'}</button>
      </div>
      <div class="btn-row" style="justify-content:center;margin-top:10px">
        <button class="btn sm secondary" data-timer="finish">⏹ Bitir & Kaydet</button>
        <button class="btn sm ghost" data-timer="skip">⏭ ${timer.mode === 'work' ? 'Molaya geç' : 'Molayı atla'}</button>
      </div>
      <p class="muted small" style="text-align:center;margin-bottom:0">Bu oturumda ${timer.cycles} pomodoro tamamladın</p>
    </div>

    <div>
      ${soundCardHtml()}
      <div class="card">
        <h3>➕ Elle Çalışma Ekle</h3>
        <form id="manualSession">
          <div class="form-row">
            <div><label>Ders</label><select name="subject">${subjectOptions(timer.subject)}</select></div>
          </div>
          <div class="form-row">
            <div><label>Süre (dk)</label><input name="minutes" type="number" min="1" max="900" required></div>
            <div><label>Tarih</label><input name="date" type="date" value="${today}" required></div>
            <div style="flex:0"><button class="btn">Ekle</button></div>
          </div>
        </form>
      </div>
      <div class="card">
        <h3>Bugünkü Oturumlar · ${fmtMin(minutesOn(today))}</h3>
        ${todays.length ? todays.slice().reverse().map(s => `<div class="list-item">
          <span class="dot" style="--c:${subjectColor(s.subject)}"></span>
          <div class="grow"><b>${esc(subjectLabel(s.subject))}</b></div><span class="pill ok">${fmtMin(s.minutes)}</span>
          <button class="btn ghost" data-del-session="${s.id}" title="Sil">🗑</button></div>`).join('')
          : emptyBox('🌱', 'Bugün henüz oturum yok. Sayacı başlat!')}
      </div>
      <div class="card">
        <h3>Son 7 Gün – Ders Dağılımı</h3>
        ${sorted.length ? sorted.map(([sid, m]) => `<div class="goal-row"><span>${esc(subjectLabel(sid))}</span><span>${fmtMin(m)}</span></div>
          <div class="bar"><span style="width:${(m / sorted[0][1]) * 100}%;background:${subjectColor(sid)}"></span></div>`).join('')
          : emptyBox('📊', 'Veri yok.')}
      </div>
    </div>
  </div>`;
};

/* =========================================================
   SORULAR
   ========================================================= */
VIEWS.questions = () => {
  const today = dateStr();
  const weekStart = addDays(today, -6);
  const stats = {};
  state.questions.forEach(q => {
    const s = (stats[q.subject] ||= { d: 0, y: 0, b: 0, week: 0 });
    s.d += q.d; s.y += q.y; s.b += q.b;
    if (q.date >= weekStart) s.week += q.d + q.y + q.b;
  });
  const recent = [...state.questions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 30);
  const total = state.questions.reduce((a, q) => a + q.d + q.y + q.b, 0);

  return `
  ${pageHead('✏️ Soru Takibi', `Toplam ${total.toLocaleString('tr-TR')} soru çözdün`)}
  <div class="card">
    <h3>➕ Soru Ekle</h3>
    <form id="questionForm">
      <div class="form-row">
        <div style="flex:2 1 200px"><label>Ders</label><select name="subject" id="qSubject">${subjectOptions(VIEWS.questions.last)}</select></div>
        <div style="flex:2 1 200px"><label>Konu (isteğe bağlı)</label><select name="topic" id="qTopic">${topicOptions(VIEWS.questions.last || activeSubjects()[0].id)}</select></div>
        <div><label>Tarih</label><input name="date" type="date" value="${today}" required></div>
      </div>
      <div class="form-row">
        <div><label style="color:var(--ok)">✓ Doğru</label>${stepper('d', 'd')}</div>
        <div><label style="color:var(--bad)">✗ Yanlış</label>${stepper('y', 'y')}</div>
        <div><label>○ Boş</label>${stepper('b')}</div>
        <div style="flex:0 0 auto"><button class="btn" style="height:42px">Kaydet</button></div>
      </div>
    </form>
  </div>

  <div class="grid grid-2">
    <div class="card"><h3>📊 Son 7 Gün</h3>${barChart(last7(questionsOn))}</div>
    <div class="card">
      <h3>📚 Ders Bazında</h3>
      <div class="table-wrap"><table>
        <tr><th>Ders</th><th>Hafta</th><th>Toplam</th><th>Başarı</th></tr>
        ${Object.entries(stats).sort((a, b) => (b[1].d + b[1].y + b[1].b) - (a[1].d + a[1].y + a[1].b)).map(([sid, s]) => {
          const t = s.d + s.y + s.b;
          const acc = t ? Math.round((s.d / t) * 100) : 0;
          return `<tr><td>${subjectTag(sid)}</td><td>${s.week}</td><td>${t}</td>
            <td><span class="pill ${acc >= 75 ? 'ok' : acc >= 50 ? 'warn' : 'bad'}">%${acc}</span></td></tr>`;
        }).join('') || `<tr><td colspan="4">${emptyBox('📚', 'Veri yok.')}</td></tr>`}
      </table></div>
    </div>
  </div>

  <div class="card">
    <h3>🕘 Son Kayıtlar</h3>
    ${recent.length ? recent.map(q => `<div class="list-item">
      <span class="dot" style="--c:${subjectColor(q.subject)}"></span>
      <div class="grow"><b>${esc(subjectLabel(q.subject))}</b>
        <div class="sub">${q.topic ? esc(q.topic) + ' · ' : ''}${fmtDate(q.date)} · <span style="color:var(--ok)">${q.d}D</span> · <span style="color:var(--bad)">${q.y}Y</span> · ${q.b}B</div></div>
      <span class="pill ok">${fmtNet(net(q.d, q.y))} net</span>
      <button class="btn ghost" data-del-question="${q.id}" title="Sil">🗑</button></div>`).join('')
    : emptyBox('✏️', 'Henüz soru kaydı yok.')}
  </div>`;
};

/* =========================================================
   DENEMELER
   ========================================================= */
let examFormType = null;
let examChartType = null;
VIEWS.exams = () => {
  examFormType ||= defaultExamType();
  examChartType ||= defaultExamType();
  const secs = EXAM_SECTIONS[examFormType];
  const types = state.settings.field === 'DIL' ? ['TYT', 'YDT'] : ['TYT', aytTypeForField()];
  const allTypes = Object.keys(EXAM_SECTIONS);
  const list = [...state.exams].sort((a, b) => b.date.localeCompare(a.date));
  const chartData = state.exams.filter(e => e.type === examChartType).sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ label: fmtDate(e.date), value: examTotalNet(e) }));
  const maxNet = (EXAM_SECTIONS[examChartType] || []).reduce((a, s) => a + s.max, 0);
  const best = chartData.length ? Math.max(...chartData.map(d => d.value)) : null;
  const avg = chartData.length ? chartData.reduce((a, d) => a + d.value, 0) / chartData.length : null;

  return `
  ${pageHead('📝 Deneme Takibi', 'Netler otomatik hesaplanır: 4 yanlış 1 doğruyu götürür',
    `<a class="btn" href="#exammode">⏱️ ${state.examSession ? 'Süren denemeye dön' : 'Deneme modu'}</a>`)}
  <div class="card">
    <h3>➕ Yeni Deneme</h3>
    <form id="examForm">
      <div class="form-row">
        <div><label>Deneme türü</label><select name="type" id="examType">
          ${allTypes.map(t => `<option value="${t}" ${t === examFormType ? 'selected' : ''}>${EXAM_LABELS[t]}</option>`).join('')}
        </select></div>
        <div><label>Deneme adı / yayın</label><input name="name" placeholder="örn. 3D Türkiye Geneli"></div>
        <div><label>Tarih</label><input name="date" type="date" value="${dateStr()}" required></div>
      </div>
      <div class="table-wrap"><table>
        <tr><th>Bölüm</th><th>Doğru</th><th>Yanlış</th><th>Net</th></tr>
        ${secs.map(s => `<tr>
          <td>${s.name} <span class="muted small">(${s.max})</span></td>
          <td><input type="number" min="0" max="${s.max}" name="d_${s.key}" value="0" data-net-input></td>
          <td><input type="number" min="0" max="${s.max}" name="y_${s.key}" value="0" data-net-input></td>
          <td id="net_${s.key}" style="font-weight:700">0</td></tr>`).join('')}
        <tr><th>Toplam</th><th></th><th></th><th id="netTotal" style="font-size:1.1rem;color:var(--primary)">0</th></tr>
      </table></div>
      <div class="btn-row" style="margin-top:12px"><button class="btn">💾 Denemeyi Kaydet</button></div>
    </form>
  </div>

  <div class="grid grid-2">
  <div class="card">
    <div class="card-head">
      <h3>📈 Net Gelişimi</h3>
      <div class="seg">${[...new Set([...types, ...state.exams.map(e => e.type)])].map(t =>
        `<button data-exam-chart="${t}" class="${t === examChartType ? 'active' : ''}">${EXAM_LABELS[t]}</button>`).join('')}</div>
    </div>
    ${chartData.length ? `<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px">
      <div class="stat center"><div class="val">${chartData.length}</div><div class="lbl">Deneme</div></div>
      <div class="stat center"><div class="val" style="color:var(--primary)">${fmtNet(chartData[chartData.length - 1].value)}</div><div class="lbl">Son net</div></div>
      <div class="stat center"><div class="val" style="color:var(--ok)">${fmtNet(best)}</div><div class="lbl">En iyi</div></div>
      <div class="stat center"><div class="val">${fmtNet(avg)}</div><div class="lbl">Ortalama</div></div>
    </div>` : ''}
    ${lineChart(chartData, { maxY: maxNet })}
  </div>

  <div class="card">
    <h3>🗂️ Tüm Denemeler</h3>
    ${list.length ? list.map(e => `<div class="list-item">
      <div class="ic blue" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:.7rem;color:var(--info)">${esc(e.type.split('-')[0])}</div>
      <div class="grow"><b>${esc(e.name || EXAM_LABELS[e.type])}</b><div class="sub">${fmtDate(e.date)} · ${esc(EXAM_LABELS[e.type])}</div></div>
      <span class="pill ok" style="font-size:.9rem">${fmtNet(examTotalNet(e))}</span>
      <button class="btn ghost" data-exam-detail="${e.id}" title="Detay">🔍</button>
      <button class="btn ghost" data-del-exam="${e.id}" title="Sil">🗑</button></div>`).join('')
    : emptyBox('📝', 'Henüz deneme yok.')}
  </div>
  </div>`;
};
VIEWS.exams.after = () => {
  const form = $('#examForm');
  const recalc = () => {
    let total = 0;
    EXAM_SECTIONS[examFormType].forEach(s => {
      const n = net(form[`d_${s.key}`].value, form[`y_${s.key}`].value);
      total += n;
      $(`#net_${s.key}`).textContent = fmtNet(n);
    });
    $('#netTotal').textContent = fmtNet(total);
  };
  form.addEventListener('input', recalc);
};

function examDetail(id) {
  const e = state.exams.find(x => x.id === id);
  if (!e) return;
  openModal(`<h3>${esc(EXAM_LABELS[e.type])} – ${esc(e.name || 'Deneme')}</h3>
    <p class="muted small">${fmtDate(e.date)}</p>
    <table><tr><th>Bölüm</th><th>D</th><th>Y</th><th>B</th><th>Net</th></tr>
    ${EXAM_SECTIONS[e.type].map(s => {
      const v = e.sections[s.key] || { d: 0, y: 0 };
      return `<tr><td>${s.name}${v.wrong && v.wrong.length ? `<div class="muted small">Yanlış: ${v.wrong.join(', ')}</div>` : ''}</td><td>${v.d}</td><td>${v.y}</td><td>${s.max - v.d - v.y}</td><td>${fmtNet(net(v.d, v.y))}</td></tr>`;
    }).join('')}
    <tr><th>Toplam</th><th></th><th></th><th></th><th>${fmtNet(examTotalNet(e))}</th></tr></table>
    ${e.type === 'TYT' ? `<p class="small" style="margin:12px 0 0">🧮 Tahmini TYT ham puanı: <b>${fmtPuan(100 + EXAM_SECTIONS.TYT.reduce((a, s) =>
      a + Math.max(0, net(e.sections[s.key]?.d, e.sections[s.key]?.y)) * PUAN.TYT.tyt[s.key], 0))}</b></p>` : ''}
    <div class="btn-row" style="margin-top:14px"><button class="btn" data-close-modal>Kapat</button></div>`);
}

/* =========================================================
   HAFTALIK PROGRAM
   ========================================================= */
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-${Math.ceil(((t - y) / 864e5 + 1) / 7)}`;
}
function checkWeekRollover() {
  const w = isoWeek();
  if (state.plan.week !== w) {
    state.plan.days.forEach(day => day.forEach(p => (p.done = false)));
    state.plan.week = w;
    save();
  }
}

VIEWS.plan = () => {
  checkWeekRollover();
  const td = weekdayIdx();
  const all = state.plan.days.flat();
  const done = all.filter(p => p.done).length;
  return `
  ${pageHead('📅 Haftalık Program', 'Programın her hafta tekrar eder; yeni haftada işaretler kendiliğinden sıfırlanır')}
  <div class="card">
    <div class="goal-row" style="margin-top:0"><span>Bu haftanın ilerlemesi</span><span>${done}/${all.length} görev</span></div>
    <div class="bar"><span style="width:${all.length ? (done / all.length) * 100 : 0}%;background:var(--ok)"></span></div>
  </div>
  <div class="week">
    ${state.plan.days.map((items, i) => `
      <div class="day ${i === td ? 'today' : ''}">
        <h4><span>${DAY_LONG[i]}</span>${i === td ? '<span class="badge">Bugün</span>' : `<span class="muted">${items.filter(p => p.done).length}/${items.length}</span>`}</h4>
        ${items.map(p => `<div class="plan-item ${p.done ? 'done' : ''}" style="--c:${subjectColor(p.subject)}">
          <input type="checkbox" data-plan-toggle="${i}|${p.id}" ${p.done ? 'checked' : ''}>
          <span class="txt"><b>${esc(subjectLabel(p.subject))}</b>${p.note ? '<br>' + esc(p.note) : ''}</span>
          <button class="btn ghost" style="padding:0 4px" data-plan-del="${i}|${p.id}">✕</button></div>`).join('')}
        <button class="btn sm secondary" style="width:100%" data-plan-add="${i}">+ Ekle</button>
      </div>`).join('')}
  </div>`;
};

function planAddModal(day) {
  openModal(`<h3>${DAY_LONG[day]} – Plan Ekle</h3>
    <form id="planForm" data-day="${day}">
      <div class="form-row"><div><label>Ders</label><select name="subject">${subjectOptions()}</select></div></div>
      <div class="form-row"><div><label>Not (konu, saat, kaynak...)</label>
        <input name="note" placeholder="örn. Türev – 40 soru, 19:00-21:00"></div></div>
      <div class="btn-row"><button class="btn">Ekle</button><button type="button" class="btn secondary" data-close-modal>İptal</button></div>
    </form>`);
}

/* =========================================================
   YANLIŞ DEFTERİ
   ========================================================= */
let mistakeFilter = { subject: 'all', solved: 'open' };
VIEWS.mistakes = () => {
  const list = state.mistakes
    .filter(m => mistakeFilter.subject === 'all' || m.subject === mistakeFilter.subject)
    .filter(m => mistakeFilter.solved === 'all' || (mistakeFilter.solved === 'open' ? !m.solved : m.solved))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const first = activeSubjects()[0];
  return `
  ${pageHead('❌ Yanlış Defteri', `${state.mistakes.filter(m => !m.solved).length} soru tekrar edilmeyi bekliyor`)}
  <div class="card">
    <h3>➕ Yanlış Ekle</h3>
    <form id="mistakeForm">
      <div class="form-row">
        <div><label>Ders</label><select name="subject" id="mistakeSubject">${subjectOptions(first.id)}</select></div>
        <div><label>Konu</label><select name="topic" id="mistakeTopic">${topicOptions(first.id)}</select></div>
      </div>
      <div class="form-row"><div><label>Not (neden yanlış yaptın, doğru çözüm...)</label><textarea name="note"></textarea></div></div>
      <div class="form-row">
        <div><label>Soru fotoğrafı (isteğe bağlı)</label><input type="file" name="img" accept="image/*"></div>
        <div style="flex:0"><button class="btn">Ekle</button></div>
      </div>
    </form>
  </div>

  <div class="card">
    <div class="form-row" style="margin:0">
      <div><label>Ders filtresi</label><select id="mFilterSubject"><option value="all">Tüm dersler</option>${subjectOptions(mistakeFilter.subject)}</select></div>
      <div><label>Durum</label><select id="mFilterSolved">
        ${[['open', 'Tekrar edilecekler'], ['solved', 'Öğrenilenler'], ['all', 'Hepsi']].map(([k, l]) =>
          `<option value="${k}" ${mistakeFilter.solved === k ? 'selected' : ''}>${l}</option>`).join('')}
      </select></div>
    </div>
  </div>

  ${list.length ? `<div class="mistake-grid">${list.map(m => `
    <div class="mistake ${m.solved ? 'solved' : ''}" style="--c:${subjectColor(m.subject)}">
      ${m.img ? `<img src="${m.img}" alt="Soru" data-zoom="${m.id}">` : ''}
      <div class="body">
        <div>${subjectTag(m.subject)}</div>
        ${m.topic ? `<b class="small">${esc(m.topic)}</b>` : ''}
        ${m.note ? `<div class="small" style="white-space:pre-wrap">${esc(m.note)}</div>` : ''}
        <div class="muted small" style="margin-top:auto">${fmtDate(m.date)}</div>
        <div class="btn-row">
          <button class="btn sm ${m.solved ? 'secondary' : ''}" data-mistake-toggle="${m.id}">${m.solved ? '↩ Tekrar et' : '✓ Öğrendim'}</button>
          <button class="btn sm ghost" data-del-mistake="${m.id}">🗑 Sil</button>
        </div>
      </div>
    </div>`).join('')}</div>` : `<div class="card">${emptyBox('🎉', 'Bu filtrede kayıt yok.')}</div>`}`;
};
function topicOptions(sid) {
  const s = subjectById(sid);
  return '<option value="">– Konu seç –</option>' + (s ? s.topics.map(t => `<option>${esc(t)}</option>`).join('') : '');
}
VIEWS.mistakes.after = () => {
  $('#mistakeSubject').addEventListener('change', e => ($('#mistakeTopic').innerHTML = topicOptions(e.target.value)));
  $('#mFilterSubject').addEventListener('change', e => { mistakeFilter.subject = e.target.value; render(); });
  $('#mFilterSolved').addEventListener('change', e => { mistakeFilter.solved = e.target.value; render(); });
};

// Fotoğrafı küçültüp sıkıştırarak kaydet (tarayıcı hafızası sınırlı)
function compressImage(file, maxSize = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}


/* =========================================================
   PUAN HESAPLAMA (tahmini)
   ========================================================= */
// nets: { 'TYT.tr': {d, y}, 'AYT-SAY.mat': {d, y}, ... }
function calcNet(nets, exam, key) {
  const v = nets[`${exam}.${key}`] || {};
  return Math.max(0, net(v.d, v.y));
}
function calcScores(type, nets, diploma, placed) {
  const tytRaw = 100 + Object.entries(PUAN.TYT.tyt).reduce((a, [k, c]) => a + calcNet(nets, 'TYT', k) * c, 0);
  let aytRaw = null;
  if (type !== 'TYT') {
    const p = PUAN[type];
    aytRaw = 100
      + Object.entries(PUAN_TYT_IN_AYT).reduce((a, [k, c]) => a + calcNet(nets, 'TYT', k) * c, 0)
      + Object.entries(p.ayt).reduce((a, [k, c]) => a + calcNet(nets, p.aytType, k) * c, 0);
  }
  const dip = Number(diploma);
  const obp = dip >= 50 && dip <= 100 ? dip * 5 : 0;
  const obpAdd = obp * (placed ? 0.06 : 0.12);
  return { tytRaw, aytRaw, obp, obpAdd, tytPlace: tytRaw + obpAdd, aytPlace: aytRaw == null ? null : aytRaw + obpAdd };
}
const fmtPuan = n => (Math.round(n * 1000) / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function netTable(exam) {
  const nets = state.calc.nets;
  return `<div class="table-wrap"><table>
    <tr><th>${esc(EXAM_LABELS[exam])}</th><th>Doğru</th><th>Yanlış</th><th>Net</th></tr>
    ${EXAM_SECTIONS[exam].map(s => {
      const v = nets[`${exam}.${s.key}`] || { d: 0, y: 0 };
      return `<tr><td>${s.name} <span class="muted small">(${s.max})</span></td>
        <td><input type="number" min="0" max="${s.max}" data-calc="${exam}.${s.key}.d" value="${v.d || 0}"></td>
        <td><input type="number" min="0" max="${s.max}" data-calc="${exam}.${s.key}.y" value="${v.y || 0}"></td>
        <td style="font-weight:700">${fmtNet(calcNet(nets, exam, s.key))}</td></tr>`;
    }).join('')}</table></div>`;
}

VIEWS.score = () => {
  const c = state.calc;
  c.type ||= state.settings.field || 'SAY';
  const r = calcScores(c.type, c.nets, c.diploma, c.placed);
  const p = PUAN[c.type];
  const low = r.tytRaw < 150;
  return `
  ${pageHead('🧮 Puan Hesaplama', 'Netlerini gir, tahmini YKS puanını gör')}
  <div class="grid grid-2">
    <div>
      <div class="card">
        <div class="card-head"><h3>Puan türü</h3>
          <button class="btn sm secondary" data-calc-fill>⚡ Son denemelerimden doldur</button></div>
        <div class="seg">${['SAY', 'EA', 'SOZ', 'DIL'].map(t =>
          `<button data-calc-type="${t}" class="${c.type === t ? 'active' : ''}">${PUAN[t].name}</button>`).join('')}</div>
      </div>
      <div class="card">${netTable('TYT')}</div>
      <div class="card">${netTable(p.aytType)}</div>
      <div class="card">
        <h3>🎓 Okul puanı (OBP)</h3>
        <div class="form-row">
          <div><label>Diploma notu (50–100)</label>
            <input type="number" min="50" max="100" step="0.01" data-calc-diploma value="${esc(c.diploma)}" placeholder="örn. 85,5"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;cursor:pointer;color:var(--text);font-weight:500">
          <input type="checkbox" data-calc-placed ${c.placed ? 'checked' : ''} style="width:auto;accent-color:var(--primary)">
          Geçen yıl bir programa yerleştim (OBP katkısı yarıya düşer)</label>
      </div>
    </div>

    <div class="score-result">
      <div class="hero" style="margin-bottom:16px">
        <div class="hero-top"><span>Tahmini yerleştirme puanı</span><span>${esc(p.name)}</span></div>
        <div style="font-size:2.6rem;font-weight:800;margin:8px 0 2px">${fmtPuan(r.aytPlace)}</div>
        <div style="opacity:.9">Ham puan ${fmtPuan(r.aytRaw)}${r.obpAdd ? ` + OBP katkısı ${fmtPuan(r.obpAdd)}` : ''}</div>
        ${state.target && state.target.score && state.target.type === c.type ? `<div style="margin-top:10px;font-weight:700">🎯 ${esc(state.target.name)}: ${
          Number(state.target.score) > r.aytPlace ? `${fmtPuan(Number(state.target.score) - r.aytPlace)} puan kaldı` : 'hedefin üstündesin 🎉'}</div>` : ''}
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="card stat center"><div class="lbl">TYT ham puan</div><div class="val">${fmtPuan(r.tytRaw)}</div></div>
        <div class="card stat center"><div class="lbl">TYT yerleştirme</div><div class="val">${fmtPuan(r.tytPlace)}</div></div>
        <div class="card stat center"><div class="lbl">${esc(p.name)} ham puan</div><div class="val">${fmtPuan(r.aytRaw)}</div></div>
        <div class="card stat center"><div class="lbl">OBP</div><div class="val">${r.obp ? fmtPuan(r.obp) : '–'}</div></div>
      </div>
      ${low ? `<div class="card" style="border-color:var(--warn);background:var(--warn-soft);margin-top:16px">
        ⚠️ <b>TYT puanın 150'nin altında.</b> Lisans programları ve ${esc(p.name)} puanı için TYT'den en az 150 almak gerekir.</div>` : ''}
      <div class="card" style="margin-top:16px">
        <h3>ℹ️ Nasıl hesaplanıyor?</h3>
        <p class="small muted" style="margin:0">Net = Doğru − Yanlış ÷ 4. Ham puan = 100 + her testin neti × katsayısı.
        TYT, ${esc(p.name)} puanına %40, ${p.aytType === 'YDT' ? 'YDT' : 'AYT'} %60 ağırlıkla girer.
        Yerleştirme puanına OBP × 0,12 eklenir (geçen yıl yerleştiysen × 0,06).<br><br>
        <b>Not:</b> ÖSYM katsayıları her yıl adayların ortalamasına göre değişir ve önceden açıklanmaz.
        Buradaki katsayılar yaklaşıktır; gerçek puanın birkaç puan farklı çıkabilir.</p>
      </div>
    </div>
  </div>`;
};
VIEWS.score.after = () => {
  // Yazarken tüm sayfayı yeniden çizmek odağı kaçırır; sadece değişince (blur/enter) güncelle
  $$('[data-calc]').forEach(inp => inp.addEventListener('change', () => {
    const [exam, key, f] = inp.dataset.calc.split('.');
    const max = Number(inp.max);
    const k = `${exam}.${key}`;
    const v = (state.calc.nets[k] ||= { d: 0, y: 0 });
    v[f] = Math.min(max, Math.max(0, parseInt(inp.value, 10) || 0));
    if (v.d + v.y > max) { v[f] = max - (f === 'd' ? v.y : v.d); toast(`Doğru + yanlış ${max}'i geçemez`); }
    save(); renderKeepScroll();
  }));
  $('[data-calc-diploma]').addEventListener('change', e => { state.calc.diploma = e.target.value; save(); renderKeepScroll(); });
  $('[data-calc-placed]').addEventListener('change', e => { state.calc.placed = e.target.checked; save(); renderKeepScroll(); });
};
function renderKeepScroll() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}
function fillCalcFromExams() {
  const c = state.calc;
  const types = ['TYT', PUAN[c.type].aytType];
  let filled = 0;
  types.forEach(t => {
    const last = state.exams.filter(e => e.type === t).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last) return;
    filled++;
    EXAM_SECTIONS[t].forEach(s => {
      const v = last.sections[s.key] || { d: 0, y: 0 };
      c.nets[`${t}.${s.key}`] = { d: v.d, y: v.y };
    });
  });
  save();
  toast(filled ? '✅ Son deneme netlerin dolduruldu' : 'Bu puan türü için kayıtlı deneme yok');
  renderKeepScroll();
}


/* =========================================================
   KAMPLAR (YouTube oynatma listeleri)
   ========================================================= */
// Bağlantıdan oynatma listesi veya video kimliğini çıkar
function parseYouTube(link) {
  try {
    const u = new URL(String(link).trim());
    const list = u.searchParams.get('list');
    if (list) return { kind: 'playlist', ref: list };
    if (/youtu\.be$/.test(u.hostname)) return { kind: 'video', ref: u.pathname.slice(1).split('/')[0] };
    const v = u.searchParams.get('v');
    if (v) return { kind: 'video', ref: v };
    const m = u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/);
    if (m) return { kind: 'video', ref: m[1] };
  } catch (e) { /* geçersiz bağlantı */ }
  return null;
}
function newCamp(name, subject, link, perDay = 2) {
  const yt = parseYouTube(link);
  if (!yt) return null;
  return {
    id: uid(), name: name || 'Yeni Kamp', subject: subject || 'other', link, ...yt, perDay,
    videos: yt.kind === 'video' ? [yt.ref] : [], titles: {}, done: {}, logTime: true, created: dateStr(),
  };
}
const campById = id => state.camps.find(c => c.id === id);
function campStats(c) {
  const total = c.videos.length;
  const done = c.videos.filter(v => c.done[v]).length;
  const today = dateStr();
  const doneToday = Object.values(c.done).filter(d => d === today).length;
  const remaining = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const daysLeft = c.perDay > 0 ? Math.ceil(remaining / c.perDay) : null;
  const finish = daysLeft != null && remaining > 0 ? addDays(today, Math.max(0, daysLeft - (doneToday >= c.perDay ? 0 : 1))) : null;
  return { total, done, doneToday, remaining, pct, finish };
}
const ytThumb = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
const campThumb = c => c.videos.length ? ytThumb(c.videos.find(v => !c.done[v]) || c.videos[0]) : '';

function campCard(c) {
  const st = campStats(c);
  return `<a href="#camp/${c.id}" class="card camp-card" style="--c:${subjectColor(c.subject)}">
    <div class="camp-thumb">${c.videos.length ? `<img src="${campThumb(c)}" alt="" loading="lazy">` : '<span>▶</span>'}
      ${st.total ? `<b class="camp-badge">${st.done}/${st.total}</b>` : ''}</div>
    <div class="camp-body">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <b class="camp-name">${esc(c.name)}</b>${subjectTag(c.subject)}</div>
      <div class="bar" style="margin:10px 0 6px"><span style="width:${st.pct}%;background:var(--c)"></span></div>
      <div class="sub muted small">${st.total ? `%${st.pct} tamamlandı · bugün ${st.doneToday}/${c.perDay} video` : 'Açınca video listesi yüklenecek'}</div>
    </div></a>`;
}

VIEWS.camps = () => `
  ${pageHead('🏕️ Kamplar', 'YouTube oynatma listelerini kampa dönüştür, her gün hedefini tamamla',
    '<button class="btn" data-camp-new>+ Yeni kamp</button>')}
  ${state.camps.length ? `<div class="camp-grid">${state.camps.map(campCard).join('')}</div>`
    : `<div class="card">${emptyBox('🏕️', 'Henüz kamp yok. Bir YouTube oynatma listesi ekleyerek başla.')}</div>`}`;

function campFormModal(c) {
  openModal(`<h3>${c ? 'Kampı düzenle' : 'Yeni kamp'}</h3>
    <form id="campForm" data-id="${c ? c.id : ''}">
      <div class="form-row"><div><label>Kamp adı</label><input name="name" required value="${esc(c ? c.name : '')}" placeholder="örn. TYT Matematik Kampı"></div></div>
      <div class="form-row"><div><label>Ders</label><select name="subject">${subjectOptions(c ? c.subject : undefined)}</select></div></div>
      ${c ? '' : `<div class="form-row"><div><label>YouTube oynatma listesi veya video bağlantısı</label>
        <input name="link" required placeholder="https://youtube.com/playlist?list=..."></div></div>`}
      <div class="form-row">
        <div><label>Günlük video hedefi</label><input name="perDay" type="number" min="1" max="50" value="${c ? c.perDay : 2}"></div>
      </div>
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer;color:var(--text);font-weight:500;margin-bottom:14px">
        <input type="checkbox" name="logTime" ${!c || c.logTime ? 'checked' : ''} style="width:auto;accent-color:var(--primary)">
        Biten videoların süresini çalışma süreme ekle</label>
      <div class="btn-row"><button class="btn">${c ? 'Kaydet' : 'Kampı oluştur'}</button>
        <button type="button" class="btn secondary" data-close-modal>İptal</button>
        ${c ? `<button type="button" class="btn danger" data-camp-delete="${c.id}" style="margin-left:auto">Sil</button>` : ''}</div>
    </form>`);
}

VIEWS.camp = id => {
  const c = campById(id);
  if (!c) return `<div class="card">${emptyBox('🤷', 'Kamp bulunamadı. <a href="#camps">Kamplara dön</a>')}</div>`;
  return `
  <div class="page-head"><div>
    <a href="#camps" class="muted small" style="text-decoration:none">← Kamplar</a>
    <h1>${esc(c.name)}</h1><p>${subjectTag(c.subject)}</p></div>
    <div class="btn-row">
      <a class="btn sm secondary" href="${esc(c.link)}" target="_blank" rel="noopener">YouTube'da aç ↗</a>
      <button class="btn sm secondary" data-camp-edit="${c.id}">⚙️ Düzenle</button></div></div>
  <div class="camp-layout">
    <div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="yt-wrap"><div id="ytPlayer"></div>
          <div class="yt-fallback" id="ytFallback">Video oynatıcı yükleniyor…</div></div>
      </div>
      <div id="campSummary"></div>
    </div>
    <div class="card camp-list-card">
      <div class="card-head"><h3>📋 Videolar</h3><span class="muted small" id="campCount"></span></div>
      <div id="campList"></div>
    </div>
  </div>`;
};
VIEWS.camp.after = () => {
  const c = campById(viewParam);
  if (!c) return;
  renderCampParts(c);
  loadCampPlayer(c);
};

function renderCampParts(c) {
  const st = campStats(c);
  const sum = $('#campSummary');
  if (!sum) return;
  const goalPct = Math.min(100, Math.round((st.doneToday / Math.max(c.perDay, 1)) * 100));
  sum.innerHTML = `<div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:16px">
      <div class="card stat center"><div class="val">%${st.pct}</div><div class="lbl">${st.done}/${st.total || '?'} video</div></div>
      <div class="card stat center"><div class="val" style="color:${goalPct >= 100 ? 'var(--ok)' : 'var(--primary)'}">${st.doneToday}/${c.perDay}</div><div class="lbl">Bugünkü hedef</div></div>
      <div class="card stat center"><div class="val" style="font-size:1.05rem">${st.total && !st.remaining ? '🎉 Bitti' : st.finish ? fmtDate(st.finish) : '–'}</div><div class="lbl">Tahmini bitiş</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="goal-row" style="margin-top:0"><span>Kamp ilerlemesi</span><span>${st.remaining} video kaldı</span></div>
      <div class="bar"><span style="width:${st.pct}%;background:${subjectColor(c.subject)}"></span></div>
      <p class="muted small" style="margin:10px 0 0">Bir video sonuna kadar izlenince otomatik işaretlenir. İstersen listeden elle de işaretleyebilirsin.</p>
    </div>`;
  $('#campCount').textContent = st.total ? `${st.done}/${st.total}` : '';
  const list = $('#campList');
  if (!c.videos.length) {
    list.innerHTML = emptyBox('⏳', 'Video listesi oynatıcıdan yükleniyor. İnternet bağlantını kontrol et.');
    return;
  }
  const next = c.videos.findIndex(v => !c.done[v]);
  list.innerHTML = c.videos.map((v, i) => `
    <div class="camp-video ${c.done[v] ? 'done' : ''} ${i === campPlayer.index ? 'playing' : ''} ${i === next ? 'next' : ''}" data-video-idx="${i}">
      <input type="checkbox" data-camp-check="${i}" ${c.done[v] ? 'checked' : ''} aria-label="İzlendi">
      <img src="${ytThumb(v)}" alt="" loading="lazy">
      <div class="grow"><div class="vt">${i + 1}. ${esc(c.titles[v] || 'Video ' + (i + 1))}</div>
        <div class="sub">${c.done[v] ? `✓ ${fmtDate(c.done[v])}` : i === next ? '▶ Sıradaki' : ''}</div></div>
    </div>`).join('');
  const playing = list.querySelector('.playing') || list.querySelector('.next');
  if (playing && !renderCampParts.scrolled) { playing.scrollIntoView({ block: 'nearest' }); renderCampParts.scrolled = true; }
}

/* ---------- YouTube oynatıcı ---------- */
const campPlayer = { player: null, campId: null, index: -1, logged: {} };
let ytApiPromise = null;
function loadYTApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { ytApiPromise = null; reject(new Error('YouTube yüklenemedi')); };
    document.head.appendChild(s);
  });
  return ytApiPromise;
}
function destroyCampPlayer() {
  try { campPlayer.player && campPlayer.player.destroy(); } catch (e) { /* yoksay */ }
  campPlayer.player = null; campPlayer.campId = null; campPlayer.index = -1;
  renderCampParts.scrolled = false;
}
async function loadCampPlayer(c) {
  try { await loadYTApi(); } catch (e) {
    const fb = $('#ytFallback');
    if (fb) fb.innerHTML = `Video oynatıcı yüklenemedi. <a href="${esc(c.link)}" target="_blank" rel="noopener">YouTube'da aç ↗</a>`;
    return;
  }
  if (currentView !== 'camp' || viewParam !== c.id || !$('#ytPlayer')) return;
  const firstUndone = Math.max(0, c.videos.findIndex(v => !c.done[v]));
  const vars = { rel: 0, modestbranding: 1, playsinline: 1, origin: location.origin !== 'null' ? location.origin : undefined };
  const opts = c.kind === 'playlist'
    ? { playerVars: { ...vars, listType: 'playlist', list: c.ref, index: firstUndone } }
    : { videoId: c.ref, playerVars: vars };
  campPlayer.campId = c.id;
  campPlayer.player = new YT.Player('ytPlayer', {
    ...opts, width: '100%', height: '100%',
    events: {
      onReady: () => { $('#ytFallback')?.remove(); syncPlaylist(c); },
      onStateChange: e => onCampState(c, e.data),
      onError: () => toast('⚠️ Bu video oynatılamıyor (gizli veya kaldırılmış olabilir)'),
    },
  });
}
// Oynatıcıdan video listesini alıp kayda geçir, başlıkları getir
function syncPlaylist(c) {
  const p = campPlayer.player;
  if (!p) return;
  const ids = c.kind === 'playlist' ? (p.getPlaylist && p.getPlaylist()) : [c.ref];
  if (!ids || !ids.length) { setTimeout(() => campPlayer.player === p && syncPlaylist(c), 800); return; }
  if (ids.join() !== c.videos.join()) { c.videos = ids; save(); }
  renderCampParts(c);
  fetchTitles(c);
}
async function fetchTitles(c) {
  const missing = c.videos.filter(v => !c.titles[v]);
  for (let i = 0; i < missing.length; i += 6) {
    const batch = missing.slice(i, i + 6);
    const res = await Promise.all(batch.map(v =>
      fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + v)}`)
        .then(r => (r.ok ? r.json() : null)).catch(() => null)));
    if (res.every(r => !r)) break; // tarayıcı izin vermiyorsa denemeyi bırak
    res.forEach((r, j) => { if (r && r.title) c.titles[batch[j]] = r.title; });
    save();
    if (campPlayer.campId === c.id) renderCampParts(c);
  }
}
function onCampState(c, s) {
  const p = campPlayer.player;
  if (!p) return;
  if (s === 1 || s === 0) {
    const idx = c.kind === 'playlist' ? p.getPlaylistIndex() : 0;
    if (idx !== campPlayer.index) { campPlayer.index = idx; renderCampParts(c); }
    // Başlık oynatıcıdan da alınabilir
    const vd = p.getVideoData && p.getVideoData();
    const vid = c.videos[idx];
    if (vd && vd.title && vid && !c.titles[vid]) { c.titles[vid] = vd.title; save(); renderCampParts(c); }
  }
  if (s === 0) { // video bitti
    const idx = campPlayer.index;
    const vid = c.videos[idx];
    if (vid && !c.done[vid]) {
      markCampVideo(c, idx, true, Math.round((p.getDuration() || 0) / 60));
    }
  }
}
function markCampVideo(c, idx, value, minutes = 0) {
  const vid = c.videos[idx];
  if (!vid) return;
  if (value) {
    c.done[vid] = dateStr();
    if (c.logTime && minutes >= 1 && !campPlayer.logged[vid]) {
      campPlayer.logged[vid] = true;
      state.sessions.push({ id: uid(), date: dateStr(), subject: c.subject, minutes });
      scheduleReminders();
    }
    const st = campStats(c);
    if (st.total && !st.remaining) toast('🎉 Tebrikler, kampı bitirdin!');
    else if (st.doneToday === c.perDay) toast('🎯 Bugünkü kamp hedefini tamamladın!');
    else toast(`✅ ${idx + 1}. video izlendi`);
  } else {
    delete c.done[vid];
  }
  save();
  renderCampParts(c);
}

/* =========================================================
   AYARLAR
   ========================================================= */
VIEWS.settings = () => {
  const s = state.settings;
  let usedKb = 0;
  try { usedKb = Math.round((localStorage.getItem(STORE_KEY) || '').length / 1024); } catch (e) { /* yoksay */ }
  return `
  ${pageHead('⚙️ Ayarlar', 'Alanını, hedeflerini ve görünümü düzenle')}
  <div class="card">
    <form id="settingsForm">
      <div class="form-row">
        <div><label>Alan</label><select name="field">
          ${Object.entries(FIELDS).map(([k, f]) => `<option value="${k}" ${s.field === k ? 'selected' : ''}>${f.name}</option>`).join('')}
        </select></div>
        <div><label>Sınav tarihi ve saati</label><input type="datetime-local" name="examDate" value="${esc(s.examDate)}"></div>
      </div>
      <div class="form-row">
        <div><label>Pomodoro çalışma (dk)</label><input type="number" min="1" max="180" name="pomoWork" value="${s.pomoWork}"></div>
        <div><label>Kısa mola (dk)</label><input type="number" min="1" max="60" name="pomoBreak" value="${s.pomoBreak}"></div>
        <div><label>Uzun mola (dk)</label><input type="number" min="1" max="90" name="pomoLongBreak" value="${s.pomoLongBreak}"></div>
      </div>
      <div class="form-row">
        <div><label>Günlük çalışma hedefi (dk)</label><input type="number" min="1" name="goalMinutes" value="${s.goalMinutes}"></div>
        <div><label>Günlük soru hedefi</label><input type="number" min="1" name="goalQuestions" value="${s.goalQuestions}"></div>
        <div><label>Tema</label><select name="theme">
          ${[['auto', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']].map(([k, l]) => `<option value="${k}" ${s.theme === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
      </div>
      <div class="btn-row"><button class="btn">Kaydet</button>
        <button type="button" class="btn secondary" data-notify-perm>🔔 Bildirimlere izin ver</button></div>
    </form>
  </div>

  ${targetSettingsHtml()}
  ${reminderSettingsHtml()}

  <div class="card">
    <h3>💾 Yedekleme</h3>
    <p class="muted small">Tüm veriler sadece bu tarayıcıda saklanır (${usedKb} KB). Başka cihaza geçmek veya kaybetmemek için düzenli yedek al.</p>
    <div class="btn-row">
      <button class="btn" data-export>⬇ Yedeği indir</button>
      <label class="btn secondary" style="margin:0;color:var(--primary);font-size:inherit">⬆ Yedekten yükle
        <input type="file" accept="application/json,.json" id="importFile" hidden></label>
      <button class="btn danger" data-reset>Tüm verileri sil</button>
    </div>
  </div>`;
};
VIEWS.settings.after = () => {
  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.settings) throw new Error('geçersiz');
      if (!confirm('Mevcut verilerin yedekteki verilerle değiştirilecek. Devam edilsin mi?')) return;
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      state = load();
      ensureCamps();
      applyTheme();
      toast('✅ Yedek yüklendi');
      render();
    } catch (err) {
      toast('❌ Dosya okunamadı');
    }
  });
};

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

/* =========================================================
   Olaylar
   ========================================================= */
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-zoom]');
  if (!t) return;
  const d = t.dataset;

  if (d.closeModal !== undefined) return closeModal();

  if (d.step) {
    const input = t.parentElement.querySelector('input');
    const max = input.max ? Number(input.max) : Infinity;
    input.value = Math.min(max, Math.max(0, (parseInt(input.value, 10) || 0) + Number(d.step)));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (d.themeToggle !== undefined) {
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    state.settings.theme = dark ? 'light' : 'dark';
    save(); applyTheme();
    return;
  }
  if (d.more !== undefined) {
    const items = [['exams', '📝', 'Denemeler'], ['questions', '✏️', 'Sorular'], ['plan', '📅', 'Program'], ['mistakes', '❌', 'Yanlış Defteri'], ['cards', '🃏', 'Bilgi Kartları'], ['stats', '📊', 'İstatistikler'], ['score', '🧮', 'Puan Hesapla'], ['settings', '⚙️', 'Ayarlar']];
    openModal(`<h3>Diğer bölümler</h3><div class="more-grid">${items.map(([v, i, l]) =>
      `<a href="#${v}" data-close-link><span class="ico">${i}</span>${l}</a>`).join('')}</div>`);
    return;
  }

  if (d.pickField) {
    state.settings.field = d.pickField;
    save(); closeModal();
    examFormType = examChartType = null;
    return render();
  }

  if (d.topic) {
    state.topics[d.topic] = (topicStatus(...splitKey(d.topic)) + 1) % 4;
    save();
    const scroll = window.scrollY;
    render();
    window.scrollTo(0, scroll);
    return;
  }
  if (d.topicFilter) { topicFilter = d.topicFilter; return render(); }

  // Sayaç
  if (d.timer) {
    if (d.timer === 'start') {
      const sel = $('#timerSubject');
      if (sel) timer.subject = sel.value;
      timer.endAt = Date.now() + timeLeft();
      timer.running = true;
      timer.remaining = null;
    } else if (d.timer === 'pause') {
      timer.remaining = timeLeft();
      timer.running = false;
    } else if (d.timer === 'finish') {
      if (timer.mode === 'work') {
        const elapsed = (modeDuration('work') - timeLeft()) / 60000;
        if (elapsed >= 1) { logSession(elapsed, timer.subject); toast(`✅ ${fmtMin(elapsed)} kaydedildi`); }
        else toast('1 dakikadan kısa oturumlar kaydedilmez');
      }
      timer.running = false; timer.remaining = null; timer.mode = 'work';
    } else if (d.timer === 'skip') {
      timer.running = false; timer.remaining = null;
      if (timer.mode === 'work') timer.cycles++;
      timer.mode = timer.mode === 'work' ? 'break' : 'work';
    }
    focusAuto(timer.running && timer.mode === 'work');
    scheduleTimerNotification();
    return render();
  }
  if (d.delSession) {
    state.sessions = state.sessions.filter(s => s.id !== d.delSession);
    save(); return render();
  }

  if (d.delQuestion) {
    if (!confirm('Bu kayıt silinsin mi?')) return;
    state.questions = state.questions.filter(q => q.id !== d.delQuestion);
    save(); return render();
  }

  if (d.campNew !== undefined) return campFormModal(null);
  if (d.campEdit) return campFormModal(campById(d.campEdit));
  if (d.campDelete) {
    if (!confirm('Bu kamp ve ilerlemesi silinsin mi?')) return;
    state.camps = state.camps.filter(c => c.id !== d.campDelete);
    save(); closeModal(); location.hash = '#camps'; return;
  }

  if (d.calcType) { state.calc.type = d.calcType; save(); return renderKeepScroll(); }
  if (d.calcFill !== undefined) return fillCalcFromExams();

  if (d.examChart) { examChartType = d.examChart; return render(); }
  if (d.examDetail) return examDetail(d.examDetail);
  if (d.delExam) {
    if (!confirm('Bu deneme silinsin mi?')) return;
    state.exams = state.exams.filter(x => x.id !== d.delExam);
    save(); return render();
  }

  if (d.planAdd) return planAddModal(Number(d.planAdd));
  if (d.planDel) {
    const [day, id] = d.planDel.split('|');
    state.plan.days[day] = state.plan.days[day].filter(p => p.id !== id);
    save(); return render();
  }

  if (d.mistakeToggle) {
    const m = state.mistakes.find(x => x.id === d.mistakeToggle);
    if (m) m.solved = !m.solved;
    save(); return render();
  }
  if (d.delMistake) {
    if (!confirm('Bu yanlış silinsin mi?')) return;
    state.mistakes = state.mistakes.filter(x => x.id !== d.delMistake);
    save(); return render();
  }
  if (d.zoom) {
    const m = state.mistakes.find(x => x.id === d.zoom);
    if (m) openModal(`<img src="${m.img}" alt="Soru"><div class="btn-row" style="margin-top:10px"><button class="btn" data-close-modal>Kapat</button></div>`);
    return;
  }

  if (d.export !== undefined) {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `yks-yedek-${dateStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return;
  }
  if (d.reset !== undefined) {
    if (!confirm('TÜM verilerin silinecek. Emin misin?')) return;
    if (!confirm('Bu işlem geri alınamaz. Son kez onaylıyor musun?')) return;
    state = structuredClone(DEFAULT_STATE);
    ensureCamps(); save(); applyTheme(); render(); askField();
    return;
  }
  if (d.notifyPerm !== undefined) {
    if (!('Notification' in window)) return toast('Tarayıcın bildirimleri desteklemiyor');
    Notification.requestPermission().then(p => toast(p === 'granted' ? '🔔 Bildirimler açık' : 'Bildirim izni verilmedi'));
    return;
  }
});

function splitKey(k) {
  const i = k.indexOf('|');
  return [k.slice(0, i), k.slice(i + 1)];
}

document.addEventListener('change', e => {
  const d = e.target.dataset;
  if (d.planToggle) {
    const [day, id] = d.planToggle.split('|');
    const p = state.plan.days[day].find(x => x.id === id);
    if (p) p.done = e.target.checked;
    save(); render();
  }
  if (e.target.id === 'examType') { examFormType = e.target.value; render(); }
  if (e.target.id === 'timerSubject') timer.subject = e.target.value;
  if (d.campCheck !== undefined) {
    const c = campById(viewParam);
    if (c) markCampVideo(c, Number(d.campCheck), e.target.checked);
  }
});

document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const v = name => f.elements[name]?.value;
  const int = name => Math.max(0, parseInt(v(name), 10) || 0);

  if (f.id === 'manualSession') {
    const m = int('minutes');
    if (!m) return toast('Süre gir');
    state.sessions.push({ id: uid(), date: v('date'), subject: v('subject'), minutes: m });
    save(); scheduleReminders(); toast('✅ Çalışma eklendi'); render();
  }

  if (f.id === 'questionForm') {
    const q = { id: uid(), date: v('date'), subject: v('subject'), topic: v('topic') || '', d: int('d'), y: int('y'), b: int('b') };
    if (!q.d && !q.y && !q.b) return toast('Soru sayısı gir');
    VIEWS.questions.last = q.subject;
    state.questions.push(q);
    save(); toast(`✅ ${q.d + q.y + q.b} soru eklendi`); render();
  }

  if (f.id === 'examForm') {
    const sections = {};
    for (const s of EXAM_SECTIONS[examFormType]) {
      const dd = int(`d_${s.key}`), yy = int(`y_${s.key}`);
      if (dd + yy > s.max) return toast(`${s.name}: doğru + yanlış ${s.max}'i geçemez`);
      sections[s.key] = { d: dd, y: yy };
    }
    state.exams.push({ id: uid(), date: v('date'), type: examFormType, name: v('name').trim(), sections });
    examChartType = examFormType;
    save(); toast('✅ Deneme kaydedildi'); render();
  }

  if (f.id === 'planForm') {
    const day = Number(f.dataset.day);
    state.plan.days[day].push({ id: uid(), subject: v('subject'), note: v('note').trim(), done: false });
    save(); closeModal(); render();
  }

  if (f.id === 'mistakeForm') {
    const file = f.elements.img.files[0];
    let img = null;
    if (file) {
      try { img = await compressImage(file); } catch (err) { return toast('Fotoğraf okunamadı'); }
    }
    const note = v('note').trim();
    if (!img && !note) return toast('Not veya fotoğraf ekle');
    state.mistakes.push({ id: uid(), date: dateStr(), subject: v('subject'), topic: v('topic'), note, img, solved: false });
    save(); toast('✅ Yanlış eklendi'); render();
  }

  if (f.id === 'campForm') {
    const perDay = Math.max(1, int('perDay') || 1);
    const logTime = f.elements.logTime.checked;
    if (f.dataset.id) {
      const c = campById(f.dataset.id);
      Object.assign(c, { name: v('name').trim() || c.name, subject: v('subject'), perDay, logTime });
      save(); closeModal(); render(); toast('✅ Kamp güncellendi');
    } else {
      const c = newCamp(v('name').trim(), v('subject'), v('link'), perDay);
      if (!c) return toast('Geçerli bir YouTube bağlantısı gir');
      c.logTime = logTime;
      state.camps.push(c);
      save(); closeModal(); location.hash = `#camp/${c.id}`;
    }
  }

  if (f.id === 'settingsForm') {
    const s = state.settings;
    const oldField = s.field;
    s.field = v('field');
    s.examDate = v('examDate') || s.examDate;
    s.pomoWork = int('pomoWork') || 25;
    s.pomoBreak = int('pomoBreak') || 5;
    s.pomoLongBreak = int('pomoLongBreak') || 15;
    s.goalMinutes = int('goalMinutes') || 300;
    s.goalQuestions = int('goalQuestions') || 200;
    s.theme = v('theme');
    if (oldField !== s.field) { examFormType = examChartType = null; timer.subject = null; }
    if (!timer.running) timer.remaining = null;
    save(); applyTheme(); toast('✅ Ayarlar kaydedildi'); render();
  }
});

// Kamp listesinde videoya dokununca oynat
document.addEventListener('click', e => {
  const row = e.target.closest('[data-video-idx]');
  if (!row || e.target.matches('input')) return;
  const p = campPlayer.player;
  const c = campById(viewParam);
  if (!p || !c || !p.playVideoAt) return;
  const idx = Number(row.dataset.videoIdx);
  if (c.kind === 'playlist') p.playVideoAt(idx); else p.playVideo();
  $('.yt-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// "Daha" menüsünde aynı sayfaya dokunulursa da menüyü kapat
document.addEventListener('click', e => { if (e.target.closest('[data-close-link]')) closeModal(); });

/* =========================================================
   Başlangıç
   ========================================================= */
const FIELD_ICONS = { SAY: '🔬', EA: '⚖️', SOZ: '📜', DIL: '🌍' };
function askField() {
  openModal(`<h2>👋 Hoş geldin!</h2>
    <p>YKS'de hangi alana hazırlanıyorsun? Konular ve denemeler buna göre ayarlanacak. (Sonradan Ayarlar'dan değiştirebilirsin.)</p>
    <div class="field-pick">${Object.entries(FIELDS).map(([k, f]) =>
      `<button data-pick-field="${k}"><span>${FIELD_ICONS[k]}</span>${f.name}</button>`).join('')}</div>`);
}

function ensureCamps() {
  if (!state.camps) { state.camps = SEED_CAMPS.map(c => newCamp(c.name, c.subject, c.link)).filter(Boolean); save(); }
}
