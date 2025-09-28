#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
// Primary WiFi credentials
#define WIFI_SSID "sbabadagip"
#define WIFI_PASSWORD "92929292"

// Backup WiFi networks - Add your backup networks here
// Maximum 5 networks supported
#define MAX_WIFI_NETWORKS 5

// WiFi network structure
struct WiFiNetwork {
  const char* ssid;
  const char* password;
};

// Define backup WiFi networks (modify these with your actual backup networks)
static const WiFiNetwork wifi_networks[MAX_WIFI_NETWORKS] = {
  {WIFI_SSID, WIFI_PASSWORD},              // Primary network
  {"CHEF_HOTSPOT", "chef1234"},             // Backup hotspot
  {"AndroidHotspot", "12345678"},           // Mobile hotspot
  {"FREE_WIFI", ""},                        // Open network
  {"BACKUP_NETWORK", "backup123"}           // Another backup
};

// Supabase Configuration
// Your actual Supabase project details
#define SUPABASE_URL "https://cfapmolnnvemqjneaher.supabase.co"
#define SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c"

// Display Configuration for CYD (ESP32-2432S028R)
// Note: TFT_WIDTH and TFT_HEIGHT are defined in platformio.ini
#define SCREEN_WIDTH 240
#define SCREEN_HEIGHT 320

// Touch Configuration
#define TOUCH_CS 33
#define TOUCH_IRQ 25

// Colors
#define BACKGROUND_COLOR TFT_BLACK
#define BUTTON_COLOR TFT_BLUE
#define BUTTON_PRESSED TFT_DARKBLUE
#define TEXT_COLOR TFT_WHITE
#define PENDING_COLOR TFT_YELLOW
#define PREPARING_COLOR TFT_ORANGE
#define READY_COLOR TFT_GREEN

#endif