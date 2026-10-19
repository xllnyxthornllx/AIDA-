#pragma once
/*
 * ============================================================================
 *  AIDA+ · Laboratorio 9 — Plantilla de credenciales
 * ============================================================================
 *  INSTRUCCIONES:
 *    1) Copia este archivo como  include/secrets.h  (mismo directorio).
 *    2) Rellena tus valores reales.
 *    3) include/secrets.h esta en .gitignore: nunca se sube al repositorio.
 * ============================================================================
 */

/* Red WiFi del simulador Wokwi (en hardware real: tu red local) */
#define WIFI_SSID     "Wokwi-GUEST"
#define WIFI_PASS     ""

/* Broker Mosquitto (tu VPS) */
#define MQTT_HOST     "0.0.0.0"        // <-- IP o dominio del broker
#define MQTT_PORT     1883
#define MQTT_USER     "usuario"        // <-- usuario MQTT
#define MQTT_PASS     "clave"          // <-- contrasena MQTT
