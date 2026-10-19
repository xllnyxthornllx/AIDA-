# AIDA+

Asistente Inteligente Descentralizado y Adaptable. Proyecto de semestre (Tecsup · ARC · ciclo VI).

Un nodo de borde ESP32 que lee sensores y se comunica por MQTT con un broker propio, un dashboard en Node-RED para verlo y controlarlo, y un portal web para el seguimiento del proyecto.

## Cómo funciona

```
sensores ──> ESP32 (FreeRTOS) ──> Mosquitto (VPS) ──> Node-RED ──> dashboard
                                        ^                              │
                                        └──────── aida/commands ───────┘
```

- **ESP32**: dos tareas sobre dos núcleos (Core 1 sensores, Core 0 MQTT) unidas por una cola, de forma que una red lenta no detiene la lectura. Publica JSON en `aida/telemetry` cada 3 s y escucha `aida/commands`.
- **Sensores**: DHT22 (temperatura y humedad), nivel de voz por ADC y GPS NEO-6M.
- **Actuadores**: OLED SSD1306, tira WS2812B, servo SG90 y buzzer.
- **Broker**: Eclipse Mosquitto con usuario y ACL.
- **Dashboard**: gauges, mapa de GPS, estado del asistente y panel de control (estado, color y servo).

## Contenido

| Ruta | Qué hay |
|---|---|
| `public/` | Portal de seguimiento (HTML/CSS/JS + Firebase) → https://aidaplus.vercel.app |
| `content/firmware/` | Firmware del ESP32 y `platformio.ini` |
| `content/hardware/` | Diagrama de Wokwi y guía para ejecutarlo |
| `content/network/` | Guía de la VPS y flujo exportado de Node-RED |
| `content/uml/` | Diagramas Mermaid: bloques, estados y secuencia |
| `Lab 9 Tarea/` | Tarea del Laboratorio 9: sensores, actuadores, dashboards, UML, pruebas y evidencias |
| `docs/` | Notas del proyecto |
| `Lab09 - Subida del proyecto.docx.md` | Informe del Laboratorio 9 |

## Cómo ejecutarlo

**Portal**

```bash
npm run dev     # http://localhost:3000
```

**Firmware y simulación**

El firmware necesita credenciales que no se versionan: copia `content/firmware/secrets.example.h`
como `include/secrets.h` y completa tus datos.

```bash
pio run                       # compilar
```

Después, en VS Code: `Wokwi: Start Simulator`. El detalle está en `content/hardware/WOKWI.md`.

**Broker y dashboard**: `content/network/guia-vps.md`.

## Equipo

- Uriel Aron Torres Salazar
- Magaly Yulisa Mancha Vilca
- Paola Ccarita Apaza
- Xavi Andre Canaza Viza
- Alexis Ramos Choque
