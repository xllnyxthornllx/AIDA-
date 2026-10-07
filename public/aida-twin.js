/* ===== AIDA+ DIGITAL TWIN — FSM + telemetría simulada (ES6 aislado) =====
   Uso:  const twin = new AidaDigitalTwin(document.getElementById('aida-twin-mount'));
         twin.setState('listening'); twin.onState(s => ...); twin.startAuto();
   Se expone como window.AidaTwin para telemetría real futura (MQTT/WebSocket). */

(function () {
  'use strict';

  const STATES = {
    idle:       { label: 'IDLE',       aria: 'AIDA+ en reposo: halo cian respirando, ojos parpadeando', glow: 'rgba(0,255,255,.14)' },
    listening:  { label: 'LISTENING',  aria: 'AIDA+ escuchando: ojos hacia arriba, oreja radar desplegada, ondas convergen al micrófono', glow: 'rgba(0,85,255,.16)' },
    processing: { label: 'PROCESSING', aria: 'AIDA+ procesando: halo violeta rotando, OLED cargando', glow: 'rgba(176,38,255,.16)' },
    speaking:   { label: 'SPEAKING',   aria: 'AIDA+ hablando: halo verde agua pulsante, OLED en modo feliz', glow: 'rgba(0,255,136,.15)' }
  };
  const ORDER = ['idle', 'listening', 'processing', 'speaking'];
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class AidaDigitalTwin {
    constructor(mount, opts) {
      if (!mount) throw new Error('AidaDigitalTwin: mount requerido');
      this.mount = mount;
      this.opts = Object.assign({ auto: true, interval: 5000 }, opts || {});
      this.state = 'idle';
      this.listeners = new Set();
      this.timer = null;
      this.render();
      this.setState('idle', { silent: true });
      this.paint(true);
      if (this.opts.auto && !REDUCED) this.startAuto();
    }

    render() {
      this.mount.innerHTML =
        '<div class="aida-node" data-state="idle" role="img" aria-label="' + STATES.idle.aria + '">' +
          '<div class="aida-halo" aria-hidden="true"><i class="h-ring"></i><i class="h-sweep"></i><i class="h-spin"></i><i class="h-core"></i><div class="aida-waves"><i></i><i></i><i></i></div></div>' +
          '<div class="aida-chassis">' +
            '<div class="aida-ear" aria-hidden="true"><div class="dish"></div><div class="sig"><i></i><i></i><i></i></div></div>' +
            '<div class="aida-glass"><div class="aida-oled">' +
              '<div class="oled-eyes"><i class="eye left"></i><i class="eye right"></i></div>' +
              '<div class="oled-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
              '<div class="oled-mouth" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
              '<div class="oled-load" aria-hidden="true"><i></i></div>' +
              '<div class="oled-scanline" aria-hidden="true"></div>' +
              '<div class="oled-scan"></div>' +
            '</div><div class="aida-glare"></div></div>' +
            '<div class="aida-base"><span class="aida-state-dot" aria-hidden="true"></span>' +
            '<span class="aida-state-label">IDLE</span><span class="aida-spec">SSD1306 · 128×64</span></div>' +
          '</div>' +
          '<div class="aida-reflect" aria-hidden="true"></div>' +
          '<div class="aida-controls" role="group" aria-label="Simular estado del nodo AIDA+">' +
            ORDER.map(s => '<button type="button" class="aida-btn" data-aida-state="' + s + '" aria-pressed="' + (s === 'idle') + '">' + STATES[s].label + '</button>').join('') +
            '<button type="button" class="aida-btn aida-auto" data-aida-auto="1" aria-pressed="' + (!!this.opts.auto && !REDUCED) + '">AUTO ' + (!!this.opts.auto && !REDUCED ? '●' : '○') + '</button>' +
          '</div>' +
          '<p class="aida-caption" aria-live="polite">Gemelo digital · <code>WS2812B</code> + <code>OLED</code> · <span data-aida-hint>respiración cian</span></p>' +
        '</div>';
      this.node = this.mount.querySelector('.aida-node');
      this.labelEl = this.mount.querySelector('.aida-state-label');
      this.hintEl = this.mount.querySelector('[data-aida-hint]');
      this.mount.querySelectorAll('[data-aida-state]').forEach(b =>
        b.addEventListener('click', () => { this.stopAuto(); this.setState(b.dataset.aidaState); this.paintAutoBtn(); }));
      this.autoBtn = this.mount.querySelector('[data-aida-auto]');
      this.autoBtn.addEventListener('click', () => {
        if (this.timer) { this.stopAuto(); } else { this.startAuto(); }
        this.paintAutoBtn();
      });
    }

    isValid(s) { return Object.prototype.hasOwnProperty.call(STATES, s); }

    setState(next, opts) {
      if (!this.isValid(next)) return false;
      const prev = this.state;
      this.state = next;
      this.node.dataset.state = next;
      this.node.setAttribute('aria-label', STATES[next].aria);
      this.labelEl.textContent = STATES[next].label;
      if (this.hintEl) this.hintEl.textContent = STATES[next].aria.split(':')[1].trim();
      this.mount.querySelectorAll('[data-aida-state]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.aidaState === next)));
      // Reflejo sutil en Kanban: el halo tiñe los bordes de las tarjetas
      document.documentElement.style.setProperty('--aida-glow', STATES[next].glow);
      if (!(opts && opts.silent) && prev !== next) this.emit(next, prev);
      return true;
    }

    onState(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(next, prev) { this.listeners.forEach(fn => { try { fn(next, prev); } catch (e) {} }); }

    startAuto() {
      this.stopAuto();
      let i = ORDER.indexOf(this.state);
      this.timer = setInterval(() => { i = (i + 1) % ORDER.length; this.setState(ORDER[i]); }, this.opts.interval);
    }
    stopAuto() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

    paint(initial) {
      this.paintAutoBtn();
      if (!initial) return;
      document.documentElement.style.setProperty('--aida-glow', STATES.idle.glow);
    }
    paintAutoBtn() {
      if (!this.autoBtn) return;
      const on = !!this.timer;
      this.autoBtn.setAttribute('aria-pressed', String(on));
      this.autoBtn.textContent = on ? 'AUTO ●' : 'AUTO ○';
    }
  }

  // Auto-montaje en el hero + API global para telemetría real (MQTT/WS futuro)
  function mountDefault() {
    const el = document.getElementById('aida-twin-mount');
    if (!el) return;
    try {
      window.AidaTwin = new AidaDigitalTwin(el);
      // Hook futuro: window.AidaTwin.setState('speaking') desde telemetría.
    } catch (e) { console.warn('AidaTwin:', e.message); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDefault);
  else mountDefault();

  window.AidaDigitalTwin = AidaDigitalTwin;
})();
