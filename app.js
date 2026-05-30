/* ==============================================
   ESTADO
   ============================================== */
// Cargar desde localStorage (sin datos estáticos)
let participantes  = JSON.parse(localStorage.getItem('quizParticipantes') || '[]');
let bancoPreguntas = JSON.parse(localStorage.getItem('quizPreguntas')     || '[]');
let historial      = JSON.parse(localStorage.getItem('quizHistorial')     || '[]');

let filtroActual       = "Todas";
let nextParticipanteId = Math.max(10, ...participantes.map(p => p.id + 1),  10);
let nextPreguntaId     = Math.max(20, ...bancoPreguntas.map(q => q.id + 1), 20);

/* helpers de persistencia */
function guardarParticipantesLS() {
    localStorage.setItem('quizParticipantes', JSON.stringify(participantes));
}
function guardarPreguntasLS() {
    localStorage.setItem('quizPreguntas', JSON.stringify(bancoPreguntas));
}

/* ==============================================
   TABS
   ============================================== */
function cambiarTab(btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab)?.classList.add('active');

    // Render bajo demanda
    if (btn.dataset.tab === 'tab-historial') renderizarHistorial();
    if (btn.dataset.tab === 'tab-equipos')   renderizarEquipos();
    if (btn.dataset.tab === 'tab-jugar')     actualizarInfoJuego();
}

/* ==============================================
   LEADERBOARD
   ============================================== */
function renderizarTablero() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    participantes.sort((a, b) => b.puntos - a.puntos);
    container.innerHTML = '';

    if (participantes.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>👥</span>No hay participantes.<br>Agrega uno con el botón + Participante</div>`;
        return;
    }

    participantes.forEach((p, index) => {
        const pos = index + 1;
        const posClass = pos <= 3 ? `pos-${pos}` : '';
        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;

        const item = document.createElement('div');
        item.className = `leaderboard-item ${posClass}`;
        item.dataset.id = p.id;
        item.innerHTML = `
            <div class="rank-badge">${medal}</div>
            <div class="participant-info">
                <div class="participant-name">${escapeHtml(p.nombre)}</div>
            </div>
            <div class="pts-badge">${p.puntos} pts</div>
            <div class="pts-controls">
                <input type="number" class="pts-input" id="pts-${p.id}" value="10" min="1" step="5">
                <button class="btn-pts btn-pts-add" onclick="modificarPuntos(${p.id}, true)"  title="Sumar puntos">+</button>
                <button class="btn-pts btn-pts-sub" onclick="modificarPuntos(${p.id}, false)" title="Restar puntos">−</button>
                <button class="btn-pts btn-pts-del" onclick="eliminarParticipante(${p.id})"   title="Eliminar">🗑</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function modificarPuntos(id, esSuma) {
    const input = document.getElementById(`pts-${id}`);
    const cantidad = Math.abs(parseInt(input?.value) || 10);
    participantes = participantes.map(p => {
        if (p.id === id) {
            p.puntos = esSuma ? p.puntos + cantidad : Math.max(0, p.puntos - cantidad);
        }
        return p;
    });
    guardarParticipantesLS();
    renderizarTablero();
}

function agregarParticipante() {
    const input = document.getElementById('input-nombre');
    const nombre = input.value.trim();
    if (!nombre) { sacudir(input); return; }
    participantes.push({ id: nextParticipanteId++, nombre, puntos: 0 });
    guardarParticipantesLS();
    cerrarModal('modal-participante');
    input.value = '';
    renderizarTablero();
    actualizarInfoJuego();
    mostrarToast(`✅ ${nombre} agregado al tablero`);
}

function eliminarParticipante(id) {
    const p = participantes.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar a "${p.nombre}" del tablero?`)) return;
    participantes = participantes.filter(x => x.id !== id);
    guardarParticipantesLS();
    actualizarInfoJuego();
    renderizarTablero();
    mostrarToast(`🗑 ${p.nombre} eliminado`);
}

function resetearPuntos() {
    if (participantes.every(p => p.puntos === 0)) return;
    if (!confirm('¿Resetear todos los puntos a 0? Considera guardar la partida primero.')) return;
    participantes = participantes.map(p => ({ ...p, puntos: 0 }));
    guardarParticipantesLS();
    renderizarTablero();
    mostrarToast('🔄 Puntos reseteados');
}

/* ==============================================
   GUARDAR PARTIDA → HISTORIAL
   ============================================== */
function guardarPartida() {
    if (participantes.length === 0) { mostrarToast('⚠️ No hay participantes'); return; }
    if (participantes.every(p => p.puntos === 0)) {
        if (!confirm('Todos tienen 0 puntos. ¿Guardar igualmente?')) return;
    }

    const sorted = [...participantes].sort((a, b) => b.puntos - a.puntos);
    const ahora  = new Date();
    const fecha  = ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
    const hora   = ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

    const partida = {
        id:          Date.now(),
        fecha,
        hora,
        ganador:     sorted[0].nombre,
        participantes: sorted.map(p => ({ nombre: p.nombre, puntos: p.puntos })),
        preguntas:   bancoPreguntas.map(q => ({ pregunta: q.pregunta, respuesta: q.respuesta, dificultad: q.dificultad, puntos: q.puntos }))
    };

    historial.unshift(partida); // más reciente primero
    localStorage.setItem('quizHistorial', JSON.stringify(historial));
    mostrarToast(`💾 Partida #${historial.length} guardada — Ganador: ${partida.ganador}`);
}

/* ==============================================
   HISTORIAL
   ============================================== */
function renderizarHistorial() {
    const container = document.getElementById('historial-container');
    if (!container) return;
    container.innerHTML = '';

    if (historial.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>📋</span>No hay partidas guardadas.<br>Guarda una partida desde la pestaña Tablero.</div>`;
        return;
    }

    historial.forEach((partida, idx) => {
        const card = document.createElement('div');
        card.className = 'historial-card';
        const num = historial.length - idx;
        const numPregs = partida.preguntas ? partida.preguntas.length : 0;

        const preguntasHtml = numPregs > 0 ? `
            <div class="historial-preguntas-titulo">❓ ${numPregs} pregunta${numPregs !== 1 ? 's' : ''} guardada${numPregs !== 1 ? 's' : ''}</div>
            <div class="historial-preguntas-lista">
                ${partida.preguntas.map((q, qi) => `
                    <div class="historial-pregunta-item">
                        <div class="historial-pregunta-header">
                            <span class="badge ${q.dificultad}" style="font-size:10px;padding:2px 7px;">${labelDiff(q.dificultad)}</span>
                            <span class="historial-pregunta-num">#${qi + 1}</span>
                        </div>
                        <div class="historial-pregunta-texto">${escapeHtml(q.pregunta)}</div>
                        <div class="historial-pregunta-resp"><strong>R:</strong> ${escapeHtml(q.respuesta)}</div>
                    </div>`).join('')}
            </div>` : '';

        card.innerHTML = `
            <div class="historial-card-header" onclick="toggleHistorialCard(this)">
                <div class="historial-meta">
                    <div class="historial-title">Partida #${num}</div>
                    <div class="historial-subtitle">📅 ${partida.fecha} · 🕐 ${partida.hora} · ${partida.participantes.length} participantes${numPregs > 0 ? ' · ❓ ' + numPregs + ' preguntas' : ''}</div>
                </div>
                <div class="historial-ganador">🥇 ${escapeHtml(partida.ganador)}</div>
                <div class="historial-acciones">
                    <button class="btn-pts btn-pts-del" onclick="eliminarPartida(event, ${partida.id})" title="Eliminar">🗑</button>
                    <span style="color:var(--text-muted);font-size:18px;line-height:1;">⌄</span>
                </div>
            </div>
            <div class="historial-body">
                <div class="historial-podio">
                    ${partida.participantes.map((p, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
                        const cls   = i === 0 ? 'oro' : i === 1 ? 'plata' : i === 2 ? 'bronce' : '';
                        return `<div class="historial-fila ${cls}">
                            <div class="historial-rank">${medal}</div>
                            <div class="historial-nombre">${escapeHtml(p.nombre)}</div>
                            <div class="historial-pts">${p.puntos} pts</div>
                        </div>`;
                    }).join('')}
                </div>
                ${preguntasHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleHistorialCard(header) {
    const body = header.nextElementSibling;
    body.classList.toggle('open');
    const arrow = header.querySelector('span[style]');
    if (arrow) arrow.textContent = body.classList.contains('open') ? '⌃' : '⌄';
}

function eliminarPartida(event, id) {
    event.stopPropagation();
    if (!confirm('¿Eliminar esta partida del historial?')) return;
    historial = historial.filter(p => p.id !== id);
    localStorage.setItem('quizHistorial', JSON.stringify(historial));
    renderizarHistorial();
    mostrarToast('🗑 Partida eliminada');
}

/* ==============================================
   NUEVA PARTIDA — borra participantes y preguntas
   ============================================== */
function nuevaPartida() {
    if (!confirm('¿Iniciar nueva partida? Se borrarán todos los participantes y preguntas actuales.\nLos resultados ya guardados permanecerán en el Historial.')) return;
    participantes  = [];
    bancoPreguntas = [];
    nextParticipanteId = 10;
    nextPreguntaId     = 20;
    guardarParticipantesLS();
    guardarPreguntasLS();
    cerrarModal('modal-partida');
    cerrarModal('modal-resultados-equipos');
    renderizarTablero();
    renderizarPreguntas();
    actualizarInfoJuego();
    // Volver al tablero
    const btn = document.querySelector('[data-tab="tab-tablero"]');
    if (btn) cambiarTab(btn);
    mostrarToast('🆕 Nueva partida iniciada — participantes y preguntas borrados');
}

function limpiarHistorial() {
    if (historial.length === 0) return;
    if (!confirm(`¿Eliminar las ${historial.length} partidas del historial?`)) return;
    historial = [];
    localStorage.removeItem('quizHistorial');
    renderizarHistorial();
    mostrarToast('🗑 Historial limpiado');
}

/* ==============================================
   PREGUNTAS
   ============================================== */
function renderizarPreguntas() {
    const contenedor = document.getElementById('contenedor-preguntas');
    const contador   = document.getElementById('contador-preguntas');
    if (!contenedor) return;

    const lista = filtroActual === 'Todas'
        ? bancoPreguntas
        : bancoPreguntas.filter(q => q.dificultad === filtroActual);

    if (contador) contador.textContent = `${lista.length} pregunta${lista.length !== 1 ? 's' : ''}`;

    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = `<div class="empty-state"><span>🔍</span>No hay preguntas con ese filtro.</div>`;
        return;
    }

    lista.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = `tarjeta-pregunta ${q.dificultad}`;
        card.innerHTML = `
            <div class="tarjeta-top">
                <div style="flex:1;min-width:0;">
                    <div class="pregunta-numero">Pregunta ${index + 1}</div>
                    <p class="pregunta-texto">${escapeHtml(q.pregunta)}</p>
                </div>
                <div class="tarjeta-actions">
                    <span class="badge ${q.dificultad}">${labelDiff(q.dificultad)}</span>
                    <span class="badge" style="background:var(--bg2);color:var(--text);border:1px solid var(--border);">+${q.puntos ?? PUNTOS_DIFF[q.dificultad] ?? 1} pt${(q.puntos ?? PUNTOS_DIFF[q.dificultad] ?? 1) !== 1 ? 's' : ''}</span>
                    <button class="btn-pts btn-pts-del" onclick="eliminarPregunta(${q.id})" title="Eliminar">🗑</button>
                </div>
            </div>
            <div class="respuesta-toggle">
                <button class="btn-toggle-resp" onclick="toggleRespuesta(this)">Ver respuesta</button>
                <div class="respuesta-texto">${escapeHtml(q.respuesta)}</div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

function toggleRespuesta(btn) {
    const respDiv = btn.nextElementSibling;
    const visible = respDiv.classList.toggle('visible');
    btn.classList.toggle('visible', visible);
    btn.textContent = visible ? 'Ocultar respuesta' : 'Ver respuesta';
}

function agregarPregunta() {
    const preguntaEl  = document.getElementById('input-pregunta');
    const respuestaEl = document.getElementById('input-respuesta');
    const puntosEl    = document.getElementById('input-puntos');
    const diffBtn     = document.querySelector('.diff-btn.active');

    const preguntaVal  = preguntaEl.value.trim();
    const respuestaVal = respuestaEl.value.trim();
    const dificultad   = diffBtn ? diffBtn.dataset.val : 'Facil';
    const puntos       = Math.max(1, parseInt(puntosEl?.value) || 1);

    if (!preguntaVal)  { sacudir(preguntaEl);  return; }
    if (!respuestaVal) { sacudir(respuestaEl); return; }

    bancoPreguntas.push({ id: nextPreguntaId++, dificultad, pregunta: preguntaVal, respuesta: respuestaVal, puntos });
    guardarPreguntasLS();
    actualizarInfoJuego();
    cerrarModal('modal-pregunta');
    preguntaEl.value  = '';
    respuestaEl.value = '';
    if (puntosEl) puntosEl.value = 1;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.diff-btn.facil')?.classList.add('active');
    renderizarPreguntas();
    mostrarToast('✅ Pregunta agregada');
}

function eliminarPregunta(id) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    bancoPreguntas = bancoPreguntas.filter(q => q.id !== id);
    guardarPreguntasLS();
    actualizarInfoJuego();
    renderizarPreguntas();
    mostrarToast('🗑 Pregunta eliminada');
}

function setFiltro(btn) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroActual = btn.dataset.filtro;
    renderizarPreguntas();
}

function selDiff(btn) {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const ptsInput = document.getElementById('input-puntos');
    if (ptsInput) ptsInput.value = btn.dataset.pts || 1;
}

/* ==============================================
   MODALES
   ============================================== */
function abrirModal(id) {
    document.getElementById(id)?.classList.add('open');
    setTimeout(() => document.querySelector(`#${id} .form-input`)?.focus(), 100);
}

function cerrarModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

function cerrarOverlay(event, id) {
    if (event.target === event.currentTarget) cerrarModal(id);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
});

/* ==============================================
   TOAST
   ============================================== */
let toastTimeout;
function mostrarToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ==============================================
   UTILIDADES
   ============================================== */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function labelDiff(d) {
    return d === 'Facil' ? 'Fácil' : d === 'Dificil' ? 'Difícil' : d;
}

function sacudir(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'sacudida 0.4s ease';
    el.focus();
}

const _style = document.createElement('style');
_style.textContent = `
@keyframes sacudida {
    0%,100%{ transform:translateX(0) }
    20%    { transform:translateX(-8px) }
    40%    { transform:translateX(8px) }
    60%    { transform:translateX(-5px) }
    80%    { transform:translateX(5px) }
}`;
document.head.appendChild(_style);

/* ==============================================
   MODO JUEGO
   ============================================== */
const PUNTOS_DIFF = { Facil: 1, Medio: 2, Dificil: 3 };

let juegoActivo      = false;
let juegoPreguntas   = [];
let juegoIndice      = 0;
let juegoTotal       = 0;
let juegoAcertadas   = 0;
let juegoSaltadas    = 0;
let juegoRespVisible = false;
let modoJuego        = 'individual'; // 'individual' | 'equipos'
let juegoEquipoSel   = null;         // id del equipo seleccionado en paso 2

/* ---------- Selector de modo ---------- */
function selModoJuego(modo, btn) {
    modoJuego = modo;
    document.querySelectorAll('.jugar-modo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const desc = document.getElementById('jugar-modo-desc');
    if (modo === 'equipos') {
        desc.innerHTML = 'Las preguntas se lanzan al azar.<br>Selecciona el equipo que respondió y luego el miembro que lo hizo.';
    } else {
        desc.innerHTML = 'Las preguntas se lanzarán al azar una por una.<br>Selecciona quién respondió correctamente para sumarle puntos.';
    }
    actualizarInfoJuego();
}

function iniciarJuego() {
    if (modoJuego === 'equipos') {
        const equiposConMiembros = equipos.filter(e => e.miembros.length > 0);
        if (equipos.length === 0) {
            mostrarToast('Crea equipos en la pestaña Equipos antes de jugar.');
            return;
        }
        if (equiposConMiembros.length === 0) {
            mostrarToast('Agrega al menos un miembro a algún equipo.');
            return;
        }
    } else {
        if (participantes.length === 0) {
            mostrarToast('Agrega participantes en el Tablero antes de jugar.');
            return;
        }
    }
    if (bancoPreguntas.length === 0) {
        mostrarToast('Agrega preguntas en el Banco antes de jugar.');
        return;
    }

    juegoPreguntas = [...bancoPreguntas].sort(() => Math.random() - 0.5);
    juegoIndice    = 0;
    juegoTotal     = juegoPreguntas.length;
    juegoAcertadas = 0;
    juegoSaltadas  = 0;
    juegoActivo    = true;
    juegoEquipoSel = null;

    document.getElementById('jugar-inicio').style.display = 'none';
    document.getElementById('jugar-fin').style.display    = 'none';
    document.getElementById('jugar-activo').style.display = 'block';
    mostrarPreguntaActual();
}

function jugarOtraRonda() {
    iniciarJuego();
}

function mostrarPreguntaActual() {
    if (juegoIndice >= juegoTotal) { terminarJuego(); return; }

    const q      = juegoPreguntas[juegoIndice];
    const numero = juegoIndice + 1;
    const pts    = q.puntos ?? PUNTOS_DIFF[q.dificultad] ?? 1;
    juegoRespVisible = false;

    // Progreso
    document.getElementById('jugar-prog-texto').textContent =
        `Pregunta ${numero} de ${juegoTotal}`;
    const restantes = juegoTotal - numero;
    document.getElementById('jugar-prog-restantes').textContent =
        `${restantes} restante${restantes !== 1 ? 's' : ''}`;
    document.getElementById('jugar-prog-fill').style.width =
        Math.round(((numero - 1) / juegoTotal) * 100) + '%';

    // Badge y puntos
    const badge = document.getElementById('jugar-badge');
    badge.textContent = labelDiff(q.dificultad);
    badge.className   = `badge ${q.dificultad}`;
    const ptsEl = document.getElementById('jugar-pts-valor');
    ptsEl.textContent = `+${pts} pt${pts > 1 ? 's' : ''}`;
    ptsEl.className   = `jugar-pts-valor diff-${q.dificultad.toLowerCase()}`;

    // Texto
    document.getElementById('jugar-pregunta-texto').textContent = q.pregunta;

    // Respuesta reset
    const respText   = document.getElementById('jugar-respuesta-texto');
    const respToggle = document.getElementById('jugar-toggle-resp');
    respText.textContent = q.respuesta;
    respText.classList.remove('visible');
    respToggle.classList.remove('visible');
    respToggle.textContent = 'Ver respuesta';

    // Animar tarjeta
    const card = document.getElementById('jugar-pregunta-card');
    card.style.animation = 'none'; card.offsetHeight;
    card.style.animation = 'fadeSlideIn 0.28s ease';

    juegoEquipoSel = null;
    if (modoJuego === 'equipos') {
        renderizarEquiposJuego(pts);
    } else {
        renderizarParticipantesJuego(pts);
    }
}

function jugarToggleRespuesta() {
    juegoRespVisible = !juegoRespVisible;
    const respText   = document.getElementById('jugar-respuesta-texto');
    const respToggle = document.getElementById('jugar-toggle-resp');
    respText.classList.toggle('visible', juegoRespVisible);
    respToggle.classList.toggle('visible', juegoRespVisible);
    respToggle.textContent = juegoRespVisible ? 'Ocultar respuesta' : 'Ver respuesta';
}

function renderizarParticipantesJuego(pts) {
    const container = document.getElementById('jugar-participantes');
    const titulo    = document.getElementById('jugar-seleccion-titulo');
    if (titulo) titulo.textContent = '¿Quién respondió correctamente?';
    const sorted    = [...participantes].sort((a, b) => b.puntos - a.puntos);
    container.innerHTML = sorted.map(p => `
        <button class="jugar-participante-btn" onclick="otorgarPunto(${p.id}, ${pts})">
            <span class="jugar-part-avatar">${escapeHtml(p.nombre.charAt(0).toUpperCase())}</span>
            <span class="jugar-part-info">
                <span class="jugar-part-nombre">${escapeHtml(p.nombre)}</span>
                <span class="jugar-part-pts">${p.puntos} pts</span>
            </span>
            <span class="jugar-part-suma">+${pts}</span>
        </button>
    `).join('');
}

/* ---- MODO EQUIPOS: paso 1 — seleccionar equipo ---- */
function renderizarEquiposJuego(pts) {
    const container = document.getElementById('jugar-participantes');
    const titulo    = document.getElementById('jugar-seleccion-titulo');
    if (titulo) titulo.textContent = '¿Qué equipo respondió correctamente?';

    const sorted = [...equipos]
        .filter(e => e.miembros.length > 0)
        .sort((a, b) => totalEquipo(b) - totalEquipo(a));

    container.innerHTML = sorted.map(eq => `
        <button class="jugar-participante-btn jugar-equipo-btn" onclick="seleccionarEquipoJuego(${eq.id}, ${pts})">
            <span class="jugar-part-avatar" style="background:${eq.color}20;border-color:${eq.color};color:${eq.color};">${escapeHtml(eq.nombre.charAt(0).toUpperCase())}</span>
            <span class="jugar-part-info">
                <span class="jugar-part-nombre">${escapeHtml(eq.nombre)}</span>
                <span class="jugar-part-pts">${totalEquipo(eq)} pts totales · ${eq.miembros.length} miembro${eq.miembros.length !== 1 ? 's' : ''}</span>
            </span>
            <span class="jugar-part-suma" style="color:${eq.color}">+${pts}</span>
        </button>
    `).join('');
}

/* ---- MODO EQUIPOS: paso 2 — seleccionar miembro del equipo ---- */
function seleccionarEquipoJuego(equipoId, pts) {
    juegoEquipoSel = equipoId;
    const eq        = equipos.find(e => e.id === equipoId);
    if (!eq) return;

    const container = document.getElementById('jugar-participantes');
    const titulo    = document.getElementById('jugar-seleccion-titulo');
    if (titulo) titulo.innerHTML =
        `<span style="display:inline-flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${eq.color}"></span>
            ${escapeHtml(eq.nombre)} — ¿Quién del equipo respondió?
        </span>`;

    const miembrosOrdenados = [...eq.miembros].sort((a, b) => b.puntos - a.puntos);
    container.innerHTML = `
        <button class="jugar-participante-btn jugar-btn-volver" onclick="renderizarEquiposJuego(${pts})" style="grid-column:1/-1;">
            <span style="font-size:16px;">←</span>
            <span class="jugar-part-info"><span class="jugar-part-nombre">Volver a equipos</span></span>
        </button>
        ${miembrosOrdenados.map(m => `
        <button class="jugar-participante-btn" onclick="otorgarPuntoEquipo(${eq.id}, ${m.id}, ${pts})">
            <span class="jugar-part-avatar" style="background:${eq.color}20;border-color:${eq.color};color:${eq.color};">${escapeHtml(m.nombre.charAt(0).toUpperCase())}</span>
            <span class="jugar-part-info">
                <span class="jugar-part-nombre">${escapeHtml(m.nombre)}</span>
                <span class="jugar-part-pts">${m.puntos} pts</span>
            </span>
            <span class="jugar-part-suma" style="color:${eq.color}">+${pts}</span>
        </button>`).join('')}
    `;
}

function otorgarPuntoEquipo(equipoId, miembroId, pts) {
    const eq = equipos.find(e => e.id === equipoId);
    if (!eq) return;
    eq.miembros = eq.miembros.map(m => {
        if (m.id === miembroId) m.puntos += pts;
        return m;
    });
    renderizarEquipos();

    const card = document.getElementById('jugar-pregunta-card');
    card.classList.add('jugar-acierto');
    const miembro = eq.miembros.find(m => m.id === miembroId);
    mostrarToast(`+${pts} pts → ${miembro?.nombre} (${eq.nombre})`);

    setTimeout(() => {
        card.classList.remove('jugar-acierto');
        juegoAcertadas++;
        juegoEquipoSel = null;
        juegoIndice++;
        mostrarPreguntaActual();
    }, 450);
}

function otorgarPunto(participanteId, pts) {
    participantes = participantes.map(p => {
        if (p.id === participanteId) p.puntos += pts;
        return p;
    });
    guardarParticipantesLS();
    renderizarTablero();

    const card = document.getElementById('jugar-pregunta-card');
    card.classList.add('jugar-acierto');
    const nombre = participantes.find(x => x.id === participanteId)?.nombre || '';
    mostrarToast(`+${pts} pts → ${nombre}`);

    setTimeout(() => {
        card.classList.remove('jugar-acierto');
        juegoAcertadas++;
        juegoIndice++;
        mostrarPreguntaActual();
    }, 450);
}

function jugarSaltar() {
    juegoSaltadas++;
    juegoIndice++;
    mostrarPreguntaActual();
}

function confirmarDetenerJuego() {
    if (confirm('¿Detener la partida? Los puntos acumulados se conservan.')) terminarJuego();
}

function terminarJuego() {
    juegoActivo = false;
    document.getElementById('jugar-activo').style.display = 'none';
    document.getElementById('jugar-fin').style.display    = 'block';

    let liderInfo = '';
    if (modoJuego === 'equipos') {
        const sorted = [...equipos].sort((a, b) => totalEquipo(b) - totalEquipo(a));
        const lider  = sorted[0];
        if (lider) liderInfo = `<br>Equipo líder: <strong>${escapeHtml(lider.nombre)}</strong> con ${totalEquipo(lider)} pts`;
    } else {
        const sorted = [...participantes].sort((a, b) => b.puntos - a.puntos);
        const lider  = sorted[0];
        if (lider) liderInfo = `<br>Líder actual: <strong>${escapeHtml(lider.nombre)}</strong> con ${lider.puntos} pts`;
    }
    document.getElementById('jugar-fin-desc').innerHTML =
        `Preguntas respondidas: <strong>${juegoAcertadas}</strong> · Saltadas: <strong>${juegoSaltadas}</strong>` + liderInfo;
}

function volverTablero() {
    const btn = document.querySelector('[data-tab="tab-tablero"]');
    if (btn) cambiarTab(btn);
}

// Mostrar info previa en la pantalla de inicio de juego
function actualizarInfoJuego() {
    const el = document.getElementById('jugar-inicio-info');
    if (!el) return;
    const totalMiembros = equipos.reduce((s, e) => s + e.miembros.length, 0);
    const chipsJugadores = modoJuego === 'equipos'
        ? `<span class="jugar-info-chip">${equipos.length} equipo${equipos.length !== 1 ? 's' : ''}</span><span class="jugar-info-chip">${totalMiembros} miembro${totalMiembros !== 1 ? 's' : ''}</span>`
        : `<span class="jugar-info-chip">${participantes.length} participante${participantes.length !== 1 ? 's' : ''}</span>`;
    el.innerHTML = chipsJugadores +
        `<span class="jugar-info-chip">${bancoPreguntas.length} pregunta${bancoPreguntas.length !== 1 ? 's' : ''}</span>`;
}

/* ==============================================
   FINALIZAR PARTIDA
   ============================================== */
function finalizarPartida() {
    if (participantes.length === 0) {
        mostrarToast('No hay participantes en la partida.');
        return;
    }

    // Guardar en historial primero
    guardarPartida();


    // Ordenar participantes por puntos descendente
    const sorted = [...participantes].sort((a, b) => b.puntos - a.puntos);

    // Subtítulo con fecha
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    document.getElementById('resultados-subtitulo').textContent = fecha;

    // PODIO TOP 3
    const top3El = document.getElementById('podio-top3');
    const podioOrden = [1, 0, 2]; // visual: 2°, 1°, 3°
    const podioClases = ['lugar-2', 'lugar-1', 'lugar-3'];
    const podioEmojis = ['🥈', '🥇', '🥉'];

    if (sorted.length >= 2) {
        top3El.style.display = 'grid';
        top3El.innerHTML = podioOrden.map((idx, col) => {
            const p = sorted[idx];
            if (!p) return `<div></div>`;
            const inicial = escapeHtml(p.nombre.charAt(0).toUpperCase());
            return `
            <div class="podio-lugar ${podioClases[col]}">
                <div class="podio-avatar">${inicial}</div>
                <div class="podio-nombre" title="${escapeHtml(p.nombre)}">${escapeHtml(p.nombre)}</div>
                <div class="podio-pts">${p.puntos} pts</div>
                <div class="podio-pedestal"></div>
            </div>`;
        }).join('');
    } else {
        top3El.style.display = 'none';
        top3El.innerHTML = '';
    }

    // LISTA DEL 4° EN ADELANTE (o todos si < 2 participantes)
    const listaEl = document.getElementById('resultados-lista');
    const inicio = sorted.length >= 2 ? 3 : 0;
    const restantes = sorted.slice(inicio);

    if (restantes.length > 0) {
        listaEl.innerHTML = restantes.map((p, i) => `
            <div class="resultado-fila">
                <span class="resultado-rank">${inicio + i + 1}</span>
                <span class="resultado-nombre">${escapeHtml(p.nombre)}</span>
                <span class="resultado-pts">${p.puntos} pts</span>
            </div>`).join('');
    } else {
        listaEl.innerHTML = '';
    }

    abrirModal('modal-partida');
}

/* ==============================================
   ESTADO — EQUIPOS
   ============================================== */
let equipos = [];
let nextEquipoId  = 100;
let nextMiembroId = 200;
let equipoActualId = null; // para el modal de agregar miembro

/* ==============================================
   RENDERIZAR EQUIPOS
   ============================================== */
function renderizarEquipos() {
    const container = document.getElementById('equipos-container');
    if (!container) return;

    if (equipos.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>👥</span>No hay equipos.<br>Crea uno con el botón + Equipo</div>`;
        return;
    }

    // Ordenar equipos por total de puntos
    equipos.sort((a, b) => totalEquipo(b) - totalEquipo(a));

    container.innerHTML = '';
    equipos.forEach((eq, idx) => {
        const pos     = idx + 1;
        const posClass = pos <= 3 ? `pos-${pos}` : '';
        const medal   = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
        const total   = totalEquipo(eq);
        const card    = document.createElement('div');
        card.className = `equipo-card ${posClass}`;
        card.id = `equipo-card-${eq.id}`;

        // Miembros ordenados por puntos
        const miembrosOrdenados = [...eq.miembros].sort((a, b) => b.puntos - a.puntos);

        card.innerHTML = `
            <div class="equipo-header" onclick="toggleEquipoCard(${eq.id})">
                <div class="equipo-rank">${medal}</div>
                <div class="equipo-color-dot" style="background:${eq.color}"></div>
                <div class="equipo-info">
                    <div class="equipo-nombre">${escapeHtml(eq.nombre)}</div>
                    <div class="equipo-stats">${eq.miembros.length} miembro${eq.miembros.length !== 1 ? 's' : ''}</div>
                </div>
                <div class="equipo-pts-total">${total} pts</div>
                <div class="equipo-actions" onclick="event.stopPropagation()">
                    <button class="btn-pts btn-pts-add" style="font-size:11px;width:auto;padding:0 8px;border-radius:6px;gap:3px;" onclick="abrirModalMiembro(${eq.id})">+ Miembro</button>
                    <button class="btn-pts btn-pts-del" onclick="eliminarEquipo(${eq.id})" title="Eliminar equipo">🗑</button>
                    <span class="equipo-expand-arrow" id="arrow-${eq.id}">▾</span>
                </div>
            </div>
            <div class="equipo-body" id="body-${eq.id}">
                ${miembrosOrdenados.length === 0
                    ? `<div class="miembro-empty">Sin miembros aún. Agrega uno con "+ Miembro"</div>`
                    : miembrosOrdenados.map((m, mi) => {
                        const mPos = mi + 1;
                        const mMedal = mPos === 1 ? '🥇' : mPos === 2 ? '🥈' : mPos === 3 ? '🥉' : mPos;
                        return `
                        <div class="miembro-item ${mPos <= 3 ? 'pos-'+mPos : ''}">
                            <div class="miembro-rank">${mMedal}</div>
                            <div class="miembro-nombre">${escapeHtml(m.nombre)}</div>
                            <div class="miembro-pts">${m.puntos} pts</div>
                            <div class="miembro-controls">
                                <input type="number" class="pts-input" id="mpts-${m.id}" value="10" min="1" step="5" style="width:48px">
                                <button class="btn-pts btn-pts-add" onclick="modificarPuntosMiembro(${eq.id},${m.id},true)"  title="Sumar">+</button>
                                <button class="btn-pts btn-pts-sub" onclick="modificarPuntosMiembro(${eq.id},${m.id},false)" title="Restar">−</button>
                                <button class="btn-pts btn-pts-del" onclick="eliminarMiembro(${eq.id},${m.id})" title="Eliminar">🗑</button>
                            </div>
                        </div>`;
                    }).join('')
                }
            </div>
        `;
        container.appendChild(card);
    });
}

function totalEquipo(eq) {
    return eq.miembros.reduce((sum, m) => sum + m.puntos, 0);
}

function toggleEquipoCard(id) {
    const body  = document.getElementById(`body-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    if (!body) return;
    const open = body.classList.toggle('open');
    if (arrow) {
        arrow.textContent = open ? '▴' : '▾';
        arrow.classList.toggle('open', open);
    }
}

/* ==============================================
   CRUD EQUIPOS
   ============================================== */
function agregarEquipo() {
    const input    = document.getElementById('input-equipo-nombre');
    const nombre   = input.value.trim();
    const colorBtn = document.querySelector('.color-swatch.active');
    const color    = colorBtn ? colorBtn.dataset.color : '#3b82f6';

    if (!nombre) { sacudir(input); return; }

    equipos.push({ id: nextEquipoId++, nombre, color, miembros: [] });
    cerrarModal('modal-equipo');
    input.value = '';
    // reset color selector
    document.querySelectorAll('.color-swatch').forEach((s, i) => s.classList.toggle('active', i === 0));
    renderizarEquipos();
    mostrarToast(`✅ Equipo "${nombre}" creado`);
}

function eliminarEquipo(id) {
    const eq = equipos.find(e => e.id === id);
    if (!eq) return;
    if (!confirm(`¿Eliminar el equipo "${eq.nombre}" y todos sus miembros?`)) return;
    equipos = equipos.filter(e => e.id !== id);
    renderizarEquipos();
    mostrarToast(`🗑 Equipo "${eq.nombre}" eliminado`);
}

function resetearEquipos() {
    if (equipos.length === 0) return;
    const tienePuntos = equipos.some(eq => eq.miembros.some(m => m.puntos > 0));
    if (!tienePuntos) return;
    if (!confirm('¿Resetear todos los puntos de todos los equipos?')) return;
    equipos = equipos.map(eq => ({
        ...eq,
        miembros: eq.miembros.map(m => ({ ...m, puntos: 0 }))
    }));
    renderizarEquipos();
    mostrarToast('🔄 Puntos reseteados');
}

/* ==============================================
   CRUD MIEMBROS
   ============================================== */
function abrirModalMiembro(equipoId) {
    equipoActualId = equipoId;
    const eq    = equipos.find(e => e.id === equipoId);
    const badge = document.getElementById('modal-miembro-equipo-label');
    if (badge && eq) {
        badge.innerHTML = `<span class="dot" style="background:${eq.color}"></span>${escapeHtml(eq.nombre)}`;
    }
    abrirModal('modal-miembro-equipo');
}

function agregarMiembro() {
    const input  = document.getElementById('input-miembro-nombre');
    const nombre = input.value.trim();
    if (!nombre) { sacudir(input); return; }

    const eq = equipos.find(e => e.id === equipoActualId);
    if (!eq) return;

    eq.miembros.push({ id: nextMiembroId++, nombre, puntos: 0 });
    cerrarModal('modal-miembro-equipo');
    input.value = '';
    renderizarEquipos();
    // Reabrir el cuerpo del equipo si estaba cerrado
    const body = document.getElementById(`body-${equipoActualId}`);
    if (body && !body.classList.contains('open')) toggleEquipoCard(equipoActualId);
    mostrarToast(`✅ ${nombre} agregado a "${eq.nombre}"`);
}

function eliminarMiembro(equipoId, miembroId) {
    const eq = equipos.find(e => e.id === equipoId);
    if (!eq) return;
    const m = eq.miembros.find(x => x.id === miembroId);
    if (!m) return;
    if (!confirm(`¿Eliminar a "${m.nombre}" del equipo?`)) return;
    eq.miembros = eq.miembros.filter(x => x.id !== miembroId);
    renderizarEquipos();
    mostrarToast(`🗑 ${m.nombre} eliminado`);
}

function modificarPuntosMiembro(equipoId, miembroId, esSuma) {
    const input    = document.getElementById(`mpts-${miembroId}`);
    const cantidad = Math.abs(parseInt(input?.value) || 10);
    const eq = equipos.find(e => e.id === equipoId);
    if (!eq) return;
    eq.miembros = eq.miembros.map(m => {
        if (m.id === miembroId) {
            m.puntos = esSuma ? m.puntos + cantidad : Math.max(0, m.puntos - cantidad);
        }
        return m;
    });
    // Preservar estado abierto del cuerpo antes de re-renderizar
    const wasOpen = document.getElementById(`body-${equipoId}`)?.classList.contains('open');
    renderizarEquipos();
    if (wasOpen) {
        const body  = document.getElementById(`body-${equipoId}`);
        const arrow = document.getElementById(`arrow-${equipoId}`);
        if (body)  { body.classList.add('open'); }
        if (arrow) { arrow.textContent = '▴'; arrow.classList.add('open'); }
    }
}

/* ==============================================
   FINALIZAR PARTIDA EQUIPOS
   ============================================== */
function finalizarPartidaEquipos() {
    if (equipos.length === 0) {
        mostrarToast('No hay equipos en la partida.');
        return;
    }

    const sorted = [...equipos]
        .map(eq => ({ ...eq, total: totalEquipo(eq) }))
        .sort((a, b) => b.total - a.total);

    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    document.getElementById('resultados-equipos-subtitulo').textContent = fecha;

    // PODIO TOP 3 EQUIPOS
    const top3El = document.getElementById('podio-top3-equipos');
    const podioOrden  = [1, 0, 2];
    const podioClases = ['lugar-2', 'lugar-1', 'lugar-3'];

    if (sorted.length >= 2) {
        top3El.style.display = 'grid';
        top3El.innerHTML = podioOrden.map((idx, col) => {
            const eq = sorted[idx];
            if (!eq) return `<div></div>`;
            return `
            <div class="podio-lugar ${podioClases[col]}">
                <div class="podio-avatar" style="${podioClases[col]==='lugar-1'?'background:var(--gold-bg);border-color:#fcd34d;color:var(--gold)':podioClases[col]==='lugar-2'?'background:var(--silver-bg);border-color:#94a3b8;color:var(--silver)':'background:#fff7ed;border-color:#fdba74;color:var(--bronze)'}">${escapeHtml(eq.nombre.charAt(0).toUpperCase())}</div>
                <div class="podio-nombre" title="${escapeHtml(eq.nombre)}">${escapeHtml(eq.nombre)}</div>
                <div class="podio-pts">${eq.total} pts</div>
                <div class="podio-pedestal"></div>
            </div>`;
        }).join('');
    } else {
        top3El.style.display = 'none';
        top3El.innerHTML = '';
    }

    // LISTA 4° EN ADELANTE
    const listaEl = document.getElementById('resultados-lista-equipos');
    const inicio   = sorted.length >= 2 ? 3 : 0;
    const restantes = sorted.slice(inicio);
    listaEl.innerHTML = restantes.map((eq, i) => `
        <div class="resultado-fila">
            <span class="resultado-rank">${inicio + i + 1}</span>
            <span class="resultado-nombre">
                <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${eq.color};margin-right:6px;vertical-align:middle;"></span>${escapeHtml(eq.nombre)}
            </span>
            <span class="resultado-pts">${eq.total} pts</span>
        </div>`).join('');

    // MVP — jugador con más puntos de todos
    const mvpEl = document.getElementById('resultados-equipos-mvp');
    let mvp = null, mvpEquipo = null;
    equipos.forEach(eq => eq.miembros.forEach(m => {
        if (!mvp || m.puntos > mvp.puntos) { mvp = m; mvpEquipo = eq; }
    }));
    if (mvp && mvp.puntos > 0) {
        mvpEl.innerHTML = `
            <div class="mvp-titulo">⭐ MVP — Mejor jugador individual</div>
            <div class="mvp-card">
                <div class="mvp-avatar">${escapeHtml(mvp.nombre.charAt(0).toUpperCase())}</div>
                <div class="mvp-info">
                    <div class="mvp-nombre">${escapeHtml(mvp.nombre)}</div>
                    <div class="mvp-equipo">
                        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${mvpEquipo.color};margin-right:4px;vertical-align:middle;"></span>${escapeHtml(mvpEquipo.nombre)}
                    </div>
                </div>
                <div class="mvp-pts">${mvp.puntos} pts</div>
            </div>`;
    } else {
        mvpEl.innerHTML = '';
    }

    abrirModal('modal-resultados-equipos');
}

/* ==============================================
   SELECTOR DE COLOR
   ============================================== */
function selColor(btn) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
}

/* ==============================================
   INICIO
   ============================================== */
document.addEventListener('DOMContentLoaded', () => {
    renderizarTablero();
    renderizarPreguntas();
    actualizarInfoJuego();
});
