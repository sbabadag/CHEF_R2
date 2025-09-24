# AVM Grup Kitchen Order System - Güncelleme Talimatları

## 🔄 Sistem Güncellemesi Tamamlandı!

### ✅ Yapılan Güncellemeler:

#### 1. **Supabase Database Schema** (`supabase_setup.sql`)
- ❌ Eski: `tea_orders` tablosu (tek içecek)
- ✅ Yeni: `drink_orders` tablosu (çoklu içecek)
- ✨ Yeni Alanlar:
  - `customer_name` - Müşteri adı
  - `department` - Departman bilgisi
  - `quantity` - İçecek adedi
  - `special_instructions` - Özel notlar
  - `priority` - Öncelik seviyesi (0=normal, 1=acil)
  - `order_group_id` - Grup sipariş ID'si
  - `waiting_minutes` - Bekleme süresi (otomatik hesaplanan)
  - `estimated_time` - Tahmini hazırlanma süresi

#### 2. **ESP32 CYD Kod Güncellemesi** (`src/main.cpp`)
- ✨ Çoklu içecek sipariş desteği
- ✨ Gelişmiş UI tasarımı:
  - 📍 Müşteri adı + Departman görüntüleme
  - 🔢 Miktar bilgisi (x2, x3 vb.)
  - 📝 Özel talimatlar görüntüleme
  - ⏰ Bekleme süresi göstergesi
  - 🚨 Acil sipariş için renk kodlaması (mor/magenta)
- ✅ Yeni durumlar: `new` → `alindi` → `hazirlandi`
- ✅ İyileştirilmiş dokunma algılaması
- ✅ Otomatik yenileme (15 saniye)

#### 3. **Web App Entegrasyonu**
- ✅ Web app zaten `drink_orders` tablosunu kullanıyor
- ✅ Çoklu içecek seçimi destekli
- ✅ Batch sipariş sistemi aktif

### 🚀 Kurulum Adımları:

#### 1. **Supabase Database Güncelleme**
1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
2. SQL Editor'ı açın
3. `supabase_setup.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'da çalıştırın (Run)
5. ✅ `drink_orders` tablosu oluşturulacak

#### 2. **ESP32 Kod Güncelleme**
1. PlatformIO'da projeyi açın
2. `src/main.cpp` dosyası güncellenmiş durumda
3. Compile ve Upload yapın
4. ✅ CYD ekranında yeni arayüz görünecek

#### 3. **Test Etme**
1. Web uygulamasından çoklu sipariş verin
2. CYD ekranında siparişlerin görüntülendiğini kontrol edin
3. Dokunarak sipariş durumlarını güncelleyin:
   - 🔴 **YENİ** (Kırmızı) → **ALINDI** butonuna dokun
   - 🟠 **ALINDI** (Turuncu) → **HAZIR** butonuna dokun
   - ✅ **HAZIR** durumu otomatik süzülür

### 🎯 Yeni Özellikler:

#### **Çoklu İçecek Sistemi**
- Bir müşteri birden fazla içecek türü sipariş edebilir
- Her içecek için ayrı miktar belirlenebilir
- Grup halinde sipariş takibi

#### **Gelişmiş CYD Arayüzü**
- **Acil Siparişler**: Mor/magenta renk kodlaması
- **Bekleme Süresi**: "5dk", "12dk" şeklinde gösterim
- **Özel Notlar**: "Not: Şekerli" gibi talimatlar
- **Departman Bilgisi**: "AKBAL (Muhasebe)" formatı

#### **Otomatik Süzme**
- Hazırlanan siparişler (`hazirlandi`) otomatik gizlenir
- Sadece aktif siparişler (`new`, `alindi`) görüntülenir
- Geçmiş veriler veritabanında korunur

### 📊 Veritabanı Görünümü:

#### **kitchen_active_orders** (View)
```sql
-- Sadece aktif siparişleri gösterir
SELECT * FROM kitchen_active_orders;
```

#### **order_statistics** (View)  
```sql
-- İstatistikleri gösterir
SELECT * FROM order_statistics;
```

### 🔧 Sorun Giderme:

#### **CYD Bağlantı Sorunları:**
1. WiFi ayarlarını kontrol edin
2. Serial Monitor'da bağlantı loglarını izleyin
3. DNS ayarlarını kontrol edin (8.8.8.8 kullanılıyor)

#### **Supabase API Hataları:**
1. API anahtarının doğru olduğunu kontrol edin
2. Tablo adının `drink_orders` olduğunu doğrulayın
3. RLS politikalarının aktif olduğunu kontrol edin

#### **Web App Sorunları:**
1. Tarayıcı konsolunda hata mesajlarını kontrol edin
2. Supabase bağlantısını test edin
3. TEST_MODE = false olduğunu doğrulayın

### 📱 Kullanım Senaryosu:

1. **AKBAL** Muhasebe departmanından web uygulamasına girer
2. **2 adet Çay**, **1 adet Su** ve **1 adet Kahve** seçer
3. Özel talimat ekler: "Çaylar şekerli olsun"
4. Siparişi onaylar
5. **CYD ekranında 3 ayrı sipariş kartı** görünür:
   - 🔴 AKBAL (Muhasebe) - Çay x2 - "Not: Şekerli"
   - 🔴 AKBAL (Muhasebe) - Su x1
   - 🔴 AKBAL (Muhasebe) - Kahve x1
6. **Aşçı** siparişleri tek tek alır ve hazırlar
7. Her sipariş tamamlandığında CYD'den silinir

### ✨ Başarılı Güncelleme!
Sistem artık tamamen çoklu içecek sipariş sistemini destekliyor ve tüm bileşenler senkronize çalışıyor.