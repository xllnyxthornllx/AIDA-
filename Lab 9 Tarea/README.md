# Lab 9 — Tarea

Respuestas de la tarea del **Laboratorio 9** del proyecto **AIDA+** (Asistente Inteligente
Descentralizado y Adaptable), con las pruebas y evidencias de cada punto.

## Índice

| Apartado del enunciado | Respuesta |
|---|---|
| **1. Sensores a utilizar** (listado, características, protocolo, librerías) | [01-sensores.md](01-sensores.md) |
| **1. Lectura de sensores por el microcontrolador** (consola, FreeRTOS + PubSubClient, bloque debug de Node-RED) | [02-lectura-sensores.md](02-lectura-sensores.md) |
| **1. Node-RED y Dashboard** (mostrar los valores de los sensores) | [03-dashboard-sensores.md](03-dashboard-sensores.md) |
| **2. Actuadores a utilizar** (listado, características, protocolo, librerías) | [04-actuadores.md](04-actuadores.md) |
| **2. Node-RED y Dashboard** (control: backend → mqtt → ESP32) | [05-dashboard-control.md](05-dashboard-control.md) |
| **3. Diagrama UML de bloques y/o flujos** | [06-uml.md](06-uml.md) |
| **Objetivo del proyecto** | [07-objetivo-problema-solucion.md](07-objetivo-problema-solucion.md) |
| **Problema a solucionar** | [07-objetivo-problema-solucion.md](07-objetivo-problema-solucion.md) |
| **Cómo soluciona** | [07-objetivo-problema-solucion.md](07-objetivo-problema-solucion.md) |
| **Pruebas y verificaciones** | [08-pruebas.md](08-pruebas.md) |
| **Evidencias** (capturas) | [evidencias/](evidencias/) |

## Archivos del proyecto que se usan aquí

| Recurso | Ruta en el repositorio |
|---|---|
| Firmware del ESP32 (FreeRTOS + PubSubClient) | [`content/firmware/main.cpp`](../content/firmware/main.cpp) |
| Diagrama de conexiones de Wokwi | [`content/hardware/diagram.json`](../content/hardware/diagram.json) |
| Guía de simulación (Wokwi + PlatformIO) | [`content/hardware/WOKWI.md`](../content/hardware/WOKWI.md) |
| Flujo exportado de Node-RED | [`content/network/flows_aida_lab9.json`](../content/network/flows_aida_lab9.json) |
| Guía del broker (VPS) | [`content/network/guia-vps.md`](../content/network/guia-vps.md) |
| Diagramas UML (Mermaid) | [`content/uml/`](../content/uml/) |
| Informe completo del laboratorio | [`Lab09 - Subida del proyecto.docx.md`](../Lab09%20-%20Subida%20del%20proyecto.docx.md) |

## Resumen en una línea

El **ESP32** lee tres sensores (temperatura/humedad, voz y GPS) con **FreeRTOS** y publica
la lectura en **JSON** por **MQTT** a un broker **Mosquitto propio**; **Node-RED** recibe esa
telemetría y la muestra en un **dashboard**, y desde ese mismo dashboard se envían **comandos**
que el ESP32 aplica sobre sus actuadores (OLED, tira WS2812B, servo y buzzer).

## Equipo

- Torres Salazar, Uriel Aron
- Mancha Vilca, Magaly Yulisa
- Ccarita Apaza, Paola
- Canaza Viza, Xavi Andre
- Ramos Choque, Alexis

**Curso:** Arquitectura de Redes y Comunicaciones — **Tecsup Arequipa**
