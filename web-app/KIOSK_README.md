# Kiosk Mode - Kitchen Display System

Bu dosyalar, mutfakta kullanılmak üzere sadece en son kaydedilen siparişi büyük fontlarla tam ekranda gösteren kiosk modunu sağlar.

## Dosyalar

- **kiosk.html** - Kiosk modu için HTML sayfa
- **kiosk.css** - Büyük fontlar ve tam ekran layout için CSS stiller
- **kiosk.js** - En son siparişi çeken ve gösteren JavaScript mantığı

## Özellikler

### 📺 Tam Ekran Görüntülem
- Ekranı tamamen kaplayan layout
- Büyük, kolay okunur fontlar
- Gradient arka plan
- Minimal UI tasarım

### 📋 Sipariş Bilgileri
- **Müşteri Bilgisi**: İsim ve departman
- **İçecek Listesi**: Tür ve adet bilgisiyle
- **Sipariş Durumu**: Renkli durum göstergesi
- **Zaman Bilgisi**: Sipariş ve güncel zaman

### 🔄 Otomatik Yenileme
- 30 saniyede bir otomatik güncelleme
- Geri sayım sayacı
- Son güncelleme zamanı
- Sayfa gizlendiğinde otomatik durdurma

### 🎨 Görsel Tasarım
- **Modern Gradient**: Mavi-mor geçiş
- **Responsive**: Farklı ekran boyutları için uyumlu
- **Animasyonlar**: Yumuşak geçişler
- **Durum Renkleri**: 
  - 🟡 Sarı: Yeni sipariş
  - 🔵 Mavi: Sipariş alındı  
  - 🟢 Yeşil: Hazırlandı

## Kullanım

### Yerel Test
```bash
cd web-app
npx http-server -p 8080
```
Tarayıcıda: `http://localhost:8080/kiosk.html`

### Üretim Kullanımı
1. `kiosk.html` dosyasını doğrudan tarayıcıda açın
2. Tam ekran yapmak için F11 tuşuna basın
3. Otomatik yenileme başlayacaktır

### Test Modu
JavaScript dosyasında `TEST_MODE = true` yaparak test verisiyle çalıştırabilirsiniz:
```javascript
const TEST_MODE = true; // Test verisi kullan
```

### Supabase Bağlantısı
Gerçek veritabanı bağlantısı için:
```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-supabase-key';
```

## Responsive Tasarım

### Büyük Ekranlar (>1400px)
- 2 sütunlu layout
- Maksimum font boyutları
- Geniş padding

### Orta Ekranlar (1200-1400px)
- Tek sütunlu layout
- Orta boy fontlar
- Optimum spacing

### Küçük Ekranlar (<1200px) 
- Dikey layout
- Compact tasarım
- Mobil uyumlu

## Debug

Tarayıcı konsolunda debug fonksiyonları:
```javascript
// Manual olarak veri yenile
window.kioskDebug.fetchLatestOrder();

// Otomatik yenilemeyi durdur
window.kioskDebug.stopAutoRefresh();

// Test verisi göster
window.kioskDebug.displayLatestOrder(testData);
```

## Konfigürasyon

### Zaman Ayarları
```javascript
const REFRESH_INTERVAL = 30000; // 30 saniye (milisaniye)
```

### Debug Ayarları
```javascript
const DEBUG_MODE = true; // Console log aktif
```

## Sorun Giderme

### Veri Gelmiyor
1. Supabase bağlantı bilgilerini kontrol edin
2. Veritabanında sipariş olduğundan emin olun
3. Network sekmesinde API çağrılarını kontrol edin

### Görüntü Bozuk
1. CSS dosyasının yüklendiğinden emin olun
2. Tarayıcı önbelleğini temizleyin (Ctrl+F5)
3. Farklı tarayıcı deneyin

### Otomatik Yenileme Çalışmıyor
1. JavaScript hatalarını konsol üzerinden kontrol edin
2. Network bağlantısını kontrol edin
3. Sayfa gizli/hidden durumda olmadığından emin olun

## İyileştirme Önerileri

### Performans
- Veritabanı sorguları cache'lenebilir
- Image lazy loading eklenebilir
- Service Worker ile offline destek

### Özellik Eklentileri  
- Ses bildirimi (yeni sipariş)
- Sipariş öncelik sıralaması
- Çoklu sipariş grupları
- Chef onay butonu

### Görsel İyileştirme
- Dark/Light theme seçeneği
- Renk konfigürasyonu
- Font boyutu ayarları
- Logo/branding ekleme