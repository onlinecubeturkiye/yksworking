'use strict';
/* =========================================================
   Ek özellikler: istatistik (takvim, haftalık rapor, zayıf konular),
   hedef bölüm, bilgi kartları, deneme modu, odak sesleri, bildirimler.
   app.js'teki yardımcıları kullanır.
   ========================================================= */

const weekStart = (offset = 0) => addDays(addDays(dateStr(), -weekdayIdx()), -7 * offset);
const inRange = (d, start, days = 7) => d >= start && d <= addDays(start, days - 1);
const pctTxt = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/* =========================================================
   📊 İSTATİSTİKLER: haftalık rapor + çalışma takvimi + zayıf konular
   ========================================================= */
function weekMetrics(start) {
  const sess = state.sessions.filter(s => inRange(s.date, start));
  const qs = state.questions.filter(q => inRange(q.date, start));
  const minutes = sess.reduce((a, s) => a + s.minutes, 0);
  const qTotal = qs.reduce((a, q) => a + q.d + q.y + q.b, 0);
  const qCorrect = qs.reduce((a, q) => a + q.d, 0);
  const bySubject = {};
  sess.forEach(s => (bySubject[s.subject] = (bySubject[s.subject] || 0) + s.minutes));
  const perDay = [...Array(7)].map((_, i) => minutesOn(addDays(start, i)));
  const camps = state.camps.reduce((a, c) => a + Object.values(c.done).filter(d => inRange(d, start)).length, 0);
  const cards = Object.entries(state.cardLog || {}).filter(([d]) => inRange(d, start)).reduce((a, [, n]) => a + n, 0);
  const exams = state.exams.filter(e => inRange(e.date, start)).length;
  const activeDays = perDay.filter(m => m > 0).length;
  return { start, minutes, qTotal, qCorrect, acc: pctTxt(qCorrect, qTotal), bySubject, perDay, camps, cards, exams, activeDays };
}

function delta(cur, prev, fmt = n => String(Math.round(n))) {
  if (!prev && !cur) return '';
  const d = cur - prev;
  const txt = fmt(Math.abs(d));
  if (!d || /^0( |$)/.test(txt)) return '<span class="delta">=</span>';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${txt}</span>`;
}

function weeklyReportHtml(offset = 1) {
  const cur = weekMetrics(weekStart(offset));
  const prev = weekMetrics(weekStart(offset + 1));
  const bestIdx = cur.perDay.indexOf(Math.max(...cur.perDay));
  const subs = Object.entries(cur.bySubject).sort((a, b) => b[1] - a[1]);
  const untouched = activeSubjects().filter(s => !cur.bySubject[s.id]);
  const range = `${fmtDate(cur.start)} – ${fmtDate(addDays(cur.start, 6))}`;
  return `
    <div class="grid grid-4 report-stats">
      <div class="stat center"><div class="val">${fmtMin(cur.minutes)}</div><div class="lbl">Çalışma ${delta(cur.minutes, prev.minutes, fmtMin)}</div></div>
      <div class="stat center"><div class="val">${cur.qTotal}</div><div class="lbl">Soru ${delta(cur.qTotal, prev.qTotal)}</div></div>
      <div class="stat center"><div class="val">%${cur.acc}</div><div class="lbl">Doğruluk ${delta(cur.acc, prev.acc, n => '%' + Math.round(n))}</div></div>
      <div class="stat center"><div class="val">${cur.activeDays}/7</div><div class="lbl">Aktif gün</div></div>
    </div>
    <div class="muted small" style="margin:6px 0 12px">${range} · ${cur.exams} deneme · ${cur.camps} kamp videosu · ${cur.cards} kart tekrarı</div>
    ${cur.minutes ? `<div class="goal-row" style="margin-top:0"><span>En verimli gün</span><span>${DAY_LONG[bestIdx]} · ${fmtMin(cur.perDay[bestIdx])}</span></div>` : ''}
    ${subs.length ? subs.slice(0, 6).map(([sid, m]) => `<div class="goal-row"><span>${esc(subjectLabel(sid))}</span><span>${fmtMin(m)}</span></div>
      <div class="bar"><span style="width:${(m / subs[0][1]) * 100}%;background:${subjectColor(sid)}"></span></div>`).join('')
      : emptyBox('🌱', 'Bu hafta için kayıt yok.')}
    ${untouched.length && cur.minutes ? `<p class="small" style="margin:14px 0 0">💡 Hiç çalışmadığın dersler:
      ${untouched.slice(0, 6).map(s => subjectTag(s.id)).join(' ')}</p>` : ''}`;
}

function heatmapHtml() {
  const today = dateStr();
  const weeks = 53;
  const start = addDays(weekStart(), -7 * (weeks - 1));
  const goal = Math.max(1, state.settings.goalMinutes);
  const mins = {};
  state.sessions.forEach(s => (mins[s.date] = (mins[s.date] || 0) + s.minutes));
  const C = 13, G = 3, L = 26, T = 18;
  let cells = '', months = '', lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      if (day > today) continue;
      const m = mins[day] || 0;
      const lvl = !m ? 0 : m < goal * 0.25 ? 1 : m < goal * 0.5 ? 2 : m < goal ? 3 : 4;
      cells += `<rect x="${L + w * (C + G)}" y="${T + d * (C + G)}" width="${C}" height="${C}" rx="3" class="hm${lvl}${day === today ? ' hm-today' : ''}">
        <title>${fmtDate(day)}: ${m ? fmtMin(m) : 'çalışma yok'}</title></rect>`;
    }
    const mo = new Date(addDays(start, w * 7) + 'T12:00').getMonth();
    if (mo !== lastMonth) {
      lastMonth = mo;
      months += `<text x="${L + w * (C + G)}" y="11">${new Date(2000, mo, 1).toLocaleDateString('tr-TR', { month: 'short' })}</text>`;
    }
  }
  const dayLabels = [0, 2, 4].map(i => `<text x="0" y="${T + i * (C + G) + 10}">${DAY_SHORT[i]}</text>`).join('');
  const W = L + weeks * (C + G), H = T + 7 * (C + G);
  // Özet
  const year = Object.entries(mins).filter(([d]) => d >= start);
  const total = year.reduce((a, [, m]) => a + m, 0);
  const days = Object.keys(mins).sort();
  let best = 0, run = 0, prev = null;
  days.forEach(d => { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return `
    <div class="heat-wrap" id="heatWrap"><svg class="heat" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${months}${dayLabels}${cells}</svg></div>
    <div class="heat-legend"><span>Az</span>${[0, 1, 2, 3, 4].map(i => `<i class="hm${i}"></i>`).join('')}<span>Hedef ✓</span></div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">
      <div class="stat center"><div class="val">${year.length}</div><div class="lbl">Aktif gün</div></div>
      <div class="stat center"><div class="val">${Math.round(total / 60)} sa</div><div class="lbl">Toplam (1 yıl)</div></div>
      <div class="stat center"><div class="val">${best} gün</div><div class="lbl">En uzun seri</div></div>
    </div>`;
}

// Zayıf konular: soru doğruluğu + açık yanlışlar + deneme bölümleri
function weakAnalysis() {
  const topics = {};
  const add = (sid, topic) => (topics[`${sid}|${topic || ''}`] ||= { sid, topic: topic || '', d: 0, t: 0, mistakes: 0 });
  state.questions.forEach(q => { const o = add(q.subject, q.topic); o.d += q.d; o.t += q.d + q.y + q.b; });
  state.mistakes.filter(m => !m.solved).forEach(m => add(m.subject, m.topic).mistakes++);
  const list = Object.values(topics).map(o => {
    const acc = o.t >= 10 ? o.d / o.t : null;
    return { ...o, acc, score: o.mistakes * 1.5 + (acc != null ? (1 - acc) * 10 : 0) };
  }).filter(o => o.score > 0 && (o.acc == null || o.acc < 0.8 || o.mistakes)).sort((a, b) => b.score - a.score);

  // Deneme bölümleri: son 5 denemenin ortalama başarı oranı
  const sections = [];
  Object.keys(EXAM_SECTIONS).forEach(type => {
    const ex = state.exams.filter(e => e.type === type).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    if (!ex.length) return;
    EXAM_SECTIONS[type].forEach(s => {
      const avg = ex.reduce((a, e) => a + Math.max(0, net(e.sections[s.key]?.d, e.sections[s.key]?.y)), 0) / ex.length;
      sections.push({ label: `${EXAM_LABELS[type]} · ${s.name}`, avg, max: s.max, ratio: avg / s.max });
    });
  });
  sections.sort((a, b) => a.ratio - b.ratio);
  return { list, sections };
}

function weakHtml() {
  const { list, sections } = weakAnalysis();
  if (!list.length && !sections.length) {
    return emptyBox('🔍', 'Analiz için soru kaydı (konusuyla birlikte), yanlış defteri veya deneme ekle.');
  }
  return `
    ${list.length ? `<h4 class="sub-h">🎯 Öncelikli konular</h4>
      ${list.slice(0, 8).map((o, i) => `<div class="list-item">
        <span class="rank">${i + 1}</span>
        <div class="grow"><b>${esc(o.topic || 'Konu belirtilmemiş')}</b>
          <div class="sub">${esc(subjectLabel(o.sid))}${o.acc != null ? ` · doğruluk %${Math.round(o.acc * 100)} (${o.t} soru)` : ''}${o.mistakes ? ` · ${o.mistakes} açık yanlış` : ''}</div></div>
        <span class="pill ${o.acc != null && o.acc < 0.5 || o.mistakes >= 3 ? 'bad' : 'warn'}">${o.acc != null && o.acc < 0.5 || o.mistakes >= 3 ? 'Acil' : 'Tekrar'}</span></div>`).join('')}` : ''}
    ${sections.length ? `<h4 class="sub-h">📝 Deneme bölümleri (son 5 deneme)</h4>
      ${sections.slice(0, 6).map(s => `<div class="goal-row"><span>${esc(s.label)}</span><span>${fmtNet(s.avg)} / ${s.max} net</span></div>
        <div class="bar"><span style="width:${Math.round(s.ratio * 100)}%;background:${s.ratio < 0.4 ? 'var(--bad)' : s.ratio < 0.65 ? 'var(--warn)' : 'var(--ok)'}"></span></div>`).join('')}` : ''}
    <p class="muted small" style="margin:12px 0 0">İpucu: Soru eklerken konuyu da seçersen analiz çok daha isabetli olur.</p>`;
}

let reportOffset = 1;
VIEWS.stats = () => `
  ${pageHead('📊 İstatistikler', 'Haftalık rapor, çalışma takvimi ve zayıf konuların')}
  <div class="grid grid-2">
    <div class="card">
      <div class="card-head"><h3>📋 Haftalık Rapor</h3>
        <div class="seg">${[[1, 'Geçen hafta'], [0, 'Bu hafta']].map(([o, l]) =>
          `<button data-report="${o}" class="${reportOffset === o ? 'active' : ''}">${l}</button>`).join('')}</div></div>
      ${weeklyReportHtml(reportOffset)}
    </div>
    <div class="card">
      <h3>🔍 Zayıf Konu Analizi</h3>
      ${weakHtml()}
    </div>
  </div>
  <div class="card" style="margin-top:16px">
    <div class="card-head"><h3>🗓️ Çalışma Takvimi</h3><span class="muted small">Renk koyulaştıkça günlük hedefe yaklaştın</span></div>
    ${heatmapHtml()}
  </div>`;
VIEWS.stats.after = () => { const w = $('#heatWrap'); if (w) w.scrollLeft = w.scrollWidth; };

// Yeni hafta başlayınca geçen haftanın raporunu bir kez göster
function maybeShowWeeklyReport() {
  const w = isoWeek();
  if (state.lastReportWeek === w) return;
  const last = weekMetrics(weekStart(1));
  state.lastReportWeek = w;
  save();
  if (!last.minutes && !last.qTotal) return;
  openModal(`<h3>📋 Geçen haftanın raporu</h3>${weeklyReportHtml(1)}
    <div class="btn-row" style="margin-top:16px"><a class="btn" href="#stats" data-close-link>Detayları gör</a>
    <button class="btn secondary" data-close-modal>Kapat</button></div>`);
}

/* =========================================================
   🎯 HEDEF BÖLÜM
   ========================================================= */
// Son 3 denemenin ortalama netleriyle tahmini puan
function estimateScore(type) {
  const avgNets = examType => {
    const ex = state.exams.filter(e => e.type === examType).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    if (!ex.length) return null;
    const out = {};
    EXAM_SECTIONS[examType].forEach(s => {
      const d = ex.reduce((a, e) => a + (e.sections[s.key]?.d || 0), 0) / ex.length;
      const y = ex.reduce((a, e) => a + (e.sections[s.key]?.y || 0), 0) / ex.length;
      out[`${examType}.${s.key}`] = { d, y };
    });
    return out;
  };
  const tyt = avgNets('TYT');
  if (!tyt) return null;
  if (type === 'TYT') {
    const r = calcScores('SAY', tyt, state.calc.diploma, state.calc.placed);
    return { score: r.tytPlace, partial: false };
  }
  const ayt = avgNets(PUAN[type].aytType);
  const r = calcScores(type, { ...tyt, ...(ayt || {}) }, state.calc.diploma, state.calc.placed);
  return { score: r.aytPlace, partial: !ayt };
}

function targetCardHtml() {
  const t = state.target;
  if (!t || !t.name || !t.score) {
    return `<a href="#settings" class="card list-item" style="text-decoration:none;color:inherit">
      <div class="ic violet" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center">🎯</div>
      <div class="grow"><b>Hedef bölümünü belirle</b><div class="sub">Hedefine kaç puan kaldığını burada gör</div></div><span class="muted">→</span></a>`;
  }
  const est = estimateScore(t.type);
  const target = Number(t.score);
  const pct = est ? Math.min(100, Math.round((est.score / target) * 100)) : 0;
  const diff = est ? target - est.score : null;
  const typeName = t.type === 'TYT' ? 'TYT' : PUAN[t.type].name;
  return `<div class="card target-card">
    <div class="card-head"><h3>🎯 ${esc(t.name)}</h3><span class="tag">${esc(typeName)} · ${fmtPuan(target)}</span></div>
    ${est ? `
      <div class="goal-row" style="margin-top:0"><span>Tahmini puanın${est.partial ? ' (AYT denemesi yok)' : ''}</span><span><b>${fmtPuan(est.score)}</b></span></div>
      <div class="bar" style="height:12px"><span style="width:${pct}%;background:var(--grad)"></span></div>
      <p style="margin:10px 0 0;font-weight:700">${diff > 0
        ? `📈 Hedefe <span style="color:var(--primary)">${fmtPuan(diff)} puan</span> kaldı · yaklaşık ${Math.ceil(diff / 3)} net daha`
        : '🎉 Tahmini puanın hedefinin üstünde! Böyle devam.'}</p>
      ${t.rank ? `<p class="muted small" style="margin:4px 0 0">Hedef sıralama: ${esc(t.rank)}</p>` : ''}
      <p class="muted small" style="margin:6px 0 0">Son 3 denemenin ortalamasından hesaplanır; tahminidir.</p>`
      : emptyBox('📝', 'Tahmini puanını görmek için deneme ekle.')}
  </div>`;
}

function targetSettingsHtml() {
  const t = state.target || {};
  return `<div class="card">
    <h3>🎯 Hedef Bölüm</h3>
    <form id="targetForm">
      <div class="form-row"><div style="flex:2 1 220px"><label>Üniversite / bölüm</label>
        <input name="name" value="${esc(t.name || '')}" placeholder="örn. ODTÜ Bilgisayar Mühendisliği"></div></div>
      <div class="form-row">
        <div><label>Puan türü</label><select name="type">
          ${['SAY', 'EA', 'SOZ', 'DIL', 'TYT'].map(k => `<option value="${k}" ${(t.type || state.settings.field || 'SAY') === k ? 'selected' : ''}>${k === 'TYT' ? 'TYT' : PUAN[k].name}</option>`).join('')}
        </select></div>
        <div><label>Hedef puan (geçen yılın taban puanı)</label><input name="score" type="number" step="0.001" min="100" max="560" value="${esc(t.score || '')}"></div>
        <div><label>Hedef sıralama (isteğe bağlı)</label><input name="rank" value="${esc(t.rank || '')}" placeholder="örn. 5.000"></div>
      </div>
      <div class="btn-row"><button class="btn">Kaydet</button></div>
    </form>
  </div>`;
}

/* =========================================================
   🃏 BİLGİ KARTLARI (aralıklı tekrar)
   ========================================================= */
const CARD_INTERVALS = [0, 1, 3, 7, 15, 30]; // kutu → gün
const dueCards = (subject = 'all') => state.cards.filter(c => c.due <= dateStr() && (subject === 'all' || c.subject === subject));
let cardFilter = 'all';
let cardSession = null;

const SAMPLE_CARDS = [
  ['tyt-mat', 'a² − b² = ?', '(a − b)(a + b)'],
  ['tyt-mat', '(a + b)² = ?', 'a² + 2ab + b²'],
  ['ayt-mat', 'sin²x + cos²x = ?', '1'],
  ['ayt-mat', '(xⁿ)′ = ?', 'n·xⁿ⁻¹'],
  ['tyt-fiz', 'Newton’un 2. yasası', 'F = m·a'],
  ['tyt-kim', 'Avogadro sayısı', '6,02 × 10²³'],
  ['tyt-tr', 'Ünsüz benzeşmesi (sertleşme) nedir?', 'Sert ünsüzle (f, s, t, k, ç, ş, h, p) biten kelimeye c, d, g ile başlayan ek gelince ç, t, k olur: kitap + cı → kitapçı'],
  ['tyt-tar', 'Malazgirt Savaşı', '1071 – Büyük Selçuklu ile Bizans; Anadolu’nun kapıları Türklere açıldı'],
].map(([subject, front, back]) => ({ subject, front, back }));

function newCard(subject, front, back) {
  return { id: uid(), subject, front, back, box: 0, due: dateStr(), created: dateStr() };
}

VIEWS.cards = param => {
  if (param === 'study') return cardStudyHtml();
  const all = state.cards.filter(c => cardFilter === 'all' || c.subject === cardFilter);
  const due = dueCards(cardFilter);
  return `
  ${pageHead('🃏 Bilgi Kartları', 'Formül ve bilgileri kartla çalış; bildiklerin seyrek, bilmediklerin sık sorulur',
    `<button class="btn" data-card-study ${due.length ? '' : 'disabled style="opacity:.5"'}>▶ Çalış (${due.length})</button>`)}
  <div class="grid grid-2">
    <div class="card">
      <h3>➕ Kart Ekle</h3>
      <form id="cardForm">
        <div class="form-row"><div><label>Ders</label><select name="subject">${subjectOptions(cardFilter === 'all' ? undefined : cardFilter)}</select></div></div>
        <div class="form-row"><div><label>Ön yüz (soru)</label><textarea name="front" required placeholder="örn. sin(2x) = ?"></textarea></div></div>
        <div class="form-row"><div><label>Arka yüz (cevap)</label><textarea name="back" required placeholder="örn. 2·sinx·cosx"></textarea></div></div>
        <div class="btn-row"><button class="btn">Kartı ekle</button>
          <button type="button" class="btn secondary" data-card-bulk>📋 Toplu ekle</button></div>
      </form>
    </div>
    <div class="card">
      <div class="card-head"><h3>📦 Kartlarım (${all.length})</h3>
        <select id="cardFilter" style="width:auto"><option value="all">Tüm dersler</option>${subjectOptions(cardFilter)}</select></div>
      <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
        <div class="stat center"><div class="val" style="color:var(--warn)">${due.length}</div><div class="lbl">Bugün</div></div>
        <div class="stat center"><div class="val">${all.filter(c => c.box > 0 && c.box < 4).length}</div><div class="lbl">Öğreniliyor</div></div>
        <div class="stat center"><div class="val" style="color:var(--ok)">${all.filter(c => c.box >= 4).length}</div><div class="lbl">Ezberlendi</div></div>
      </div>
      ${all.length ? `<div class="card-list">${all.slice().reverse().map(c => `<div class="list-item">
        <span class="dot" style="--c:${subjectColor(c.subject)}"></span>
        <div class="grow"><b class="clip">${esc(c.front)}</b><div class="sub clip">${esc(c.back)}</div>
          <div class="sub">${'●'.repeat(c.box)}${'○'.repeat(5 - c.box)} · ${c.due <= dateStr() ? 'bugün' : fmtDate(c.due)}</div></div>
        <button class="btn ghost" data-card-del="${c.id}" title="Sil">🗑</button></div>`).join('')}</div>`
        : `${emptyBox('🃏', 'Henüz kart yok.')}<div style="text-align:center"><button class="btn sm secondary" data-card-samples>Örnek kartları ekle</button></div>`}
    </div>
  </div>`;
};
VIEWS.cards.after = () => {
  $('#cardFilter')?.addEventListener('change', e => { cardFilter = e.target.value; render(); });
  if (viewParam === 'study' && !cardSession) location.hash = '#cards';
};

function startCardSession() {
  const due = dueCards(cardFilter).sort((a, b) => a.box - b.box);
  if (!due.length) return toast('Bugün tekrar edilecek kart yok 🎉');
  cardSession = { queue: due.map(c => c.id), i: 0, shown: false, known: 0, unknown: 0, total: due.length };
  location.hash = '#cards/study';
}

function cardStudyHtml() {
  const s = cardSession;
  if (!s) return '';
  if (s.i >= s.queue.length) {
    return `${pageHead('🃏 Tekrar bitti', '')}
      <div class="card" style="text-align:center;max-width:520px;margin:0 auto">
        <div style="font-size:3rem">🎉</div><h2>Harika!</h2>
        <p>${s.total} kartı tekrar ettin · <b style="color:var(--ok)">${s.known} bildin</b> · <b style="color:var(--bad)">${s.unknown} tekrar</b></p>
        <a class="btn" href="#cards">Kartlara dön</a></div>`;
  }
  const c = state.cards.find(x => x.id === s.queue[s.i]);
  if (!c) { s.i++; return cardStudyHtml(); }
  return `
  <div class="page-head"><div><a href="#cards" class="muted small" style="text-decoration:none">← Kartlar</a>
    <h1>🃏 Tekrar</h1></div><span class="muted">${s.i + 1} / ${s.queue.length}</span></div>
  <div class="bar" style="margin-bottom:16px"><span style="width:${(s.i / s.queue.length) * 100}%;background:var(--grad)"></span></div>
  <div class="flashcard ${s.shown ? 'flipped' : ''}" data-card-flip style="--c:${subjectColor(c.subject)}">
    <div class="fc-tag">${subjectTag(c.subject)}</div>
    <div class="fc-front">${esc(c.front)}</div>
    ${s.shown ? `<div class="fc-sep"></div><div class="fc-back">${esc(c.back)}</div>` : '<div class="muted small fc-hint">Cevabı görmek için dokun</div>'}
  </div>
  ${s.shown ? `<div class="btn-row fc-actions">
      <button class="btn danger lg" data-card-answer="0">✗ Bilemedim</button>
      <button class="btn lg" data-card-answer="1" style="background:var(--ok)">✓ Bildim</button></div>`
    : `<div class="btn-row fc-actions"><button class="btn lg secondary" data-card-flip>Cevabı göster</button></div>`}`;
}

function answerCard(known) {
  const s = cardSession;
  const c = state.cards.find(x => x.id === s.queue[s.i]);
  if (c) {
    if (known) {
      c.box = Math.min(5, c.box + 1);
      c.due = addDays(dateStr(), CARD_INTERVALS[c.box]);
      s.known++;
    } else {
      c.box = 0;
      c.due = dateStr();
      s.unknown++;
      s.queue.push(c.id); // oturum sonunda tekrar sor
    }
    const t = dateStr();
    state.cardLog ||= {};
    state.cardLog[t] = (state.cardLog[t] || 0) + 1;
    save();
  }
  s.i++;
  s.shown = false;
  render();
}

function bulkCardsModal() {
  openModal(`<h3>📋 Toplu kart ekle</h3>
    <p class="muted small">Her satıra bir kart yaz: <b>ön yüz | arka yüz</b></p>
    <form id="bulkCardForm">
      <div class="form-row"><div><label>Ders</label><select name="subject">${subjectOptions(cardFilter === 'all' ? undefined : cardFilter)}</select></div></div>
      <div class="form-row"><div><textarea name="lines" style="min-height:160px" placeholder="sin(2x) | 2·sinx·cosx&#10;cos(2x) | cos²x − sin²x"></textarea></div></div>
      <div class="btn-row"><button class="btn">Ekle</button><button type="button" class="btn secondary" data-close-modal>İptal</button></div>
    </form>`);
}

/* =========================================================
   ⏱️ DENEME MODU (süre + optik form)
   ========================================================= */
const EXAM_DURATIONS = { TYT: 165, 'AYT-SAY': 180, 'AYT-EA': 180, 'AYT-SOZ': 180, YDT: 180 };
const OPTIONS = ['A', 'B', 'C', 'D', 'E'];
let omSection = null;

function examLeft() {
  const s = state.examSession;
  return s ? Math.max(0, s.start + s.duration * 60000 - Date.now()) : 0;
}
const fmtLong = ms => {
  const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

VIEWS.exammode = () => {
  const s = state.examSession;
  if (!s) return examSetupHtml();
  return s.phase === 'grading' ? examGradingHtml() : examRunningHtml();
};

function examSetupHtml() {
  const def = defaultExamType();
  return `${pageHead('⏱️ Deneme Modu', 'Gerçek sınav süresiyle çöz, cevaplarını optik forma işaretle, sonunda netin otomatik hesaplansın')}
  <div class="card" style="max-width:560px">
    <form id="examStartForm">
      <div class="form-row"><div><label>Deneme türü</label><select name="type" id="emType">
        ${Object.keys(EXAM_SECTIONS).map(t => `<option value="${t}" ${t === def ? 'selected' : ''}>${EXAM_LABELS[t]}</option>`).join('')}</select></div></div>
      <div class="form-row">
        <div><label>Deneme adı / yayın</label><input name="name" placeholder="örn. 3D TG-4"></div>
        <div><label>Süre (dakika)</label><input name="duration" id="emDuration" type="number" min="5" max="300" value="${EXAM_DURATIONS[def]}"></div>
      </div>
      <p class="muted small">Sınav başlayınca sayfadan çıksan da süre işlemeye devam eder; geri döndüğünde kaldığın yerden devam edersin.</p>
      <div class="btn-row"><button class="btn lg">▶ Sınavı başlat</button></div>
    </form>
  </div>`;
}

function examRunningHtml() {
  const s = state.examSession;
  const secs = EXAM_SECTIONS[s.type];
  if (!secs.find(x => x.key === omSection)) omSection = secs[0].key;
  const sec = secs.find(x => x.key === omSection);
  const ans = s.answers[sec.key] || [];
  const answered = Object.values(s.answers).reduce((a, arr) => a + arr.filter(Boolean).length, 0);
  const total = secs.reduce((a, x) => a + x.max, 0);
  return `
  <div class="exam-bar">
    <div><b>${esc(EXAM_LABELS[s.type])}</b><div class="muted small">${esc(s.name || 'Deneme')} · ${answered}/${total} işaretli</div></div>
    <div class="exam-time" id="emTime">${fmtLong(examLeft())}</div>
    <button class="btn sm danger" data-exam-finish>Bitir</button>
  </div>
  <div class="seg" style="margin-bottom:12px">${secs.map(x => {
    const n = (s.answers[x.key] || []).filter(Boolean).length;
    return `<button data-om-sec="${x.key}" class="${x.key === omSection ? 'active' : ''}">${x.name} <span class="muted">${n}/${x.max}</span></button>`;
  }).join('')}</div>
  <div class="card optik">
    ${[...Array(sec.max)].map((_, i) => `<div class="om-row"><span class="om-n">${i + 1}</span>
      ${OPTIONS.map(o => `<button class="om-b ${ans[i] === o ? 'on' : ''}" data-om="${sec.key}|${i}|${o}">${o}</button>`).join('')}</div>`).join('')}
  </div>`;
}

function gradeSection(s, sec) {
  const ans = s.answers[sec.key] || [];
  const key = (s.keys[sec.key] || '').toUpperCase().replace(/[^A-E\-X*]/g, '');
  if (key.length) {
    let d = 0, y = 0;
    const wrong = [];
    for (let i = 0; i < sec.max; i++) {
      const k = key[i];
      if (!k || k === '-' || k === 'X' || k === '*') { if (ans[i]) d++; continue; } // iptal soru: işaretleyene doğru sayılır
      if (!ans[i]) continue;
      if (ans[i] === k) d++; else { y++; wrong.push(i + 1); }
    }
    return { d, y, wrong, auto: true, keyLen: key.length };
  }
  const m = s.manual[sec.key] || {};
  return { d: Number(m.d) || 0, y: Number(m.y) || 0, wrong: [], auto: false };
}

function examGradingHtml() {
  const s = state.examSession;
  const secs = EXAM_SECTIONS[s.type];
  let totalNet = 0;
  const rows = secs.map(sec => {
    const g = gradeSection(s, sec);
    const n = net(g.d, g.y);
    totalNet += n;
    const marked = (s.answers[sec.key] || []).filter(Boolean).length;
    return `<div class="card grade-sec">
      <div class="card-head"><h3>${sec.name} <span class="muted small">(${sec.max} soru · ${marked} işaretli)</span></h3>
        <span class="pill ${n / sec.max >= 0.65 ? 'ok' : n / sec.max >= 0.4 ? 'warn' : 'bad'}">${fmtNet(n)} net</span></div>
      <label>Cevap anahtarı (yayının anahtarını yaz: ABCDE…; iptal soru için -)</label>
      <input data-exam-key="${sec.key}" value="${esc(s.keys[sec.key] || '')}" placeholder="${'ABCDE'.repeat(2)}…" autocomplete="off" autocapitalize="characters" spellcheck="false">
      ${g.auto ? `<div class="small" style="margin-top:8px">✓ ${g.d} doğru · ✗ ${g.y} yanlış · ○ ${sec.max - g.d - g.y} boş
          ${g.keyLen < sec.max ? `<span style="color:var(--warn)"> · anahtarda ${sec.max - g.keyLen} soru eksik</span>` : ''}
          ${g.wrong.length ? `<div class="muted" style="margin-top:4px">Yanlış sorular: ${g.wrong.join(', ')}</div>` : ''}</div>`
        : `<div class="form-row" style="margin:10px 0 0">
          <div><label>veya Doğru</label><input type="number" min="0" max="${sec.max}" data-exam-manual="${sec.key}|d" value="${esc(s.manual[sec.key]?.d ?? '')}"></div>
          <div><label>Yanlış</label><input type="number" min="0" max="${sec.max}" data-exam-manual="${sec.key}|y" value="${esc(s.manual[sec.key]?.y ?? '')}"></div></div>`}
    </div>`;
  }).join('');
  const used = Math.round(((s.finished || Date.now()) - s.start) / 60000);
  return `${pageHead('✅ Sınav bitti', `${esc(EXAM_LABELS[s.type])} · ${esc(s.name || 'Deneme')} · ${used} dakika sürdü`)}
    <div class="hero" style="margin-bottom:16px"><div class="hero-top"><span>Toplam net</span></div>
      <div style="font-size:2.6rem;font-weight:800" id="emTotal">${fmtNet(totalNet)}</div>
      <div style="opacity:.9">Cevap anahtarını girdikçe netin güncellenir</div></div>
    ${rows}
    <div class="btn-row"><button class="btn lg" data-exam-save>💾 Denemeyi kaydet</button>
      <button class="btn secondary" data-exam-discard>Kaydetmeden çık</button></div>`;
}

function finishExam(auto = false) {
  const s = state.examSession;
  if (!s || s.phase === 'grading') return;
  s.phase = 'grading';
  s.finished = Math.min(Date.now(), s.start + s.duration * 60000);
  save();
  nativeCancel([2001]);
  if (auto) { beep(); notify('⏰ Deneme süresi bitti! Cevap anahtarını gir.'); }
  if (currentView === 'exammode') render();
}

/* =========================================================
   🎧 ODAK SESLERİ (Web Audio ile üretilir, dosya gerekmez)
   ========================================================= */
const SOUNDS = { rain: '🌧️ Yağmur', waves: '🌊 Dalga', brown: '🟤 Derin uğultu', pink: '🌸 Pembe gürültü', white: '⚪ Beyaz gürültü' };
const focusAudio = { ctx: null, nodes: [], gain: null, playing: null };

function noiseBuffer(ctx, kind, seconds = 4) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // kahverengi
  }
  return buf;
}
function loopSource(ctx, buf) {
  const s = ctx.createBufferSource();
  s.buffer = buf; s.loop = true; s.start();
  return s;
}
function startFocusSound(kind) {
  stopFocusSound();
  try {
    const ctx = focusAudio.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    const out = ctx.createGain();
    out.gain.value = state.sound.volume;
    out.connect(ctx.destination);
    const nodes = [out];
    if (kind === 'rain') {
      const src = loopSource(ctx, noiseBuffer(ctx, 'pink'));
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      src.connect(hp); hp.connect(lp); lp.connect(out);
      // damlalar
      const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < 90; k++) {
        const p = Math.floor(Math.random() * (len - 600)), a = Math.random() * 0.5;
        for (let j = 0; j < 500; j++) d[p + j] += (Math.random() * 2 - 1) * a * Math.exp(-j / 70);
      }
      const drops = loopSource(ctx, buf);
      const dg = ctx.createGain(); dg.gain.value = 0.35;
      drops.connect(dg); dg.connect(out);
      nodes.push(src, hp, lp, drops, dg);
    } else if (kind === 'waves') {
      const src = loopSource(ctx, noiseBuffer(ctx, 'brown', 6));
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = ctx.createGain(); g.gain.value = 0.55;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.45;
      lfo.connect(lfoGain); lfoGain.connect(g.gain); lfo.start();
      src.connect(lp); lp.connect(g); g.connect(out);
      nodes.push(src, lp, g, lfo, lfoGain);
    } else {
      const src = loopSource(ctx, noiseBuffer(ctx, kind));
      src.connect(out);
      nodes.push(src);
    }
    focusAudio.nodes = nodes; focusAudio.gain = out; focusAudio.playing = kind;
  } catch (e) { toast('Ses başlatılamadı'); }
  refreshSoundUI();
}
function stopFocusSound() {
  focusAudio.nodes.forEach(n => { try { n.stop && n.stop(); } catch (e) { /* zaten durdu */ } try { n.disconnect(); } catch (e) { /* yoksay */ } });
  focusAudio.nodes = []; focusAudio.gain = null; focusAudio.playing = null;
  refreshSoundUI();
}
// Sayaçla otomatik başlat/durdur
function focusAuto(on) {
  if (!state.sound.auto) return;
  if (on && !focusAudio.playing) startFocusSound(state.sound.type);
  if (!on && focusAudio.playing) stopFocusSound();
}
function soundCardHtml() {
  const s = state.sound;
  return `<div class="card" id="soundCard">
    <div class="card-head"><h3>🎧 Odak Sesleri</h3>
      <button class="btn sm ${focusAudio.playing ? 'secondary' : ''}" data-sound-toggle>${focusAudio.playing ? '⏸ Durdur' : '▶ Çal'}</button></div>
    <div class="sound-grid">${Object.entries(SOUNDS).map(([k, l]) =>
      `<button class="${s.type === k ? 'active' : ''} ${focusAudio.playing === k ? 'playing' : ''}" data-sound="${k}">${l}</button>`).join('')}</div>
    <div class="form-row" style="margin:12px 0 6px;align-items:center">
      <div style="flex:0 0 auto">🔈</div>
      <div><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-sound-vol style="padding:0;accent-color:var(--primary)"></div>
      <div style="flex:0 0 auto">🔊</div></div>
    <label style="display:flex;gap:8px;align-items:center;cursor:pointer;color:var(--text);font-weight:500;margin:0">
      <input type="checkbox" data-sound-auto ${s.auto ? 'checked' : ''} style="width:auto;accent-color:var(--primary)">
      Sayaç çalışırken otomatik çal</label>
  </div>`;
}
function refreshSoundUI() {
  const el = $('#soundCard');
  if (el) el.outerHTML = soundCardHtml();
}

/* =========================================================
   🔔 BİLDİRİMLER (Android uygulamasında yerel bildirim)
   ========================================================= */
const isNativeApp = () => !!(window.Capacitor && window.Capacitor.nativePromise &&
  window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android');
const nativeLN = (method, opts = {}) => window.Capacitor.nativePromise('LocalNotifications', method, opts);
const REMINDER_IDS = [1000, 1001, 1002, 1003, 1004, 1005, 1006];

async function nativePermission() {
  try {
    let p = await nativeLN('checkPermissions');
    if (p.display !== 'granted') p = await nativeLN('requestPermissions');
    return p.display === 'granted';
  } catch (e) { return false; }
}
async function nativeCancel(ids) {
  if (!isNativeApp()) return;
  try { await nativeLN('cancel', { notifications: ids.map(id => ({ id })) }); } catch (e) { /* eklenti yok */ }
}
async function nativeSchedule(list) {
  if (!isNativeApp() || !list.length) return false;
  try {
    await nativeLN('schedule', {
      notifications: list.map(n => ({
        smallIcon: 'ic_stat_notify', iconColor: '#5B4CF0', ...n,
        schedule: { at: n.at.toISOString(), allowWhileIdle: true },
        at: undefined,
      })),
    });
    return true;
  } catch (e) { return false; }
}

function reminderBody() {
  const parts = [];
  const due = dueCards().length;
  const camp = state.camps.find(c => { const s = campStats(c); return s.total && s.remaining; });
  if (camp) parts.push(`🏕️ ${camp.name} kampında sıradaki video seni bekliyor`);
  if (due) parts.push(`🃏 ${due} kart tekrar bekliyor`);
  parts.push(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  return parts.join(' · ');
}

let reminderTimer = null;
function scheduleReminders() {
  clearTimeout(reminderTimer);
  reminderTimer = setTimeout(async () => {
    if (!isNativeApp()) return;
    await nativeCancel(REMINDER_IDS);
    const r = state.reminders;
    if (!r.enabled) return;
    const [hh, mm] = (r.time || '20:00').split(':').map(Number);
    const goalMet = minutesOn(dateStr()) >= state.settings.goalMinutes;
    const list = [];
    for (let i = 0; i < 7; i++) {
      const at = new Date(); at.setDate(at.getDate() + i); at.setHours(hh, mm, 0, 0);
      if (at <= new Date() || (i === 0 && goalMet)) continue;
      list.push({ id: REMINDER_IDS[i], title: i === 0 && minutesOn(dateStr()) ? `📚 Bugün ${fmtMin(minutesOn(dateStr()))} çalıştın, hedefe az kaldı!` : '📚 Çalışma zamanı!', body: reminderBody(), at });
    }
    await nativeSchedule(list);
  }, 400);
}

// Pomodoro ve deneme bitişini, uygulama arka plandayken de haber ver
function scheduleTimerNotification() {
  nativeCancel([2000]);
  if (!timer.running || !state.reminders.pomodoro) return;
  nativeSchedule([{ id: 2000, title: timer.mode === 'work' ? '🎉 Pomodoro bitti!' : '💪 Mola bitti!',
    body: timer.mode === 'work' ? 'Mola zamanı. Uygulamaya dönüp kaydını kontrol et.' : 'Çalışmaya dönme zamanı.', at: new Date(timer.endAt) }]);
}
function scheduleExamNotification() {
  const s = state.examSession;
  nativeCancel([2001]);
  if (!s || s.phase !== 'running') return;
  nativeSchedule([{ id: 2001, title: '⏰ Deneme süresi bitti', body: 'Cevap anahtarını girip netini hesapla.', at: new Date(s.start + s.duration * 60000) }]);
}

function reminderSettingsHtml() {
  const r = state.reminders;
  const nativeApp = isNativeApp();
  return `<div class="card">
    <h3>🔔 Hatırlatmalar</h3>
    ${nativeApp ? '' : `<p class="small" style="background:var(--warn-soft);padding:10px 12px;border-radius:10px;margin-top:0">
      📱 Zamanlanmış bildirimler yalnızca <b>Android uygulamasında</b> çalışır. Tarayıcıda yalnızca sayfa açıkken bildirim gelir.</p>`}
    <form id="reminderForm">
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer;color:var(--text);font-weight:500">
        <input type="checkbox" name="enabled" ${r.enabled ? 'checked' : ''} style="width:auto;accent-color:var(--primary)">
        Her gün çalışma hatırlatması gönder (o günkü hedefini tamamladıysan gönderilmez)</label>
      <div class="form-row" style="margin-top:10px"><div style="max-width:180px"><label>Saat</label><input type="time" name="time" value="${esc(r.time)}"></div></div>
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer;color:var(--text);font-weight:500;margin-bottom:14px">
        <input type="checkbox" name="pomodoro" ${r.pomodoro ? 'checked' : ''} style="width:auto;accent-color:var(--primary)">
        Pomodoro ve deneme süresi bitince bildir</label>
      <div class="btn-row"><button class="btn">Kaydet</button>
        ${nativeApp ? '<button type="button" class="btn secondary" data-notify-test>🔔 Deneme bildirimi</button>'
          : '<button type="button" class="btn secondary" data-notify-perm>🔔 Tarayıcı bildirimlerine izin ver</button>'}</div>
    </form>
  </div>`;
}

/* =========================================================
   Olaylar
   ========================================================= */
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-card-flip]');
  if (!t) return;
  const d = t.dataset;

  if (d.report !== undefined) { reportOffset = Number(d.report); return render(); }

  // Kartlar
  if (d.cardStudy !== undefined) return startCardSession();
  if (d.cardFlip !== undefined && cardSession && !cardSession.shown) { cardSession.shown = true; return render(); }
  if (d.cardAnswer !== undefined) return answerCard(d.cardAnswer === '1');
  if (d.cardBulk !== undefined) return bulkCardsModal();
  if (d.cardDel) {
    if (!confirm('Kart silinsin mi?')) return;
    state.cards = state.cards.filter(c => c.id !== d.cardDel);
    save(); return render();
  }
  if (d.cardSamples !== undefined) {
    SAMPLE_CARDS.forEach(c => state.cards.push(newCard(c.subject, c.front, c.back)));
    save(); toast(`✅ ${SAMPLE_CARDS.length} örnek kart eklendi`); return render();
  }

  // Deneme modu
  if (d.om) {
    const [key, i, o] = d.om.split('|');
    const s = state.examSession;
    if (!s || s.phase !== 'running') return;
    const arr = (s.answers[key] ||= []);
    arr[i] = arr[i] === o ? null : o;
    save();
    t.parentElement.querySelectorAll('.om-b').forEach(b => b.classList.toggle('on', b.dataset.om === `${key}|${i}|${arr[i]}`));
    const segBtn = $(`[data-om-sec="${key}"] span`);
    const sec = EXAM_SECTIONS[s.type].find(x => x.key === key);
    if (segBtn) segBtn.textContent = `${arr.filter(Boolean).length}/${sec.max}`;
    return;
  }
  if (d.omSec) { omSection = d.omSec; return renderKeepScroll(); }
  if (d.examFinish !== undefined) {
    if (!confirm('Sınavı bitirmek istediğine emin misin?')) return;
    return finishExam();
  }
  if (d.examSave !== undefined) {
    const s = state.examSession;
    const sections = {};
    for (const sec of EXAM_SECTIONS[s.type]) {
      const g = gradeSection(s, sec);
      if (g.d + g.y > sec.max) return toast(`${sec.name}: doğru + yanlış ${sec.max}'i geçemez`);
      sections[sec.key] = { d: g.d, y: g.y, wrong: g.wrong };
    }
    state.exams.push({ id: uid(), date: dateStr(new Date(s.start)), type: s.type, name: s.name, sections,
      minutes: Math.round((s.finished - s.start) / 60000) });
    state.examSession = null;
    save(); toast('✅ Deneme kaydedildi');
    location.hash = '#exams';
    return;
  }
  if (d.examDiscard !== undefined) {
    if (!confirm('Bu deneme kaydedilmeden silinecek. Emin misin?')) return;
    state.examSession = null; save(); return render();
  }

  // Sesler
  if (d.soundToggle !== undefined) return focusAudio.playing ? stopFocusSound() : startFocusSound(state.sound.type);
  if (d.sound) { state.sound.type = d.sound; save(); return startFocusSound(d.sound); }

  // Bildirim
  if (d.notifyTest !== undefined) {
    nativePermission().then(ok => {
      if (!ok) return toast('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.');
      nativeSchedule([{ id: 3000, title: '🔔 Bildirimler çalışıyor!', body: reminderBody(), at: new Date(Date.now() + 3000) }])
        .then(r => toast(r ? '3 saniye içinde bildirim gelecek' : 'Bildirim gönderilemedi; uygulamayı güncellemen gerekebilir'));
    });
  }
});

document.addEventListener('input', e => {
  const d = e.target.dataset;
  if (d.soundVol !== undefined) {
    state.sound.volume = Number(e.target.value);
    if (focusAudio.gain) focusAudio.gain.gain.value = state.sound.volume;
    save();
  }
  if (d.examKey || d.examManual) {
    const s = state.examSession;
    if (!s) return;
    if (d.examKey) s.keys[d.examKey] = e.target.value;
    else { const [k, f] = d.examManual.split('|'); (s.manual[k] ||= {})[f] = e.target.value; }
    save();
    clearTimeout(e.target._t);
    // Yazma bitince yeniden hesapla (odağı koruyarak)
    e.target._t = setTimeout(() => {
      const id = d.examKey ? `[data-exam-key="${d.examKey}"]` : `[data-exam-manual="${d.examManual}"]`;
      const pos = e.target.selectionStart;
      renderKeepScroll();
      const el = $(id);
      if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) { /* sayı alanı */ } }
    }, 700);
  }
});

document.addEventListener('change', e => {
  const d = e.target.dataset;
  if (d.soundAuto !== undefined) { state.sound.auto = e.target.checked; save(); }
  if (e.target.id === 'emType') $('#emDuration').value = EXAM_DURATIONS[e.target.value] || 180;
});

document.addEventListener('submit', e => {
  const f = e.target;
  const v = n => f.elements[n]?.value ?? '';
  if (f.id === 'targetForm') {
    state.target = { name: v('name').trim(), type: v('type'), score: v('score'), rank: v('rank').trim() };
    save(); toast('🎯 Hedef kaydedildi'); render();
  }
  if (f.id === 'reminderForm') {
    state.reminders = { enabled: f.elements.enabled.checked, time: v('time') || '20:00', pomodoro: f.elements.pomodoro.checked };
    save();
    if (state.reminders.enabled && isNativeApp()) nativePermission().then(ok => !ok && toast('Bildirim izni verilmedi'));
    scheduleReminders();
    toast('🔔 Hatırlatmalar kaydedildi');
  }
  if (f.id === 'cardForm') {
    const front = v('front').trim(), back = v('back').trim();
    if (!front || !back) return toast('İki yüzü de doldur');
    state.cards.push(newCard(v('subject'), front, back));
    save(); toast('✅ Kart eklendi'); render();
  }
  if (f.id === 'bulkCardForm') {
    const subject = v('subject');
    const lines = v('lines').split('\n').map(l => l.split('|')).filter(p => p.length >= 2 && p[0].trim() && p.slice(1).join('|').trim());
    if (!lines.length) return toast('Satırları "ön | arka" biçiminde yaz');
    lines.forEach(p => state.cards.push(newCard(subject, p[0].trim(), p.slice(1).join('|').trim())));
    save(); closeModal(); toast(`✅ ${lines.length} kart eklendi`); render();
  }
  if (f.id === 'examStartForm') {
    const duration = Math.min(300, Math.max(5, parseInt(v('duration'), 10) || 165));
    state.examSession = { type: v('type'), name: v('name').trim(), start: Date.now(), duration, phase: 'running', answers: {}, keys: {}, manual: {} };
    omSection = null;
    save(); scheduleExamNotification(); render();
  }
});

// Deneme süresi: sayfadan bağımsız işler
setInterval(() => {
  const s = state.examSession;
  if (!s || s.phase !== 'running') return;
  const left = examLeft();
  const el = $('#emTime');
  if (el) { el.textContent = fmtLong(left); el.classList.toggle('low', left < 5 * 60000); }
  if (left <= 0) finishExam(true);
}, 1000);

// Soru formunda ders değişince konu listesini güncelle
VIEWS.questions.after = () => {
  $('#qSubject')?.addEventListener('change', e => ($('#qTopic').innerHTML = topicOptions(e.target.value)));
};
