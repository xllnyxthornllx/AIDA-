/*
 * ============================================================================
 *  AIDA+ · Laboratorio 9 — Proyecto de Semestre (Tecsup · ARC · Ciclo VI)
 *  Nodo central Edge AI (ESP32) — Firmware con FreeRTOS + MQTT
 * ============================================================================
 *  Arquitectura:
 *    [Sensores: DHT22 / voz(ADC) / GPS UART]  ->  ESP32 (FreeRTOS)
 *        -> Mosquitto (VPS AWS Debian/Ubuntu 54.94.50.247:1883)
 *        -> Node-RED Dashboard  ->  [aida/commands]  ->  actuadores
 *    Actuadores: OLED SSD1306 (I2C) · Tira WS2812B · Servo SG90 · Buzzer
 *
 *  Tareas FreeRTOS (xTaskCreatePinnedToCore):
 *    - TaskSensors  (Core 1) : lee sensores, imprime en consola serial,
 *                              publica en la cola de telemetria.
 *    - TaskMQTT     (Core 0) : mantiene WiFi + MQTT, serializa JSON y publica
 *                              cada PUBLISH_INTERVAL_MS en aida/telemetry.
 *    - El callback de PubSubClient (corre en TaskMQTT) atiende aida/commands.
 *
 *  Notas de simulacion (Wokwi):
 *    - El modulo GPS NEO-6M no existe en Wokwi -> si no hay fix valido se usan
 *      coordenadas de Arequipa (-16.4090, -71.5375) y se marca "gps":"simulado".
 *    - El microfono MAX9814/INMP441 se representa con un potenciometro en el
 *      pin ADC (misma ruta analogRead), reportado como "voice" (0-100%).
 *    - El amplificador MAX98357A se representa con un buzzer para los tonos
 *      de confirmacion (tone()).
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>

#include <DHT.h>
#include <Adafruit_Sensor.h>
#include <TinyGPS++.h>
#include <ESP32Servo.h>

/* ───────────────────────── Configuracion de red ───────────────────────── */
#define WIFI_SSID     "Wokwi-GUEST"
#define WIFI_PASS     ""

#define MQTT_HOST     "54.94.50.247"   // VPS AWS · Mosquitto
#define MQTT_PORT     1883
#define MQTT_USER     "aida"
#define MQTT_PASS     "AidaLab9_2026"
#define MQTT_CLIENT   "aida-esp32-lab9"

#define TOPIC_TELEMETRY "aida/telemetry"
#define TOPIC_COMMANDS  "aida/commands"

#define PUBLISH_INTERVAL_MS 3000UL
#define SENSOR_INTERVAL_MS  3000UL

/* ───────────────────────── Pines ───────────────────────── */
#define PIN_DHT        15
#define DHT_TYPE       DHT22
#define PIN_VOICE      34     // potenciometro ~ microfono (ADC1, input only)
#define PIN_STRIP      25     // tira WS2812B
#define PIN_SERVO      13     // servo SG90
#define PIN_BUZZER     26     // amplificador/altavoz (tonos)
#define PIN_OLED_SDA   21
#define PIN_OLED_SCL   22
#define GPS_RX         16
#define GPS_TX         17

#define STRIP_PIXELS   8
#define OLED_W         128
#define OLED_H         64
#define OLED_ADDR      0x3C

/* Coordenadas de respaldo (Arequipa) cuando el GPS aun no tiene fix */
#define SIM_LAT  -16.4090
#define SIM_LON  -71.5375

/* ───────────────────────── Estados del asistente ──────────────────────── */
enum AidaState { ST_IDLE = 0, ST_LISTENING, ST_PROCESSING, ST_SPEAKING };
volatile AidaState gState = ST_IDLE;
const char* stateName(AidaState s) {
  switch (s) {
    case ST_LISTENING:  return "listening";
    case ST_PROCESSING: return "processing";
    case ST_SPEAKING:   return "speaking";
    default:            return "idle";
  }
}

/* ───────────────────────── Objetos de hardware ────────────────────────── */
Adafruit_SSD1306 display(OLED_W, OLED_H, &Wire, -1);
Adafruit_NeoPixel strip(STRIP_PIXELS, PIN_STRIP, NEO_GRB + NEO_KHZ800);
DHT dht(PIN_DHT, DHT_TYPE);
TinyGPSPlus gps;
HardwareSerial GPSSerial(2);
Servo servo;
WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);

/* ───────────────────────── Telemetria compartida ──────────────────────── */
struct Telemetry {
  float    temp;
  float    hum;
  float    lat;
  float    lon;
  int      voice;      // 0..100 %
  bool     gpsFix;
  uint32_t seq;
  uint32_t uptime;
};
QueueHandle_t   telemetryQueue = nullptr;
SemaphoreHandle_t displayMutex = nullptr;
SemaphoreHandle_t stateMutex   = nullptr;

/* Contador de tramas (monotonico, compartido entre tareas) */
uint32_t gSeq = 0;

/* Color por estado (r,g,b) */
static void stateRGB(AidaState s, uint8_t &r, uint8_t &g, uint8_t &b) {
  switch (s) {
    case ST_LISTENING:  r = 0;   g = 90;  b = 255; break; // azul
    case ST_PROCESSING: r = 176; g = 38;  b = 255; break; // violeta
    case ST_SPEAKING:   r = 0;   g = 255; b = 136; break; // verde
    default:            r = 0;   g = 255; b = 255; break; // cian (idle)
  }
}

/* ───────────────────────── OLED: cara segun estado ────────────────────── */
static void drawFace(AidaState s) {
  if (xSemaphoreTake(displayMutex, pdMS_TO_TICKS(200)) != pdTRUE) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // ── ojos ──
  switch (s) {
    case ST_LISTENING:
      display.fillRoundRect(24, 14, 26, 16, 6, SSD1306_WHITE);
      display.fillRoundRect(78, 14, 26, 16, 6, SSD1306_WHITE);
      display.drawCircle(37, 22, 3, SSD1306_BLACK);
      display.drawCircle(91, 22, 3, SSD1306_BLACK);
      // ondas de escucha
      display.drawCircle(6, 22, 6, SSD1306_WHITE);
      display.drawCircle(6, 22, 10, SSD1306_WHITE);
      display.drawCircle(122, 22, 6, SSD1306_WHITE);
      display.drawCircle(122, 22, 10, SSD1306_WHITE);
      break;
    case ST_PROCESSING:
      display.fillRoundRect(24, 16, 26, 12, 4, SSD1306_WHITE);
      display.fillRoundRect(78, 16, 26, 12, 4, SSD1306_WHITE);
      display.drawLine(8, 22, 20, 22, SSD1306_WHITE);
      display.drawLine(108, 22, 120, 22, SSD1306_WHITE);
      break;
    case ST_SPEAKING:
      display.fillRoundRect(24, 12, 26, 20, 8, SSD1306_WHITE);
      display.fillRoundRect(78, 12, 26, 20, 8, SSD1306_WHITE);
      break;
    default: // idle
      display.fillRoundRect(24, 16, 26, 18, 8, SSD1306_WHITE);
      display.fillRoundRect(78, 16, 26, 18, 8, SSD1306_WHITE);
      display.fillCircle(37, 25, 3, SSD1306_BLACK);
      display.fillCircle(91, 25, 3, SSD1306_BLACK);
      break;
  }

  // ── boca ──
  if (s == ST_SPEAKING) {
    for (int i = 0; i < 5; i++) {
      int h = 4 + ((millis() / 120 + i) % 3) * 5;
      display.fillRect(52 + i * 5, 44 - h / 2, 3, h, SSD1306_WHITE);
    }
  } else if (s == ST_PROCESSING) {
    display.drawRect(56, 42, 16, 6, SSD1306_WHITE);
  } else if (s == ST_LISTENING) {
    display.drawCircle(64, 44, 5, SSD1306_WHITE);
  } else {
    display.drawLine(56, 44, 72, 44, SSD1306_WHITE);
    display.drawLine(56, 44, 54, 42, SSD1306_WHITE);
    display.drawLine(72, 44, 74, 42, SSD1306_WHITE);
  }

  // ── titulo / estado ──
  display.setTextSize(1);
  display.setCursor(2, 56);
  display.print("AIDA+ ");
  display.print(stateName(s));

  display.display();
  xSemaphoreGive(displayMutex);
}

/* ───────────────────────── Meta de telemetria ─────────────────────────── */
static void drawTelemetryLine(const Telemetry &t) {
  if (xSemaphoreTake(displayMutex, pdMS_TO_TICKS(200)) != pdTRUE) return;
  display.fillRect(0, 34, OLED_W, 10, SSD1306_BLACK);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(2, 36);
  display.printf("T:%.1fC H:%.0f%% V:%d%%", t.temp, t.hum, t.voice);
  display.display();
  xSemaphoreGive(displayMutex);
}

/* ───────────────────────── Tira WS2812B ──────────────────────────────── */
static void applyStrip(uint8_t r, uint8_t g, uint8_t b) {
  for (int i = 0; i < STRIP_PIXELS; i++) {
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
  strip.show();
}

static void applyStateStyle(AidaState s) {
  uint8_t r, g, b;
  stateRGB(s, r, g, b);
  applyStrip(r, g, b);
}

/* Parseo "#RRGGBB" */
static bool parseHexColor(const char *hex, uint8_t &r, uint8_t &g, uint8_t &b) {
  if (!hex) return false;
  if (*hex == '#') hex++;
  if (strlen(hex) != 6) return false;
  char buf[3] = {0, 0, 0};
  buf[0] = hex[0]; buf[1] = hex[1]; r = strtol(buf, nullptr, 16);
  buf[0] = hex[2]; buf[1] = hex[3]; g = strtol(buf, nullptr, 16);
  buf[0] = hex[4]; buf[1] = hex[5]; b = strtol(buf, nullptr, 16);
  return true;
}

static void beep(int freq, int ms) {
  tone(PIN_BUZZER, freq, ms);
}

/* ───────────────────────── Callback MQTT (aida/commands) ──────────────── */
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  char buf[256];
  unsigned int n = (length < sizeof(buf) - 1) ? length : sizeof(buf) - 1;
  memcpy(buf, payload, n);
  buf[n] = '\0';

  Serial.printf("[MQTT] << %s : %s\n", topic, buf);

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, buf, n);
  if (err) {
    Serial.printf("[MQTT] JSON invalido: %s\n", err.c_str());
    return;
  }

  if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(200)) == pdTRUE) {

    if (doc.containsKey("state")) {
      const char *s = doc["state"];
      AidaState ns = gState;
      if      (!strcmp(s, "listening"))  ns = ST_LISTENING;
      else if (!strcmp(s, "processing")) ns = ST_PROCESSING;
      else if (!strcmp(s, "speaking"))   ns = ST_SPEAKING;
      else                               ns = ST_IDLE;
      gState = ns;
      applyStateStyle(ns);
      drawFace(ns);
      beep(ns == ST_SPEAKING ? 1200 : 900, 90);
      Serial.printf("[AIDA+] estado -> %s\n", stateName(ns));
    }

    if (doc.containsKey("led_color")) {
      uint8_t r, g, b;
      if (parseHexColor(doc["led_color"], r, g, b)) {
        applyStrip(r, g, b);
        Serial.printf("[AIDA+] WS2812B -> R%d G%d B%d\n", r, g, b);
        beep(1500, 60);
      }
    }

    if (doc.containsKey("servo_angle")) {
      int a = doc["servo_angle"];
      a = constrain(a, 0, 180);
      servo.write(a);
      Serial.printf("[AIDA+] Servo -> %d grados\n", a);
      beep(700, 60);
    }

    xSemaphoreGive(stateMutex);
  }
}

/* ───────────────────────── TaskSensors (Core 1) ───────────────────────── */
void TaskSensors(void *pv) {
  TickType_t last = xTaskGetTickCount();

  for (;;) {
    Telemetry t = {};

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    if (isnan(temp) || isnan(hum)) {
      Serial.println("[SENSOR] Error de lectura DHT22, reintentando...");
      temp = NAN; hum = NAN;
    }

    int raw   = analogRead(PIN_VOICE);
    t.voice   = map(raw, 0, 4095, 0, 100);

    while (GPSSerial.available() > 0) gps.encode(GPSSerial.read());
    t.gpsFix  = gps.location.isValid();
    t.lat     = t.gpsFix ? gps.location.lat() : SIM_LAT;
    t.lon     = t.gpsFix ? gps.location.lng() : SIM_LON;

    t.temp    = temp;
    t.hum     = hum;
    t.seq     = ++gSeq;              // contador de tramas (1, 2, 3, ...)
    t.uptime  = millis() / 1000;

    Serial.printf(
      "[SENSOR] T=%.1f C  H=%.1f %%  VOZ=%d %%  LAT=%.4f  LON=%.4f  (%s)  ESTADO=%s\n",
      t.temp, t.hum, t.voice, t.lat, t.lon,
      t.gpsFix ? "GPS fix" : "GPS simulado", stateName(gState));

    xQueueOverwrite(telemetryQueue, &t);
    drawTelemetryLine(t);

    vTaskDelayUntil(&last, pdMS_TO_TICKS(SENSOR_INTERVAL_MS));
  }
}

/* ───────────────────────── WiFi / MQTT helper ─────────────────────────── */
static void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[WiFi] conectando a ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    vTaskDelay(pdMS_TO_TICKS(500));
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] conectado · IP: %s\n", WiFi.localIP().toString().c_str());
}

static void ensureMqtt() {
  if (mqttClient.connected()) return;
  while (!mqttClient.connected()) {
    Serial.printf("[MQTT] conectando a %s:%d como '%s'...\n", MQTT_HOST, MQTT_PORT, MQTT_USER);
    String cid = String(MQTT_CLIENT) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    bool ok = mqttClient.connect(cid.c_str(), MQTT_USER, MQTT_PASS);
    if (ok) {
      Serial.println("[MQTT] conectado al broker Mosquitto (VPS)");
      mqttClient.subscribe(TOPIC_COMMANDS, 0);
      Serial.printf("[MQTT] suscrito a %s\n", TOPIC_COMMANDS);
      beep(1800, 120);
    } else {
      Serial.printf("[MQTT] fallo rc=%d, reintento en 3s\n", mqttClient.state());
      vTaskDelay(pdMS_TO_TICKS(3000));
    }
  }
}

/* ───────────────────────── TaskMQTT (Core 0) ──────────────────────────── */
void TaskMQTT(void *pv) {
  ensureWifi();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
  mqttClient.setKeepAlive(15);

  TickType_t lastPub = xTaskGetTickCount();
  Telemetry latest = {};
  bool haveData = false;

  for (;;) {
    if (WiFi.status() != WL_CONNECTED) ensureWifi();
    ensureMqtt();
    mqttClient.loop();

    if (xQueuePeek(telemetryQueue, &latest, 0) == pdTRUE) haveData = true;

    if (haveData && (xTaskGetTickCount() - lastPub) >= pdMS_TO_TICKS(PUBLISH_INTERVAL_MS)) {
      lastPub = xTaskGetTickCount();

      StaticJsonDocument<320> doc;
      doc["device"] = "AIDA-ESP32-01";
      doc["temp"]   = serialized(String(latest.temp, 1));
      doc["hum"]    = serialized(String(latest.hum, 1));
      doc["lat"]    = serialized(String(latest.lat, 4));
      doc["lon"]    = serialized(String(latest.lon, 4));
      doc["voice"]  = latest.voice;
      doc["state"]  = stateName(gState);
      doc["gps"]    = latest.gpsFix ? "fix" : "simulado";
      doc["seq"]    = latest.seq;
      doc["uptime"] = latest.uptime;

      char out[320];
      size_t len = serializeJson(doc, out, sizeof(out));
      bool pub = mqttClient.publish(TOPIC_TELEMETRY, out, len);
      Serial.printf("[MQTT] >> %s : %s  (%s)\n", TOPIC_TELEMETRY, out, pub ? "ok" : "ERROR");
    }

    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

/* ───────────────────────── Setup ──────────────────────────────────────── */
void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println();
  Serial.println("=====================================================");
  Serial.println(" AIDA+ · Laboratorio 9 · Nodo Edge AI (ESP32)");
  Serial.printf (" Broker MQTT : %s:%d\n", MQTT_HOST, MQTT_PORT);
  Serial.printf (" Telemetria  : %s\n", TOPIC_TELEMETRY);
  Serial.printf (" Comandos    : %s\n", TOPIC_COMMANDS);
  Serial.println("=====================================================");

  displayMutex = xSemaphoreCreateMutex();
  stateMutex   = xSemaphoreCreateMutex();
  telemetryQueue = xQueueCreate(1, sizeof(Telemetry));

  // OLED SSD1306 (I2C)
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("[OLED] No se pudo inicializar el SSD1306");
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(2, 2);
    display.println("AIDA+ LAB 9");
    display.display();
  }

  // Tira WS2812B
  strip.begin();
  strip.setBrightness(80);
  applyStateStyle(ST_IDLE);

  // DHT22 + GPS + Servo + Buzzer
  dht.begin();
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  servo.attach(PIN_SERVO);
  servo.write(90);
  pinMode(PIN_BUZZER, OUTPUT);

  drawFace(ST_IDLE);
  beep(2000, 100);

  // FreeRTOS
  xTaskCreatePinnedToCore(TaskSensors, "TaskSensors", 4096, nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(TaskMQTT,    "TaskMQTT",    6144, nullptr, 2, nullptr, 0);

  Serial.println("[AIDA+] Tareas FreeRTOS iniciadas (TaskSensors=Core1, TaskMQTT=Core0)");
}

/* El loop queda vacio: todo el trabajo corre en las tareas FreeRTOS */
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
