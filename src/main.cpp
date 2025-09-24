#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include "config.h"

class LGFX_CYD : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9341 _panel_instance;
  lgfx::Bus_SPI _bus_instance;
  lgfx::Light_PWM _light_instance;
  lgfx::Touch_XPT2046 _touch_instance;

public:
  LGFX_CYD(void) {
    {
      auto cfg = _bus_instance.config();
      cfg.spi_host = HSPI_HOST;
      cfg.spi_mode = 0;
      cfg.freq_write = 40000000;
      cfg.freq_read = 16000000;
      cfg.spi_3wire = true;
      cfg.use_lock = true;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      cfg.pin_sclk = 14;
      cfg.pin_mosi = 13;
      cfg.pin_miso = 12;
      cfg.pin_dc = 2;
      _bus_instance.config(cfg);
      _panel_instance.setBus(&_bus_instance);
    }

    {
      auto cfg = _panel_instance.config();
      cfg.pin_cs = 15;
      cfg.pin_rst = -1;
      cfg.pin_busy = -1;
      cfg.panel_width = 240;
      cfg.panel_height = 320;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      cfg.offset_rotation = 0;
      cfg.dummy_read_pixel = 8;
      cfg.dummy_read_bits = 1;
      cfg.readable = false;
      cfg.invert = false;
      cfg.rgb_order = false;
      cfg.dlen_16bit = false;
      cfg.bus_shared = true;
      _panel_instance.config(cfg);
    }

    { // Backlight on GPIO21
      auto cfg = _light_instance.config();
      cfg.pin_bl = 21;
      cfg.invert = false;
      cfg.freq = 44100;
      cfg.pwm_channel = 7;
      _light_instance.config(cfg);
      _panel_instance.setLight(&_light_instance);
    }

    {
      auto cfg = _touch_instance.config();
      cfg.x_min = 0;
      cfg.x_max = 306;
      cfg.y_min = 48;
      cfg.y_max = 191;
      cfg.pin_cs = 33;
      cfg.pin_int = 36;
      cfg.bus_shared = true;
      cfg.offset_rotation = 0;
      cfg.spi_host = VSPI_HOST;
      cfg.freq = 2500000;
      cfg.pin_sclk = 25;
      cfg.pin_mosi = 32;
      cfg.pin_miso = 39;
      _touch_instance.config(cfg);
      _panel_instance.setTouch(&_touch_instance);
    }

    setPanel(&_panel_instance);
  }
};

LGFX_CYD tft;

// Buzzer configuration
const int BUZZER_PIN = 22;

// WiFi credentials
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// Supabase configuration - CORRECT URL AND KEY
const char* supabase_url = SUPABASE_URL;
const char* supabase_key = SUPABASE_ANON_KEY;

// Order structure for multiple drink orders
struct Order {
  String id;
  String customer_name;  // Updated field name to match new schema
  String department;     // New field for department
  String drink_type;
  int quantity;          // New field for quantity
  String status;         // "new", "alindi", "hazirlandi"
  String special_instructions; // New field for special instructions
  int priority;          // New field for priority (0=normal, 1=urgent)
  String created_at;
  float waiting_minutes; // Calculated waiting time
  int position_y;
};

const int MAX_ORDERS = 8;
Order orders[MAX_ORDERS];
int orderCount = 0;
unsigned long lastFetch = 0;
const unsigned long FETCH_INTERVAL = 15000; // Increased to 15 seconds
int consecutiveErrors = 0;
const int MAX_CONSECUTIVE_ERRORS = 5;

// Buzzer control variables
bool hasNewOrder = false;
bool buzzerActive = false;
unsigned long lastBuzzerTime = 0;
const unsigned long BUZZER_INTERVAL = 60000; // 1 minute = 60000ms
String lastOrderId = "";
bool initialBuzzDone = false;

// Forward declarations
void fetchOrders();
void drawScreen();
void handleTouch(uint16_t x, uint16_t y);
void updateOrderStatus(int orderIndex, const String& newStatus);
int findTouchedOrder(uint16_t x, uint16_t y);
String utf8ToLatin1(String input);
void buzzerBeep(int count = 1, int duration = 200, int pause = 300);
void checkNewOrderBuzzer();
void handlePeriodicBuzzer();

// Handle Turkish characters conversion
String utf8ToLatin1(String input) {
  // Replace Turkish characters with ASCII equivalents for display
  input.replace("ç", "c");
  input.replace("ğ", "g"); 
  input.replace("ı", "i");
  input.replace("ö", "o");
  input.replace("ş", "s");
  input.replace("ü", "u");
  input.replace("Ç", "C");
  input.replace("Ğ", "G");
  input.replace("İ", "I");
  input.replace("Ö", "O");
  input.replace("Ş", "S");
  input.replace("Ü", "U");
  return input;
}

void setup() {
  Serial.begin(115200);
  Serial.println("=== MUTFAK SIPARIS SISTEMI ===");
  
  // Initialize buzzer pin
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  tft.init();
  tft.setRotation(1);  // Landscape mode 320x240
  tft.fillScreen(TFT_BLACK);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 50);
  tft.print("WiFi Baglaniyor...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  // Configure DNS servers - Try multiple approaches
  WiFi.config(WiFi.localIP(), WiFi.gatewayIP(), WiFi.subnetMask(), IPAddress(8, 8, 8, 8), IPAddress(1, 1, 1, 1));
  delay(1000);
  
  Serial.println("\nWiFi Baglandi!");
  Serial.print("IP Adresi: ");
  Serial.println(WiFi.localIP());
  Serial.print("Gateway: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("DNS: ");
  Serial.println(WiFi.dnsIP());
  
  // Test basic internet connectivity first
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(10, 50);
  tft.print("Internet baglantisi test ediliyor...");
  
  // Test with a simple HTTP request to Google (HTTP, not HTTPS)
  HTTPClient testHttp;
  WiFiClient testClient;
  testHttp.begin(testClient, "http://httpbin.org/get");
  testHttp.setTimeout(5000);
  int testCode = testHttp.GET();
  testHttp.end();
  
  Serial.print("HTTP test sonucu: ");
  Serial.println(testCode);
  
  if (testCode > 0) {
    Serial.println("Internet baglantisi OK");
    tft.setCursor(10, 70);
    tft.setTextColor(TFT_GREEN);
    tft.print("Internet baglantisi OK");
  } else {
    Serial.println("Internet baglantisi PROBLEM");
    tft.setCursor(10, 70);
    tft.setTextColor(TFT_RED);
    tft.print("Internet baglantisi PROBLEM");
  }
  
  delay(2000);
  
  // Initial screen
  drawScreen();
  
  // Fetch initial orders
  fetchOrders();
}
void fetchOrders() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi baglantisi yok!");
    return;
  }
  
  // Skip fetching if too many consecutive errors
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    Serial.println("Cok fazla hata, 30 saniye bekleniyor...");
    if (millis() - lastFetch < 30000) {
      return;
    }
    consecutiveErrors = 0; // Reset error count after waiting
  }
  
  Serial.println("Siparisler getiriliyor...");
  
  HTTPClient http;
  // Updated query for multiple drink orders - get orders that are "new" or "alindi"
  String url = String(supabase_url) + "/rest/v1/drink_orders?or=(status.eq.new,status.eq.alindi)&order=priority.desc,created_at.asc";
  
  Serial.println("URL: " + url);
  
  // Use WiFiClientSecure for HTTPS connections
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate verification for now
  http.begin(client, url);
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_key));
  http.setTimeout(15000); // Increased timeout to 15 seconds
  
  int httpCode = http.GET();
  
  Serial.print("HTTP Yanit Kodu: ");
  Serial.println(httpCode);
  
  if (httpCode == 200) {
    consecutiveErrors = 0; // Reset error count on success
    String payload = http.getString();
    Serial.println("Veri alindi: " + payload.substring(0, min(200, (int)payload.length())) + "...");
    
    JsonDocument doc;
    
    if (deserializeJson(doc, payload) == DeserializationError::Ok) {
      orderCount = 0;
      JsonArray array = doc.as<JsonArray>();
      
      for (JsonObject obj : array) {
        if (orderCount >= MAX_ORDERS) break;
        
        // Parse new schema fields
        orders[orderCount].id = obj["id"].as<String>();
        orders[orderCount].customer_name = utf8ToLatin1(obj["customer_name"].as<String>());
        orders[orderCount].department = utf8ToLatin1(obj["department"].as<String>());
        orders[orderCount].drink_type = utf8ToLatin1(obj["drink_type"].as<String>());
        orders[orderCount].quantity = obj["quantity"].as<int>();
        orders[orderCount].status = obj["status"].as<String>();
        orders[orderCount].special_instructions = utf8ToLatin1(obj["special_instructions"].as<String>());
        orders[orderCount].priority = obj["priority"].as<int>();
        orders[orderCount].created_at = obj["created_at"].as<String>();
        
        // Calculate waiting minutes if available
        if (obj.containsKey("waiting_minutes") && !obj["waiting_minutes"].isNull()) {
          orders[orderCount].waiting_minutes = obj["waiting_minutes"].as<float>();
        } else {
          orders[orderCount].waiting_minutes = 0;
        }
        
        orderCount++;
      }
      
      Serial.println("Siparisler guncellendi: " + String(orderCount) + " adet");
      drawScreen();
      
      // Check for new orders and trigger buzzer if needed
      checkNewOrderBuzzer();
    } else {
      Serial.println("JSON parse hatasi!");
      consecutiveErrors++;
    }
  } else if (httpCode == -1) {
    consecutiveErrors++;
    Serial.println("DNS cozumleme hatasi veya baglanti problemi! Hata sayisi: " + String(consecutiveErrors));
    
    // Display error on screen only if first few errors
    if (consecutiveErrors <= 3) {
      tft.fillScreen(TFT_BLACK);
      tft.setTextColor(TFT_RED);
      tft.setTextSize(2);
      tft.setCursor(10, 50);
      tft.print("BAGLANTI HATASI");
      tft.setTextColor(TFT_WHITE);
      tft.setTextSize(1);
      tft.setCursor(10, 80);
      tft.print("DNS cozumleme sorunu");
      tft.setCursor(10, 100);
      tft.print("Hata sayisi: " + String(consecutiveErrors));
      tft.setCursor(10, 120);
      tft.print("Otomatik yeniden deneniyor...");
    }
    
  } else {
    consecutiveErrors++;
    String errorResponse = http.getString();
    Serial.println("HTTP Hatasi: " + String(httpCode) + ", Hata sayisi: " + String(consecutiveErrors));
    Serial.println("Hata mesaji: " + errorResponse);
    
    // Display HTTP error only if first few errors
    if (consecutiveErrors <= 3) {
      tft.fillScreen(TFT_BLACK);
      tft.setTextColor(TFT_RED);
      tft.setTextSize(2);
      tft.setCursor(10, 50);
      tft.print("HTTP HATASI");
      tft.setTextColor(TFT_WHITE);
      tft.setTextSize(1);
      tft.setCursor(10, 80);
      tft.print("Hata kodu: " + String(httpCode));
      tft.setCursor(10, 100);
      tft.print("Hata sayisi: " + String(consecutiveErrors));
    }
  }
  
  http.end();
}

void drawScreen() {
  tft.fillScreen(TFT_BLACK);
  
  // Header - smaller and more compact
  tft.setTextColor(TFT_CYAN);
  tft.setTextSize(1);
  tft.setCursor(10, 5);
  tft.print("AVM MUTFAK");
  
  // Show WiFi status and order count
  tft.setCursor(200, 5);
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(TFT_GREEN);
    tft.print("WiFi:OK");
  } else {
    tft.setTextColor(TFT_RED);
    tft.print("WiFi:ERR");
  }
  
  // Show order count in corner
  tft.setTextColor(TFT_WHITE);
  tft.setCursor(260, 5);
  tft.print("(" + String(orderCount) + ")");
  
  if (orderCount == 0) {
    // No orders - full screen message
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(3);
    tft.setCursor(70, 80);
    tft.print("SIPARIS");
    tft.setCursor(100, 110);
    tft.print("YOK");
    
    tft.setTextColor(TFT_GREEN);
    tft.setTextSize(2);
    tft.setCursor(60, 160);
    tft.print("Yeni siparisler");
    tft.setCursor(80, 180);
    tft.print("bekleniyor...");
    return;
  }
  
  // Show only the LATEST order (first one) in large card format
  Order* latestOrder = &orders[0]; // Get the most recent order
  latestOrder->position_y = 20; // Set position for touch detection
  
  // Determine colors based on status and priority
  uint16_t bgColor, textColor, accentColor;
  if (latestOrder->priority > 0) { // Urgent order
    if (latestOrder->status == "new") {
      bgColor = TFT_PURPLE;
      textColor = TFT_WHITE;
      accentColor = TFT_YELLOW;
    } else {
      bgColor = TFT_MAGENTA;
      textColor = TFT_WHITE;
      accentColor = TFT_YELLOW;
    }
  } else {
    // Normal priority colors
    if (latestOrder->status == "new") {
      bgColor = TFT_RED;
      textColor = TFT_WHITE;
      accentColor = TFT_WHITE;
    } else if (latestOrder->status == "alindi") {
      bgColor = TFT_ORANGE;
      textColor = TFT_BLACK;
      accentColor = TFT_BLACK;
    } else {
      bgColor = TFT_LIGHTGREY;
      textColor = TFT_BLACK;
      accentColor = TFT_BLACK;
    }
  }
  
  // Main order card - large and prominent (covers most of screen)
  const int cardX = 10;
  const int cardY = 25;
  const int cardW = 300;
  const int cardH = 180;
  
  tft.fillRoundRect(cardX, cardY, cardW, cardH, 8, bgColor);
  tft.drawRoundRect(cardX, cardY, cardW, cardH, 8, accentColor);
  tft.drawRoundRect(cardX+1, cardY+1, cardW-2, cardH-2, 7, accentColor);
  
  // Priority indicator (large corner badge for urgent orders)
  if (latestOrder->priority > 0) {
    tft.fillRoundRect(cardX + cardW - 40, cardY + 5, 35, 20, 3, TFT_YELLOW);
    tft.setTextColor(TFT_BLACK);
    tft.setTextSize(1);
    tft.setCursor(cardX + cardW - 35, cardY + 10);
    tft.print("ACIL");
  }
  
  // Customer name - very large
  tft.setTextColor(textColor);
  tft.setTextSize(3);
  int nameY = cardY + 15;
  tft.setCursor(cardX + 10, nameY);
  String customerName = latestOrder->customer_name;
  if (customerName.length() > 12) {
    customerName = customerName.substring(0, 10) + "..";
  }
  tft.print(customerName);
  
  // Department - large
  if (latestOrder->department.length() > 0) {
    tft.setTextColor(accentColor);
    tft.setTextSize(2);
    tft.setCursor(cardX + 10, nameY + 30);
    String dept = latestOrder->department;
    if (dept.length() > 15) {
      dept = dept.substring(0, 13) + "..";
    }
    tft.print(dept);
  }
  
  // Drink information - very prominent
  tft.setTextColor(textColor);
  tft.setTextSize(2);
  int drinkY = nameY + 60;
  tft.setCursor(cardX + 10, drinkY);
  String drinkInfo = latestOrder->drink_type;
  if (latestOrder->quantity > 1) {
    drinkInfo += " x" + String(latestOrder->quantity);
  }
  if (drinkInfo.length() > 18) {
    drinkInfo = drinkInfo.substring(0, 16) + "..";
  }
  tft.print(drinkInfo);
  
  // Special instructions if any
  if (latestOrder->special_instructions.length() > 0 && latestOrder->special_instructions != "null") {
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(1);
    tft.setCursor(cardX + 10, drinkY + 25);
    String instructions = latestOrder->special_instructions;
    if (instructions.length() > 30) {
      instructions = instructions.substring(0, 27) + "...";
    }
    tft.print("Not: " + instructions);
  }
  
  // Waiting time indicator - prominent
  if (latestOrder->waiting_minutes > 0) {
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.setCursor(cardX + cardW - 80, drinkY);
    tft.print(String((int)latestOrder->waiting_minutes) + "dk");
  }
  
  // Large status action button - make it bigger and more prominent
  String buttonText = "";
  uint16_t buttonColor = TFT_GREEN;
  if (latestOrder->status == "new") {
    buttonText = "ALINDI";
    buttonColor = TFT_GREEN;
  } else if (latestOrder->status == "alindi") {
    buttonText = "HAZIR";
    buttonColor = TFT_BLUE;
  }
  
  if (buttonText != "") {
    // Make button larger and more prominent
    const int btnX = cardX + 15;  // Reduced margin
    const int btnY = cardY + cardH - 45; // More height
    const int btnW = cardW - 30;  // Wider button
    const int btnH = 35;  // Taller button
    
    // Debug: Print button coordinates
    Serial.println("Drawing button at: X=" + String(btnX) + "-" + String(btnX + btnW) + 
                   ", Y=" + String(btnY) + "-" + String(btnY + btnH));
    
    tft.fillRoundRect(btnX, btnY, btnW, btnH, 8, buttonColor);
    tft.drawRoundRect(btnX, btnY, btnW, btnH, 8, TFT_WHITE);
    tft.drawRoundRect(btnX+1, btnY+1, btnW-2, btnH-2, 7, TFT_WHITE);
    tft.drawRoundRect(btnX+2, btnY+2, btnW-4, btnH-4, 6, TFT_WHITE); // Triple border
    
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    int textW = buttonText.length() * 12; // Approximate text width
    tft.setCursor(btnX + (btnW - textW) / 2, btnY + 12);
    tft.print(buttonText);
  }
  
  // Show if there are more orders waiting
  if (orderCount > 1) {
    tft.setTextColor(TFT_CYAN);
    tft.setTextSize(1);
    tft.setCursor(10, 210);
    tft.print("+ " + String(orderCount - 1) + " daha siparis bekliyor");
  }
  
  // Footer with refresh info
  tft.setTextColor(TFT_DARKGREY);
  tft.setTextSize(1);
  tft.setCursor(10, 225);
  tft.print("Son guncelleme: " + String((millis() - lastFetch) / 1000) + "s once");
}

int findTouchedOrder(uint16_t x, uint16_t y) {
  // In single card mode, we only show the first (latest) order
  if (orderCount > 0) {
    // Check if touch is anywhere on the main card area
    const int cardX = 10;
    const int cardY = 25;
    const int cardW = 300;
    const int cardH = 180;
    
    // Button coordinates - MUST match drawScreen() button positioning
    const int btnX = cardX + 15;  // Same as in drawScreen
    const int btnY = cardY + cardH - 45; // Same as in drawScreen
    const int btnW = cardW - 30;  // Same as in drawScreen
    const int btnH = 35;  // Same as in drawScreen
    
    // Debug: Print button coordinates and touch position
    Serial.println("=== TOUCH DEBUG ===");
    Serial.println("Touch at: (" + String(x) + ", " + String(y) + ")");
    Serial.println("Button area: X=" + String(btnX) + "-" + String(btnX + btnW) + 
                   ", Y=" + String(btnY) + "-" + String(btnY + btnH));
    
    // Make touch area more forgiving - expand detection zone
    const int touchMargin = 30; // Larger margin for easier touching
    if (x >= (btnX - touchMargin) && x <= (btnX + btnW + touchMargin) && 
        y >= (btnY - touchMargin) && y <= (btnY + btnH + touchMargin)) {
      Serial.println("BUTTON HIT! Returning order index 0");
      return 0; // Return first order index (latest order)
    } else {
      Serial.println("Touch outside button area");
      
      // Also try detecting touch anywhere in the lower part of the card as fallback
      if (y >= cardY + cardH - 80) { // Lower 80 pixels of card
        Serial.println("FALLBACK: Touch in lower card area, accepting as button press");
        return 0;
      }
    }
  }
  return -1;
}

void updateOrderStatus(int orderIndex, const String& newStatus) {
  if (orderIndex < 0 || orderIndex >= orderCount) return;
  
  HTTPClient http;
  String url = String(supabase_url) + "/rest/v1/drink_orders?id=eq." + orders[orderIndex].id;
  
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate verification
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_key));
  http.setTimeout(10000);
  
  JsonDocument doc;
  doc["status"] = newStatus;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.sendRequest("PATCH", jsonString);
  
  if (httpCode == 200 || httpCode == 204) {
    Serial.println("Siparis durumu guncellendi: " + orders[orderIndex].id + " -> " + newStatus);
    
    // Update local status
    orders[orderIndex].status = newStatus;
    
    // Stop buzzer if order was taken (alındı) or completed
    if (newStatus == "alindi" || newStatus == "hazirlandi") {
      if (buzzerActive && orders[orderIndex].id == lastOrderId) {
        Serial.println("Sipariş alındı/hazırlandı, buzzer durduruldu");
        buzzerActive = false;
        hasNewOrder = false;
      }
    }
    
    // If status is "hazirlandi", the order will be filtered out in next fetch
    // No need to delete it, just let it remain in database for history
    
    // Refresh orders after a short delay
    delay(500);
    fetchOrders();
    
  } else {
    Serial.println("Durum guncelleme hatasi: " + String(httpCode));
    
    // Show error on screen briefly
    tft.fillRect(0, 200, 320, 40, TFT_RED);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(1);
    tft.setCursor(10, 210);
    tft.print("Guncelleme hatasi: " + String(httpCode));
    tft.setCursor(10, 220);
    tft.print("Tekrar deneniyor...");
    delay(2000);
    drawScreen();
  }
  
  http.end();
}

void handleTouch(uint16_t x, uint16_t y) {
  Serial.print("=== TOUCH EVENT ===");
  Serial.print("Dokunma algılandi: ");
  Serial.print(x);
  Serial.print(", ");
  Serial.println(y);
  
  // Debug: Show order count and status
  Serial.println("Order count: " + String(orderCount));
  if (orderCount > 0) {
    Serial.println("Latest order status: " + orders[0].status);
    Serial.println("Latest order ID: " + orders[0].id);
  }
  
  int touchedOrder = findTouchedOrder(x, y);
  Serial.println("findTouchedOrder returned: " + String(touchedOrder));
  
  if (touchedOrder >= 0) {
    String currentStatus = orders[touchedOrder].status;
    String nextStatus = "";
    
    Serial.println("Processing touch for order with status: " + currentStatus);
    
    if (currentStatus == "new") {
      nextStatus = "alindi";
      Serial.println("Siparis alindi: " + orders[touchedOrder].customer_name + " - " + orders[touchedOrder].drink_type);
    } else if (currentStatus == "alindi") {
      nextStatus = "hazirlandi";
      Serial.println("Siparis hazir: " + orders[touchedOrder].customer_name + " - " + orders[touchedOrder].drink_type);
    }
    
    if (nextStatus != "") {
      Serial.println("Updating status to: " + nextStatus);
      
      // Visual feedback - highlight the entire card
      const int cardX = 10;
      const int cardY = 25;
      const int cardW = 300;
      const int cardH = 180;
      
      tft.drawRoundRect(cardX-2, cardY-2, cardW+4, cardH+4, 10, TFT_WHITE);
      tft.drawRoundRect(cardX-1, cardY-1, cardW+2, cardH+2, 9, TFT_WHITE);
      
      updateOrderStatus(touchedOrder, nextStatus);
    } else {
      Serial.println("No status change needed or invalid status");
    }
  } else {
    // Touch outside orders - refresh manually
    Serial.println("Touch outside button area - Manuel yenileme");
    fetchOrders();
  }
  Serial.println("=== END TOUCH EVENT ===");
}

// Buzzer control functions
void buzzerBeep(int count, int duration, int pause) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(duration);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < count - 1) { // Don't delay after last beep
      delay(pause);
    }
  }
}

void checkNewOrderBuzzer() {
  // Check if there's a new order that needs initial buzzing
  if (orderCount > 0 && orders[0].status == "new") {
    String currentLatestOrderId = orders[0].id;
    
    // If this is a different order than the last one we processed
    if (currentLatestOrderId != lastOrderId) {
      Serial.println("Yeni siparis algılandi: " + currentLatestOrderId);
      
      // Trigger initial 3 beeps for new order
      buzzerBeep(3, 200, 300);
      
      // Update tracking variables
      lastOrderId = currentLatestOrderId;
      initialBuzzDone = true;
      buzzerActive = true;
      lastBuzzerTime = millis();
      hasNewOrder = true;
      
      Serial.println("İlk 3 bip tamamlandı, periyodik bip başlatıldı");
    }
  }
}

void handlePeriodicBuzzer() {
  // Only buzz if we have an active new order
  if (buzzerActive && orderCount > 0 && orders[0].status == "new") {
    // Check if it's time for periodic beep (1 minute intervals)
    if (millis() - lastBuzzerTime >= BUZZER_INTERVAL) {
      Serial.println("Periyodik bip - sipariş hala yeni durumda");
      buzzerBeep(1, 500, 0); // Single longer beep for periodic reminder
      lastBuzzerTime = millis();
    }
  } else if (orderCount > 0 && orders[0].status != "new") {
    // Order status changed, stop buzzing
    if (buzzerActive) {
      Serial.println("Sipariş durumu değişti, bip durduruldu");
      buzzerActive = false;
      hasNewOrder = false;
    }
  } else if (orderCount == 0) {
    // No orders, reset buzzer state
    if (buzzerActive) {
      Serial.println("Sipariş kalmadı, bip durumu sıfırlandı");
      buzzerActive = false;
      hasNewOrder = false;
      lastOrderId = "";
      initialBuzzDone = false;
    }
  }
}

void loop() {
  uint16_t x, y;
  
  if (tft.getTouch(&x, &y)) {
    // Show touch coordinates on screen for debugging
    tft.fillRect(250, 210, 70, 25, TFT_BLACK); // Clear previous coordinates
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(1);
    tft.setCursor(250, 210);
    tft.print("T:" + String(x) + "," + String(y));
    
    handleTouch(x, y);
    delay(300); // Debounce touch
  }
  
  // Handle periodic buzzer for new orders
  handlePeriodicBuzzer();
  
  // Automatic refresh every FETCH_INTERVAL
  if (millis() - lastFetch > FETCH_INTERVAL) {
    fetchOrders();
    lastFetch = millis();
  }
  
  delay(50);
}