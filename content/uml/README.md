# Diagramas UML — AIDA+ Laboratorio 9

Diagramas del proyecto de semestre, en formato **Mermaid**. Los archivos `.mmd` son el
código fuente (se abren en [Mermaid Live](https://mermaid.live), Obsidian o VS Code con
la extensión *Markdown Preview Mermaid Support*); esta página los muestra ya renderizados
en GitHub.

| Diagrama | Archivo | Qué responde |
|---|---|---|
| Bloques | [`uml_aida_bloques.mmd`](./uml_aida_bloques.mmd) | ¿Qué componentes hay y cómo se conectan? |
| Flujo de estados | [`uml_aida_flujo_estados.mmd`](./uml_aida_flujo_estados.mmd) | ¿Qué estados tiene el asistente y qué los cambia? |
| Secuencia | [`uml_aida_secuencia.mmd`](./uml_aida_secuencia.mmd) | ¿En qué orden viajan los mensajes entre ESP32, broker y dashboard? |

---

## 1. Diagrama de bloques

```mermaid
flowchart TB
    subgraph CAMPO["Entorno del usuario (Arequipa)"]
        V["Voz del usuario<br/>captura por microfono"]
        P["Presencia y contexto"]
    end

    subgraph EDGE["Nodo Edge - ESP32 DevKit (FreeRTOS)"]
        SENS["TaskSensors - Core 1<br/>DHT22 temp/humedad<br/>Microfono MAX9814 ADC<br/>GPS NEO-6M UART"]
        QUEUE["Cola FreeRTOS<br/>xQueueOverwrite"]
        MQTT_T["TaskMQTT - Core 0<br/>WiFi STA + PubSubClient<br/>JSON cada 3 s"]
        ACT["Actuadores<br/>OLED SSD1306 I2C<br/>Tira WS2812B<br/>Servo SG90 PWM<br/>Buzzer"]
        SENS --> QUEUE --> MQTT_T
        MQTT_T --> ACT
    end

    subgraph CLOUD["VPS AWS - Ubuntu (familia Debian)"]
        BROKER["Eclipse Mosquitto 2.0<br/>:1883 con auth y ACL<br/>topico aida/#"]
        NR["Node-RED 4.1.15<br/>:1880<br/>Dashboard 2.0 en /ui"]
    end

    subgraph CLIENTE["Cliente"]
        UI["Dashboard AIDA+ LAB 9<br/>gauges temp/humedad<br/>mapa GPS - estado<br/>botones - slider - color"]
        DEV["Nodo debug<br/>muestra las tramas JSON"]
    end

    V --> SENS
    P --> SENS
    MQTT_T -- "publish aida/telemetry" --> BROKER
    BROKER -- "subscribe aida/telemetry" --> NR
    NR --> UI
    NR --> DEV
    UI -- "acciones del operador" --> NR
    NR -- "publish aida/commands" --> BROKER
    BROKER -- "subscribe aida/commands" --> MQTT_T
    MQTT_T -- "callback segun comando" --> ACT
```

## 2. Diagrama de flujo de estados

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Reposo

    Reposo : Reposo (idle)
    Reposo : WS2812B en cian
    Reposo : OLED con ojos abiertos
    Reposo : escucha pasiva del ADC de voz

    Escuchando : Escuchando (listening)
    Escuchando : WS2812B en azul
    Escuchando : OLED con ondas sonoras
    Escuchando : nivel de voz sobre el umbral

    Procesando : Procesando IA (processing)
    Procesando : WS2812B en violeta
    Procesando : OLED mostrando texto pensando

    Hablando : Hablando (speaking)
    Hablando : WS2812B en verde
    Hablando : OLED con boca animada
    Hablando : reproduccion de audio

    Reposo --> Escuchando : voz detectada
    Escuchando --> Procesando : fin de la captura
    Procesando --> Hablando : respuesta lista
    Hablando --> Reposo : audio finalizado
    Escuchando --> Reposo : silencio o timeout
    Procesando --> Reposo : error de inferencia

    note right of Reposo
      Comando MQTT de respaldo por aida/commands
      para forzar el estado desde el dashboard
      con la clave state
    end note
```

## 3. Diagrama de secuencia

```mermaid
sequenceDiagram
    autonumber
    participant S as Sensores (DHT22 / voz / GPS)
    participant E as ESP32 (FreeRTOS)
    participant M as Mosquitto (VPS)
    participant N as Node-RED
    participant D as Dashboard 2.0

    loop TaskSensors en Core 1
        E->>S: leer temperatura, humedad, voz y GPS
        S-->>E: valores de los sensores
        E->>E: imprimir la trama en la consola serial
    end

    loop TaskMQTT en Core 0
        E->>M: PUBLISH aida/telemetry con el JSON
        M-->>N: entrega del mensaje QoS 0
        N->>D: actualiza gauges, textos y mapa
    end

    D->>N: el operador pulsa un boton o mueve el slider
    N->>M: PUBLISH aida/commands con el JSON
    M-->>E: entrega del comando
    E->>E: callback aplica OLED, WS2812B, servo y buzzer
```
