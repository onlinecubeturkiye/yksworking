'use strict';
// Uygulamayı başlat (tüm ekranlar yüklendikten sonra)
ensureCamps();
applyTheme();
route();
// Çevrimdışı kullanım ve "ana ekrana ekle" için
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
if (!state.settings.field) askField();
else maybeShowWeeklyReport();
scheduleReminders();
if (state.examSession && state.examSession.phase === 'running' && examLeft() <= 0) finishExam(true);
