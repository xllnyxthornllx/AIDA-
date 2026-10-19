# 3. Diagrama UML de bloques y/o flujos

## 3.1 Diagrama de bloques

```mermaid
flowchart TB
    subgraph CAMPO["Entorno del usuario"]
        V["Voz del usuario"]
    end
    subgraph EDGE["ESP32 DevKit - FreeRTOS"]
        SENS["<b>TaskSensors</b> · Core 1<br/>DHT22 · Voz(ADC) · GPS(UART)"]
        QUEUE["Cola FreeRTOS"]
        MQTT_T["<b>TaskMQTT</b> · Core 0<br/>WiFi + PubSubClient + JSON"]
        ACT["<b>Actuadores</b><br/>OLED · WS2812B · Servo · Buzzer"]
        SENS --> QUEUE --> MQTT_T --> ACT
    end
    subgraph CLOUD["VPS AWS (Ubuntu 26.04)"]
        BROKER["<b>Eclipse Mosquitto</b><br/>:1883 · auth + ACL"]
        NR["<b>Node-RED 4.1.15</b><br/>:1880 · Dashboard 2.0"]
    end
    UI["Dashboard AIDA+ LAB 9<br/>gauges · mapa · botones · slider"]
    DEV["Nodo debug"]

    V --> SENS
    MQTT_T -- "publish aida/telemetry" --> BROKER
    BROKER -- "subscribe" --> NR
    NR --> UI
    NR --> DEV
    UI -- "acciones" --> NR
    NR -- "publish aida/commands" --> BROKER
    BROKER -- "subscribe" --> MQTT_T
    MQTT_T -- "callback" --> ACT
```

## 3.2 Diagrama de flujo de estados (comportamiento del asistente)

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Reposo
    Reposo : idle — WS2812B cian · OLED ojos abiertos
    Escuchando : listening — WS2812B azul · OLED ondas
    Procesando : processing — WS2812B violeta · OLED "..."
    Hablando : speaking — WS2812B verde · OLED boca animada
    Reposo --> Escuchando : voz detectada
    Escuchando --> Procesando : fin de captura
    Procesando --> Hablando : respuesta lista
    Hablando --> Reposo : audio finalizado
    Escuchando --> Reposo : silencio / timeout
    Procesando --> Reposo : error de inferencia
```

## 3.3 Diagrama de secuencia (extremo a extremo)

```mermaid
sequenceDiagram
    autonumber
    participant S as Sensores
    participant E as ESP32 (FreeRTOS)
    participant M as Mosquitto (VPS)
    participant N as Node-RED
    participant D as Dashboard
    loop TaskSensors · Core 1 · 3 s
        E->>S: leer temperatura, humedad, voz, GPS
        S-->>E: valores
    end
    loop TaskMQTT · Core 0 · 3 s
        E->>M: PUBLISH aida/telemetry {temp,hum,lat,lon,voice,state}
        M-->>N: entrega QoS 0
        N->>D: actualiza gauges, textos y mapa
    end
    D->>N: el operador pulsa un botón
    N->>M: PUBLISH aida/commands {state|servo_angle|led_color}
    M-->>E: entrega del comando
    E->>E: callback → OLED + WS2812B + Servo + Buzzer
```

> **Fuentes de los diagramas:** los archivos `.mmd` (formato Mermaid, renderizables en GitHub
> y en Obsidian) están en el repositorio:
> [`content/uml/uml_aida_bloques.mmd`](../content/uml/uml_aida_bloques.mmd),
> [`content/uml/uml_aida_flujo_estados.mmd`](../content/uml/uml_aida_flujo_estados.mmd) y
> [`content/uml/uml_aida_secuencia.mmd`](../content/uml/uml_aida_secuencia.mmd).
> También están reunidos en [`content/uml/README.md`](../content/uml/README.md).

## Lectura de los diagramas

- **Bloques:** muestra las tres capas del sistema (campo → borde → nube) y, dentro del ESP32,
  las dos tareas FreeRTOS separadas por una cola, con los actuadores como salida del *callback*.
- **Estados:** modela el comportamiento del asistente. Es la pieza que hace que los botones del
  dashboard tengan sentido: cada comando lleva el sistema a un estado, y cada estado tiene una
  representación concreta en luz, pantalla y sonido.
- **Secuencia:** muestra el ciclo completo en el tiempo, incluido el lazo de control (dashboard
  → broker → ESP32 → actuadores).

## Evidencia

**📷 Evidencia 8 — Diagramas UML renderizados**

![Evidencia 8a — diagrama de bloques](evidencias/EVIDENCIA-8a-diagrama-bloques.png)

![Evidencia 8b — flujo de estados](evidencias/EVIDENCIA-8b-flujo-estados.png)

![Evidencia 8c — diagrama de secuencia](evidencias/EVIDENCIA-8c-secuencia.png)
