# Ejecutar AIDA+ en Wokwi (con PlatformIO) — paso a paso

Este proyecto se **simula en Wokwi** ejecutando el *mismo binario* que se compila con
PlatformIO, así que lo que se ve en el simulador es el firmware real que se evalúa.

---

## 1. Requisitos (una sola vez)

| Qué | Detalle |
|---|---|
| VS Code | con las extensiones **PlatformIO IDE** y **Wokwi for VS Code** |
| Cuenta Wokwi | gratuita en <https://wokwi.com>. Se pide la licencia de la extensión con `Wokwi: Request a New License` (llega un enlace de activación al correo; se pega al abrir el simulador) |
| Internet | el simulador abre un socket TCP real hacia el broker de la VPS (54.94.50.247:1883) |
| Credenciales | archivo `include/secrets.h` (ver punto 2) |

Extensiones recomendadas (ya declaradas en `.vscode/extensions.json`):
`platformio.platformio-ide` y `wokwi.wokwi-vscode`.

## 2. Credenciales (`include/secrets.h`)

El repositorio **no** incluye credenciales. Copia la plantilla y complétala:

```bash
cp include/secrets.example.h include/secrets.h     # en Windows: copy
```

```cpp
// include/secrets.h  (NO se versiona)
#define WIFI_SSID     "Wokwi-GUEST"   // red del simulador (sin clave)
#define WIFI_PASS     ""
#define MQTT_HOST     "54.94.50.247"  // VPS AWS · Mosquitto
#define MQTT_PORT     1883
#define MQTT_USER     "aida"
#define MQTT_PASS     "<tu-clave>"
```

Si `secrets.h` no existe, el sketch **igual compila** con valores de ejemplo y avisa
con `#warning "include/secrets.h no encontrado..."`, pero no se conectará al broker.

## 3. Arrancar el simulador

1. Abre la carpeta `ESP32-Aida+` en VS Code.
2. Compila: icono **✔** de PlatformIO (o `pio run`). Debe terminar en
   `[SUCCESS]` con `RAM 14.1 %` y `Flash 62.5 %`.
3. `Ctrl+Shift+P` → **Wokwi: Start Simulator**.
4. Se abre el diagrama y, abajo, la **consola serial** (115200 baudios, ya viene
   por `monitor_speed = 115200`).

> `wokwi.toml` apunta a `.pio/build/esp32dev/firmware.bin` y `firmware.elf`, por eso
> hay que compilar **antes** de arrancar el simulador.

## 4. Qué debe aparecer en la consola serial

```
=====================================================
 AIDA+ · Laboratorio 9 · Nodo Edge AI (ESP32)
 Broker MQTT : 54.94.50.247:1883
 Telemetria  : aida/telemetry
 Comandos    : aida/commands
=====================================================
[WiFi] conectando a Wokwi-GUEST
[WiFi] conectado · IP: 10.0.0.2
[MQTT] conectando a 54.94.50.247:1883 como 'aida'...
[MQTT] conectado al broker Mosquitto (VPS)
[MQTT] suscrito a aida/commands
[AIDA+] Tareas FreeRTOS iniciadas (TaskSensors=Core1, TaskMQTT=Core0)
[SENSOR] T=26.4 C  H=52.7 %  VOZ=41 %  LAT=-16.4090  LON=-71.5375  (GPS simulado)  ESTADO=listening
[MQTT] >> aida/telemetry : {"device":"AIDA-ESP32-01","temp":26.4,...}  (ok)
```

Cada 3 s se repite el par `[SENSOR]` + `[MQTT] >>` (tramas JSON por MQTT, **requisito
del laboratorio**). La telemetría se ve además en el nodo **debug** de Node-RED y en el
dashboard.

Al mover un control del dashboard (con la simulación corriendo):

```
[MQTT] << aida/commands : {"servo_angle":134}
[AIDA+] Servo -> 134 grados
```

## 5. Componentes del `diagram.json` (ya cableados)

| Componente Wokwi | Representa | Pin(es) ESP32 |
|---|---|---|
| `board-esp32-devkit-c-v4` | Nodo Edge AI | — |
| `board-ssd1306` | OLED SSD1306 I2C (cara del asistente) | SDA→21 · SCL→22 · VCC→3V3 · GND |
| `wokwi-dht22` | Sensor de temperatura/humedad DHT22 | SDA→15 · VCC→3V3 · GND |
| `wokwi-led-strip` (8 px) | Tira WS2812B (estado por color) | DIN→25 · VDD→5V · VSS→GND |
| `wokwi-potentiometer` | **Sustituye al micrófono** (misma ruta ADC1) | SIG→34 |
| `wokwi-servo` | Servo SG90 (movimiento) | PWM→13 · V+→5V · GND |
| `wokwi-buzzer` | **Sustituye al amplificador/parlante** | 1→26 · 2→GND |
| `wokwi-text` ×2 | Rótulos del diagrama | — |

> Sustituciones: Wokwi no tiene micrófono ni amplificador I2S. El potenciómetro entrega
> la misma señal analógica al GPIO34 (`voice`) y el buzzer representa la salida de audio.
> El GPS se simula con coordenadas fijas de Arequipa (`"gps":"simulado"`).

## 6. Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `Wokwi: ... license required` | Falta activar la licencia: `Wokwi: Request a New License` y pegar el enlace recibido |
| No aparece el diagrama | Ejecutar el comando desde la **raíz del proyecto** (donde está `wokwi.toml` y `diagram.json`) |
| `[WiFi] conectando...` y se queda ahí | El SSID debe ser exactamente `Wokwi-GUEST` y sin contraseña |
| `[MQTT] fallo rc=-2` | No se alcanza el broker: revisar `MQTT_HOST`, que el puerto 1883 siga abierto y que la clave sea la correcta |
| `[MQTT] fallo rc=5` | Credenciales rechazadas (usuario/clave) |
| `[OLED] No se pudo inicializar el SSD1306` | Revisar en `diagram.json` que el SSD1306 esté en I2C 21/22 y con dirección `0x3C` |
| `[SENSOR] Error de lectura DHT22` | Es normal en los primeros ciclos: el DHT22 necesita ~2 s tras encender |

## 7. Verificar sin el simulador (opcional)

Desde la VPS, para comprobar que el lazo MQTT completo funciona sin Wokwi:

```bash
export MQTT_PASS='<tu-clave>'
mosquitto_sub -h localhost -u aida -P "$MQTT_PASS" -t 'aida/#' -v
mosquitto_pub -h localhost -u aida -P "$MQTT_PASS" -t aida/telemetry \
  -m '{"device":"AIDA-ESP32-01","temp":26.4,"hum":52.7,"lat":-16.4090,"lon":-71.5375,"voice":41,"state":"listening","seq":1}'
```
