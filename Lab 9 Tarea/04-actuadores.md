# 2. Actuadores a utilizar

## Listado de actuadores

| # | Actuador | Función en el asistente | Pin del ESP32 |
|---|---|---|---|
| 1 | **Pantalla OLED SSD1306** | "Cara" del asistente: ojos, boca y estado | SDA = GPIO 21 · SCL = GPIO 22 (I²C) |
| 2 | **Tira LED WS2812B** (8 píxeles) | Color del asistente según su estado y color elegido desde el dashboard | GPIO 25 |
| 3 | **Servomotor SG90** | Gesto físico / orientación controlada desde el dashboard | GPIO 13 |
| 4 | **Buzzer / altavoz** | Confirmaciones sonoras y salida de audio del asistente | GPIO 26 |

> En el hardware final el audio se reproduce con un **amplificador I²S MAX98357A + parlante**;
> en la simulación y en las pruebas con el ESP32 básico se usa un **buzzer** sobre el mismo pin
> de salida, que permite validar toda la lógica de estados y confirmaciones.

## Características y protocolo de comunicación

### 1. Pantalla OLED SSD1306 (128×64)

| Característica | Valor |
|---|---|
| Resolución | 128 × 64 píxeles, monocromo |
| Controlador | SSD1306 |
| Dirección I²C | `0x3C` |
| Alimentación | 3,3 a 5 V |
| **Protocolo** | **I²C** (2 hilos SDA/SCL, hasta 400 kHz) |

### 2. Tira LED WS2812B

| Característica | Valor |
|---|---|
| LEDs | 8 píxeles RGB direccionables individualmente |
| Alimentación | 5 V |
| Consumo | ≈ 60 mA por LED a blanco pleno (≈ 480 mA los 8) |
| **Protocolo** | **1-Wire NZR propietario** a 800 kHz, con codificación por duración de pulso (**no** es SPI) |

### 3. Servomotor SG90

| Característica | Valor |
|---|---|
| Rotación | 0° a 180° |
| Torque | 1,8 kg·cm |
| Alimentación | 4,8 a 6 V |
| **Protocolo** | **PWM** con pulso de 1 a 2 ms repetido a 50 Hz (en el ESP32, generado por LEDC) |

### 4. Buzzer / altavoz

| Característica | Valor |
|---|---|
| Tipo | Buzzer piezoeléctrico (o amplificador + parlante) |
| Frecuencias usadas | 700 Hz (servo), 900 Hz (reposo), 1200 Hz (hablando), 1500 Hz (color), 1800 Hz (conexión MQTT) |
| **Protocolo** | **PWM** por frecuencia (`tone()` del core de Arduino para ESP32) |

## Librerías utilizadas

| Actuador | Librería | Para qué |
|---|---|---|
| OLED SSD1306 | `Wire.h` | Inicializar el bus I²C (`Wire.begin(21, 22)`) |
| OLED SSD1306 | `Adafruit_GFX.h` | Primitivas gráficas (rectángulos, círculos, líneas, texto) |
| OLED SSD1306 | `Adafruit_SSD1306.h` | Driver del controlador SSD1306 |
| Tira WS2812B | `Adafruit_NeoPixel.h` | Encender los 8 LEDs con color individual (alternativa: `FastLED`) |
| Servomotor SG90 | `ESP32Servo.h` | Generar el PWM de 50 Hz y usar `servo.write(ángulo)` |
| Buzzer | `tone()` (incluida en el core de Arduino para ESP32) | Generar tonos de confirmación |
| Audio real (hardware final) | `driver/i2s.h` o `ESP32-audioI2S` | Salida de audio por I²S con el MAX98357A |

Declaración exacta en el firmware:

```cpp
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <ESP32Servo.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);   // I2C 0x3C
Adafruit_NeoPixel strip(8, 25, NEO_GRB + NEO_KHZ800);
Servo servo;                                    // GPIO 13
```

## Cómo responde cada actuador al estado del asistente

| Estado | OLED | Tira WS2812B | Sonido |
|---|---|---|---|
| `idle` (reposo) | ojos abiertos | cian | beep 900 Hz al entrar |
| `listening` | ondas de escucha | azul | — |
| `processing` | ojos entrecerrados y "…" | violeta | — |
| `speaking` | boca animada | verde | beep 1200 Hz al entrar |
| color elegido | — | color RGB enviado desde el dashboard | beep 1500 Hz |
| ángulo del servo | — | — | beep 700 Hz |

## Evidencia

**📷 Evidencia 5 — Actuadores**

> Pendiente de captura: diagrama de Wokwi (`content/hardware/diagram.json`) con la OLED
> SSD1306, la tira WS2812B, el servo y el buzzer conectados al ESP32, y/o foto de los
> módulos reales.

> 📁 Guardar la captura en `evidencias/` con el nombre **`EVIDENCIA-5-actuadores.png`**.
