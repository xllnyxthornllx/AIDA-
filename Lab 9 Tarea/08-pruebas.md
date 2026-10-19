# Pruebas y verificaciones

Todo lo que se verificó para dar por válido el Laboratorio 9, con el resultado obtenido.

## Pruebas ejecutadas

| # | Prueba | Cómo se hizo | Resultado |
|---|---|---|---|
| 1 | **El firmware compila** | `pio run` en PlatformIO (placa `esp32dev`) | ✅ Compila: RAM **14,1 %** y Flash **62,5 %** |
| 2 | **El firmware compila sin credenciales en el repositorio** | Compilación con `include/secrets.h` ausente (usa `secrets.example.h` y avisa con `#warning`) | ✅ Compila igual: el código publicado nunca lleva credenciales |
| 3 | **El binario sale apuntando al broker real** | Búsqueda de cadenas dentro de `firmware.bin` | ✅ Contiene `54.94.50.247`, el usuario `aida` y su clave; no queda el valor de ejemplo `0.0.0.0` |
| 4 | **El ESP32 se conecta desde el simulador** | Wokwi con `Wokwi-GUEST` (canal 6) y gateway público | ✅ Obtiene IP `10.10.0.2` y sale a Internet |
| 5 | **Autenticación del broker** | `mosquitto_sub` con y sin usuario | ✅ Con usuario `aida` entrega los mensajes; una conexión anónima es **rechazada** |
| 6 | **Telemetría periódica en JSON** | Suscripción a `aida/telemetry` | ✅ Llega una trama JSON cada **3 s** con `temp`, `hum`, `lat`, `lon`, `voice`, `state`, `seq` y `uptime` |
| 7 | **El contador `seq` es monótono** | Revisión de varias tramas seguidas | ✅ `seq` crece de 1 en 1 (se incrementa dentro de un mutex, sin duplicados con dos tareas) |
| 8 | **El dashboard responde** | Petición HTTP con autenticación a `/ui/aida-lab9` | ✅ **HTTP 200**, título `AIDA+ LAB 9` |
| 9 | **El dashboard muestra los sensores** | Lectura de los gauges y textos en el navegador | ✅ Temperatura 47 %, humedad 55 %, estado `listening`, GPS −16.409 / −71.5375 |
| 10 | **El lazo de control está cerrado** | `mosquitto_sub -t 'aida/commands' -v` mientras se pulsan los controles del dashboard | ✅ Llegan los 6 comandos previstos: `{"state":…}` (×4), `{"led_color":"#ff0000"}` y `{"servo_angle":134}` |
| 11 | **El ESP32 obedece los comandos** | Monitor serial con las líneas `[MQTT] <<` y `[AIDA+]` | ✅ Cambia de estado, pinta la tira, mueve el servo y confirma con beeps |
| 12 | **Los diagramas UML renderizan** | Renderizado de los 3 `.mmd` en GitHub y en Obsidian | ✅ Los tres diagramas se ven sin errores |
| 13 | **Las credenciales no se publican** | Revisión de los archivos versionados y del portal | ✅ La clave MQTT queda solo en `include/secrets.h` (ignorado por Git) y en la copia local no versionada |

## Pruebas que faltan (requieren el hardware real)

Estas pruebas **no se pueden dar por válidas** con el simulador y quedan pendientes para cuando
el grupo tenga los módulos físicos:

| Prueba pendiente | Por qué no se puede simular |
|---|---|
| Niveles eléctricos y niveles lógicos de cada módulo | Dependen del hardware real (pull-ups, tolerancias) |
| Audio real del micrófono (MAX9814) y del amplificador I²S | La simulación usa un potenciómetro sobre el ADC |
| *Fix* real del GPS (tramas NMEA del NEO-6M) | En la simulación se envían coordenadas de respaldo |
| Consumo y alimentación de la tira WS2812B (8 LEDs) | El consumo real (~480 mA a blanco pleno) no se simula |

## Reproducir las pruebas

```bash
# 1. Compilar y flashear/simular el firmware
pio run                 # compilar
pio run -t upload       # subir al ESP32 real
# o en VS Code: Wokwi: Start Simulator

# 2. Ver lo que publica el ESP32 (desde la VPS o cualquier equipo con acceso al broker)
mosquitto_sub -h 54.94.50.247 -u aida -P '<CLAVE>' -t 'aida/telemetry' -v

# 3. Ver los comandos que manda el dashboard
mosquitto_sub -h 54.94.50.247 -u aida -P '<CLAVE>' -t 'aida/commands' -v

# 4. Revisar el log del broker en la VPS
sudo grep -a 'aida/' /var/log/mosquitto/mosquitto.log | tail
```
