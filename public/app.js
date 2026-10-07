/* ===== CORE DATA ===== */
const TEAM = [
  { id:'uriel', name:'Uriel Aron Torres Salazar', short:'Uriel Torres', initials:'UT', role:'Líder / Edge AI', color:'var(--cyan)' },
  { id:'magaly', name:'Magaly Yulisa Mancha Vilca', short:'Magaly Mancha', initials:'MM', role:'Hardware / Periféricos', color:'var(--cyan2)' },
  { id:'paola', name:'Paola Ccarita Apaza', short:'Paola Ccarita', initials:'PC', role:'Redes IoT / MQTT', color:'var(--cyan)' },
  { id:'alexis', name:'Alexis Ramos Choque', short:'Alexis Ramos', initials:'AR', role:'IA / Firmware', color:'var(--cyan2)' },
  { id:'xavi', name:'Xavi Andre Canaza Viza', short:'Xavi Canaza', initials:'XC', role:'Pruebas / Docs', color:'var(--cyan)' }
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
  { title:'Arquitectura del Sistema', desc:'Diagrama Nodo Central ↔ Esclavos ↔ Broker MQTT.', tag:'Docs', img:'assets/images/architecture.png' },
  { title:'Esquema ESP32 — OLED I2C', desc:'Conexión SSD1306 SDA/SCL y alimentación 3.3V.', tag:'Hardware', img:'assets/images/wiring.png' }
];

let currentUser = null, db = null, auth = null, theme = 'dark';
const BASE_EVIDENCES = EVIDENCES.map(e => Object.assign({}, e));
let REMOTE_EVIDENCES = [];
let DELETED_TITLES = new Set();

function rebuildEvidences() {
  const seen = new Set();
  EVIDENCES = [...BASE_EVIDENCES, ...REMOTE_EVIDENCES].filter(e => {
    if (!e || !e.title || DELETED_TITLES.has(e.title) || seen.has(e.title)) return false;
    seen.add(e.title);
    return true;
  });
  renderEvidences();
}

function refreshEvidenceDeleteButtons() {
  const grid = document.getElementById('evidence-grid');
  if (grid) grid.classList.toggle('can-edit', !!currentUser);
  document.querySelectorAll('.evidence-card').forEach(card => {
    if (card.querySelector('.ev-del')) return;
    const b = document.createElement('button');
    b.className = 'ev-del';
    b.type = 'button';
    b.title = 'Eliminar evidencia';
    b.setAttribute('aria-label', 'Eliminar evidencia');
    b.textContent = '×';
    b.addEventListener('click', ev => { ev.stopPropagation(); deleteEvidence(card); });
    card.appendChild(b);
  });
}

function deleteEvidence(card) {
  if (!requireAuth()) return;
  const h4 = card.querySelector('h4');
  const title = h4 ? h4.textContent : '';
  if (!title || !confirm('¿Eliminar la evidencia "' + title + '"?')) return;
  const remote = REMOTE_EVIDENCES.find(r => r.title === title);
  if (db) {
    if (remote && remote._key) db.ref('evidences/' + remote._key).remove();
    db.ref('deletedEvidences').push({ title: title, by: currentUser.email, at: Date.now() });
  } else {
    DELETED_TITLES.add(title);
    EVIDENCES = EVIDENCES.filter(x => x.title !== title);
    renderEvidences();
  }
  toast('Evidencia eliminada');
}

// ===== TOAST =====
function toast(msg) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 3200);
}

// ===== RENDER FUNCTIONS =====
function renderGantt() {
  const body = document.getElementById('gantt-body');
  body.innerHTML = PHASES.map(p => {
    const left = ((p.start - 1) / 6) * 100;
    const width = ((p.end - p.start + 1) / 6) * 100;
    return `<div class="gantt-row"><div class="gantt-phase-name">${p.name}<small>${p.owners} · S${p.start}–S${p.end}</small></div><div class="gantt-track"><div class="gantt-bar" data-left="${left}" data-width="${width}"></div></div></div>`;
  }).join('');
  // Safe trigger - if elements exist, set their width
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bars = document.querySelectorAll('.gantt-bar');
    if (bars.length > 0) {
      bars.forEach(b => { b.style.left = b.dataset.left + '%'; b.style.width = b.dataset.width + '%'; });
    }
  }));
}

function renderKanban() {
  const cols = ['backlog','proceso','validacion','completado'];
  cols.forEach(c => {
    document.getElementById('col-'+c).innerHTML = '';
    const n = KANBAN_TASKS.filter(t => t.col === c).length;
    const badge = document.getElementById('count-'+c);
    if (badge) badge.textContent = n;
  });
  KANBAN_TASKS.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = !!currentUser;
    card.dataset.taskId = t.id;
    card.style.animationDelay = (i * 0.06) + 's';
    card.innerHTML = `<h4>${t.id} — ${t.title}</h4><div class="meta"><span class="assignee">${t.assignee}</span></div>`;
    if (!currentUser) card.style.cursor = 'default';
    document.getElementById('col-'+t.col).appendChild(card);
  });
  initDnD();
  updateKanbanFilterUI();
}

function renderTeam() {
  document.getElementById('team-grid').innerHTML = TEAM.map(m =>
    `<div class="team-card reveal visible"><div class="avatar">${m.initials}</div><h4>${m.short}</h4><p>${m.role}</p></div>`).join('');
  setTimeout(() => document.querySelectorAll('.team-card').forEach(el => el.classList.add('visible')), 100);
}

// ===== EVIDENCIAS: Drive / URLs / archivos =====
function driveId(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? (m[1] || m[2]) : null;
}

function evidenceMedia(e) {
  const raw = (e.img || '').trim();
  const id = driveId(raw);
  if (id) {
    return {
      kind: 'drive-image',
      thumb: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800',
      full: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600',
      link: 'https://drive.google.com/file/d/' + id + '/view'
    };
  }
  if (/\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(raw) || raw.startsWith('assets/') || raw.startsWith('data:image')) {
    return { kind: 'image', thumb: raw, full: raw, link: raw };
  }
  if (/^(https?:|blob:)/i.test(raw)) {
    return { kind: 'doc', thumb: null, full: null, link: raw };
  }
  return { kind: 'image', thumb: raw, full: raw, link: raw };
}

function renderEvidences() {
  const grid = document.getElementById('evidence-grid');
  grid.innerHTML = EVIDENCES.map((e0, i) => { const e = Object.assign({}, e0, evidenceMedia(e0)); return `
    <div class="evidence-card" data-full="${e.full || ''}" data-link="${e.link || ''}" style="animation-delay:${i*0.07}s">
      ${e.kind === 'doc' ? `<a class="evidence-doc" href="${e.link}" target="_blank" rel="noopener"><span class="doc-icon">DOC</span><span>Abrir documento</span></a>` : `<img class="evidence-thumb" src="${e.thumb}" alt="${e.title}" loading="lazy" onerror="this.closest('.evidence-card').querySelector('.evidence-fallback').style.display='flex';this.remove()">`}
      <div class="evidence-fallback" style="display:none"><a href="${e.link}" target="_blank" rel="noopener">Ver archivo</a></div>
      <div class="evidence-body"><h4>${e.title}</h4><p>${e.desc}</p><span class="evidence-tag">#${e.tag}</span>${e.by ? `<small class="evidence-by">· ${e.by.split('@')[0]}</small>` : ''}</div>
    </div>`; }).join('');
  document.querySelectorAll('.evidence-card').forEach(card => {
    card.addEventListener('click', ev => {
      if (ev.target.closest('a')) return;
      const full = card.getAttribute('data-full');
      const link = card.getAttribute('data-link');
      if (full) {
        let lb = document.getElementById('lightbox');
        if (!lb) {
          lb = document.createElement('div'); lb.id = 'lightbox'; lb.className = 'lightbox';
          lb.innerHTML = `<span class="lightbox-close">&times;</span><img src="" alt>`;
          document.body.appendChild(lb);
          lb.querySelector('.lightbox-close').addEventListener('click', () => lb.classList.remove('open'));
          lb.addEventListener('click', e2 => { if (e2.target === lb) lb.classList.remove('open'); });
        }
        lb.querySelector('img').src = full;
        lb.classList.add('open');
      } else if (link) {
        window.open(link, '_blank', 'noopener');
      }
    });
  });
  refreshEvidenceDeleteButtons();
}

// ===== KANBAN DnD + FILTROS =====
function initDnD() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    if (!currentUser) return;
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', card.dataset.taskId); card.style.opacity = '.5'; });
    card.addEventListener('dragend', () => { card.style.opacity = '1'; });
    card.addEventListener('click', () => openTaskModal(card.dataset.taskId));
  });
  document.querySelectorAll('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', e => { if (!currentUser) return; e.preventDefault(); col.style.background = 'rgba(0,255,255,.05)'; });
    col.addEventListener('dragleave', () => { col.style.background = ''; });
    col.addEventListener('drop', e => {
      if (!currentUser) return;
      e.preventDefault(); col.style.background = '';
      const taskId = e.dataTransfer.getData('text/plain');
      const newCol = col.id.replace('col-', '');
      const task = KANBAN_TASKS.find(t => t.id === taskId);
      if (task && task.col !== newCol) {
        task.col = newCol;
        if (db && currentUser) db.ref('tasks/' + taskId).set(task);
        renderKanban(); toast(taskId + ' movida');
      }
    });
  });
}

function kanbanMatches(t) {
  const q = (document.getElementById('kanban-search').value || '').toLowerCase();
  const f = document.getElementById('kanban-filter').value || '';
  if (f && t.assignee !== f) return false;
  if (q && !(t.id + ' ' + t.title + ' ' + t.assignee).toLowerCase().includes(q)) return false;
  return true;
}

function updateKanbanFilterUI() {
  const sel = document.getElementById('kanban-filter');
  if (sel && sel.options.length <= 1) {
    [...new Set(KANBAN_TASKS.map(t => t.assignee))].sort().forEach(a => {
      const o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o);
    });
  }
  let visible = 0;
  document.querySelectorAll('.kanban-card').forEach(card => {
    const t = KANBAN_TASKS.find(x => x.id === card.dataset.taskId);
    const show = t ? kanbanMatches(t) : true;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const empty = document.getElementById('kanban-empty');
  if (empty) empty.classList.toggle('hidden', visible > 0);
}

function initKanbanTools() {
  const s = document.getElementById('kanban-search');
  const f = document.getElementById('kanban-filter');
  if (s) s.addEventListener('input', updateKanbanFilterUI);
  if (f) f.addEventListener('change', updateKanbanFilterUI);
  const ex = document.getElementById('export-kanban');
  if (ex) ex.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(KANBAN_TASKS, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'kanban-aida.json'; a.click();
    URL.revokeObjectURL(a.href); toast('Kanban exportado');
  });
}

// ===== TASK MODAL (editar / eliminar, solo logueados) =====
function openTaskModal(taskId) {
  if (!requireAuth()) return;
  const t = KANBAN_TASKS.find(x => x.id === taskId);
  if (!t) return;
  document.getElementById('task-id').value = t.id;
  document.getElementById('task-title-input').value = t.title;
  const selA = document.getElementById('task-assignee');
  selA.innerHTML = TEAM.map(m => `<option value="${m.short}"${m.short === t.assignee ? ' selected' : ''}>${m.short}</option>`).join('');
  document.getElementById('task-col').value = t.col;
  document.getElementById('task-modal').classList.add('open');
}

function initTaskModal() {
  const modal = document.getElementById('task-modal');
  if (!modal) return;
  document.getElementById('task-close').addEventListener('click', () => closeModal(modal));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); });
  document.getElementById('task-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!requireAuth()) return;
    const id = document.getElementById('task-id').value;
    const t = KANBAN_TASKS.find(x => x.id === id);
    if (!t) return;
    t.title = document.getElementById('task-title-input').value.trim() || t.title;
    t.assignee = document.getElementById('task-assignee').value;
    t.col = document.getElementById('task-col').value;
    if (db) db.ref('tasks/' + id).set(t);
    closeModal(modal); renderKanban(); toast(id + ' actualizada');
  });
  document.getElementById('task-delete').addEventListener('click', () => {
    if (!requireAuth()) return;
    const id = document.getElementById('task-id').value;
    KANBAN_TASKS = KANBAN_TASKS.filter(x => x.id !== id);
    if (db) db.ref('tasks/' + id).remove();
    closeModal(modal); renderKanban(); toast(id + ' eliminada');
  });
}

// ===== EVIDENCE TOOLS (buscar / filtrar / vista) =====
function initEvidenceTools() {
  const s = document.getElementById('evidence-search');
  const f = document.getElementById('evidence-filter');
  const grid = document.getElementById('evidence-grid');
  const apply = () => {
    const q = (s.value || '').toLowerCase();
    const tag = f.value || '';
    if (f.options.length <= 1) {
      [...new Set(EVIDENCES.map(e => e.tag))].sort().forEach(t => {
        const o = document.createElement('option'); o.value = t; o.textContent = t; f.appendChild(o);
      });
    }
    document.querySelectorAll('.evidence-card').forEach(card => {
      const title = card.querySelector('h4').textContent.toLowerCase();
      const tg = (card.querySelector('.evidence-tag').textContent || '').replace('#', '');
      const show = (!tag || tg === tag) && (!q || title.includes(q));
      card.style.display = show ? '' : 'none';
    });
  };
  if (s) s.addEventListener('input', apply);
  if (f) f.addEventListener('change', apply);
  const gv = document.getElementById('evidence-grid-view');
  const lv = document.getElementById('evidence-list-view');
  if (gv) gv.addEventListener('click', () => { grid.style.gridTemplateColumns = ''; gv.setAttribute('aria-pressed', 'true'); lv.setAttribute('aria-pressed', 'false'); });
  if (lv) lv.addEventListener('click', () => { grid.style.gridTemplateColumns = '1fr'; lv.setAttribute('aria-pressed', 'true'); gv.setAttribute('aria-pressed', 'false'); });
}

// ===== PROGRESS =====
function setProgressUI(val) {
  const fill = document.querySelector('.progress-fill');
  const label = document.querySelector('.progress-label strong');
  if (fill) fill.style.width = val + '%';
  if (label) label.textContent = val + '%';
}

function initProgress() {
  setProgressUI(localStorage.getItem('aida_progress') || '35');
  const pb = document.getElementById('update-progress-btn');
  if (pb) {
    pb.addEventListener('click', () => {
      if (!currentUser) { toast('Inicia sesión para editar'); return; }
      const val = document.getElementById('progress-input').value;
      if (val !== '' && val >= 0 && val <= 100) {
        localStorage.setItem('aida_progress', val);
        setProgressUI(val);
        if (db && currentUser) db.ref('progress/global').set({ value: Number(val), by: currentUser.email, at: Date.now() });
        toast('Progreso actualizado: ' + val + '%');
      }
    });
  }
  // No initCharts() call anymore - avoids CSP errors
}

// ===== MODALES =====
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('open'));
  const f = m.querySelector('input, select, button.btn-primary');
  if (f) setTimeout(() => f.focus(), 120);
}
function closeModal(m) {
  if (typeof m === 'string') m = document.getElementById(m);
  if (!m) return;
  m.classList.remove('open');
  setTimeout(() => { m.hidden = true; }, 220);
}

// ===== AUTH =====
function requireAuth() {
  if (!currentUser) { openModal('auth-modal'); toast('Inicia sesión para editar'); return false; }
  return true;
}

function authError(msg) {
  const err = document.getElementById('auth-error');
  err.textContent = msg;
  err.classList.remove('shake');
  void err.offsetWidth;
  err.classList.add('shake');
}

function setAuthBtn(label, logged) {
  const b = document.getElementById('auth-btn');
  const s = b.querySelector('span');
  if (s) s.textContent = label; else b.textContent = label;
  b.classList.toggle('logged', !!logged);
}

function updateAuthUI() {
  const addEv = document.getElementById('add-evidence-btn');
  const hint = document.getElementById('evidence-hint');
  const status = document.getElementById('auth-status');
  const loggedOut = document.getElementById('auth-loggedout');
  const loggedIn = document.getElementById('auth-loggedin');
  if (currentUser) {
    setAuthBtn(currentUser.email.split('@')[0] + ' ●', true);
    document.getElementById('auth-btn').setAttribute('aria-expanded', 'false');
    if (addEv) addEv.classList.remove('hidden');
    if (hint) { hint.textContent = 'Sesión activa como ' + currentUser.email + '. Puedes subir evidencias.'; hint.classList.add('ok'); }
    if (status) status.textContent = 'Conectado: ' + currentUser.email;
    if (loggedOut) loggedOut.classList.add('hidden');
    if (loggedIn) loggedIn.classList.remove('hidden');
    const ue = document.getElementById('user-email');
    if (ue) ue.textContent = currentUser.email;
    const ua = document.getElementById('user-avatar');
    if (ua) ua.textContent = (currentUser.displayName || currentUser.email).trim().charAt(0).toUpperCase();
  } else {
    setAuthBtn('Iniciar sesión', false);
    if (addEv) addEv.classList.add('hidden');
    if (hint) { hint.textContent = 'Inicia sesión para subir nuevas evidencias.'; hint.classList.remove('ok'); }
    if (status) status.textContent = 'Modo lectura pública.';
    if (loggedOut) loggedOut.classList.remove('hidden');
    if (loggedIn) loggedIn.classList.add('hidden');
  }
  renderEvidences();
}

function initAuth() {
  const modal = document.getElementById('auth-modal');
  const authBtn = document.getElementById('auth-btn');

  const openAuth = () => {
    if (currentUser) { openModal('auth-modal'); return; }
    document.getElementById('auth-error').textContent = '';
    openModal('auth-modal');
    authBtn.setAttribute('aria-expanded', 'true');
  };
  authBtn.addEventListener('click', openAuth);
  document.getElementById('auth-close').addEventListener('click', () => { closeModal(modal); authBtn.setAttribute('aria-expanded', 'false'); });
  modal.addEventListener('click', e => { if (e.target === modal) { closeModal(modal); authBtn.setAttribute('aria-expanded', 'false'); } });
  document.getElementById('evidence-close').addEventListener('click', () => closeModal('evidence-modal'));
  document.getElementById('evidence-modal').addEventListener('click', e => { if (e.target.id === 'evidence-modal') closeModal('evidence-modal'); });
  document.getElementById('add-evidence-btn').addEventListener('click', () => {
    if (!requireAuth()) return;
    openModal('evidence-modal');
  });
  // Mostrar / ocultar contraseña
  document.getElementById('pass-toggle').addEventListener('click', () => {
    const p = document.getElementById('auth-pass');
    const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    document.getElementById('pass-toggle').textContent = show ? '🙈' : '👁';
  });
  document.getElementById('evidence-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!requireAuth()) return;
    const ev = {
      title: document.getElementById('ev-title').value.trim(),
      desc: document.getElementById('ev-desc').value.trim(),
      tag: document.getElementById('ev-tag').value.trim() || 'General',
      img: document.getElementById('ev-img').value.trim() || 'assets/images/render.png',
      by: currentUser.email, at: Date.now()
    };
    if (!ev.title) { toast('Pon un título'); return; }
    if (db) db.ref('evidences').push(ev);
    else { EVIDENCES.push(ev); renderEvidences(); }
    closeModal('evidence-modal');
    document.getElementById('evidence-form').reset();
    toast('Evidencia guardada');
  });

  // FIREBASE INIT - simplified, no Chart dependencies.
  // Guard anti-duplicado: firebase-config.js ya NO inicializa.
  if (typeof FIREBASE_ENABLED === 'undefined' || !FIREBASE_ENABLED || typeof firebase === 'undefined') {
    updateAuthUI(); return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  } catch (e) { console.warn('Firebase init:', e.message); updateAuthUI(); return; }
  auth = firebase.auth(); db = firebase.database();

  const setLoading = on => document.getElementById('auth-login').classList.toggle('loading', !!on);

  // Login con correo (submit del form: click + Enter, sin recargar)
  document.getElementById('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value;
    if (!email || !pass) { authError('Ingresa correo y contraseña.'); return; }
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      closeModal(modal);
      toast('Sesión iniciada');
    } catch (err2) {
      authError('No se pudo ingresar: ' + (err2.code === 'auth/invalid-credential' ? 'credenciales incorrectas.' : err2.message));
    } finally { setLoading(false); }
  });

  // Login con Google: solo popup. Si el navegador lo bloquea, se guía al
  // login con correo (el redirect falla en Firefox con storage particionado).
  let googleBusy = false;
  document.getElementById('auth-google').addEventListener('click', async () => {
    if (googleBusy) return;
    googleBusy = true; setLoading(true);
    try {
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      closeModal(modal);
      toast('Sesión iniciada con Google');
    } catch (e2) {
      if (e2.code === 'auth/popup-blocked') {
        authError('Tu navegador bloqueó la ventana de Google. Permite popups para este sitio o ingresa con tu correo institucional abajo.');
        document.getElementById('auth-email').focus();
      } else if (e2.code !== 'auth/popup-closed-by-user' && e2.code !== 'auth/cancelled-popup-request') {
        authError('Google: ' + e2.message);
      }
    } finally { googleBusy = false; setLoading(false); }
  });

  document.getElementById('auth-logout').addEventListener('click', async () => {
    await auth.signOut();
    closeModal(modal);
    toast('Sesión cerrada');
  });

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
      if (val) { KANBAN_TASKS = Object.values(val); renderKanban(); }
      else if (currentUser) { const o = {}; KANBAN_TASKS.forEach(t => o[t.id] = t); db.ref('tasks').set(o); }
    });
    db.ref('evidences').on('value', s => {
      const val = s.val();
      REMOTE_EVIDENCES = val ? Object.entries(val).map(([k, v]) => Object.assign({}, v, { _key: k })) : [];
      rebuildEvidences();
    });
    db.ref('deletedEvidences').on('value', s => {
      const val = s.val();
      DELETED_TITLES = new Set(val ? Object.values(val).map(d => d.title) : []);
      rebuildEvidences();
    });
  } catch(e) {}
}

// ===== EFFECTS =====
function initEffects() {
  setTimeout(() => document.getElementById('loader').classList.add('hide'), 600);
  
  const bar = document.getElementById('scroll-progress');
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    header.classList.toggle('scrolled', h.scrollTop > 10);
  }, { passive: true });

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count; let cur = 0;
    const step = Math.max(1, Math.round(target / 40));
    const t = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(t); } el.textContent = cur; }, 40);
    cio.unobserve(el);
  }), { threshold: 0.5 });
  counters.forEach(el => cio.observe(el));

  const tilt = document.querySelector('.tilt');
  if (tilt) {
    tilt.addEventListener('mousemove', e => {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(900px) rotateY(${x*10}deg) rotateX(${-y*10}deg)`;
    });
    tilt.addEventListener('mouseleave', () => tilt.style.transform = '');
  }

  const cv = document.getElementById('bg-canvas');
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, H, pts = [];
    const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    resize(); addEventListener('resize', resize);
    for (let i = 0; i < 55; i++) pts.push({ x: Math.random()*innerWidth, y: Math.random()*innerHeight, vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35 });
    (function loop() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 7);
        ctx.fillStyle = 'rgba(0,255,255,.35)'; ctx.fill();
      });
      requestAnimationFrame(loop);
    })();
  }

  // Theme toggle
  const html = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const moonIcon = document.querySelector('.icon-moon');
  const sunIcon = document.querySelector('.icon-sun');
  
  const savedTheme = localStorage.getItem('aida-theme');
  if (savedTheme) { theme = savedTheme; html.setAttribute('data-theme', theme); }
  else if (window.matchMedia('(prefers-color-scheme: light)').matches) { theme = 'light'; html.setAttribute('data-theme', theme); }
  
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    localStorage.setItem('aida-theme', theme);
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
    if (sunIcon) sunIcon.style.display = theme === 'light' ? 'block' : 'none';
  }
  
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
    if (sunIcon) sunIcon.style.display = theme === 'light' ? 'block' : 'none';
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.open,.lightbox.open').forEach(m => m.classList.remove('open')); });
}

// ===== CHART INIT REMOVED - no Chart.js to avoid CSP errors =====
// initCharts function removed completely to prevent:
// - EvalError: call to Function() blocked by CSP
// - MIME type mismatches from CDN Chart.js CSS
// - Blocking loading due to external script errors

// ===== KEYDOWN =====
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.open,.lightbox.open').forEach(m => m.classList.remove('open')); });

document.addEventListener('DOMContentLoaded', () => {
  renderGantt(); renderKanban(); renderTeam(); renderEvidences(); initProgress(); initAuth(); updateAuthUI(); initEffects(); initKanbanTools(); initTaskModal(); initEvidenceTools();
});
