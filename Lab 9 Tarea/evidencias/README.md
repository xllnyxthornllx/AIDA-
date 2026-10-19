# Evidencias del Laboratorio 9

Capturas que acompañan cada apartado de la tarea. Las que ya están renderizadas se muestran en
los archivos numerados; las pendientes se capturan desde el simulador/navegador y se guardan en
esta misma carpeta con el nombre indicado.

## Estado

| # | Evidencia | Dónde se muestra | Nombre del archivo | Estado |
|---|---|---|---|---|
| 1 | Sensores utilizados (componentes / catálogo de Wokwi) | [01-sensores.md](../01-sensores.md) | `EVIDENCIA-1-sensores.png` | ⏳ pendiente de captura |
| 2 | Lectura en consola serial (`[SENSOR]` y `[MQTT] >>`) | [02-lectura-sensores.md](../02-lectura-sensores.md) | `EVIDENCIA-2-consola-serial.png` | ⏳ pendiente de captura |
| 3 | Bloque debug de Node-RED con el JSON | [02-lectura-sensores.md](../02-lectura-sensores.md) | `EVIDENCIA-3-debug-nodered.png` | ⏳ pendiente de captura |
| 4 | Dashboard mostrando los sensores | [03-dashboard-sensores.md](../03-dashboard-sensores.md) | `EVIDENCIA-4-dashboard-sensores.png` | ✅ lista |
| 5 | Actuadores (diagrama de Wokwi / módulos reales) | [04-actuadores.md](../04-actuadores.md) | `EVIDENCIA-5-actuadores.png` | ⏳ pendiente de captura |
| 6 | El ESP32 obedece al dashboard | [05-dashboard-control.md](../05-dashboard-control.md) | `EVIDENCIA-6-control-dashboard.png` | ⏳ pendiente de captura |
| 7 | Log del broker Mosquitto (opcional) | [05-dashboard-control.md](../05-dashboard-control.md) | `EVIDENCIA-7-log-broker.png` | ⏳ pendiente de captura |
| 8 | Diagramas UML renderizados (componentes, bloques, estados y secuencia) | [06-uml.md](../06-uml.md) | `EVIDENCIA-8a-componentes.png`, `8b-bloques.png`, `8c-estados.png`, `8d-secuencia.png` | ✅ listas |

## Qué debe mostrar cada captura pendiente

**Evidencia 1 — Sensores.** Foto de los componentes reales (ESP32 + DHT22 + micrófono + GPS)
y/o captura del catálogo de piezas de Wokwi, donde se vean el DHT22, el potenciómetro que
representa la voz y el módulo GPS.

**Evidencia 2 — Consola serial.** Monitor serial de Wokwi/PlatformIO con las líneas
`[WiFi] conectado · IP: …`, `[MQTT] conectado …`, `[SENSOR] T=… H=… VOZ=… LAT=… LON=…` y
`[MQTT] >> aida/telemetry : {…} (ok)`.

**Evidencia 3 — Debug de Node-RED.** Pestaña `LAB 9 - AIDA+` del editor y el panel derecho del
bloque debug con los objetos JSON que llegan por `aida/telemetry`.

**Evidencia 5 — Actuadores.** El diagrama de conexiones de Wokwi (`content/hardware/diagram.json`)
con la OLED, la tira WS2812B, el servo y el buzzer, y/o foto de los módulos.

**Evidencia 6 — Control.** Dos capturas (o una combinada): el dashboard con los botones, el
slider y el color, y el monitor serial con `[MQTT] << aida/commands` y `[AIDA+] …` mostrando el
cambio en la tira/OLED/servo.

**Evidencia 7 — Broker (opcional).** Salida de
`sudo grep -a 'aida/' /var/log/mosquitto/mosquitto.log | tail` en la VPS.

## Dónde se publican

1. En esta carpeta del repositorio (las imágenes que ya están listas se muestran en los
   archivos numerados).
2. En el **portal del proyecto** → sección *Evidencias*, con la etiqueta `Lab09`.
3. En la carpeta de **Google Drive** del equipo, subcarpeta `Lab09`, como respaldo.

> Antes de publicar, revisar que ninguna captura muestre la clave del broker. En las capturas
> de configuración de Node-RED la clave aparece como campo de contraseña.
