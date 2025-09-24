#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>

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

// WiFi credentials
const char* ssid = "AVM GRUP2";
const char* password = "AVMGRUP2023";

// Supabase configuration - CORRECT URL AND KEY
const char* supabase_url = "https://cfapmolnnvemqjneaher.supabase.co";
const char* supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c";

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

// Forward declarations
void fetchOrders();
void drawScreen();
void handleTouch(uint16_t x, uint16_t y);
void updateOrderStatus(int orderIndex, const String& newStatus);
int findTouchedOrder(uint16_t x, uint16_t y);
String utf8ToLatin1(String input);

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
  
  // Header
  tft.setTextColor(TFT_CYAN);
  tft.setTextSize(2);
  tft.setCursor(20, 5);
  tft.print("AVM MUTFAK SISTEMI");
  
  // Order count and info
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(1);
  tft.setCursor(10, 25);
  tft.print("Aktif Siparisler: ");
  tft.print(orderCount);
  
  // Show WiFi status
  tft.setCursor(200, 25);
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(TFT_GREEN);
    tft.print("WiFi: OK");
  } else {
    tft.setTextColor(TFT_RED);
    tft.print("WiFi: ERR");
  }
  
  if (orderCount == 0) {
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(3);
    tft.setCursor(70, 100);
    tft.print("SIPARIS YOK");
    
    tft.setTextColor(TFT_GREEN);
    tft.setTextSize(1);
    tft.setCursor(90, 140);
    tft.print("Yeni siparisler");
    tft.setCursor(100, 150);
    tft.print("bekleniyor...");
    return;
  }
  
  // Draw orders with enhanced information
  int y = 40;
  const int orderHeight = 28; // Increased height for more info
  
  for (int i = 0; i < orderCount; i++) {
    if (y + orderHeight > 240) break; // Screen boundary check
    
    orders[i].position_y = y;
    
    // Priority indicator - urgent orders get different color
    uint16_t bgColor, textColor;
    if (orders[i].priority > 0) { // Urgent order
      if (orders[i].status == "new") {
        bgColor = TFT_PURPLE; // Purple for urgent new orders
        textColor = TFT_WHITE;
      } else {
        bgColor = TFT_MAGENTA; // Magenta for urgent taken orders
        textColor = TFT_WHITE;
      }
    } else {
      // Normal priority colors
      if (orders[i].status == "new") {
        bgColor = TFT_RED;
        textColor = TFT_WHITE;
      } else if (orders[i].status == "alindi") {
        bgColor = TFT_ORANGE;
        textColor = TFT_BLACK;
      } else {
        bgColor = TFT_LIGHTGREY;
        textColor = TFT_BLACK;
      }
    }
    
    // Order card background
    tft.fillRoundRect(5, y, 310, orderHeight, 3, bgColor);
    tft.drawRoundRect(5, y, 310, orderHeight, 3, TFT_WHITE);
    
    // Priority indicator (small triangle in corner for urgent)
    if (orders[i].priority > 0) {
      tft.fillTriangle(5, y, 15, y, 5, y+10, TFT_YELLOW);
    }
    
    // Line 1: Customer name and department
    tft.setTextColor(textColor);
    tft.setTextSize(1);
    tft.setCursor(10, y + 3);
    String customerInfo = orders[i].customer_name;
    if (orders[i].department.length() > 0) {
      customerInfo += " (" + orders[i].department + ")";
    }
    // Limit text length to fit screen
    if (customerInfo.length() > 25) {
      customerInfo = customerInfo.substring(0, 22) + "...";
    }
    tft.print(customerInfo);
    
    // Line 2: Drink type and quantity
    tft.setCursor(10, y + 13);
    String drinkInfo = orders[i].drink_type;
    if (orders[i].quantity > 1) {
      drinkInfo += " x" + String(orders[i].quantity);
    }
    if (drinkInfo.length() > 20) {
      drinkInfo = drinkInfo.substring(0, 17) + "...";
    }
    tft.print(drinkInfo);
    
    // Line 3: Special instructions if any
    if (orders[i].special_instructions.length() > 0 && orders[i].special_instructions != "null") {
      tft.setCursor(10, y + 22);
      tft.setTextColor(TFT_YELLOW);
      String instructions = orders[i].special_instructions;
      if (instructions.length() > 18) {
        instructions = instructions.substring(0, 15) + "...";
      }
      tft.print("Not: " + instructions);
    }
    
    // Waiting time indicator
    if (orders[i].waiting_minutes > 0) {
      tft.setTextColor(TFT_WHITE);
      tft.setCursor(200, y + 3);
      tft.print(String((int)orders[i].waiting_minutes) + "dk");
    }
    
    // Status action button
    String buttonText = "";
    uint16_t buttonColor = TFT_GREEN;
    if (orders[i].status == "new") {
      buttonText = "ALINDI";
      buttonColor = TFT_GREEN;
    } else if (orders[i].status == "alindi") {
      buttonText = "HAZIR";
      buttonColor = TFT_BLUE;
    }
    
    if (buttonText != "") {
      tft.fillRoundRect(240, y + 8, 65, 15, 2, buttonColor);
      tft.drawRoundRect(240, y + 8, 65, 15, 2, TFT_WHITE);
      tft.setTextColor(TFT_WHITE);
      tft.setCursor(245, y + 11);
      tft.print(buttonText);
    }
    
    y += orderHeight + 2;
  }
  
  // Footer with refresh info
  if (orderCount < MAX_ORDERS) {
    tft.setTextColor(TFT_DARKGREY);
    tft.setTextSize(1);
    tft.setCursor(10, 220);
    tft.print("Son guncelleme: ");
    tft.print((millis() - lastFetch) / 1000);
    tft.print("s once");
  }
}

int findTouchedOrder(uint16_t x, uint16_t y) {
  for (int i = 0; i < orderCount; i++) {
    int orderY = orders[i].position_y;
    const int orderHeight = 28; // Match the height from drawScreen
    
    // Check if touch is on the button area (updated coordinates)
    if (x >= 240 && x <= 305 && y >= orderY + 8 && y <= orderY + 23) {
      return i;
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
  Serial.print("Dokunma algılandi: ");
  Serial.print(x);
  Serial.print(", ");
  Serial.println(y);
  
  int touchedOrder = findTouchedOrder(x, y);
  
  if (touchedOrder >= 0) {
    String currentStatus = orders[touchedOrder].status;
    String nextStatus = "";
    
    if (currentStatus == "new") {
      nextStatus = "alindi";
      Serial.println("Siparis alindi: " + orders[touchedOrder].customer_name + " - " + orders[touchedOrder].drink_type);
    } else if (currentStatus == "alindi") {
      nextStatus = "hazirlandi";
      Serial.println("Siparis hazir: " + orders[touchedOrder].customer_name + " - " + orders[touchedOrder].drink_type);
    }
    
    if (nextStatus != "") {
      // Visual feedback - highlight touched order
      tft.drawRoundRect(5, orders[touchedOrder].position_y, 310, 28, 3, TFT_WHITE);
      tft.drawRoundRect(4, orders[touchedOrder].position_y-1, 312, 30, 3, TFT_WHITE);
      
      updateOrderStatus(touchedOrder, nextStatus);
    }
  } else {
    // Touch outside orders - refresh manually
    Serial.println("Manuel yenileme");
    fetchOrders();
  }
}

void loop() {
  uint16_t x, y;
  
  if (tft.getTouch(&x, &y)) {
    handleTouch(x, y);
    delay(300); // Debounce touch
  }
  
  // Automatic refresh every FETCH_INTERVAL
  if (millis() - lastFetch > FETCH_INTERVAL) {
    fetchOrders();
    lastFetch = millis();
  }
  
  delay(50);
}