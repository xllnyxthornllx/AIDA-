# 1. Lectura de sensores por el microcontrolador

Microcontrolador utilizado: **ESP32 DevKit v1** (programado con **PlatformIO**), con
**FreeRTOS** y el cliente MQTT **PubSubClient**.

## a) Lectura de cada sensor mostrada en la consola serial

Cada 3 segundos el firmware imprime **todas** las lecturas en una sola línea de la consola
serial (`monitor_speed = 115200`):

```
=====================================================
 AIDA+ · Laboratorio 9 · Nodo Edge AI (ESP32)
 Broker MQTT : 54.94.50.247:1883
 Telemetria  : aida/telemetry
 Comandos    : aida/commands
=====================================================
[AIDA+] Tareas FreeRTOS iniciadas (TaskSensors=Core1, TaskMQTT=Core0)
[WiFi] conectando a Wokwi-GUEST
[WiFi] conectado · IP: 10.10.0.2
[MQTT] conectando a 54.94.50.247:1883 como 'aida'...
[MQTT] conectado al broker Mosquitto (VPS)
[MQTT] suscrito a aida/commands
[SENSOR] T=24.5 C  H=48.2 %  VOZ=37 %  LAT=-16.4090  LON=-71.5375  (GPS simulado)  ESTADO=idle
[MQTT] >> aida/telemetry : {"device":"AIDA-ESP32-01","temp":"24.5","hum":"48.2","lat":"-16.4090","lon":"-71.5375","voice":37,"state":"idle","gps":"simulado","seq":1,"uptime":6}  (ok)
```

- La línea `[SENSOR]` la imprime **TaskSensors** y contiene las cuatro lecturas
  (temperatura, humedad, voz y coordenadas) más el estado actual del asistente.
- La línea `[MQTT] >>` la imprime **TaskMQTT** y muestra el **JSON exacto** que sale hacia el
  broker.

**📷 Evidencia 2 — Lectura en consola serial**

> Pendiente de captura: monitor serial de Wokwi/PlatformIO mostrando las líneas `[SENSOR]` y
> `[MQTT] >>`.

> 📁 Guardar la captura en `evidencias/` con el nombre **`EVIDENCIA-2-consola-serial.png`**.

## b) Envío al broker en formato JSON con FreeRTOS y PubSubClient

### Arquitectura de tareas

Se usan **dos tareas fijadas a núcleos distintos** y una **cola** para desacoplar la
adquisición de la publicación:

| Tarea | Núcleo | Prioridad | Responsabilidad |
|---|---|---|---|
| `TaskSensors` | **Core 1** | 1 | Lee el DHT22 + la voz (ADC) + el GPS, imprime en consola y guarda la última muestra en la cola (`xQueueOverwrite`). |
| `TaskMQTT` | **Core 0** | 2 | Mantiene el WiFi y la conexión MQTT, ejecuta `mqttClient.loop()` y publica el JSON cada 3 s (`xQueuePeek`). Atiende el *callback* de `aida/commands`. |

```cpp
xTaskCreatePinnedToCore(TaskSensors, "TaskSensors", 4096, nullptr, 1, nullptr, 1);
xTaskCreatePinnedToCore(TaskMQTT,    "TaskMQTT",    6144, nullptr, 2, nullptr, 0);
```

Con esta separación, **una red lenta o un broker caído no detienen la lectura de sensores**:
la cola siempre conserva la última muestra válida.

### Serialización JSON y publicación

```cpp
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
mqttClient.publish(TOPIC_TELEMETRY, out, len);
```

### Trama JSON publicada

```json
{
  "device": "AIDA-ESP32-01",
  "temp": "24.5",
  "hum": "48.2",
  "lat": "-16.4090",
  "lon": "-71.5375",
  "voice": 37,
  "state": "idle",
  "gps": "simulado",
  "seq": 12,
  "uptime": 36
}
```

> Los valores numéricos se serializan **como cadena con un decimal fijo** (`serialized(String(...))`)
> para que siempre viajen con la misma precisión y evitar el redondeo por defecto de ArduinoJson,
> que en telemetría produce saltos de 0,1 °C en los gauges.

### Tópicos MQTT

| Tópico | Dirección | QoS | Formato |
|---|---|---|---|
| `aida/telemetry` | ESP32 → Mosquitto → Node-RED | 0 | JSON cada 3 s |
| `aida/commands` | Node-RED → Mosquitto → ESP32 | 0 | JSON por evento |

El broker es **Eclipse Mosquitto** alojado en la **VPS propia** del grupo
(`54.94.50.247:1883`), con autenticación por usuario (`aida`) y lista de control de acceso.

## c) Visualización en Node-RED con el bloque debug

En la pestaña `LAB 9 - AIDA+` del editor de Node-RED, la telemetría se muestra en el panel
**debug**:

| Nodo | Función |
|---|---|
| `mqtt in` → `aida/telemetry` | Se suscribe al broker Mosquitto de la VPS (usuario `aida`) |
| `json` | Convierte el *string* JSON en un objeto |
| `debug` **"DEBUG payload"** | Muestra `msg.payload` con las lecturas ya separadas (`temp`, `hum`, `lat`, `lon`, `voice`, `state`) |
| `debug` **"DEBUG trama completa"** | Muestra el `msg` completo, incluyendo el `topic` |

**📷 Evidencia 3 — Bloque debug de Node-RED**

> Pendiente de captura: Node-RED con la pestaña `LAB 9 - AIDA+` abierta y el panel lateral
> derecho mostrando los objetos JSON que llegan por `aida/telemetry`.

> 📁 Guardar la captura en `evidencias/` con el nombre **`EVIDENCIA-3-debug-nodered.png`**.
