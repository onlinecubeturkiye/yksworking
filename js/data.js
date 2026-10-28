// YKS müfredatı, alanlar ve deneme yapıları

const FIELDS = {
  SAY: { name: 'Sayısal', ayt: ['ayt-mat', 'ayt-geo', 'ayt-fiz', 'ayt-kim', 'ayt-bio'] },
  EA: { name: 'Eşit Ağırlık', ayt: ['ayt-mat', 'ayt-geo', 'ayt-edb', 'ayt-tar1', 'ayt-cog1'] },
  SOZ: { name: 'Sözel', ayt: ['ayt-edb', 'ayt-tar1', 'ayt-cog1', 'ayt-tar2', 'ayt-cog2', 'ayt-fel', 'ayt-din'] },
  DIL: { name: 'Dil', ayt: ['ydt'] },
};

const SUBJECTS = [
  // ---------- TYT ----------
  { id: 'tyt-tr', exam: 'TYT', name: 'Türkçe', topics: [
    'Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf', 'Ses Bilgisi', 'Yazım Kuralları', 'Noktalama İşaretleri',
    'Sözcük Yapısı (Kök-Ek)', 'İsimler', 'Sıfatlar', 'Zamirler', 'Zarflar', 'Edat-Bağlaç-Ünlem', 'Fiiller',
    'Ek Fiil', 'Fiilimsiler', 'Fiil Çatısı', 'Cümlenin Ögeleri', 'Cümle Türleri', 'Anlatım Bozuklukları'] },
  { id: 'tyt-mat', exam: 'TYT', name: 'Matematik', topics: [
    'Temel Kavramlar', 'Sayı Basamakları', 'Bölme ve Bölünebilme', 'EBOB-EKOK', 'Rasyonel Sayılar',
    'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar', 'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran-Orantı',
    'Denklem Çözme', 'Sayı-Kesir Problemleri', 'Yaş Problemleri', 'Yüzde-Kâr-Zarar Problemleri',
    'Karışım Problemleri', 'Hareket Problemleri', 'İşçi-Havuz Problemleri', 'Grafik Problemleri', 'Kümeler',
    'Mantık', 'Fonksiyonlar', 'Polinomlar', '2. Dereceden Denklemler', 'Permütasyon', 'Kombinasyon',
    'Olasılık', 'Veri-İstatistik'] },
  { id: 'tyt-geo', exam: 'TYT', name: 'Geometri', topics: [
    'Doğruda ve Üçgende Açılar', 'Dik Üçgen ve Pisagor', 'İkizkenar ve Eşkenar Üçgen', 'Açıortay',
    'Kenarortay', 'Üçgende Alan', 'Üçgende Benzerlik', 'Açı-Kenar Bağıntıları', 'Çokgenler', 'Dörtgenler',
    'Yamuk', 'Paralelkenar', 'Eşkenar Dörtgen', 'Dikdörtgen ve Kare', 'Çember ve Daire',
    'Noktanın ve Doğrunun Analitiği', 'Katı Cisimler'] },
  { id: 'tyt-fiz', exam: 'TYT', name: 'Fizik', topics: [
    'Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket', 'Kuvvet ve Newton Yasaları', 'İş-Güç-Enerji',
    'Isı ve Sıcaklık', 'Genleşme', 'Basınç', 'Kaldırma Kuvveti', 'Elektrostatik', 'Elektrik Akımı ve Devreler',
    'Manyetizma', 'Dalgalar', 'Optik (Aynalar)', 'Optik (Kırılma ve Mercekler)'] },
  { id: 'tyt-kim', exam: 'TYT', name: 'Kimya', topics: [
    'Kimya Bilimi', 'Atom ve Yapısı', 'Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler',
    'Maddenin Halleri', 'Doğa ve Kimya', 'Kimyanın Temel Kanunları', 'Mol Kavramı', 'Kimyasal Tepkimeler ve Hesaplamalar',
    'Karışımlar', 'Asitler-Bazlar-Tuzlar', 'Kimya Her Yerde'] },
  { id: 'tyt-bio', exam: 'TYT', name: 'Biyoloji', topics: [
    'Canlıların Ortak Özellikleri', 'Canlıların Temel Bileşenleri', 'Hücre ve Organeller', 'Madde Geçişleri',
    'Canlıların Sınıflandırılması', 'Mitoz ve Eşeysiz Üreme', 'Mayoz ve Eşeyli Üreme', 'Kalıtım',
    'Ekosistem Ekolojisi', 'Güncel Çevre Sorunları'] },
  { id: 'tyt-tar', exam: 'TYT', name: 'Tarih', topics: [
    'Tarih ve Zaman', 'İnsanlığın İlk Dönemleri', 'Orta Çağda Dünya', 'İlk ve Orta Çağlarda Türk Dünyası',
    'İslam Medeniyetinin Doğuşu', 'İlk Türk-İslam Devletleri', 'Selçuklu Türkiyesi', 'Beylikten Devlete Osmanlı',
    'Dünya Gücü Osmanlı', 'Değişim Çağında Avrupa ve Osmanlı', 'Uluslararası İlişkilerde Denge Stratejisi',
    'Devrimler Çağı ve Osmanlı', 'XX. Yüzyıl Başlarında Osmanlı ve Dünya', 'Milli Mücadele',
    'Atatürkçülük ve Türk İnkılabı'] },
  { id: 'tyt-cog', exam: 'TYT', name: 'Coğrafya', topics: [
    'Doğa ve İnsan', 'Dünyanın Şekli ve Hareketleri', 'Coğrafi Konum', 'Harita Bilgisi', 'Atmosfer ve İklim',
    'Sıcaklık-Basınç-Rüzgar-Nem', 'İklim Tipleri', 'İç ve Dış Kuvvetler', 'Su-Toprak-Bitki', 'Nüfus', 'Göç',
    'Yerleşme', 'Ekonomik Faaliyetler', 'Bölgeler', 'Uluslararası Ulaşım Hatları', 'Doğal Afetler'] },
  { id: 'tyt-fel', exam: 'TYT', name: 'Felsefe', topics: [
    'Felsefeyi Tanıma', 'Bilgi Felsefesi', 'Varlık Felsefesi', 'Ahlak Felsefesi', 'Sanat Felsefesi',
    'Din Felsefesi', 'Siyaset Felsefesi', 'Bilim Felsefesi', 'Felsefe Tarihi'] },
  { id: 'tyt-din', exam: 'TYT', name: 'Din Kültürü', topics: [
    'Bilgi ve İnanç', 'Din ve İslam', 'İslam ve İbadet', 'Gençlik ve Değerler', 'Allah-İnsan İlişkisi',
    'Hz. Muhammed', 'Vahiy ve Akıl', 'İslam Düşüncesinde Yorumlar', 'Din, Kültür ve Medeniyet',
    'Ahlaki Tutum ve Davranışlar'] },

  // ---------- AYT ----------
  { id: 'ayt-mat', exam: 'AYT', name: 'Matematik', topics: [
    'Fonksiyonlar (İleri)', 'Polinomlar', '2. Dereceden Denklemler', 'Eşitsizlikler', 'Parabol',
    'Permütasyon-Kombinasyon-Binom', 'Olasılık', 'Trigonometri', 'Üstel ve Logaritmik Fonksiyonlar',
    'Diziler', 'Limit ve Süreklilik', 'Türev', 'Türevin Uygulamaları', 'Belirsiz İntegral', 'Belirli İntegral'] },
  { id: 'ayt-geo', exam: 'AYT', name: 'Geometri', topics: [
    'Üçgenler (Tekrar)', 'Çokgenler ve Dörtgenler', 'Çember ve Daire', 'Noktanın Analitiği', 'Doğrunun Analitiği',
    'Dönüşüm Geometrisi', 'Çemberin Analitiği', 'Katı Cisimler'] },
  { id: 'ayt-fiz', exam: 'AYT', name: 'Fizik', topics: [
    'Vektörler', 'Bağıl Hareket', 'Newton Hareket Yasaları', 'Sabit İvmeli Hareket', 'Atışlar', 'İş-Enerji',
    'İtme ve Momentum', 'Tork ve Denge', 'Kütle Merkezi', 'Basit Makineler', 'Elektrik Alan ve Potansiyel',
    'Paralel Levhalar ve Sığa', 'Manyetizma ve İndüksiyon', 'Alternatif Akım ve Transformatörler',
    'Düzgün Çembersel Hareket', 'Kütle Çekim ve Kepler', 'Basit Harmonik Hareket', 'Dalga Mekaniği',
    'Atom Fiziği ve Radyoaktivite', 'Modern Fizik', 'Modern Fiziğin Uygulamaları'] },
  { id: 'ayt-kim', exam: 'AYT', name: 'Kimya', topics: [
    'Modern Atom Teorisi', 'Gazlar', 'Sıvı Çözeltiler ve Çözünürlük', 'Kimyasal Tepkimelerde Enerji',
    'Tepkime Hızları', 'Kimyasal Denge', 'Asit-Baz Dengesi', 'Çözünürlük Dengesi', 'Kimya ve Elektrik',
    'Karbon Kimyasına Giriş', 'Organik Bileşikler', 'Enerji Kaynakları ve Bilimsel Gelişmeler'] },
  { id: 'ayt-bio', exam: 'AYT', name: 'Biyoloji', topics: [
    'Sinir Sistemi', 'Endokrin Sistem', 'Duyu Organları', 'Destek ve Hareket Sistemi', 'Sindirim Sistemi',
    'Dolaşım ve Bağışıklık Sistemi', 'Solunum Sistemi', 'Boşaltım Sistemi', 'Üreme Sistemi ve Embriyonik Gelişim',
    'Komünite ve Popülasyon Ekolojisi', 'Nükleik Asitler', 'Genetik Şifre ve Protein Sentezi',
    'Canlılık ve Enerji', 'Fotosentez', 'Kemosentez', 'Hücresel Solunum', 'Bitki Biyolojisi', 'Canlılar ve Çevre'] },
  { id: 'ayt-edb', exam: 'AYT', name: 'Türk Dili ve Edebiyatı', topics: [
    'Güzel Sanatlar ve Edebiyat', 'Şiir Bilgisi (Nazım Birimi, Ölçü, Uyak)', 'Edebi Sanatlar',
    'Olay Çevresinde Oluşan Metinler', 'Öğretici Metinler', 'İslamiyet Öncesi Türk Edebiyatı',
    'Geçiş Dönemi Edebiyatı', 'Halk Edebiyatı', 'Divan Edebiyatı', 'Tanzimat Edebiyatı', 'Servet-i Fünun',
    'Fecr-i Ati', 'Milli Edebiyat', 'Cumhuriyet Dönemi Edebiyatı', 'Edebi Akımlar', 'Dünya Edebiyatı'] },
  { id: 'ayt-tar1', exam: 'AYT', name: 'Tarih-1', topics: [
    'Tarih Bilimi', 'İlk ve Orta Çağlarda Türk Dünyası', 'İslam Tarihi ve Türk-İslam Devletleri',
    'Türkiye Tarihi (Selçuklu)', 'Osmanlı Kuruluş ve Yükselme', 'Osmanlı Kültür ve Medeniyeti',
    'Osmanlı Duraklama-Gerileme', 'XIX. Yüzyılda Osmanlı', 'XX. Yüzyıl Başlarında Osmanlı', 'Milli Mücadele',
    'Atatürk İlke ve İnkılapları', 'Atatürk Dönemi Dış Politika', 'II. Dünya Savaşı', 'Soğuk Savaş Dönemi',
    'Yumuşama Dönemi ve Sonrası', 'Küreselleşen Dünya'] },
  { id: 'ayt-cog1', exam: 'AYT', name: 'Coğrafya-1', topics: [
    'Ekosistem', 'Nüfus Politikaları', 'Türkiye\'de Nüfus ve Yerleşme', 'Ekonomik Faaliyetler ve Doğal Kaynaklar',
    'Göç ve Şehirleşme', 'Türkiye Ekonomisi', 'Tarım ve Hayvancılık', 'Madencilik ve Enerji', 'Sanayi',
    'Ulaşım ve Ticaret', 'Turizm', 'Küresel Ortam: Bölgeler ve Ülkeler', 'Çevre ve Toplum'] },
  { id: 'ayt-tar2', exam: 'AYT', name: 'Tarih-2', topics: [
    'Türk Kültür ve Medeniyeti', 'Osmanlı Devlet Teşkilatı', 'Osmanlı Toplum ve Ekonomi', 'XX. Yüzyılda Dünya',
    'İki Savaş Arası Dönem', 'II. Dünya Savaşı Sonrası Türkiye', 'Toplumsal Devrim Çağında Dünya ve Türkiye',
    'XXI. Yüzyılın Eşiğinde Türkiye ve Dünya'] },
  { id: 'ayt-cog2', exam: 'AYT', name: 'Coğrafya-2', topics: [
    'Biyoçeşitlilik', 'Ekosistemlerin İşleyişi', 'Madde Döngüleri', 'Şehirlerin Fonksiyonları',
    'Türkiye\'nin İşlevsel Bölgeleri', 'Kültür Bölgeleri', 'Ülkeler Arası Etkileşim', 'Jeopolitik Konum',
    'Çatışma Bölgeleri', 'Küresel ve Bölgesel Örgütler', 'Çevre Sorunları ve Çözümleri', 'Doğal Afetler'] },
  { id: 'ayt-fel', exam: 'AYT', name: 'Felsefe Grubu', topics: [
    'Mantığa Giriş', 'Klasik Mantık', 'Mantık ve Dil', 'Sembolik Mantık', 'Psikolojinin Temel Süreçleri',
    'Öğrenme-Bellek-Düşünme', 'Ruh Sağlığının Temelleri', 'Birey ve Toplum', 'Toplumsal Yapı',
    'Toplumsal Değişme ve Gelişme', 'Toplum ve Kültür', 'Toplumsal Kurumlar', 'MÖ 6. yy - MS 2. yy Felsefesi',
    'MS 2. yy - 15. yy Felsefesi', '15. - 17. yy Felsefesi', '18. - 19. yy Felsefesi', '20. yy Felsefesi'] },
  { id: 'ayt-din', exam: 'AYT', name: 'Din Kültürü', topics: [
    'Dünya ve Ahiret', 'Kur\'an\'a Göre Hz. Muhammed', 'Kur\'an\'da Bazı Kavramlar', 'İnançla İlgili Meseleler',
    'Yahudilik ve Hristiyanlık', 'Hint ve Çin Dinleri', 'İslam ve Bilim', 'Anadolu\'da İslam',
    'İslam Düşüncesinde Tasavvufi Yorumlar', 'Güncel Dini Meseleler'] },
  { id: 'ydt', exam: 'YDT', name: 'Yabancı Dil', topics: [
    'Kelime Bilgisi', 'Tenses', 'Modals', 'Passive Voice', 'Conditionals', 'Relative Clauses', 'Noun Clauses',
    'Gerund-Infinitive', 'Conjunctions', 'Prepositions', 'Cloze Test', 'Cümle Tamamlama', 'Çeviri (İng-Tr)',
    'Çeviri (Tr-İng)', 'Okuma Parçası', 'Diyalog Tamamlama', 'Anlamca En Yakın Cümle', 'Paragraf Tamamlama',
    'Anlam Bütünlüğünü Bozan Cümle'] },
];

// Deneme bölümleri (soru sayıları ÖSYM yapısına göre)
const EXAM_SECTIONS = {
  TYT: [
    { key: 'tr', name: 'Türkçe', max: 40 },
    { key: 'sos', name: 'Sosyal Bilimler', max: 20 },
    { key: 'mat', name: 'Temel Matematik', max: 40 },
    { key: 'fen', name: 'Fen Bilimleri', max: 20 },
  ],
  'AYT-SAY': [
    { key: 'mat', name: 'Matematik', max: 40 },
    { key: 'fiz', name: 'Fizik', max: 14 },
    { key: 'kim', name: 'Kimya', max: 13 },
    { key: 'bio', name: 'Biyoloji', max: 13 },
  ],
  'AYT-EA': [
    { key: 'mat', name: 'Matematik', max: 40 },
    { key: 'edb', name: 'Edebiyat', max: 24 },
    { key: 'tar1', name: 'Tarih-1', max: 10 },
    { key: 'cog1', name: 'Coğrafya-1', max: 6 },
  ],
  'AYT-SOZ': [
    { key: 'edb', name: 'Edebiyat', max: 24 },
    { key: 'tar1', name: 'Tarih-1', max: 10 },
    { key: 'cog1', name: 'Coğrafya-1', max: 6 },
    { key: 'tar2', name: 'Tarih-2', max: 11 },
    { key: 'cog2', name: 'Coğrafya-2', max: 11 },
    { key: 'fel', name: 'Felsefe Grubu', max: 12 },
    { key: 'din', name: 'Din Kültürü', max: 6 },
  ],
  YDT: [{ key: 'ydt', name: 'Yabancı Dil', max: 80 }],
};

const EXAM_LABELS = {
  TYT: 'TYT', 'AYT-SAY': 'AYT (Sayısal)', 'AYT-EA': 'AYT (Eşit Ağırlık)', 'AYT-SOZ': 'AYT (Sözel)', YDT: 'YDT (Dil)',
};

const QUOTES = [
  'Başarı, her gün tekrarlanan küçük çabaların toplamıdır.',
  'Bugün yaptığın çalışma, yarınki sıralamanı belirler.',
  'Zor olan başlamaktır; gerisi alışkanlıktır.',
  'Motivasyon seni başlatır, disiplin devam ettirir.',
  'Bir soru daha, bir konu daha. Hepsi birikiyor.',
  'Kendini dünkü hâlinle kıyasla, başkalarıyla değil.',
  'Yorulduğunda dinlen, ama bırakma.',
  'Hedefini her gün hatırla, çünkü o seni bekliyor.',
  'Yanlışların, en iyi öğretmenlerindir.',
  'Mükemmel olmak zorunda değilsin; sadece devam et.',
  'Az ama her gün, çok ama ara sıradan iyidir.',
  'Sınav bir gün; hazırlık her gün.',
];

// Yaklaşık puan katsayıları (ÖSYM her yıl standart sapmaya göre hesaplar; bunlar tahmindir)
// Ham puan = 100 + Σ(net × katsayı). Her puan türünde en yüksek ham puan 500'dür.
const PUAN = {
  TYT: { name: 'TYT', tyt: { tr: 3.3, sos: 3.4, mat: 3.3, fen: 3.4 }, ayt: null },
  SAY: { name: 'Sayısal', aytType: 'AYT-SAY', ayt: { mat: 3.0, fiz: 2.85, kim: 3.07, bio: 3.07 } },
  EA: { name: 'Eşit Ağırlık', aytType: 'AYT-EA', ayt: { mat: 3.0, edb: 3.0, tar1: 2.8, cog1: 3.33 } },
  SOZ: { name: 'Sözel', aytType: 'AYT-SOZ', ayt: { edb: 3.0, tar1: 2.8, cog1: 3.33, tar2: 2.91, cog2: 2.91, fel: 3.0, din: 3.33 } },
  DIL: { name: 'Dil', aytType: 'YDT', ayt: { ydt: 3.0 } },
};
// AYT/YDT puan türlerinde TYT %40 ağırlıkla girer
const PUAN_TYT_IN_AYT = { tr: 1.32, sos: 1.36, mat: 1.32, fen: 1.36 };

// Hazır kamplar (YouTube oynatma listeleri). Ad ve ders, Kamplar ekranından değiştirilebilir.
const SEED_CAMPS = [
  { name: 'Kamp 1', subject: 'other', link: 'https://youtube.com/playlist?list=PLVoSZ0D0CB3qkytIGl01_CAPZuKgaMbxw' },
  { name: 'Kamp 2', subject: 'other', link: 'https://youtube.com/playlist?list=PLBals97P4r_ZfnhNcNTUhF36t17ynwZho' },
  { name: 'Kamp 3', subject: 'other', link: 'https://youtu.be/kP_Iw5sDn6o' },
  { name: 'Kamp 4', subject: 'other', link: 'https://youtube.com/playlist?list=PLwyfvkhKMmwqWbRHpDnhpBCRxiyNkZgq0' },
];
