# Objetivo, problema y solución

## Objetivo del proyecto

Desarrollar **AIDA+**, un asistente inteligente **descentralizado y adaptable** cuyo nodo de
borde (**ESP32**) adquiere señales del entorno (temperatura, humedad, voz y ubicación), las
publica por **MQTT** hacia un **broker propio**, y puede ser **controlado en tiempo real** desde
un panel **Node-RED**, representando su estado interno mediante luz, pantalla y movimiento.

## Problema a solucionar

Los asistentes domésticos comerciales (Alexa, Google Home) **dependen de la nube de un
tercero**: sin Internet dejan de funcionar, envían datos personales a servidores externos y no
pueden adaptarse a necesidades específicas de un hogar (accesibilidad, idioma, privacidad).

Además, un sistema de este tipo suele fallar cuando la adquisición de sensores y la comunicación
de red se ejecutan en un **único bucle secuencial**: una lectura lenta o un broker caído
bloquean todo el sistema.

## Cómo soluciona

La solución implementada tiene cuatro piezas:

1. Un **broker Mosquitto propio** en la VPS del grupo, que el usuario controla (no un servicio
   de terceros).
2. Un **ESP32 con FreeRTOS** que separa en **dos tareas sobre dos núcleos** la adquisición de
   sensores (Core 1) y la comunicación MQTT (Core 0), **comunicadas por una cola**, de modo que
   una red lenta nunca detiene la lectura.
3. Un **dashboard Node-RED** que cierra el **lazo de control**: los widgets publican comandos
   MQTT que el ESP32 aplica sobre sus actuadores.
4. El estado del asistente modelado explícitamente como una **máquina de estados**
   (`idle → listening → processing → speaking`), visible en la OLED, la tira LED y el dashboard.

Y así se ve en el **diagrama UML de componentes** de la implementación:

```mermaid
flowchart TB
    USUARIO(["«actor» Usuario del hogar"])

    subgraph NODO["«nodo» ESP32 DevKit v1 · firmware FreeRTOS"]
        direction TB
        TS["«tarea» TaskSensors<br/>Core 1 · prioridad 1<br/>DHT22 · voz (ADC) · GPS (UART)"]
        COLA["«buffer» telemetryQueue<br/>tamano 1 · xQueueOverwrite / xQueuePeek"]
        TM["«tarea» TaskMQTT<br/>Core 0 · prioridad 2<br/>WiFi + PubSubClient + ArduinoJson"]
        MTX["«mutex» stateMutex"]
        FSM["«maquina de estados» AidaState<br/>idle · listening · processing · speaking"]
        ACT["«actuadores»<br/>OLED SSD1306 (I2C)<br/>WS2812B (1-Wire)<br/>SG90 y buzzer (PWM)"]
    end

    subgraph VPS["«nodo» VPS AWS · Ubuntu LTS"]
        BROKER["«broker MQTT» Eclipse Mosquitto :1883<br/>autenticacion y ACL"]
        NR["«aplicacion» Node-RED :1880<br/>Dashboard 2.0 y nodo debug<br/>muestra gauges, mapa y estado"]
    end

    USUARIO -- "habla" --> TS
    USUARIO -- "opera el panel" --> NR
    TS -- "escribe la muestra" --> COLA
    COLA -- "publica la ultima muestra" --> TM
    TM -- "aplica el comando" --> ACT
    MTX -.->|protege| FSM
    TM -.->|lee el estado| FSM
    TM -- "aida/telemetry" --> BROKER
    BROKER -- "entrega QoS 0" --> NR
    NR -- "aida/commands" --> BROKER
    BROKER -- "entrega el comando" --> TM
```

El **comportamiento** del asistente (qué estado sigue a cuál) se muestra en el diagrama de
estados, y el **orden temporal** de los mensajes en el diagrama de secuencia. Los tres están en
[06-uml.md](06-uml.md), y sus fuentes `.mmd` en [`content/uml/`](../content/uml/).

## Relación problema → solución

| Problema | Cómo lo resuelve AIDA+ |
|---|---|
| Dependencia de la nube de un tercero | Broker Mosquitto **propio** en la VPS del grupo |
| Datos personales a servidores externos | La telemetría solo viaja al broker del propio proyecto |
| No se adapta a necesidades del hogar | Nodo de borde programable (ESP32) y dashboard propio |
| Un bucle secuencial bloquea todo | **Dos tareas FreeRTOS** en núcleos distintos, unidas por una cola |
| Falta de visibilidad del estado interno | **Máquina de estados** representada en OLED, tira LED y dashboard |
| No se puede accionar el sistema | **Lazo de control** por MQTT: dashboard → broker → ESP32 → actuadores |
