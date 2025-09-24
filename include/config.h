#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
// Update these with your actual WiFi credentials
#define WIFI_SSID "TURKSAT-KABLONET-26C6-2.4G"
#define WIFI_PASSWORD "babadag4242"

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