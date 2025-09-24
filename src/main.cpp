#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

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

// WiFi credentials - UPDATE THESE WITH YOUR CREDENTIALS
const char* ssid = "AVM GRUP2";
const char* password = "AVMGRUP2023";

// Supabase configuration  
const char* supabase_url = "https://ftnqvabsefkmxtmkwmkf.supabase.co";
const char* supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bnF2YWJzZWZrbXh0bWt3bWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3OTQ5NDAsImV4cCI6MjA1MjM3MDk0MH0.lKTy1VgO5ZzwTIgdz7v_lsZNdWINhwLZJOOYl-Vz7og";

// Tea menu items
struct MenuItem {
  String name;
  float price;
  uint16_t color;
};

MenuItem menu[] = {
  {"Black Tea", 3.50, TFT_BROWN},
  {"Green Tea", 3.75, TFT_GREEN},
  {"Earl Grey", 4.00, TFT_PURPLE},
  {"Chamomile", 3.25, TFT_YELLOW},
  {"Oolong", 4.25, TFT_ORANGE},
  {"Jasmine", 3.90, TFT_PINK}
};

int menuSize = sizeof(menu) / sizeof(menu[0]);
int selectedItem = -1;
bool orderPlaced = false;

// Forward declarations
void drawMainScreen();
void handleTouch(uint16_t x, uint16_t y);
void placeOrder();

void setup() {
  Serial.begin(115200);
  Serial.println("=== Tea Order Kitchen App ===");
  
  tft.init();
  tft.setRotation(1);  // Landscape mode 320x240
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 50);
  tft.print("Connecting WiFi...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  drawMainScreen();
}
void drawMainScreen() {
  tft.fillScreen(TFT_BLACK);
  
  // Title
  tft.setTextSize(3);
  tft.setTextColor(TFT_CYAN);
  tft.setCursor(50, 10);
  tft.print("TEA ORDERS");
  
  // Menu items as buttons
  int buttonWidth = 100;
  int buttonHeight = 30;
  int startY = 50;
  
  for (int i = 0; i < menuSize; i++) {
    int x = (i % 3) * 105 + 10;  // 3 columns
    int y = startY + (i / 3) * 40;
    
    // Highlight selected item
    uint16_t bgColor = (i == selectedItem) ? TFT_WHITE : menu[i].color;
    uint16_t textColor = (i == selectedItem) ? TFT_BLACK : TFT_WHITE;
    
    // Draw button background
    tft.fillRoundRect(x, y, buttonWidth, buttonHeight, 5, bgColor);
    tft.drawRoundRect(x, y, buttonWidth, buttonHeight, 5, TFT_WHITE);
    
    // Draw text
    tft.setTextSize(1);
    tft.setTextColor(textColor);
    tft.setCursor(x + 5, y + 5);
    tft.print(menu[i].name);
    tft.setCursor(x + 5, y + 15);
    tft.print("$");
    tft.print(menu[i].price, 2);
  }
  
  // Status area
  tft.setTextSize(2);
  tft.setCursor(10, 180);
  if (selectedItem >= 0) {
    tft.setTextColor(TFT_GREEN);
    tft.print("Selected: ");
    tft.print(menu[selectedItem].name);
  } else {
    tft.setTextColor(TFT_YELLOW);
    tft.print("Select a tea to order");
  }
  
  // Order button
  if (selectedItem >= 0) {
    tft.fillRoundRect(200, 200, 100, 30, 5, TFT_GREEN);
    tft.drawRoundRect(200, 200, 100, 30, 5, TFT_WHITE);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.setCursor(215, 210);
    tft.print("ORDER");
  }
}

void handleTouch(uint16_t x, uint16_t y) {
  Serial.print("Touch at: ");
  Serial.print(x);
  Serial.print(", ");
  Serial.println(y);
  
  // Check menu item touches
  for (int i = 0; i < menuSize; i++) {
    int buttonX = (i % 3) * 105 + 10;
    int buttonY = 50 + (i / 3) * 40;
    
    if (x >= buttonX && x <= buttonX + 100 && 
        y >= buttonY && y <= buttonY + 30) {
      selectedItem = i;
      Serial.print("Selected: ");
      Serial.println(menu[i].name);
      drawMainScreen();
      return;
    }
  }
  
  // Check order button
  if (selectedItem >= 0 && 
      x >= 200 && x <= 300 && 
      y >= 200 && y <= 230) {
    placeOrder();
  }
}

void placeOrder() {
  if (selectedItem < 0) return;
  
  tft.fillScreen(TFT_BLACK);
  tft.setTextSize(2);
  tft.setTextColor(TFT_YELLOW);
  tft.setCursor(10, 50);
  tft.print("Placing order...");
  
  // Create order data
  JsonDocument orderData;
  orderData["tea_name"] = menu[selectedItem].name;
  orderData["price"] = menu[selectedItem].price;
  orderData["status"] = "pending";
  orderData["order_time"] = "now()";
  
  String jsonString;
  serializeJson(orderData, jsonString);
  
  Serial.println("Sending order data: " + jsonString);
  
  // Send to Supabase
  HTTPClient http;
  String url = String(supabase_url) + "/rest/v1/tea_orders";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(supabase_key));
  http.addHeader("apikey", supabase_key);
  
  int httpResponseCode = http.POST(jsonString);
  String response = http.getString();
  
  Serial.print("HTTP Response Code: ");
  Serial.println(httpResponseCode);
  Serial.print("Response: ");
  Serial.println(response);
  
  if (httpResponseCode > 0 && httpResponseCode < 300) {
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_GREEN);
    tft.setCursor(10, 70);
    tft.print("ORDER PLACED!");
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(10, 100);
    tft.print(menu[selectedItem].name);
    tft.setCursor(10, 130);
    tft.print("$");
    tft.print(menu[selectedItem].price, 2);
    
    Serial.println("Order placed successfully!");
  } else {
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_RED);
    tft.setCursor(10, 70);
    tft.print("ORDER FAILED");
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(10, 100);
    tft.print("Error: ");
    tft.print(httpResponseCode);
    
    Serial.print("HTTP Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  
  // Reset after 3 seconds
  delay(3000);
  selectedItem = -1;
  drawMainScreen();
}

void loop() {
  uint16_t x, y;
  
  if (tft.getTouch(&x, &y)) {
    handleTouch(x, y);
    delay(300); // Debounce
  }
  
  delay(50);
}