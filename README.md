# 📚 YKS Çalışma Platformu

Kişisel YKS hazırlık takip uygulaması. Kurulum gerektirmez; `index.html` dosyasını tarayıcıda açman yeterli.
Tüm alanları destekler: **Sayısal, Eşit Ağırlık, Sözel, Dil**.

## Özellikler
- 🏠 **Ana Sayfa** – YKS geri sayımı, bugünkü çalışma/soru, çalışma serisi 🔥, günlük hedefler, son 7 gün grafikleri, günün programı
- 📖 **Konular** – TYT + alanına göre AYT/YDT konu listesi; her konu için Başlanmadı → Çalışılıyor → Bitti → Tekrar Edildi
- ⏱️ **Sayaç** – Pomodoro (çalışma / kısa mola / uzun mola), derse göre otomatik süre kaydı, elle çalışma ekleme
- ✏️ **Sorular** – Günlük doğru/yanlış/boş kaydı, ders bazında başarı yüzdesi
- 📝 **Denemeler** – TYT, AYT (SAY/EA/SÖZ), YDT netleri (4 yanlış 1 doğruyu götürür), net gelişim grafiği
- 📅 **Program** – Her hafta tekrar eden haftalık plan, işaretler her yeni haftada sıfırlanır
- ❌ **Yanlış Defteri** – Fotoğraflı/notlu yanlış sorular, "Öğrendim" işareti
- ⚙️ **Ayarlar** – Alan, sınav tarihi, pomodoro süreleri, hedefler, açık/koyu tema, yedek alma/yükleme

## Veriler
Veriler yalnızca kullandığın tarayıcıda (localStorage) saklanır, hesap gerekmez.
Cihaz değiştirirken veya veri kaybetmemek için **Ayarlar → Yedeği indir** kullan.

## Yayınlama (isteğe bağlı)
GitHub'da **Settings → Pages → Branch: main / root** seçersen uygulama
`https://<kullanıcı-adı>.github.io/yksworking/` adresinden telefonda da açılır.

## Dosyalar
- `index.html` – sayfa iskeleti
- `css/style.css` – tasarım (açık/koyu tema)
- `js/data.js` – müfredat, alanlar, deneme yapıları
- `js/app.js` – uygulama mantığı
