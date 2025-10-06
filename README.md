# Kitchen Order Display System for CYD (ESP32-2432S028R)

Modern mutfak sipariş yönetim sistemi - ESP32 tabanlı dokunmatik ekran kiosk ve Supabase backend.

## 🎯 Özellikler

- ✅ **Otomatik WiFi Bağlantısı**: Kimlik bilgileri kalıcı olarak saklanır
- ✅ **Çoklu İçecek Siparişi**: Tek seferde birden fazla içecek sipariş edilebilir
- ✅ **Dokunmatik Arayüz**: 2.8" TFT LCD ekran ile kullanımı kolay
- ✅ **Gerçek Zamanlı Senkronizasyon**: Supabase ile anlık veri güncellemesi
- ✅ **Web Yapılandırma**: Kullanıcı dostu WiFi setup arayüzü
- ✅ **SSL/TLS Güvenli Bağlantı**: HTTPS üzerinden güvenli veri iletişimi
- ✅ **Öncelikli Sipariş Sistemi**: Acil siparişler için önceliklendirme
- ✅ **Departman Bazlı Filtreleme**: Farklı departmanlar için ayrı görünüm

## 📱 WiFi Ayarları

### 🔄 Otomatik Bağlantı Özelliği

ESP32 kiosk cihazınız artık WiFi kimlik bilgilerini **otomatik olarak kaydeder**!

#### İlk Kurulum
1. Cihazı açın - "WiFi Setup Mode" ekranını göreceksiniz
2. `CYD_SETUP` ağına bağlanın (Şifre: `12345678`)
3. Tarayıcınızda `http://192.168.4.1` adresine gidin
4. WiFi ağınızı seçin ve şifresini girin
5. **Başarılı bağlantı sonrası kimlik bilgileri otomatik kaydedilir**

#### Sonraki Açılışlar
- ✅ Cihaz kayıtlı WiFi ağına **otomatik bağlanır**
- ✅ **Hiçbir kullanıcı müdahalesi gerekmez**
- ✅ En son bağlanılan ağa en yüksek öncelik verilir

📖 **Detaylı bilgi için**: [WIFI_SETUP_TR.md](WIFI_SETUP_TR.md) dosyasına bakın

## Hardware Requirements

- CYD (Cheap Yellow Display) - ESP32-2432S028R
- This board includes:
  - ESP32 microcontroller
  - 2.8" TFT LCD display (480x320)
  - Resistive touch screen
  - Built-in WiFi

## Software Requirements

- PlatformIO IDE (VS Code extension)
- Supabase account and project

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Create a table called `tea_orders` with the following structure:

```sql
CREATE TABLE tea_orders (
    id SERIAL PRIMARY KEY,
    tea_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    customer_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample data
INSERT INTO tea_orders (tea_type, quantity, customer_name, status) VALUES
('Black Tea', 2, 'John Doe', 'pending'),
('Green Tea', 1, 'Jane Smith', 'pending'),
('Earl Grey', 1, 'Bob Johnson', 'preparing');
```

3. Go to Settings > API and copy:
   - Project URL
   - Anon/Public key

## Configuration

1. Open `include/config.h` and update:
   - `WIFI_SSID` - Your WiFi network name
   - `WIFI_PASSWORD` - Your WiFi password
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon key

## Features

### Kitchen Staff Interface
- **Main Menu**: Overview of the system
- **Order Queue**: View all pending tea orders
- **Order Details**: Detailed view of individual orders
- **Status Management**: Update order status (pending → preparing → ready)
- **Real-time Updates**: Automatically fetches new orders every 30 seconds

### Touch Controls
- Navigate between screens using touch
- Update order status with touch buttons
- Cancel orders if needed

### Order Status Flow
1. **Pending** (Yellow): New order received
2. **Preparing** (Orange): Kitchen staff is preparing the tea
3. **Ready** (Green): Tea is ready for pickup

## Usage Instructions

1. **Power on the device** - It will automatically connect to WiFi
2. **Main Menu** - Shows system status and order count
3. **Touch "View Orders"** - See all current orders
4. **Select an order** - Touch any order to see details
5. **Update status** - Touch the status button to advance order status
6. **Cancel orders** - Touch "Cancel Order" to remove from queue

## API Endpoints Used

The app interacts with Supabase using these REST API endpoints:

- `GET /tea_orders` - Fetch all orders
- `PATCH /tea_orders` - Update order status
- `DELETE /tea_orders` - Cancel/delete orders

## Troubleshooting

### WiFi Connection Issues
- Check SSID and password in config.h
- Ensure WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)

### Supabase Connection Issues
- Verify project URL and API key
- Check Row Level Security (RLS) settings in Supabase
- Ensure table name matches exactly: `tea_orders`

### Display Issues
- Check that the board is properly connected
- Verify display orientation settings
- Touch calibration may need adjustment

### Touch Not Working
- Check touch pin connections
- Adjust touch coordinates mapping in code if needed

## Customization

### Adding New Tea Types
Modify the `teaTypes` array in `main.cpp`:

```cpp
String teaTypes[] = {"Black Tea", "Green Tea", "Earl Grey", "Chamomile", "Oolong", "Custom Tea"};
```

### Changing Colors
Update color definitions in `config.h`

### Modifying Refresh Rate
Change the refresh interval in `loop()`:

```cpp
if (millis() - lastRefresh > 30000) { // 30 seconds
```

## Future Enhancements

- Order priority system
- Customer notification when ready
- Order history and analytics
- Multiple kitchen stations
- Sound notifications
- Order preparation time tracking

## License

This project is open source. Feel free to modify and distribute.