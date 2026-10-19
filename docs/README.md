# 📓 Documentación AIDA+ (Vault Obsidian)

Documentación técnica completa del portal **AIDA+ — Hito N° 2** en formato **Obsidian**.

## Cómo abrir

1. Abre **Obsidian** → *Abrir carpeta como bóveda*.
2. Selecciona esta carpeta (`AIDA+/docs`).
3. Empieza por **`00 - Inicio (MOC).md`**.

## Requisitos

- **Obsidian** con soporte de **Mermaid** (incluido por defecto).
- Opcional: plugins *Dataview*, *Kanban*, *Excalidraw* para más vistas.

## Contenido

| Nota | Tema |
|---|---|
| `00 - Inicio (MOC)` | Índice / mapa de contenido |
| `01 - Arquitectura General` | Sistema, stack, flujo de datos |
| `02 - Gemelo Digital (FSM)` | Máquina de estados y animaciones |
| `03 - Autenticación Firebase` | Auth, reglas, usuarios |
| `04 - Evidencias y Google Drive` | Subida a Drive, scope, bugs |
| `05 - Kanban y Gantt` | Tablero y cronograma |
| `06 - Deploy (Vercel)` | CI/CD y cache-busting |
| `07 - Estructura de Archivos` | Árbol y responsabilidades |
| `08 - Historial de Versiones` | Bitácora v1 → v16 |
| `09 - Troubleshooting` | Errores y soluciones |
| `10 - Backlog y Pendientes` | Roadmap y bugs |

## Diagramas

Todas las notas usan **Mermaid** (`flowchart`, `sequenceDiagram`, `stateDiagram-v2`,
`gantt`, `mindmap`, `timeline`) para esquemas visuales.

## Notas sobre secretos

Los valores sensibles aparecen como `${VARIABLE}` — nunca en claro.
Ver `public/firebase-config.js` para el valor real local.
