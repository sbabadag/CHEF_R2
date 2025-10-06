# WiFi Ayarları - Kullanım Kılavuzu 📶

## Otomatik WiFi Bağlantısı

ESP32 kiosk cihazınız artık WiFi kimlik bilgilerini kalıcı olarak kaydediyor!

### 🎯 Özellikler

- ✅ **Otomatik Bağlantı**: Cihaz açıldığında kayıtlı WiFi ağlarına otomatik bağlanır
- ✅ **Kalıcı Kayıt**: Başarılı bağlantılar ESP32 flash belleğine kaydedilir
- ✅ **Öncelik Sistemi**: En son bağlanılan ağ en yüksek önceliğe sahiptir
- ✅ **Web Arayüzü**: Kolay WiFi yapılandırması için kullanıcı dostu web arayüzü
- ✅ **Fallback AP Modu**: Hiçbir ağ bulunamazsa otomatik konfigürasyon modu

---

## 📋 İlk Kurulum (İlk Açılış)

### Adım 1: Cihazı Açın
- ESP32'yi güç kaynağına bağlayın
- Ekranda "WiFi Setup Mode" mesajını göreceksiniz

### Adım 2: AP Mode'a Bağlanın
Cihaz otomatik olarak bir Access Point (AP) oluşturur:

```
SSID: CYD_SETUP
Şifre: 12345678
IP: 192.168.4.1
```

### Adım 3: Web Arayüzüne Erişin
1. Telefonunuz veya bilgisayarınızdan `CYD_SETUP` ağına bağlanın
2. Tarayıcınızı açın ve şu adrese gidin:
   ```
   http://192.168.4.1
   ```
3. Otomatik olarak konfigürasyon sayfası açılacaktır

### Adım 4: WiFi Ağını Seçin
Web arayüzünde:
1. **"Scan for Networks"** butonuna tıklayın
2. Mevcut WiFi ağları listelenecektir
3. Bağlanmak istediğiniz ağa tıklayın
4. WiFi şifresini girin
5. **"Connect to WiFi"** butonuna tıklayın

### Adım 5: Bağlantı Doğrulama
- ✅ Başarılı bağlantı sonrası:
  - Ekranda **"WiFi Baglandi!"** mesajı görünür
  - **"(Kimlik bilgileri kaydedildi)"** bilgisi gösterilir
  - **"Bir dahaki sefere otomatik baglanacak!"** mesajı görünür
  - Cihaz otomatik olarak yeniden başlatılır

- ❌ Bağlantı başarısız olursa:
  - **"Baglanti basarisiz!"** hatası gösterilir
  - Şifrenizi kontrol edin ve tekrar deneyin
  - Yanlış şifreler **kaydedilmez**

---

## 🔄 Sonraki Açılışlar

### Otomatik Bağlantı
Cihaz her açıldığında:
1. Kayıtlı WiFi ağlarını tarar
2. Mevcut ağlardan en yüksek öncelikli olanı bulur
3. Otomatik olarak bağlanır
4. **Hiçbir kullanıcı müdahalesi gerekmez!**

### Ekran Mesajları
```
WiFi Baglandi!
(Kimlik bilgileri kaydedildi)
SSID: sbabadagip
IP: 192.168.1.97
Gateway: 192.168.1.1
DNS: 192.168.1.1
Bir dahaki sefere otomatik
baglanacak!
```

---

## 🔧 Yeni Ağ Ekleme

### Yöntem 1: Web Arayüzü (Önerilen)
Mevcut WiFi bağlantısı kesildiğinde veya başka bir ağa bağlanmak istediğinizde:

1. Cihaz otomatik olarak AP moduna geçer
2. Yukarıdaki "İlk Kurulum" adımlarını takip edin
3. Yeni ağ bilgileri eski olanların üzerine yazılır

### Yöntem 2: Manuel Kod Güncelleme
`include/config.h` dosyasında varsayılan ağları tanımlayabilirsiniz:

```cpp
// WiFi network credentials (fallback)
WiFiCredentials wifi_networks[MAX_WIFI_NETWORKS] = {
  {"Ag_Adi_1", "sifre123"},
  {"Ag_Adi_2", "sifre456"},
  {"", ""} // Empty entries for future use
};
```

---

## 💾 Veri Saklama Detayları

### Preferences API
ESP32, WiFi kimlik bilgilerini **NVS (Non-Volatile Storage)** kullanarak saklar:

- **Namespace**: `wifi-creds`
- **Kayıt Formatı**:
  ```
  count: Toplam ağ sayısı
  ssid0: İlk ağın SSID'si
  pass0: İlk ağın şifresi
  en0: Etkin/Devre dışı durumu
  pr0: Öncelik değeri (0 = en yüksek)
  ```

### Maksimum Kapasite
- **Maksimum Ağ Sayısı**: 5 (MAX_WIFI_NETWORKS)
- **SSID Uzunluğu**: 32 karakter
- **Şifre Uzunluğu**: 64 karakter

### Öncelik Sistemi
- **0**: En yüksek öncelik (en son eklenen/güncellenen ağ)
- **1-4**: Düşük öncelikler
- Cihaz her zaman en yüksek öncelikli mevcut ağa bağlanır

---

## 🐛 Sorun Giderme

### Problem: Cihaz WiFi'ye Bağlanamıyor
**Çözüm**:
1. Şifrenin doğru olduğundan emin olun
2. WiFi ağının 2.4 GHz olduğunu kontrol edin (ESP32, 5 GHz'i desteklemez)
3. Router'ın ESP32'yi engellemediğini kontrol edin
4. Serial Monitor'ü açın ve hata loglarını inceleyin:
   ```bash
   platformio device monitor -p COM3
   ```

### Problem: AP Mode'a Geçmiyor
**Çözüm**:
1. Cihazı yeniden başlatın
2. Preferences'ı temizlemek için Serial Monitor'de şunu deneyin:
   ```cpp
   preferences.begin("wifi-creds", false);
   preferences.clear();
   preferences.end();
   ```

### Problem: Kayıtlı Ağı Unutturmak İstiyorum
**Çözüm 1** (Web Arayüzü):
- Yeni bir ağ eklerseniz, eski ağ üzerine yazılır

**Çözüm 2** (Kod):
```cpp
preferences.begin("wifi-creds", false);
preferences.putInt("count", 0); // Tüm ağları sıfırla
preferences.end();
ESP.restart();
```

### Problem: DNS Hatası
**Çözüm**:
- Cihaz artık DHCP'den otomatik DNS alıyor
- Router'ınızın DHCP'sinin aktif olduğundan emin olun
- Manuel DNS gerekiyorsa `config.h` dosyasını düzenleyin

---

## 📊 Serial Monitor Logları

### Başarılı Bağlantı
```
Starting WiFi auto-connection...
Found 5 networks
Network sbabadagip is available, attempting connection...
Trying to connect to: sbabadagip
Connected to sbabadagip
IP Address: 192.168.1.97
DNS: 192.168.1.1
✅ Connection successful, saving network credentials...
➕ Added new network: sbabadagip (priority 0, total: 1)
📝 Network credentials saved to Preferences
```

### Bağlantı Hatası
```
Trying to connect to: YanlisSifre
Failed to connect to YanlisSifre
WiFi Status: 1 (WL_NO_SSID_AVAIL)
❌ Failed to connect to network
```

### Otomatik Bağlantı
```
Loaded network 0: sbabadagip (enabled: yes)
Network sbabadagip is available, attempting connection...
WiFi connected successfully!
Final DNS: 192.168.1.1
```

---

## 🔐 Güvenlik Notları

1. **Şifre Güvenliği**: 
   - WiFi şifreleri ESP32 flash belleğinde **düz metin** olarak saklanır
   - Fiziksel cihaz güvenliğine dikkat edin

2. **AP Mode Şifresi**:
   - Varsayılan AP şifresi: `12345678`
   - Güvenlik için `config.h` dosyasından değiştirin:
     ```cpp
     #define AP_PASSWORD "YeniGüvenliŞifre"
     ```

3. **Web Arayüzü**:
   - HTTP kullanılır (HTTPS değil)
   - Sadece lokal ağda kullanın
   - Hassas bilgileri genel ağlarda paylaşmayın

---

## 🎨 Kullanıcı Deneyimi İyileştirmeleri

### Ekran Mesajları
- ✅ Yeşil renk: Başarılı işlemler
- ❌ Kırmızı renk: Hatalar
- 🔄 Sarı renk: İşlem devam ediyor
- ℹ️ Mavi renk: Bilgi mesajları

### Web Arayüzü
- Responsive tasarım (mobil uyumlu)
- Sinyal gücü göstergesi (Strong/Good/Weak)
- Otomatik ağ tarama
- Gerçek zamanlı durum güncellemeleri
- Türkçe hata mesajları

### Otomatik Yeniden Başlatma
- Başarılı bağlantı sonrası 3 saniye içinde cihaz yeniden başlar
- Temiz bir başlangıç sağlar
- Eski bağlantı sorunlarını temizler

---

## 📝 Değişiklik Geçmişi

### v2.0 (Güncel)
- ✅ Otomatik WiFi kimlik bilgisi kaydetme
- ✅ Başarılı bağlantı sonrası otomatik kayıt
- ✅ Öncelik sistemi (en son bağlanılan ağ = öncelik 0)
- ✅ Web arayüzü Türkçeleştirildi
- ✅ SSL/TLS bağlantı iyileştirmeleri
- ✅ WiFiClientSecure pointer kullanımı
- ✅ Otomatik cihaz yeniden başlatma
- ✅ Gelişmiş hata mesajları

### v1.0 (Eski)
- Manuel WiFi yapılandırması
- Her seferinde şifre isteme
- Temel web arayüzü

---

## 🆘 Destek

Sorun yaşarsanız:
1. Serial Monitor loglarını kontrol edin
2. GitHub Issues'da sorun bildirin
3. Cihazı fabrika ayarlarına sıfırlayın (flash erase)

**Mutlu kodlamalar! 🚀**
