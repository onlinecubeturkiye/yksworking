# 📚 YKS Çalışma Platformu

Kişisel YKS hazırlık takip uygulaması. Kurulum gerektirmez; `index.html` dosyasını tarayıcıda açman yeterli.
Tüm alanları destekler: **Sayısal, Eşit Ağırlık, Sözel, Dil**.

## Özellikler
- 🏠 **Ana Sayfa** – YKS geri sayımı, bugünkü çalışma/soru, çalışma serisi 🔥, günlük hedefler, son 7 gün grafikleri, günün programı
- 📖 **Konular** – TYT + alanına göre AYT/YDT konu listesi; her konu için Başlanmadı → Çalışılıyor → Bitti → Tekrar Edildi
- 🏕️ **Kamplar** – YouTube oynatma listelerini kampa dönüştürür: video sırası, izlenenler, günlük video hedefi, tahmini bitiş tarihi; biten videolar otomatik işaretlenir ve süresi çalışmaya eklenir
- 🧮 **Puan Hesapla** – Netlerden tahmini TYT / SAY / EA / SÖZ / DİL puanı ve OBP katkısı
- 📊 **İstatistikler** – Haftalık rapor (önceki haftayla kıyas), yıllık çalışma takvimi, zayıf konu analizi
- 🃏 **Bilgi Kartları** – Aralıklı tekrarla formül/bilgi kartları, toplu ekleme
- 🎯 **Hedef Bölüm** – Son denemelerden tahmini puan ve hedefe kalan puan
- ⏱️ **Deneme Modu** – Gerçek sınav süresi, ekranda optik form, cevap anahtarıyla otomatik net
- 🎧 **Odak Sesleri** – Yağmur, dalga ve gürültü sesleri (dosya gerekmeden üretilir)
- 🔔 **Hatırlatmalar** – Android uygulamasında günlük çalışma, pomodoro ve deneme bitiş bildirimleri
- ⏱️ **Sayaç** – Pomodoro (çalışma / kısa mola / uzun mola), derse göre otomatik süre kaydı, elle çalışma ekleme
- ✏️ **Sorular** – Günlük doğru/yanlış/boş kaydı, ders bazında başarı yüzdesi
- 📝 **Denemeler** – TYT, AYT (SAY/EA/SÖZ), YDT netleri (4 yanlış 1 doğruyu götürür), net gelişim grafiği
- 📅 **Program** – Her hafta tekrar eden haftalık plan, işaretler her yeni haftada sıfırlanır
- ❌ **Yanlış Defteri** – Fotoğraflı/notlu yanlış sorular, "Öğrendim" işareti
- ⚙️ **Ayarlar** – Alan, sınav tarihi, pomodoro süreleri, hedefler, açık/koyu tema, yedek alma/yükleme

## Not
Kamplardaki YouTube oynatıcısı, sayfa `file://` olarak açıldığında bazı tarayıcılarda çalışmayabilir; GitHub Pages gibi bir adresten açınca sorunsuz çalışır.

## 📱 Telefona kurma
**Android (APK):** Depodaki **Releases** bölümünden en son `YKS-Calisma.apk` dosyasını indirip aç.
APK, `main` dalına `android-app/` klasöründe değişiklik geldiğinde GitHub Actions tarafından otomatik derlenir
(Actions → "Android APK" → *Run workflow* ile elle de başlatılabilir).
Uygulama yayındaki siteyi açar; bu yüzden sitedeki her güncelleme uygulamaya da kendiliğinden gelir.

**Ana ekrana ekleme (PWA):** Siteyi Chrome'da açıp menüden *Ana ekrana ekle* / *Uygulamayı yükle* seçilebilir.
Bir kez açıldıktan sonra internetsiz de çalışır.

> Not: APK'lar `android-app/keystore/debug.keystore` anahtarıyla imzalanır. Bu sayede yeni sürüm eskisinin
> üstüne kurulur ve veriler silinmez. Anahtar depoda herkese açık olduğu için APK'yı yalnızca bu deponun
> Releases sayfasından indir.

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
