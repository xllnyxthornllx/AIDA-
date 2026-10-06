const TEAM = [
  { id:'uriel', name:'Uriel Aron Torres Salazar', short:'Uriel Torres', initials:'UT', role:'Líder / Edge AI' },
  { id:'magaly', name:'Magaly Yulisa Mancha Vilca', short:'Magaly Mancha', initials:'MM', role:'Hardware / Periféricos' },
  { id:'paola', name:'Paola Ccarita Apaza', short:'Paola Ccarita', initials:'PC', role:'Redes IoT / MQTT' },
  { id:'alexis', name:'Alexis Ramos Choque', short:'Alexis Ramos', initials:'AR', role:'IA / Firmware' },
  { id:'xavi', name:'Xavi Andre Canaza Viza', short:'Xavi Canaza', initials:'XC', role:'Pruebas / Docs' }
];

const PHASES = [
  { id:1, name:'Fase 1: Diseño e Ingeniería Conceptual', owners:'Uriel y Magaly', start:1, end:2 },
  { id:2, name:'Fase 2: Desarrollo de Hardware y Periféricos', owners:'Alexis, Xavi, Uriel', start:2, end:3 },
  { id:3, name:'Fase 3: Redes e Infraestructura IoT', owners:'Paola, Alexis, Magaly', start:3, end:4 },
  { id:4, name:'Fase 4: Integración con IA y Automatización', owners:'Uriel, Magaly, Xavi', start:4, end:5 },
  { id:5, name:'Fase 5: Pruebas, Video y Documentación', owners:'Todo el equipo', start:5, end:6 }
];

const KANBAN_TASKS = [
  { id:'F1-01', title:'Levantamiento de Requerimientos', assignee:'Uriel Torres', col:'validacion' },
  { id:'F1-02', title:'Diagramas de Arquitectura', assignee:'Magaly Mancha', col:'completado' },
  { id:'F1-03', title:'Modelado Digital 3D de AIDA+', assignee:'Paola Ccarita', col:'proceso' },
  { id:'F2-01', title:'Firmware base ESP32 y FreeRTOS', assignee:'Alexis Ramos', col:'proceso' },
  { id:'F2-02', title:'Integración OLED SSD1306 y WS2812B', assignee:'Xavi Canaza', col:'backlog' },
  { id:'F3-02', title:'Configuración MQTT y Webhooks', assignee:'Paola Ccarita', col:'backlog' }
];

const EVIDENCES = [
  { title:'Render 3D — AIDA+', desc:'Modelo digital del asistente creado en Fusion 360.', tag:'Diseño', img:'assets/images/render.png' },
  { title:'Arquitectura del Sistema', desc:'Diagrama de bloques Nodo Central ↔ Nodos Esclavos ↔ Broker MQTT.', tag:'Docs', img:'assets/images/architecture.png' },
  { title:'Esquema ESP32 — OLED I2C', desc:'Conexión SSD1306 SDA/SCL y alimentación 3.3V.', tag:'Hardware', img:'assets/images/wiring.png' }
];

function renderGantt() {
  const body = document.getElementById('gantt-body');
  body.innerHTML = PHASES.map(p => {
    const left = ((p.start - 1) / 6) * 100;
    const width = ((p.end - p.start + 1) / 6) * 100;
    return `
      <div class="gantt-row">
        <div class="gantt-phase-name">${p.name}<small>${p.owners}</small></div>
        <div class="gantt-track"><div class="gantt-bar" style="left:${left}%; width:${width}%"></div></div>
      </div>`;
  }).join('');
}

function renderKanban() {
  ['backlog','proceso','validacion','completado'].forEach(c => {
    document.getElementById('col-'+c).innerHTML = '';
  });
  KANBAN_TASKS.forEach(t => {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.innerHTML = `<h4>${t.id} — ${t.title}</h4><div class="meta"><span class="assignee">${t.assignee}</span></div>`;
    document.getElementById('col-'+t.col).appendChild(card);
  });
}

function renderTeam() {
  document.getElementById('team-grid').innerHTML = TEAM.map(m => `
    <div class="team-card">
      <div class="avatar">${m.initials}</div>
      <h4>${m.short}</h4>
      <p>${m.role}</p>
    </div>`).join('');
}

function renderEvidences() {
  const grid = document.getElementById('evidence-grid');
  grid.innerHTML = EVIDENCES.map(e => `
    <div class="evidence-card" data-full="${e.img}">
      <img class="evidence-thumb" src="${e.img}" alt="${e.title}" loading="lazy">
      <div class="evidence-body">
        <h4>${e.title}</h4>
        <p>${e.desc}</p>
        <span class="evidence-tag">#${e.tag}</span>
      </div>
    </div>`).join('');

  // Lightbox
  document.querySelectorAll('.evidence-card').forEach(card => {
    card.addEventListener('click', () => {
      const img = card.getAttribute('data-full');
      let lb = document.getElementById('lightbox');
      if (!lb) {
        lb = document.createElement('div');
        lb.id = 'lightbox';
        lb.className = 'lightbox';
        lb.innerHTML = `<span class="lightbox-close">&times;</span><img src="" alt="">`;
        document.body.appendChild(lb);
        lb.querySelector('.lightbox-close').addEventListener('click', () => lb.classList.remove('open'));
        lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });
      }
      lb.querySelector('img').src = img;
      lb.classList.add('open');
    });
  });
}

// ===== PROGRESS LOCALSTORAGE =====
function initProgress() {
  const saved = localStorage.getItem('aida_progress');
  if (saved) {
    document.querySelector('.progress-fill').style.width = saved + '%';
    document.querySelector('.progress-label strong').textContent = saved + '%';
  }
  const btn = document.getElementById('update-progress-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const val = document.getElementById('progress-input').value;
      if (val >= 0 && val <= 100) {
        localStorage.setItem('aida_progress', val);
        document.querySelector('.progress-fill').style.width = val + '%';
        document.querySelector('.progress-label strong').textContent = val + '%';
      }
    });
  }
}

function initDnD() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain','card'); card.style.opacity = '.5'; });
    card.addEventListener('dragend', () => card.style.opacity = '1');
  });
  document.querySelectorAll('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.style.background='rgba(0,255,255,.04)'; });
    col.addEventListener('dragleave', () => col.style.background='');
    col.addEventListener('drop', e => {
      e.preventDefault(); col.style.background='';
      const dragged = document.querySelector('.kanban-card[style*="opacity: 0.5"]');
      if (dragged) col.appendChild(dragged);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderGantt(); renderKanban(); renderTeam(); renderEvidences(); initDnD(); initProgress();
});
