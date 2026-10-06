// AIDA+ — Hito N° 2: Plan de Trabajo y Cronograma

const TEAM = [
  { id: 'uriel', name: 'Uriel Aron Torres Salazar', short: 'Uriel Torres', initials: 'UT', role: 'Líder / Edge AI' },
  { id: 'magaly', name: 'Magaly Yulisa Mancha Vilca', short: 'Magaly Mancha', initials: 'MM', role: 'Hardware' },
  { id: 'paola', name: 'Paola Ccarita Apaza', short: 'Paola Ccarita', initials: 'PC', role: 'Redes IoT' },
  { id: 'alexis', name: 'Alexis Ramos Choque', short: 'Alexis Ramos', initials: 'AR', role: 'IA / Firmware' },
  { id: 'xavi', name: 'Xavi Andre Canaza Viza', short: 'Xavi Canaza', initials: 'XC', role: 'Documents' }
];

const PHASES = [
  { id: 1, name: 'Fase 1: Diseño e Ingeniería Conceptual', owners: 'Uriel y Magaly', startWeek: 1, endWeek: 2 },
  { id: 2, name: 'Fase 2: Desarrollo de Hardware y Periféricos', owners: 'Alexis, Xavi, Uriel', startWeek: 2, endWeek: 3 },
  { id: 3, name: 'Fase 3: Redes e Infraestructura IoT', owners: 'Paola, Alexis, Magaly', startWeek: 3, endWeek: 4 },
  { id: 4, name: 'Fase 4: Integración con IA y Automatización', owners: 'Uriel, Magaly, Xavi', startWeek: 4, endWeek: 5 },
  { id: 5, name: 'Fase 5: Pruebas, Video y Documentación', owners: 'Todo el equipo', startWeek: 5, endWeek: 6 }
];

const KANBAN_TASKS = [
  { id: 'F1-01', title: 'Levantamiento de Requerimientos', assignee: 'Uriel Torres', column: 'validacion' },
  { id: 'F1-02', title: 'Diagramas de Arquitectura', assignee: 'Magaly Mancha', column: 'completado' },
  { id: 'F1-03', title: 'Modelado Digital 3D de AIDA+', assignee: 'Paola Ccarita', column: 'proceso' },
  { id: 'F2-01', title: 'Firmware base ESP32 y FreeRTOS', assignee: 'Alexis Ramos', column: 'proceso' },
  { id: 'F2-02', title: 'Integración OLED SSD1306 y WS2812B', assignee: 'Xavi Canaza', column: 'backlog' },
  { id: 'F3-02', title: 'Configuración MQTT y Webhooks', assignee: 'Paola Ccarita', column: 'backlog' }
];

// ===== RENDER GANTT =====
function renderGantt() {
  const body = document.getElementById('gantt-body');
  body.innerHTML = PHASES.map(p => {
    const startPct = ((p.startWeek - 1) / 6) * 100;
    const widthPct = ((p.endWeek - p.startWeek + 1) / 6) * 100;
    return `
      <div class="gantt-row">
        <div class="gantt-phase-name">
          ${p.name}
          <small>${p.owners}</small>
        </div>
        <div class="gantt-bar-track">
          <div class="gantt-bar" style="left:${startPct}%; width:${widthPct}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ===== RENDER KANBAN =====
function renderKanban() {
  const columns = { backlog: 'col-backlog', proceso: 'col-proceso', validacion: 'col-validacion', completado: 'col-completado' };
  Object.values(columns).forEach(id => {
    document.getElementById(id).innerHTML = '';
  });

  KANBAN_TASKS.forEach(task => {
    const target = document.getElementById(columns[task.column]);
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.innerHTML = `
      <h4>${task.id} — ${task.title}</h4>
      <div class="meta">
        <span class="assignee">${task.assignee}</span>
      </div>`;
    target.appendChild(card);
  });
}

// ===== RENDER TEAM =====
function renderTeam() {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = TEAM.map(member => `
    <div class="team-card">
      <div class="avatar">${member.initials}</div>
      <h4>${member.short}</h4>
      <p>${member.role}</p>
    </div>
  `).join('');
}

// ===== DRAG & DROP KANBAN =====
function initDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.column-cards');

  cards.forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.id || card.querySelector('h4').textContent);
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => { card.style.opacity = '1'; });
  });

  columns.forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.style.background = '#2a2a2a'; });
    col.addEventListener('dragleave', () => { col.style.background = ''; });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.style.background = '';
      const dragged = document.querySelector('.kanban-card[style*="opacity: 0.5"]');
      if (dragged) col.appendChild(dragged);
    });
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderGantt();
  renderKanban();
  renderTeam();
  initDragAndDrop();
});
