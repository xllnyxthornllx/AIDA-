# Guía de despliegue — VPS (Mosquitto + Node-RED + Dashboard)

**Proyecto:** AIDA+ · Asistente Inteligente Descentralizado y Adaptable
**Laboratorio:** 9 — Proyecto de Semestre
**Servidor:** AWS EC2 · `ec2-54-94-50-247.sa-east-1.compute.amazonaws.com`
**IP pública:** `54.94.50.247`
**Sistema operativo:** **Ubuntu 26.04 LTS** (familia Debian; la guía del laboratorio menciona Debian 12, los comandos son idénticos)

---

## 1. Arquitectura desplegada

```
┌────────────────────── VPS AWS (Ubuntu 26.04 LTS) ──────────────────────┐
│                                                                        │
│   Eclipse Mosquitto 2.0.22              Node-RED 4.1.15                │
│   ┌──────────────────────┐              ┌──────────────────────────┐   │
│   │ :1883  MQTT (auth)   │◄────────────►│ :1880  editor + runtime  │   │
│   │ :9001  WebSockets    │              │ :1880/ui  Dashboard 2.0  │   │
│   │ ACL: aida/#          │              │ flow "LAB 9 - AIDA+"     │   │
│   └──────────────────────┘              └──────────────────────────┘   │
│              ▲                                    ▲                    │
└──────────────┼────────────────────────────────────┼────────────────────┘
               │ publish aida/telemetry             │ publish aida/commands
               │ subscribe aida/commands            │ subscribe aida/telemetry
        ┌──────┴───────┐                     ┌──────┴──────────┐
        │ ESP32 (Wokwi)│                     │ Navegador del   │
        │ FreeRTOS     │                     │ operador        │
        └──────────────┘                     └─────────────────┘
```

| Recurso | Valor |
|---|---|
| Broker MQTT | `54.94.50.247:1883` |
| Usuario MQTT | `aida` |
| Password MQTT | *(no se publica; está en `include/secrets.h` del firmware y en la entrega al docente)* |
| Tópico de subida | `aida/telemetry` (QoS 0, cada 3 s) |
| Tópico de bajada | `aida/commands` (QoS 0) |
| Editor Node-RED | `http://54.94.50.247:1880` |
| Dashboard | `http://54.94.50.247:1880/ui` → página **AIDA+ LAB 9** |

> ⚠️ El dashboard y los nodos `http` están protegidos por `httpNodeAuth` en
> `~/.node-red/settings.js` (usuario `nyxthorn`). Al abrir `/ui` el navegador pedirá
> usuario y contraseña.

> 🔒 **Manejo de credenciales.** La contraseña MQTT **no se publica** en este
> repositorio ni en el portal: en el firmware se declara en `include/secrets.h`
> (ignorado por git, plantilla en `include/secrets.example.h`) y por CLI se inyecta
> con la variable `$MQTT_PASS`. Los valores reales se entregan al docente por
> separado.

---

## 2. Auditoría previa (no reinstalar lo que ya existe)

Antes de instalar **cualquier** cosa se verificó el estado del servidor:

```bash
cat /etc/os-release                     # Ubuntu 26.04 LTS
which mosquitto mosquitto_pub mosquitto_sub
systemctl is-active mosquitto nodered   # active / active
node -v && npm -v                       # v20.20.2 / 10.8.2
ss -tlnp | grep -E '1880|1883'          # ambos escuchando
sudo ufw status verbose                 # 22, 80, 443, 1880, 1883 ALLOW
ls ~/.node-red/node_modules | grep dashboard
```

**Resultado:** Mosquitto, Node-RED, Node.js, npm y **Dashboard 2.0
(`@flowfuse/node-red-dashboard` v1.33.0)** ya estaban instalados y activos.
El firewall local (UFW) ya permitía 1880/1883 y el *Security Group* de AWS
también estaba abierto (comprobado con `Test-NetConnection` desde el cliente).

➡️ **No se instaló nada nuevo**; únicamente se realizó configuración mínima.

---

## 3. Configuración aplicada

### 3.1 Usuario MQTT dedicado a AIDA+

```bash
sudo mosquitto_passwd -b /etc/mosquitto/passwd aida '<CLAVE_MQTT>'
```

Usuarios existentes que se **preservaron**: `iotuser`, `nyxthorn`, `magaly`,
`rodrigo`, `nr-lab8`, `landing`.

### 3.2 ACL (permisos por usuario)

El archivo `/etc/mosquitto/conf.d/lab8.acl` define qué tópicos puede usar cada
usuario. Se **añadió** (sin borrar lo anterior) el bloque de AIDA+:

```conf
# Lab 9 - AIDA+
user aida
topic readwrite aida/#
```

> Mosquitto sólo admite **una** directiva `acl_file` global, por eso el bloque se
> agrega al mismo archivo referenciado por `default.conf`, en lugar de crear un
> archivo nuevo (que sería ignorado).

### 3.3 Reinicio y verificación

```bash
sudo systemctl restart mosquitto

# prueba autenticada (debe funcionar) — define primero tu clave
export MQTT_PASS='<CLAVE_MQTT>'
mosquitto_sub -h localhost -u aida -P "$MQTT_PASS" -t 'aida/#' -C 1 &
mosquitto_pub -h localhost -u aida -P "$MQTT_PASS" -t 'aida/telemetry' \
  -m '{"temp":24.5,"hum":48.2,"lat":-16.409,"lon":-71.537,"state":"listening"}'

# prueba anónima (debe ser rechazada)
mosquitto_pub -h localhost -t 'aida/test' -m 'anon'
# → Connection error: Connection Refused: not authorised.
```

### 3.4 Flow de Node-RED «LAB 9 - AIDA+»

El flow se añadió **sin eliminar** los existentes
(`Domótica IoT - Reto 9`, `Reto 8 SCADA`, `LAB 8`): los nodos pasaron de
**134 → 159**.

* Tab: `LAB 9 - AIDA+`
* Broker: `Mosquitto VPS AIDA+` → `127.0.0.1:1883`, usuario `aida`
  (las credenciales quedan cifradas en `~/.node-red/flows_cred.json`,
  cifrado `aes-256-ctr` con la clave derivada de `credentialSecret`).
* Página de dashboard: `/aida-lab9` (sobre la base `db2base` y el tema oscuro
  existentes).

**Nodos del flow:**

| Nodo | Función |
|---|---|
| `mqtt in` → `aida/telemetry` | Recibe la telemetría del ESP32 |
| `json` | Parsea la trama |
| 2 × `debug` | Muestra la lectura y la trama completa (sidebar) |
| 2 × `change` | Extrae `temp` y `hum` para los gauges |
| 2 × `ui-gauge` | Temperatura (°C) y Humedad (%) |
| 2 × `ui-text` | Coordenadas GPS y estado del asistente |
| `ui-template` | Mapa OpenStreetMap con el marcador GPS |
| 4 × `ui-button` | Reposo / Escuchando / Procesando IA / Hablando |
| `ui-template` | Selector de color RGB para la tira WS2812B |
| `ui-slider` | Ángulo del servo SG90 (0–180°) |
| `function` | Construye `{"servo_angle": n}` |
| `mqtt out` → `aida/commands` | Envía los comandos al ESP32 |

**Respaldo creado automáticamente antes del merge:**

```
~/.node-red/flows.json.bak-aida-<fecha>
~/.node-red/flows_cred.json.bak-aida-<fecha>
```

### 3.5 Permisos (UFW) y puertos

```bash
sudo ufw allow 1883/tcp comment 'MQTT Mosquitto'
sudo ufw allow 1880/tcp comment 'Node-RED'
```

Además, en la consola de AWS → **EC2 → Security Groups → Inbound rules** deben
existir reglas TCP para **1880** y **1883** (verificado: accesibles desde
Internet).

---

## 4. Verificación extremo a extremo (evidencia)

```bash
# 1) publicar como lo hace el ESP32, usando la IP PÚBLICA
mosquitto_pub -h 54.94.50.247 -u aida -P "$MQTT_PASS" \
  -t 'aida/telemetry' \
  -m '{"temp":24.5,"hum":48.2,"lat":-16.409,"lon":-71.537,"state":"listening"}'

# 2) comprobar que el broker lo entregó a Node-RED
sudo grep -a 'aida/telemetry' /var/log/mosquitto/mosquitto.log | tail
```

Salida esperada (recortada):

```
New client connected from 127.0.0.1:42370 as nr-aida-lab9 (p2, c1, k60, u'aida').
Received SUBSCRIBE from nr-aida-lab9
Received PUBLISH from auto-... 'aida/telemetry' ... (93 bytes)
Sending PUBLISH to nr-aida-lab9 'aida/telemetry' ... (93 bytes)
```

Esto demuestra: **ESP32 → Mosquitto → Node-RED** funcionando con autenticación.

---

## 5. Operación diaria

| Acción | Comando |
|---|---|
| Ver estado | `systemctl is-active mosquitto nodered` |
| Reiniciar broker | `sudo systemctl restart mosquitto` |
| Reiniciar Node-RED | `sudo systemctl restart nodered` |
| Ver logs Node-RED | `sudo journalctl -u nodered -f` |
| Ver logs Mosquitto | `sudo tail -f /var/log/mosquitto/mosquitto.log` |
| Recargar ACL sin cortar sesiones | `sudo systemctl reload mosquitto` |
| Localizar nuestro tab | `grep -n 'aida_lab9_tab' ~/.node-red/flows.json` |

---

## 6. Solución de problemas (incidencias reales de este despliegue)

| Síntoma | Causa | Solución |
|---|---|---|
| `Connection Refused: not authorised` | El usuario no existe o no está en la ACL | `mosquitto_passwd -b` + bloque `user aida` en `lab8.acl` |
| `Unable to open pwfile` | Se cambió el dueño de `/etc/mosquitto/passwd` a `root:root` | Restaurar `sudo chown mosquitto:mosquitto /etc/mosquitto/passwd` |
| El servicio no arranca tras varios reinicios | systemd entra en *rate-limit* | `sudo systemctl reset-failed mosquitto` |
| Un usuario ve tópicos de otros | Falta ACL | Añadir `topic readwrite <prefijo>/#` bajo su `user` |
| El navegador pide usuario/clave en `/ui` | `httpNodeAuth` activo | Usar el usuario del `httpNodeAuth` definido en `settings.js` |
| Tras editar `flows.json` el cambio desaparece | Node-RED estaba corriendo y reescribió el archivo | Detener el servicio → editar → arrancar |

---

## 7. Seguridad (recomendaciones)

1. **No** se usa `allow_anonymous`: todo cliente debe autenticarse.
2. Cada usuario tiene ACL limitada a su prefijo de tópicos.
3. El listener WebSocket (`9001`) sólo escucha en `127.0.0.1`.
4. Las credenciales de los nodos MQTT de Node-RED están **cifradas** en
   `flows_cred.json` (`aes-256-ctr` + `credentialSecret`).
5. Pendiente/sugerido: rotar el token de Discord almacenado en
   `flows_cred.json` y añadir 512 MB de *swap* si se instalan más nodos.
