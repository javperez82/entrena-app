// ===== ENTRENA · app.js =====
'use strict';

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 2200); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- capa de datos (Supabase o localStorage con la misma API) ----------
const CFG = window.ENTRENA_CONFIG || {};
const SUPA_ON = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
let supa = null;

const LocalDB = {
  _get(t){ return JSON.parse(localStorage.getItem('entrena_' + t) || '[]'); },
  _set(t, rows){ localStorage.setItem('entrena_' + t, JSON.stringify(rows)); },
  async list(t, filter){ let rows = this._get(t); if (filter) rows = rows.filter(r => Object.entries(filter).every(([k,v]) => r[k] === v)); return rows; },
  async insert(t, row){ row = { id: uid(), created_at: new Date().toISOString(), ...row }; const rows = this._get(t); rows.push(row); this._set(t, rows); return row; },
  async update(t, id, patch){ const rows = this._get(t); const i = rows.findIndex(r => r.id === id); if (i >= 0){ rows[i] = { ...rows[i], ...patch }; this._set(t, rows); return rows[i]; } },
  async remove(t, id){ this._set(t, this._get(t).filter(r => r.id !== id)); },
};

const SupaDB = {
  async list(t, filter){ let q = supa.from(t).select('*'); if (filter) for (const [k,v] of Object.entries(filter)) q = q.eq(k, v); const { data, error } = await q.order('created_at', { ascending: true }); if (error){ console.error(error); toast('Error de conexión'); return []; } return data; },
  async insert(t, row){ const { data, error } = await supa.from(t).insert(row).select().single(); if (error){ console.error(error); toast('No se pudo guardar'); return null; } return data; },
  async update(t, id, patch){ const { data, error } = await supa.from(t).update(patch).eq('id', id).select().single(); if (error) console.error(error); return data; },
  async remove(t, id){ const { error } = await supa.from(t).delete().eq('id', id); if (error) console.error(error); },
};

let DB = LocalDB;

// ---------- estado ----------
const S = { sesionActiva: null, series: [], jornada: null, semana: 1, charts: {} };

// ---------- semana del programa ----------
function inicioPrograma(){
  let d = localStorage.getItem('entrena_inicio');
  if (!d){ // lunes de esta semana
    const n = new Date(); const off = (n.getDay() + 6) % 7; n.setDate(n.getDate() - off);
    d = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    localStorage.setItem('entrena_inicio', d);
  }
  return d;
}
function semanaActual(){
  const dias = Math.floor((new Date(hoyISO()) - new Date(inicioPrograma())) / 864e5);
  return Math.min(Math.max(Math.floor(dias / 7) + 1, 1), 4);
}

// ---------- vistas ----------
$$('nav.tabs button').forEach(b => b.onclick = () => {
  $$('nav.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'view-' + b.dataset.view));
  if (b.dataset.view === 'progreso') renderProgreso();
  if (b.dataset.view === 'meds') renderMeds();
  if (b.dataset.view === 'mente') renderMente();
});

// ============================================================
// HOY — sesión de entrenamiento
// ============================================================
async function renderHoy(){
  const fecha = new Date();
  $('#hoy-fecha').textContent = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  S.semana = semanaActual();
  const sem = SEMANAS[S.semana];
  $('#semana-tag').textContent = `Semana ${S.semana} · ${sem.titulo}`;
  $('#semana-tip').innerHTML = `<p class="muted"><b style="color:var(--amber)">${esc(sem.rir)}.</b> ${esc(sem.tip)}</p>`;

  let tipo = localStorage.getItem('entrena_override_' + hoyISO()) || CALENDARIO[fecha.getDay()];
  S.jornada = tipo;

  const zona = $('#sesion-zona');
  const selector = `<div class="card flat"><label>Cambiar jornada de hoy</label><select id="jornada-select">
    ${Object.entries(PLAN).map(([k,p]) => `<option value="${k}" ${k===tipo?'selected':''}>${p.nombre} · ${p.sub}</option>`).join('')}
    <option value="caminata" ${tipo==='caminata'?'selected':''}>Caminata 30-40 min</option>
    <option value="descanso" ${tipo==='descanso'?'selected':''}>Descanso</option>
  </select></div>`;

  if (tipo === 'caminata' || tipo === 'descanso'){
    $('#jornada-titulo').textContent = tipo === 'caminata' ? 'Caminata' : 'Descanso';
    $('#jornada-sub').textContent = tipo === 'caminata' ? '30-40 min, ideal después de la comida fuerte' : 'El músculo crece cuando descansas';
    setRing(0, 0);
    zona.innerHTML = (tipo === 'caminata'
      ? `<div class="card"><p class="muted" style="margin-bottom:12px">Ritmo en el que puedas hablar pero no cantar. La caminata post-comida hace que el músculo capte glucosa directamente: es medicina para tu hígado.</p><button class="btn" id="caminata-done">Caminata hecha ✓</button></div>`
      : `<div class="card"><p class="muted">Día libre. Si quieres sumar: la respiración 4-7-8 antes de dormir está en Mente.</p></div>`)
      + selector;
    const cd = $('#caminata-done');
    if (cd) cd.onclick = async () => { await DB.insert('sesiones', { fecha: hoyISO(), dia: 'caminata', semana: S.semana, completada: true }); toast('Caminata registrada 🚶'); };
  } else {
    const plan = PLAN[tipo];
    $('#jornada-titulo').textContent = plan.nombre;
    $('#jornada-sub').textContent = plan.sub;
    // ¿ya hay sesión de hoy?
    const previas = await DB.list('sesiones', { fecha: hoyISO(), dia: tipo });
    S.sesionActiva = previas[0] || null;
    if (S.sesionActiva){
      S.series = await DB.list('series', { sesion_id: S.sesionActiva.id });
      renderSesion(plan);
    } else {
      setRing(0, plan.ejercicios.length);
      zona.innerHTML = `<button class="btn" id="iniciar" style="margin-bottom:12px">Iniciar ${esc(plan.nombre)}</button>
        <div class="card flat"><p class="muted">Calentamiento primero: 5 min de cardio suave + movilidad + 2 series de aproximación en el primer ejercicio. Exhala siempre durante el esfuerzo.</p></div>` + selector;
      $('#iniciar').onclick = async () => {
        S.sesionActiva = await DB.insert('sesiones', { fecha: hoyISO(), dia: tipo, semana: S.semana, completada: false });
        S.series = [];
        renderSesion(plan);
      };
    }
  }
  const js = $('#jornada-select');
  if (js) js.onchange = e => { localStorage.setItem('entrena_override_' + hoyISO(), e.target.value); renderHoy(); };
}

function setRing(done, total){
  const C = 251.3;
  $('#ring-fill').style.strokeDashoffset = total ? C * (1 - done / total) : C;
  $('#ring-num').textContent = `${done}/${total}`;
}

function seriesDelPlan(ej){
  const factor = SEMANAS[S.semana].seriesFactor; // semana 1: una serie menos
  return Math.max(ej.series + factor, 1);
}

async function ultimaCarga(slug){
  // mejor peso de la última sesión donde se hizo este ejercicio
  const todas = (await DB.list('series')).filter(s => s.ejercicio === slug && s.sesion_id !== S.sesionActiva?.id);
  if (!todas.length) return null;
  const porSesion = {};
  todas.forEach(s => { (porSesion[s.sesion_id] = porSesion[s.sesion_id] || []).push(s); });
  const ult = Object.values(porSesion).sort((a,b) => new Date(a[0].created_at) - new Date(b[0].created_at)).pop();
  const max = ult.reduce((m,s) => s.peso > m.peso ? s : m, ult[0]);
  return max;
}

async function renderSesion(plan){
  const zona = $('#sesion-zona');
  const swaps = JSON.parse(localStorage.getItem('entrena_swaps') || '{}');
  let html = '';
  for (const ej of plan.ejercicios){
    const slug = swaps[ej.slug] || ej.slug;
    const info = EJERCICIOS[slug];
    const nSeries = seriesDelPlan(ej);
    const hechas = S.series.filter(s => s.ejercicio === slug);
    const done = hechas.length >= nSeries;
    const unidad = info.unidad === 'seg' ? 'seg' : 'reps';
    const prev = await ultimaCarga(slug);
    let rows = '';
    for (let i = 1; i <= nSeries; i++){
      const h = hechas[i-1];
      rows += `<div class="serie-row" data-slug="${slug}" data-n="${i}">
        <div class="n">${i}</div>
        <input type="number" step="0.5" inputmode="decimal" placeholder="kg" value="${h ? h.peso : (prev ? prev.peso : '')}" ${h?'disabled':''} class="in-peso">
        <input type="number" inputmode="numeric" placeholder="${ej.reps[0]}-${ej.reps[1]} ${unidad}" value="${h ? h.reps : ''}" ${h?'disabled':''} class="in-reps">
        <button class="ok ${h?'on':''}" ${h?'disabled':''} aria-label="Marcar serie">✓</button>
      </div>`;
    }
    html += `<div class="ej ${done?'done':''} ${!done?'':''}" id="ej-${ej.slug}">
      <div class="ej-head" data-toggle="${ej.slug}">
        <img class="ej-img" src="img/${slug}_0.jpg" alt="${esc(info.es)}" data-imgs="img/${slug}_0.jpg,img/${slug}_1.jpg" loading="lazy">
        <div class="ej-tit"><h3>${esc(info.es)}</h3><span class="muted">${nSeries} × ${ej.reps[0]}${ej.reps[1]!==ej.reps[0] ? '–'+ej.reps[1] : ''} ${unidad}${info.porLado ? ' por pierna' : ''}</span></div>
        <button class="ej-check" aria-label="Ejercicio completo">✓</button>
      </div>
      <div class="ej-body">
        ${prev ? `<div class="prev">Última vez: ${prev.peso} kg × ${prev.reps}</div>` : ''}
        <p class="ej-nota">${esc(info.nota)}</p>
        ${info.alt ? `<button class="btn sec mini" style="margin-bottom:10px" data-swap="${ej.slug}" data-to="${swaps[ej.slug] ? '' : info.alt}">${swaps[ej.slug] ? 'Volver a goblet' : 'Usar barra (sem. 3+)'}</button>` : ''}
        ${rows}
      </div>
    </div>`;
  }
  const totalDone = plan.ejercicios.filter(ej => {
    const slug = swaps[ej.slug] || ej.slug;
    return S.series.filter(s => s.ejercicio === slug).length >= seriesDelPlan(ej);
  }).length;
  const fin = totalDone === plan.ejercicios.length;
  html += `<button class="btn" id="terminar" ${S.sesionActiva?.completada ? 'disabled' : ''}>${S.sesionActiva?.completada ? 'Sesión guardada ✓' : (fin ? 'Terminar sesión 🔥' : 'Terminar sesión (incompleta)')}</button><div class="spacer"></div>`;
  zona.innerHTML = html;
  setRing(totalDone, plan.ejercicios.length);

  // interacciones
  $$('.ej-head').forEach(h => h.onclick = e => { if (e.target.closest('.ej-check')) return; h.closest('.ej').classList.toggle('open'); });
  // alternar imagen inicio/fin del movimiento (limpiando intervalos previos)
  (S.imgTimers || []).forEach(clearInterval);
  S.imgTimers = $$('.ej-img').map(img => { let i = 0; const srcs = img.dataset.imgs.split(','); return setInterval(() => { i = 1 - i; img.src = srcs[i]; }, 1400); });
  // marcar serie
  $$('.serie-row .ok:not(.on)').forEach(btn => btn.onclick = async () => {
    const row = btn.closest('.serie-row');
    const peso = parseFloat(row.querySelector('.in-peso').value);
    const reps = parseInt(row.querySelector('.in-reps').value);
    if (isNaN(peso) || isNaN(reps)) return toast('Anota peso y repeticiones');
    await DB.insert('series', { sesion_id: S.sesionActiva.id, ejercicio: row.dataset.slug, serie: +row.dataset.n, peso, reps });
    S.series = await DB.list('series', { sesion_id: S.sesionActiva.id });
    renderSesion(plan);
  });
  // check ejercicio completo (marca las series restantes con lo escrito)
  $$('.ej-check').forEach(btn => btn.onclick = e => e.stopPropagation());
  // cambiar goblet ↔ barra
  $$('[data-swap]').forEach(btn => btn.onclick = () => {
    const sw = JSON.parse(localStorage.getItem('entrena_swaps') || '{}');
    if (btn.dataset.to) sw[btn.dataset.swap] = btn.dataset.to; else delete sw[btn.dataset.swap];
    localStorage.setItem('entrena_swaps', JSON.stringify(sw));
    renderSesion(plan);
  });
  const t = $('#terminar');
  if (t && !S.sesionActiva?.completada) t.onclick = async () => {
    await DB.update('sesiones', S.sesionActiva.id, { completada: true });
    S.sesionActiva.completada = true;
    toast(fin ? 'Jornada completa. Ahora: proteína. 💪' : 'Sesión guardada');
    renderSesion(plan);
  };
}

// ============================================================
// PROGRESO
// ============================================================
async function renderProgreso(){
  const mets = (await DB.list('metricas')).sort((a,b) => a.fecha.localeCompare(b.fecha));
  const sesiones = await DB.list('sesiones');
  const gym = sesiones.filter(s => s.dia !== 'caminata' && s.completada);

  // stats
  const ult = mets[mets.length - 1];
  const primero = mets[0];
  const perdido = ult && primero ? (primero.peso - ult.peso).toFixed(1) : '0.0';
  $('#stats-zona').innerHTML = `
    <div class="stat"><div class="v">${ult ? ult.peso : '—'}</div><div class="l">kg actual</div></div>
    <div class="stat"><div class="v" style="color:var(--accent)">−${perdido}</div><div class="l">kg perdidos</div></div>
    <div class="stat"><div class="v">${gym.length}</div><div class="l">sesiones gym</div></div>
    <div class="stat"><div class="v">${ult ? (ult.peso - 85).toFixed(1) : '—'}</div><div class="l">kg a la meta (85)</div></div>`;

  // chart cuerpo
  drawChart('cuerpo', $('#chart-cuerpo'), {
    labels: mets.map(m => m.fecha.slice(5)),
    datasets: [
      { label: 'Peso (kg)', data: mets.map(m => m.peso), borderColor: '#3EDD9B', backgroundColor: 'transparent', tension: .3 },
      { label: 'Cintura (cm)', data: mets.map(m => m.cintura), borderColor: '#F5B04D', backgroundColor: 'transparent', tension: .3 },
    ]
  });

  // selector ejercicios y chart de cargas
  const sel = $('#chart-ej-select');
  if (!sel.options.length){
    sel.innerHTML = Object.entries(EJERCICIOS).map(([k,v]) => `<option value="${k}">${v.es}</option>`).join('');
    sel.onchange = renderProgreso;
  }
  const slug = sel.value || Object.keys(EJERCICIOS)[0];
  const series = (await DB.list('series')).filter(s => s.ejercicio === slug);
  const porSesion = {};
  for (const s of series){ const key = s.sesion_id; if (!porSesion[key] || s.peso > porSesion[key].peso) porSesion[key] = s; }
  const mapa = Object.fromEntries(sesiones.map(s => [s.id, s.fecha]));
  const pts = Object.entries(porSesion).map(([sid, s]) => ({ f: mapa[sid] || '?', peso: s.peso })).sort((a,b) => a.f.localeCompare(b.f));
  drawChart('cargas', $('#chart-cargas'), {
    labels: pts.map(p => p.f.slice(5)),
    datasets: [{ label: 'Mejor serie (kg)', data: pts.map(p => p.peso), borderColor: '#3EDD9B', backgroundColor: 'rgba(62,221,155,.12)', fill: true, tension: .25 }]
  });
}

function drawChart(key, canvas, data){
  if (S.charts[key]) S.charts[key].destroy();
  S.charts[key] = new Chart(canvas, { type: 'line', data, options: {
    plugins: { legend: { labels: { color: '#7E948F', boxWidth: 12 } } },
    scales: { x: { ticks: { color: '#7E948F' }, grid: { color: '#1B2C30' } }, y: { ticks: { color: '#7E948F' }, grid: { color: '#1B2C30' } } }
  }});
}

$('#m-guardar').onclick = async () => {
  const peso = parseFloat($('#m-peso').value);
  if (isNaN(peso)) return toast('Anota al menos el peso');
  await DB.insert('metricas', {
    fecha: hoyISO(), peso,
    cintura: parseFloat($('#m-cintura').value) || null,
    ta_sis: parseInt($('#m-sis').value) || null,
    ta_dia: parseInt($('#m-dia').value) || null,
    notas: $('#m-notas').value || null,
  });
  ['#m-peso','#m-cintura','#m-sis','#m-dia','#m-notas'].forEach(s => $(s).value = '');
  toast('Métricas guardadas 📈');
  renderProgreso();
};

// ============================================================
// MEDS
// ============================================================
async function renderMeds(){
  const tomas = await DB.list('tomas', { fecha: hoyISO() });
  $('#meds-zona').innerHTML = MEDS_DIARIOS.map(m => {
    const on = tomas.some(t => t.med === m.id);
    return `<div class="med ${on?'on':''}" data-med="${m.id}">
      <button class="toggle" aria-label="Marcar toma">✓</button>
      <div class="info"><b>${esc(m.nombre)}</b><span class="muted">${esc(m.momento)}</span></div>
    </div>`;
  }).join('');
  $$('.med').forEach(el => el.onclick = async () => {
    const id = el.dataset.med;
    const previa = (await DB.list('tomas', { fecha: hoyISO() })).find(t => t.med === id);
    if (previa) await DB.remove('tomas', previa.id); else await DB.insert('tomas', { fecha: hoyISO(), med: id });
    renderMeds();
  });

  // inyectables
  const iny = await DB.list('inyecciones');
  $('#iny-zona').innerHTML = INYECTABLES.map(x => {
    const ultimas = iny.filter(i => i.tipo === x.id).sort((a,b) => a.fecha.localeCompare(b.fecha));
    const ult = ultimas[ultimas.length - 1];
    const dias = ult ? Math.floor((new Date(hoyISO()) - new Date(ult.fecha)) / 864e5) : null;
    const due = dias !== null && dias >= x.cadaDias;
    return `<div class="iny">
      <div class="big ${due?'due':''}">${dias === null ? '—' : `${dias}<span style="font-size:.7rem;color:var(--muted)">/${x.cadaDias}</span>`}</div>
      <div class="info"><b>${esc(x.nombre)}</b><div class="muted">${esc(x.detalle)}${ult ? ' · última: ' + ult.fecha : ' · sin registro'}</div>
      ${due ? '<div class="pill warn" style="margin-top:6px">Toca aplicar</div>' : ''}</div>
      <button class="btn sec mini" data-iny="${x.id}">Hoy ✓</button>
    </div>`;
  }).join('');
  $$('[data-iny]').forEach(b => b.onclick = async () => {
    await DB.insert('inyecciones', { fecha: hoyISO(), tipo: b.dataset.iny });
    toast('Inyección registrada 💉');
    renderMeds();
  });
}

// ============================================================
// MENTE
// ============================================================
let respTimer = null, medTimer = null;

$$('[data-resp]').forEach(b => b.onclick = () => startResp(RESPIRACIONES[b.dataset.resp]));

function startResp(r){
  stopResp();
  const orb = $('#orb'), fase = $('#fase-txt');
  $('#resp-stop').style.display = 'block';
  fase.textContent = r.desc;
  let ciclo = 0, fi = 0, inicio = Date.now();
  const paso = () => {
    if (ciclo >= r.ciclos){ finResp(inicio, r.nombre); return; }
    const [nombre, seg] = r.fases[fi];
    orb.textContent = nombre;
    fase.textContent = `${nombre} ${seg} segundos · ciclo ${ciclo + 1} de ${r.ciclos}`;
    orb.style.transition = `transform ${seg}s linear`;
    orb.style.transform = nombre === 'Inhala' ? 'scale(1.35)' : nombre === 'Exhala' ? 'scale(1)' : orb.style.transform;
    respTimer = setTimeout(() => { fi = (fi + 1) % r.fases.length; if (fi === 0) ciclo++; paso(); }, seg * 1000);
  };
  paso();
}
async function finResp(inicio, nombre){
  stopResp(true);
  const min = Math.max(Math.round((Date.now() - inicio) / 6000) / 10, 0.5);
  await DB.insert('meditaciones', { fecha: hoyISO(), tipo: nombre, minutos: min });
  toast('Respiración completa 🌿');
  renderMente();
}
function stopResp(silent){
  clearTimeout(respTimer);
  $('#orb').style.transform = 'scale(1)';
  $('#orb').textContent = 'Listo';
  $('#fase-txt').textContent = silent ? 'Bien hecho' : 'Elige un ejercicio para empezar';
  $('#resp-stop').style.display = 'none';
}
$('#resp-stop').onclick = () => stopResp();

$$('[data-timer]').forEach(b => b.onclick = () => startMedTimer(+b.dataset.timer));
function startMedTimer(min){
  clearInterval(medTimer);
  const stage = $('#timer-stage'), orb = $('#timer-orb');
  stage.style.display = 'flex';
  $('#timer-stop').style.display = 'block';
  let restante = min * 60;
  const inicio = min;
  const tick = () => {
    orb.textContent = `${Math.floor(restante/60)}:${String(restante%60).padStart(2,'0')}`;
    if (restante-- <= 0){ finMedTimer(inicio); }
  };
  tick();
  medTimer = setInterval(tick, 1000);
}
async function finMedTimer(min){
  clearInterval(medTimer);
  $('#timer-stage').style.display = 'none';
  $('#timer-stop').style.display = 'none';
  await DB.insert('meditaciones', { fecha: hoyISO(), tipo: 'Temporizador', minutos: min });
  toast('Meditación registrada 🧘');
  renderMente();
}
$('#timer-stop').onclick = () => { clearInterval(medTimer); $('#timer-stage').style.display = 'none'; $('#timer-stop').style.display = 'none'; };

async function renderMente(){
  let links = await DB.list('enlaces_meditacion');
  if (!links.length){
    for (const l of MEDITACIONES_SEED) await DB.insert('enlaces_meditacion', l);
    links = await DB.list('enlaces_meditacion');
  }
  $('#medit-links').innerHTML = links.map(l =>
    `<a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.titulo)}</span><span class="arrow">↗</span></a>`
  ).join('');
  const sesiones = await DB.list('meditaciones');
  const dias = new Set(sesiones.map(s => s.fecha)).size;
  const mins = sesiones.reduce((a,s) => a + (s.minutos || 0), 0);
  $('#mente-racha').textContent = sesiones.length
    ? `${sesiones.length} sesiones · ${dias} días distintos · ${Math.round(mins)} minutos acumulados. La calma también baja la presión arterial.`
    : 'Aún sin sesiones. Dos minutos de respiración de caja cuentan.';
}

$('#link-add').onclick = async () => {
  const titulo = $('#link-titulo').value.trim(), url = $('#link-url').value.trim();
  if (!titulo || !/^https?:\/\//.test(url)) return toast('Nombre y URL válida (https://…)');
  await DB.insert('enlaces_meditacion', { titulo, url });
  $('#link-titulo').value = ''; $('#link-url').value = '';
  renderMente();
};

// ============================================================
// arranque + auth
// ============================================================
async function boot(){
  if (SUPA_ON){
    supa = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    DB = SupaDB;
    $('#modo-pill').textContent = 'nube';
    const { data: { session } } = await supa.auth.getSession();
    if (!session){
      $('#login').style.display = 'block';
      $('#login-btn').onclick = async () => {
        const email = $('#login-email').value.trim();
        const password = $('#login-pass').value;
        if (!email || !password) return ($('#login-msg').textContent = 'Escribe correo y contraseña.');
        $('#login-msg').textContent = 'Entrando…';
        const { error } = await supa.auth.signInWithPassword({ email, password });
        if (error){ $('#login-msg').textContent = 'Correo o contraseña incorrectos.'; return; }
        location.reload();
      };
      $('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') $('#login-btn').click(); });
      return;
    }
  } else {
    $('#modo-pill').textContent = 'local';
  }
  $('#app').style.display = 'block';
  renderHoy();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
