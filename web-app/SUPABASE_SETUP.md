# Supabase API Key Güncelleme Rehberi

## ❗ API Key Hatası Çözümü

Web uygulamanızda "Invalid API key" hatası alıyorsanız, aşağıdaki adımları takip edin:

### 1. Supabase Dashboard'a Giriş
- https://supabase.com adresine gidin
- Hesabınıza giriş yapın
- `cfapmolnnvemqjneaher` projenizi seçin

### 2. API Anahtarlarını Bulma
- Sol menüden **Settings** > **API** seçeneğine gidin
- Aşağıdaki bilgileri bulun:
  - **Project URL**: `https://cfapmolnnvemqjneaher.supabase.co`
  - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (uzun anahtar)

### 3. Anahtarları Güncelleme
`script.js` dosyasında aşağıdaki satırları bulun ve güncelleyin:

```javascript
// Supabase Configuration
const SUPABASE_URL = 'BURAYA_PROJECT_URL_YAZIN';
const SUPABASE_ANON_KEY = 'BURAYA_ANON_KEY_YAZIN';
```

### 4. Test Modu Ayarları
- Geçici test için: `const TEST_MODE = true;`
- Gerçek veritabanı için: `const TEST_MODE = false;`

### 5. Veritabanı Tablosu Kontrolü
Supabase'de `drink_orders` tablosunun mevcut olduğundan emin olun:

```sql
-- Tablo oluşturma (eğer yoksa)
CREATE TABLE drink_orders (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_name text NOT NULL,
    department text NOT NULL,
    drink_type text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    created_at timestamp with time zone DEFAULT NOW()
);

-- RLS (Row Level Security) ayarları
ALTER TABLE drink_orders ENABLE ROW LEVEL SECURITY;

-- Herkesin okuma/yazma izni (geliştirme için)
CREATE POLICY "Enable all operations for everyone" ON drink_orders
FOR ALL USING (true);
```

### 6. API Anahtarı Test Etme
Browser Console'da test edin:
```javascript
// Test bağlantısı
const testClient = supabase.createClient('YOUR_URL', 'YOUR_KEY');
testClient.from('drink_orders').select('count(*)').then(console.log);
```

## 🔧 Mevcut Durum
- ✅ Test modu aktif (TEST_MODE = true)
- ✅ Otomatik fallback mekanizması mevcut
- ✅ API key hatası durumunda test moduna geçiş
- ✅ Detaylı hata mesajları

## 📝 Notlar
- Test modu tam fonksiyonel çalışır
- Gerçek siparişler CYD'de görünmez (test modunda)
- API key düzeltildikten sonra TEST_MODE = false yapın
- ESP32 CYD kodu aynı anahtarları kullanır

## 🚀 GitHub Pages'de Çalıştırma
GitHub Pages'de yayınlandığında aynı API anahtarları geçerli olacaktır.