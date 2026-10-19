# 2. Node-RED y Dashboard — control de actuadores

## Backend: del dashboard al ESP32 por MQTT

El dashboard **no** habla directamente con el ESP32: **publica en el broker** y el ESP32
reacciona en su *callback*. Ese es el backend MQTT implementado en Node-RED.

```
[ui-button / ui-slider / color picker]
        │  (msg.payload)
        ▼
   [function]  ──►  [mqtt out]  ──►  Mosquitto (VPS)  ──►  aida/commands  ──►  ESP32
                                                                              (callback)
```

| Componente | Detalle |
|---|---|
| Widgets | 4 botones de estado, un selector de color y un slider |
| Nodo `function` | Normaliza el valor del widget y arma el objeto JSON |
| Nodo `mqtt out` | Publica en el tópico `aida/commands` del broker `127.0.0.1:1883` con usuario `aida` |
| Suscriptor | El ESP32, suscrito a `aida/commands` desde el arranque |

## Comandos implementados

| Control en el dashboard | Publica en `aida/commands` | Efecto en el ESP32 |
|---|---|---|
| Botón **REPOSO** | `{"state":"idle"}` | OLED ojos abiertos · WS2812B **cian** · beep 900 Hz |
| Botón **ESCUCHANDO** | `{"state":"listening"}` | OLED ondas sonoras · WS2812B **azul** |
| Botón **PROCESANDO IA** | `{"state":"processing"}` | OLED "…" · WS2812B **violeta** |
| Botón **HABLANDO** | `{"state":"speaking"}` | OLED boca animada · WS2812B **verde** · beep 1200 Hz |
| **Selector de color** | `{"led_color":"#00ff88"}` | Pinta los 8 LEDs de la tira con el color elegido · beep 1500 Hz |
| **Slider** Servo SG90 (0–180°) | `{"servo_angle":135}` | `servo.write(135)` · beep 700 Hz |

## Código del callback en el ESP32

```cpp
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);

  // Se toma el mutex porque el estado lo lee también TaskSensors
  if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(200)) == pdTRUE) {
    if (doc.containsKey("state"))       { /* OLED + WS2812B + beep segun estado */ }
    if (doc.containsKey("led_color"))   { /* parseHexColor + applyStrip */ }
    if (doc.containsKey("servo_angle")) { servo.write(constrain((int)doc["servo_angle"], 0, 180)); }
    xSemaphoreGive(stateMutex);
  }
}
```

## Demostración: trazas de consola al recibir comandos

```
[MQTT] << aida/commands : {"state":"listening"}
[AIDA+] estado -> listening
[MQTT] << aida/commands : {"led_color":"#00ff88"}
[AIDA+] WS2812B -> R0 G255 B136
[MQTT] << aida/commands : {"servo_angle":135}
[AIDA+] Servo -> 135 grados
```

## Verificación real del lazo de control

Con el dashboard abierto se pulsaron los controles y se capturó lo que realmente llega al
broker:

```bash
$ mosquitto_sub -h localhost -u aida -P '****' -t 'aida/commands' -v
aida/commands {"state":"listening"}     <- botón ESCUCHANDO
aida/commands {"state":"speaking"}      <- botón HABLANDO
aida/commands {"state":"processing"}    <- botón PROCESANDO IA
aida/commands {"state":"idle"}          <- botón REPOSO
aida/commands {"led_color":"#ff0000"}   <- selector de color
aida/commands {"servo_angle":134}       <- slider del servo (una trama por paso)
```

Esto demuestra que **cada control del dashboard publica exactamente el JSON previsto** en
`aida/commands`, que es el mismo camino que sigue el comando hasta el ESP32.

## Evidencias

**📷 Evidencia 6 — El ESP32 obedece al dashboard**

> Pendiente de captura: dashboard con los botones/slider/color **y** el monitor serial con las
> líneas `[MQTT] << aida/commands` y `[AIDA+] …`, mostrando el cambio de color de la tira, la
> cara de la OLED y el movimiento del servo en Wokwi.

> 📁 Guardar la captura en `evidencias/` con el nombre **`EVIDENCIA-6-control-dashboard.png`**.

**📷 Evidencia 7 — Verificación en el broker (opcional)**

> Pendiente de captura: `sudo grep -a 'aida/' /var/log/mosquitto/mosquitto.log | tail`, donde
> se ve `New client connected … as nr-aida-lab9 (… u'aida')` y la entrega de `aida/telemetry`
> a Node-RED.

> 📁 Guardar la captura en `evidencias/` con el nombre **`EVIDENCIA-7-log-broker.png`**.
