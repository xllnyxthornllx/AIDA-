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

// Chart instances
let phaseChart = null;
let weeklyChart = null;

// State
let currentUser = null, db = null, auth = null, theme = 'dark';

// ===== TOAST =====
function toast(msg) {
  const c = document.getElementById('toast-container');
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
  // Trigger animation
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.gantt-bar').forEach(b => { b.style.left = b.dataset.left + '%'; b.style.width = b.dataset.width + '%'; });
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
  // Render cards with stagger
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
  // Trigger reveal
  setTimeout(() => document.querySelectorAll('.team-card').forEach(el => el.classList.add('visible')), 100);
}

function renderEvidences() {
  const grid = document.getElementById('evidence-grid');
  grid.innerHTML = EVIDENCES.map((e, i) => `
    <div class="evidence-card" data-full="${e.img}" style="animation-delay:${i*0.07}s">
      <img class="evidence-thumb" src="${e.img}" alt="${e.title}" loading="lazy" onerror="this.style.display='none'>
      <div class="evidence-body"><h4>${e.title}</h4><p>${e.desc}</p><span class="evidence-tag">#${e.tag}</span></div>
    </div>`).join('');
  // Lightbox init
  document.querySelectorAll('.evidence-card').forEach(card => {
    card.addEventListener('click', e => {
      e.stopPropagation();
      const img = card.getAttribute('data-full');
      if (!img) return;
      let lb = document.getElementById('lightbox');
      if (!lb) {
        lb = document.createElement('div'); lb.id = 'lightbox'; lb.className = 'lightbox';
        lb.innerHTML = `<span class="lightbox-close">&times;</span><img src="" alt>`;
        document.body.appendChild(lb);
        lb.querySelector('.lightbox-close').addEventListener('click', () => lb.classList.remove('open'));
        lb.addEventListener('click', ev => { if (ev.target === lb) lb.classList.remove('open'); });
      }
      lb.querySelector('img').src = img;
      lb.classList.add('open');
    });
  });
}

// ===== PROGRESS =====
function setProgressUI(val) {
  const fill = document.querySelector('.progress-fill');
  const label = document.querySelector('.progress-label strong');
  if (fill) fill.style.width = val + '%';
  if (label) label.textContent = val + '%';
  // Update chart if exists
  if (weeklyChart) weeklyChart.data.datasets[0].data = [val, 100-val];
  if (weeklyChart) weeklyChart.update();
}

function initProgress() {
  setProgressUI(localStorage.getItem('aida_progress') || '35');
  document.getElementById('update-progress-btn').addEventListener('click', () => {
    if (!currentUser) { toast('Inicia sesión para editar'); return; }
    const val = document.getElementById('progress-input').value;
    if (val !== '' && val >= 0 && val <= 100) {
      localStorage.setItem('aida_progress', val);
      setProgressUI(val);
      if (db && currentUser) db.ref('progress/global').set({ value: Number(val), by: currentUser.email, at: Date.now() });
      toast('Progreso actualizado: ' + val + '%');
    }
  });
  // Initialize chart after DOM is ready
  setTimeout(initCharts, 200);
}

// ===== AUTH =====
function requireAuth() {
  if (!currentUser) { document.getElementById('auth-modal').classList.add('open'); toast('Inicia sesión para editar'); return false; }
  return true;
}

function updateAuthUI() {
  const btn = document.getElementById('auth-btn');
  const addEv = document.getElementById('add-evidence-btn');
  const hint = document.getElementById('evidence-hint');
  const status = document.getElementById('auth-status');
  const logoutBtn = document.getElementById('auth-logout');
  if (currentUser) {
    btn.textContent = currentUser.email.split('@')[0] + ' ●'; btn.classList.add('logged');
    if (addEv) addEv.classList.remove('hidden');
    if (hint) { hint.textContent = 'Sesión activa como ' + currentUser.email + '. Puedes subir evidencias.'; hint.classList.add('ok'); }
    if (status) status.textContent = 'Conectado: ' + currentUser.email;
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    btn.textContent = 'Iniciar sesión'; btn.classList.remove('logged');
    if (addEv) addEv.classList.add('hidden');
    if (hint) { hint.textContent = 'Inicia sesión para subir nuevas evidencias.'; hint.classList.remove('ok'); }
    if (status) status.textContent = theme === 'dark' ? 'Modo lectura pública.' : 'Modo lectura pública.';
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
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
    if (!e.title) { toast('Pon un título'); return; }
    if (db) db.ref('evidences').push(e);
    else { EVIDENCES.push(e); renderEvidences(); }
    document.getElementById('evidence-modal').classList.remove('open');
    toast('Evidencia guardada');
  });

  if (!FIREBASE_ENABLED || typeof firebase === 'undefined') { updateAuthUI(); return; }
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth(); db = firebase.database();

  document.getElementById('auth-login').addEventListener('click', async () => {
    const err = document.getElementById('auth-error'); err.textContent = '';
    try {
      await auth.signInWithEmailAndPassword(document.getElementById('auth-email').value.trim(), document.getElementById('auth-pass').value);
      modal.classList.remove('open'); toast('Sesión iniciada');
    } catch(e) { err.textContent = 'Error: ' + e.message; }
  });
  document.getElementById('auth-google').addEventListener('click', async () => {
    const err = document.getElementById('auth-error');
    try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); modal.classList.remove('open'); toast('Sesión iniciada'); }
    catch(e) { err.textContent = 'Error: ' + e.message; }
  });
  document.getElementById('auth-logout').addEventListener('click', () => { auth.signOut(); toast('Sesión cerrada'); });
  auth.onAuthStateChanged(user => { currentUser = user; updateAuthUI(); if (user) subscribeDB(); });
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
      if (val) {
        const base = EVIDENCES.slice(0, 3);
        const seen = new Set(base.map(e => e.title));
        Object.values(val).forEach(e => { if (!seen.has(e.title)) base.push(e); });
        EVIDENCES = base; renderEvidences();
      }
    });
  } catch(e) {}
}

// ===== EFFECTS =====
function initEffects() {
  // Loader hide
  setTimeout(() => document.getElementById('loader').classList.add('hide'), 600);
  
  // Scroll progress bar
  const bar = document.getElementById('scroll-progress');
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    header.classList.toggle('scrolled', h.scrollTop > 10);
  }, { passive: true });

  // Intersection Observer for reveal animations
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Counter animation
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count; let cur = 0;
    const step = Math.max(1, Math.round(target / 40));
    const t = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(t); } el.textContent = cur; }, 40);
    cio.unobserve(el);
  }), { threshold: 0.5 });
  counters.forEach(el => cio.observe(el));

  // Tilt effect on hero card
  const tilt = document.querySelector('.tilt');
  if (tilt) {
    tilt.addEventListener('mousemove', e => {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(900px) rotateY(${x*10}deg) rotateX(${-y*10}deg)`;
    });
    tilt.addEventListener('mouseleave', () => tilt.style.transform = '');
  }

  // Background particles canvas
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
  
  // Check for saved theme or preferred scheme
  const savedTheme = localStorage.getItem('aida-theme');
  if (savedTheme) {
    theme = savedTheme;
    html.setAttribute('data-theme', theme);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    theme = 'light';
    html.setAttribute('data-theme', theme);
  }
  
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    localStorage.setItem('aida-theme', theme);
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
    if (sunIcon) sunIcon.style.display = theme === 'light' ? 'block' : 'none';
  }
  
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
    // Update icons based on current theme
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
    if (sunIcon) sunIcon.style.display = theme === 'light' ? 'block' : 'none';
  }

  // Toast close on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.open,.lightbox.open').forEach(m => m.classList.remove('open')); });
}

// ===== CHART INIT =====
function initCharts() {
  // Phases chart
  const phaseCtx = document.getElementById('phase-chart')?.getContext('2d');
  if (phaseCtx) {
    phaseChart = new Chart(phaseCtx, {
      type: 'bar',
      data: {
        labels: PHASES.map(p => p.name.split(' ')[1] + ' ' + p.name.split(' ')[2]),
        datasets: [{
          label: 'Progreso (%)',
          data: PHASES.map(p => Math.round((p.end - p.start + 1) / 6 * 100)),
          backgroundColor: PHASES.map(p => p.color || var(--cyan)),
          borderColor: PHASES.map(p => p.color || var(--cyan)).map(c => c.rgb),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: var(--surface), titleColor: var(--text), bodyColor: var(--text) }
        },
        scales: {
          y: { display: false, beginAtZero: true, max: 100 }
        }
      }
    });
  }

  // Weekly progress chart
  const weeklyCtx = document.getElementById('weekly-progress')?.getContext('2d');
  if (weeklyCtx) {
    const initialProgress = parseFloat(localStorage.getItem('aida_progress') || '35');
    weeklyChart = new Chart(weeklyCtx, {
      type: 'doughnut',
      data: {
        labels: ['Avance', 'Restante'],
        datasets: [{
          data: [initialProgress, 100 - initialProgress],
          backgroundColor: [var(--cyan), var(--muted)],
          borderColor: [var(--cyan2), var(--border)],
          borderWidth: 2
        }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { backgroundColor: var(--surface), titleColor: var(--text), bodyColor: var(--text) }
        }
      }
    });
  }
}

// ===== KEYDOWN =====
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.open,.lightbox.open').forEach(m => m.classList.remove('open')); });

document.addEventListener('DOMContentLoaded', () => {
  renderGantt(); renderKanban(); renderTeam(); renderEvidences(); initProgress(); initAuth(); updateAuthUI(); initCharts(); initEffects();
});