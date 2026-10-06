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

let KANBAN_TASKS = [
  { id:'F1-01', title:'Levantamiento de Requerimientos', assignee:'Uriel Torres', col:'validacion' },
  { id:'F1-02', title:'Diagramas de Arquitectura', assignee:'Magaly Mancha', col:'completado' },
  { id:'F1-03', title:'Modelado Digital 3D de AIDA+', assignee:'Paola Ccarita', col:'proceso' },
  { id:'F2-01', title:'Firmware base ESP32 y FreeRTOS', assignee:'Alexis Ramos', col:'proceso' },
  { id:'F2-02', title:'Integración OLED SSD1306 y WS2812B', assignee:'Xavi Canaza', col:'backlog' },
  { id:'F3-02', title:'Configuración MQTT y Webhooks', assignee:'Paola Ccarita', col:'backlog' }
];

let EVIDENCES = [
  { title:'Render 3D — AIDA+', desc:'Modelo digital del asistente creado en Fusion 360.', tag:'Diseño', img:'assets/images/render.png' },
  { title:'Arquitectura del Sistema', desc:'Diagrama de bloques Nodo Central ↔ Nodos Esclavos ↔ Broker MQTT.', tag:'Docs', img:'assets/images/architecture.png' },
  { title:'Esquema ESP32 — OLED I2C', desc:'Conexión SSD1306 SDA/SCL y alimentación 3.3V.', tag:'Hardware', img:'assets/images/wiring.png' }
];

let currentUser = null;
let db = null;
let auth = null;

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
    card.draggable = !!currentUser;
    card.dataset.taskId = t.id;
    card.innerHTML = `<h4>${t.id} — ${t.title}</h4><div class="meta"><span class="assignee">${t.assignee}</span></div>`;
    if (!currentUser) card.style.cursor = 'default';
    document.getElementById('col-'+t.col).appendChild(card);
  });
  initDnD();
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
      <img class="evidence-thumb" src="${e.img}" alt="${e.title}" loading="lazy" onerror="this.style.display='none'">
      <div class="evidence-body">
        <h4>${e.title}</h4>
        <p>${e.desc}</p>
        <span class="evidence-tag">#${e.tag}</span>
      </div>
    </div>`).join('');

  document.querySelectorAll('.evidence-card').forEach(card => {
    card.addEventListener('click', () => {
      const img = card.getAttribute('data-full');
      if (!img || img.includes('PEGA')) return;
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

function initProgress() {
  const saved = localStorage.getItem('aida_progress') || '35';
  setProgressUI(saved);
  const btn = document.getElementById('update-progress-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!requireAuth()) return;
      const val = document.getElementById('progress-input').value;
      if (val >= 0 && val <= 100 && val !== '') {
        localStorage.setItem('aida_progress', val);
        setProgressUI(val);
        if (db && currentUser) db.ref('progress/global').set({ value: Number(val), by: currentUser.email, at: Date.now() });
      }
    });
  }
  if (db) {
    try { db.ref('progress/global').on('value', s => { const v = s.val(); if (v && v.value != null) setProgressUI(String(v.value)); }); } catch(e) {}
  }
}

function setProgressUI(val) {
  const fill = document.querySelector('.progress-fill');
  const label = document.querySelector('.progress-label strong');
  if (fill) fill.style.width = val + '%';
  if (label) label.textContent = val + '%';
}

function requireAuth() {
  if (!currentUser) {
    document.getElementById('auth-modal').classList.add('open');
    return false;
  }
  return true;
}

function initDnD() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    if (!currentUser) return;
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', card.dataset.taskId); card.style.opacity = '.5'; });
    card.addEventListener('dragend', () => card.style.opacity = '1');
  });
  document.querySelectorAll('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', e => { if (!currentUser) return; e.preventDefault(); col.style.background='rgba(0,255,255,.04)'; });
    col.addEventListener('dragleave', () => col.style.background='');
    col.addEventListener('drop', e => {
      if (!currentUser) return;
      e.preventDefault(); col.style.background='';
      const taskId = e.dataTransfer.getData('text/plain');
      const newCol = col.id.replace('col-','');
      const task = KANBAN_TASKS.find(t => t.id === taskId);
      if (task) {
        task.col = newCol;
        if (db && currentUser) db.ref('tasks/' + taskId).set(task);
        renderKanban();
      }
    });
  });
}

function updateAuthUI() {
  const btn = document.getElementById('auth-btn');
  const addEv = document.getElementById('add-evidence-btn');
  const hint = document.getElementById('evidence-hint');
  const status = document.getElementById('auth-status');
  const logoutBtn = document.getElementById('auth-logout');
  if (currentUser) {
    btn.textContent = currentUser.email.split('@')[0] + ' ●';
    btn.classList.add('logged');
    if (addEv) addEv.classList.remove('hidden');
    if (hint) { hint.textContent = 'Sesión activa como ' + currentUser.email + '. Puedes subir evidencias.'; hint.classList.add('ok'); }
    if (status) status.textContent = 'Conectado: ' + currentUser.email;
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    btn.textContent = 'Iniciar sesión';
    btn.classList.remove('logged');
    if (addEv) addEv.classList.add('hidden');
    if (hint) { hint.textContent = 'Inicia sesión para subir nuevas evidencias.'; hint.classList.remove('ok'); }
    if (status) status.textContent = FIREBASE_ENABLED ? 'Modo lectura pública.' : 'Firebase no configurado: pega tu apiKey en firebase-config.js';
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
  renderKanban();
}

function initAuth() {
  const modal = document.getElementById('auth-modal');
  document.getElementById('auth-btn').addEventListener('click', () => modal.classList.add('open'));
  document.getElementById('auth-close').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

  document.getElementById('evidence-close').addEventListener('click', () => document.getElementById('evidence-modal').classList.remove('open'));
  document.getElementById('add-evidence-btn').addEventListener('click', () => {
    if (!requireAuth()) return;
    document.getElementById('evidence-modal').classList.add('open');
  });

  document.getElementById('ev-save').addEventListener('click', () => {
    if (!requireAuth()) return;
    const e = {
      title: document.getElementById('ev-title').value.trim(),
      desc: document.getElementById('ev-desc').value.trim(),
      tag: document.getElementById('ev-tag').value.trim() || 'General',
      img: document.getElementById('ev-img').value.trim() || 'assets/images/render.png',
      by: currentUser.email, at: Date.now()
    };
    if (!e.title) return;
    if (db && currentUser) {
      db.ref('evidences').push(e);
    } else {
      EVIDENCES.push(e);
      renderEvidences();
    }
    document.getElementById('evidence-modal').classList.remove('open');
  });

  if (!FIREBASE_ENABLED || typeof firebase === 'undefined') {
    updateAuthUI();
    return;
  }

  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.database();

  document.getElementById('auth-login').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value;
    const err = document.getElementById('auth-error');
    err.textContent = '';
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      modal.classList.remove('open');
    } catch (e) { err.textContent = 'Error: ' + e.message; }
  });

  document.getElementById('auth-google').addEventListener('click', async () => {
    const err = document.getElementById('auth-error');
    try {
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      modal.classList.remove('open');
    } catch (e) { err.textContent = 'Error: ' + e.message; }
  });

  document.getElementById('auth-logout').addEventListener('click', () => auth.signOut());

  auth.onAuthStateChanged(user => {
    currentUser = user;
    updateAuthUI();
    if (user) subscribeDB();
  });

  subscribeDB();
}

function subscribeDB() {
  if (!db) return;
  try {
    db.ref('tasks').on('value', s => {
      const val = s.val();
      if (val) {
        KANBAN_TASKS = Object.values(val);
        renderKanban();
      } else if (currentUser) {
        const obj = {};
        KANBAN_TASKS.forEach(t => obj[t.id] = t);
        db.ref('tasks').set(obj);
      }
    });
    db.ref('evidences').on('value', s => {
      const val = s.val();
      if (val) {
        const remote = Object.values(val);
        EVIDENCES = [...EVIDENCES.slice(0,3), ...remote];
        renderEvidences();
      }
    });
  } catch(e) { console.warn('RTDB offline', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  renderGantt(); renderKanban(); renderTeam(); renderEvidences(); initProgress(); initAuth(); updateAuthUI();
});
