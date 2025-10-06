# Changelog - CHEF_R2 Kitchen Kiosk System

## [2.0.0] - 2025-10-06

### 🎉 Major Stability & WiFi Connection Fixes

#### Critical Bug Fixes

**WiFi Connection Loop (FIXED)**
- ❌ **Problem:** Device would connect to WiFi successfully, then immediately return to WiFi setup/AP mode
- ✅ **Solution:** 
  - Added `lastWifiCheck = millis()` initialization after successful WiFi connection
  - Prevents immediate WiFi status check after connection
  - Added 5-minute timeout before activating AP mode on WiFi disconnect
  - Added 3 reconnect attempts with delays before considering WiFi lost

**ESP32 Restart Loop (FIXED)**
- ❌ **Problem:** Device would restart indefinitely after WiFi connection, returning to calibration screen
- ✅ **Solution:**
  - Removed `ESP.restart()` call in `handleConnect()`
  - Implemented proper AP mode service shutdown (server.stop(), server.close(), dnsServer.stop())
  - Added proper state flag ordering (set flags BEFORE service changes)

**Crash on DNS Failure (FIXED)**
- ❌ **Problem:** Device would crash with "Guru Meditation Error" when DNS resolution failed
- ✅ **Solution:**
  - Added null pointer checks before deleting WiFiClientSecure objects
  - Removed String concatenation in TFT error displays
  - Added early return on connection failures
  - Removed all TFT error screens that used String operations

**Touch Calibration Repeated Every Boot (FIXED)**
- ❌ **Problem:** Touch calibration ran on every startup
- ✅ **Solution:**
  - Implemented Preferences storage for calibration data ("touch-cal" namespace)
  - Calibration now runs only once and persists across reboots
  - Shows "✅ Using saved touch calibration" on subsequent boots

#### Enhancements

**WiFi Management**
- ✅ Auto-save WiFi credentials on successful connection
- ✅ Support for 5 WiFi networks with priority-based connection
- ✅ Persistent WiFi credentials storage in NVS Preferences
- ✅ Automatic fallback to AP mode only after 5 minutes of disconnect
- ✅ WiFi reconnect attempts with proper delays

**Connection Stability**
- ✅ Added `lastWifiCheck` timer to prevent aggressive WiFi monitoring
- ✅ Increased WiFi check interval to 30 seconds
- ✅ Added 1-second delay before initial `fetchOrders()` after WiFi connection
- ✅ Proper DNS configuration (Google 8.8.8.8 and Cloudflare 1.1.1.1)

**Error Handling**
- ✅ Graceful handling of DNS resolution failures
- ✅ Graceful handling of HTTP connection errors
- ✅ No more crashes on network issues
- ✅ Proper cleanup of SSL client objects with null checks

**AP Mode Configuration**
- ✅ Captive portal on 192.168.4.1
- ✅ Web interface for WiFi configuration
- ✅ SSID: CYD-WiFi-Setup
- ✅ Password: 12345678
- ✅ Automatic AP mode shutdown after successful WiFi connection

### Technical Details

**Modified Functions:**

1. **handleConnect()**
   - Removed `ESP.restart()`
   - Added proper service shutdown sequence
   - Added `lastWifiCheck = millis()`
   - Fixed flag ordering (set before service changes)

2. **autoConnectWiFi()**
   - Added `lastWifiCheck = millis()` after successful connection
   - Improved network scanning and connection logic

3. **checkWiFiConnection()**
   - Added 5-minute disconnect timeout
   - Added 3 reconnect attempts with 2-second delays
   - Added static `firstDisconnectTime` tracking

4. **fetchOrders()**
   - Added null pointer checks for WiFiClientSecure cleanup
   - Removed TFT error displays with String concatenation
   - Added early return on DNS/connection failures

5. **acceptOrder()**
   - Added null pointer checks for client deletion
   - Removed error screens with String operations

6. **touch_calibrate()**
   - Added Preferences storage implementation
   - Added calibration data persistence

**Memory Optimization:**
- Flash usage: 83.6% (1,095,613 bytes of 1,310,720)
- RAM usage: 15.9% (52,160 bytes of 327,680)
- Reduced code size by removing error display logic

**Global Variables:**
- Moved `lastFetch`, `lastWifiCheck`, `lastBuzzerTime` to proper global scope
- Fixed duplicate variable declarations

### Database & API

**Schema Compatibility:** ✅ Fully compatible
- Supabase REST API integration
- Field mapping documented in DATABASE_SCHEMA.md
- Status flow: new → alindi → hazirlandi → teslim_edildi
- Order grouping by `order_group_id`

**Endpoints:**
- GET `/rest/v1/drink_orders?status=eq.new`
- PATCH `/rest/v1/drink_orders?order_group_id=eq.{id}&status=eq.{status}`

### Configuration

**Supabase:**
- URL: https://cfapmolnnvemqjneaher.supabase.co
- Authentication: Bearer token (anon key)

**Network:**
- Primary DNS: 8.8.8.8 (Google)
- Secondary DNS: 1.1.1.1 (Cloudflare)
- HTTP timeout: 25 seconds
- WiFi check interval: 30 seconds
- Fetch interval: 15 seconds

**Hardware:**
- Board: ESP32-D0WD-V3 (rev 3.1)
- Display: ESP32-2432S028R (CYD)
- MAC: e4:65:b8:21:20:00

### Known Issues

⚠️ **DNS Resolution**
- Requires internet-connected WiFi network
- Current test network (AVM GRUP2) lacks internet access
- Recommend using 4G/5G hotspot for testing

### Testing Status

✅ **Completed:**
- WiFi auto-connection
- WiFi credentials persistence
- Touch calibration persistence
- AP mode WiFi configuration
- Order fetching logic
- Order grouping display
- Touch-based acknowledgment
- Status updates (when internet available)
- Crash prevention on network errors
- 5-minute AP mode timeout

⏳ **Pending Internet Connection:**
- DNS resolution to Supabase
- End-to-end order flow
- Real-time status updates

### Migration Notes

**From v1.x to v2.0:**
- Touch calibration will run once on first boot with v2.0
- WiFi credentials will be preserved if already stored
- No database migration required
- Web system integration unchanged

### Recommendations

1. **Production Deployment:**
   - Use WiFi with stable internet connection
   - Monitor DNS resolution errors
   - Consider enabling SSL certificate verification
   - Set up remote logging for error tracking

2. **Web System:**
   - Ensure orders sent with `status='new'`
   - Use `order_group_id` for batch orders
   - Test all status transitions
   - Validate `waiting_minutes` calculation

3. **Network Setup:**
   - Configure static IP (optional)
   - Ensure firewall allows HTTPS to Supabase
   - Test DNS resolution to cfapmolnnvemqjneaher.supabase.co
   - Monitor network stability

---

## [1.0.0] - Initial Release

### Features
- Basic order fetching from Supabase
- Touch interface
- Order status updates
- Buzzer notifications
- WiFi connection

### Issues (Fixed in v2.0)
- WiFi connection loop
- ESP32 restart loop
- Crash on DNS failure
- Touch calibration every boot
- Aggressive WiFi monitoring

---

**Maintainer:** AVM Development Team  
**Last Updated:** October 6, 2025  
**Platform:** PlatformIO + Arduino Framework  
**License:** Proprietary
