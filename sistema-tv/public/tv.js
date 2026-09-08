'use strict';
/* ============================================================
   Mural — player das TVs
   Reescrito em JavaScript compatível com navegadores antigos
   de Smart TV: sem "fetch", sem funções modernas. Fala com o
   servidor a cada 3s, avança sozinho, faz loop, obedece à fila,
   pausa/pula, e continua exibindo se a internet cair.
   ============================================================ */

var TOKEN = decodeURIComponent(location.pathname.split('/').pop());
var KEY = 'mural:' + TOKEN;

// ---------- utilidades ----------
function byId(id) { return document.getElementById(id); }
function esc(s) {
  s = (s === null || s === undefined) ? '' : String(s);
  return s.replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
// substitui classList (ausente em navegadores de TV bem antigos)
function setClass(el, cls, on) {
  if (!el) return;
  var parts = el.className.split(/\s+/);
  var i = parts.indexOf(cls);
  if (on && i < 0) parts.push(cls);
  if (!on && i >= 0) parts.splice(i, 1);
  el.className = parts.join(' ');
}
function setBar(frac) {
  if (frac < 0) frac = 0;
  if (frac > 1) frac = 1;
  byId('bar').style.width = (frac * 100) + '%';
}
function claro(hex) {
  var n = parseInt(String(hex || '#000').replace('#', ''), 16);
  if (isNaN(n)) return false;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) > 150;
}
function dois(n) { return (n < 10 ? '0' : '') + n; }

// ---------- estado ----------
var st = {
  device: null,      // {name, orientation}
  default: null,     // playlist padrão
  queue: [],         // fila de playlists
  cur: null,         // {list, playlistId, playlistName, version, index, entryId}
  paused: false,
  timer: null, endAt: 0, total: 0, remain: 0, usingTimer: false,
  finishedEntry: null,
  offline: false, started: false, videoEl: null, layerA: true
};

function marcarOffline() {
  st.offline = true;
  setClass(document.body, 'off', true);
  st.finishedEntry = null;
}

// ---------- comunicação com o servidor (XMLHttpRequest: funciona em toda TV) ----------
function poll() {
  var atual = (st.cur && st.cur.list) ? st.cur.list[st.cur.index] : null;
  var corpo = JSON.stringify({
    token: TOKEN,
    current_media_id: atual ? atual.media_id : null,
    current_playlist_id: st.cur ? st.cur.playlistId : null,
    paused: !!st.paused,
    finished_queue_entry: (st.finishedEntry === undefined) ? null : st.finishedEntry
  });
  var x = new XMLHttpRequest();
  x.open('POST', '/api/player/state', true);
  x.setRequestHeader('Content-Type', 'application/json');
  x.onreadystatechange = function () {
    if (x.readyState !== 4) return;
    if (x.status === 404) { // link renovado ou apagado
      setClass(byId('fatal'), 'hidden', false);
      setClass(byId('start'), 'hidden', true);
      return;
    }
    if (x.status !== 200) { marcarOffline(); return; }
    var data = null;
    try { data = JSON.parse(x.responseText); } catch (e) { marcarOffline(); return; }
    st.offline = false;
    setClass(document.body, 'off', false);
    // guarda tudo para sobreviver offline
    try { localStorage.setItem(KEY, JSON.stringify({ device: data.device, default: data.default, queue: data.queue })); } catch (e) {}
    aplicarEstado(data);
  };
  x.onerror = function () { marcarOffline(); };
  try { x.send(corpo); } catch (e) { marcarOffline(); }
}

function aplicarEstado(data) {
  var reiniciar = false;
  var cmds = (data && data.commands) ? data.commands : [];
  for (var i = 0; i < cmds.length; i++) {
    var a = cmds[i].action;
    if (a === 'play' || a === 'back') reiniciar = true;
    else if (a === 'skip') { if (st.timer) clearTimeout(st.timer); st.paused = false; proximoItem(); }
    else if (a === 'pause') pausar();
    else if (a === 'resume') retomar();
  }
  st.default = (data && data.default) ? data.default : null;
  st.queue = (data && data.queue) ? data.queue : [];
  if (data && data.device) st.device = data.device;
  setClass(document.body, 'vert', !!(st.device && st.device.orientation === 'vertical'));
  atualizarHud();
  if (reiniciar) { if (st.timer) clearTimeout(st.timer); st.paused = false; comecarTocando(); return; }
  if (!st.cur) comecarTocando();
  else sincronizarVersao();
}

// ---------- máquina de exibição ----------
function comecarTocando() {
  if (st.default && st.default.items && st.default.items.length) {
    tocarPlaylist(st.default, null, 0);
  } else if (st.queue.length && st.queue[0].playlist) {
    tocarPlaylist(st.queue[0].playlist, st.queue[0].entry_id, 0);
  } else {
    mostrarParado(
      st.default ? 'A playlist padrão está vazia' : 'Sem programação agora',
      st.default ? 'Adicione mídias a esta playlist no painel do Mural. Esta tela se atualiza sozinha.'
                 : 'No painel do Mural, escolha uma playlist e toque em "Exibir agora".'
    );
  }
}
function tocarPlaylist(p, entryId, idx) {
  st.cur = { list: p.items, playlistId: p.id, playlistName: p.name, version: p.version, index: idx, entryId: entryId };
  mostrarItem();
}
function proximoItem() {
  if (!st.cur) return;
  st.cur.index++;
  if (st.cur.index >= st.cur.list.length) fimDaPlaylist();
  else mostrarItem();
}
function fimDaPlaylist() {
  if (st.cur && st.cur.entryId) { // era da fila: avisa o servidor
    st.finishedEntry = st.cur.entryId;
    var restante = [];
    for (var i = 0; i < st.queue.length; i++)
      if (st.queue[i].entry_id !== st.cur.entryId) restante.push(st.queue[i]);
    st.queue = restante;
  }
  if (st.queue.length && st.queue[0].playlist) tocarPlaylist(st.queue[0].playlist, st.queue[0].entry_id, 0);
  else if (st.default && st.default.items && st.default.items.length) tocarPlaylist(st.default, null, 0);
  else comecarTocando();
}
// a playlist mudou no painel? recarrega sem quebrar o ritmo
function sincronizarVersao() {
  var cur = st.cur, fonte = null, i;
  if (cur.entryId) {
    for (i = 0; i < st.queue.length; i++)
      if (st.queue[i].entry_id === cur.entryId) { fonte = st.queue[i].playlist; break; }
  } else if (st.default && st.default.id === cur.playlistId) {
    fonte = st.default;
  }
  if (!fonte) { comecarTocando(); return; }
  if (fonte.version !== cur.version) {
    var mantem = cur.index;
    cur.list = fonte.items; cur.version = fonte.version; cur.playlistName = fonte.name;
    if (mantem >= cur.list.length) cur.index = 0;
    mostrarItem();
  }
}

// ---------- render de um item ----------
function mostrarItem() {
  var it = st.cur.list[st.cur.index];
  if (!it) { fimDaPlaylist(); return; }
  st.videoEl = null; st.paused = false; setBar(0);

  var entra = st.layerA ? byId('layerB') : byId('layerA');
  var sai   = st.layerA ? byId('layerA') : byId('layerB');
  st.layerA = !st.layerA;
  entra.innerHTML = renderConteudo(it);
  setClass(entra, 'show', true);
  setClass(sai, 'show', false);

  if (it.kind === 'video') {
    st.usingTimer = false; st.total = 0;
    var v = entra.getElementsByTagName('video')[0];
    if (v) ligarVideo(v);
  } else {
    st.usingTimer = true;
    agendaTimer((it.duration_seconds || 10) * 1000);
  }
  atualizarHud();
}
function renderConteudo(it) {
  if (it.kind === 'image') return '<img src="' + esc(it.file_path) + '" alt="">';
  if (it.kind === 'video') return '<video src="' + esc(it.file_path) + '" autoplay playsinline></video>';
  var cls = claro(it.bg_color) ? 'dark' : 'light';
  return '<div class="notice" style="background:' + esc(it.bg_color) + '">' +
    '<div class="notice-in ' + cls + '"><h1>' + esc(it.title || '') + '</h1>' +
    '<p>' + esc(it.body || '') + '</p></div></div>';
}
function ligarVideo(v) {
  st.videoEl = v;
  var caiu = false;
  var pular = function () { if (!caiu) { caiu = true; proximoItem(); } };
  v.addEventListener('ended', pular);
  v.addEventListener('error', function () { setTimeout(pular, 800); });
  v.addEventListener('timeupdate', function () { if (v.duration) setBar(v.currentTime / v.duration); });
  var tentar = function () {
    var p = v.play();
    if (p && p.catch) p.catch(function () {   // sem gesto, some o som e tenta de novo
      if (caiu) return;
      v.muted = true;
      var p2 = v.play();
      if (p2 && p2.catch) p2.catch(function () { setTimeout(pular, 2500); });
    });
  };
  tentar();
  setTimeout(function () { if (!caiu && v.readyState < 2) pular(); }, 8000); // vídeo travado não para a TV
}

// ---------- tempo: avançar, pausar, retomar ----------
function agendaTimer(ms) {
  st.total = ms;
  if (st.timer) clearTimeout(st.timer);
  st.endAt = Date.now() + ms;
  st.timer = setTimeout(proximoItem, ms);
}
function pausar() {
  if (st.paused || !st.cur) return;
  st.paused = true;
  if (st.usingTimer) { if (st.timer) clearTimeout(st.timer); st.remain = Math.max(0, st.endAt - Date.now()); }
  if (st.videoEl) st.videoEl.pause();
  atualizarHud();
}
function retomar() {
  if (!st.paused || !st.cur) return;
  st.paused = false;
  if (st.usingTimer) agendaTimer(Math.max(600, st.remain));
  if (st.videoEl) { var p = st.videoEl.play(); if (p && p.catch) p.catch(function () {}); }
  atualizarHud();
}
setInterval(function () { // barra de progresso dos itens com tempo fixo
  if (!st.cur || !st.usingTimer || !st.total) return;
  var restante = st.paused ? st.remain : Math.max(0, st.endAt - Date.now());
  setBar(1 - restante / st.total);
}, 400);

// ---------- hud, relógio, telas de apoio ----------
function atualizarHud() {
  var t = (st.device && st.device.name) ? st.device.name : 'Mural';
  if (st.cur && st.cur.playlistName) t += '  •  ' + st.cur.playlistName;
  byId('hud-left').textContent = t;
  setClass(byId('idle'), 'hidden', !!st.cur);
}
function mostrarParado(titulo, texto) {
  st.cur = null;
  if (st.timer) clearTimeout(st.timer);
  setBar(0); st.videoEl = null;
  setClass(byId('layerA'), 'show', false);
  setClass(byId('layerB'), 'show', false);
  byId('idle-titulo').textContent = titulo;
  byId('idle-texto').innerHTML = esc(texto).replace(/\n/g, '<br>');
  setClass(byId('idle'), 'hidden', false);
  atualizarHud();
}
setInterval(function () {
  var d = new Date();
  byId('clock').textContent = dois(d.getHours()) + ':' + dois(d.getMinutes());
}, 1000);

// ---------- modo tela cheia + cursor invisível ----------
// ---------- HUD que some sozinho com fade ----------
// Tempo (em milissegundos) que o HUD fica visível sem interação.
// Troque 3000 por 2000 se preferir 2 segundos.
var HUD_MS = 3000;
var hudTimer = null;
function mostrarHud() {
  setClass(document.body, 'hud-off', false);
  if (hudTimer) clearTimeout(hudTimer);
  hudTimer = setTimeout(function () {
    setClass(document.body, 'hud-off', true);
  }, HUD_MS);
}

// ---------- modo tela cheia + cursor invisível ----------
function pedidoTelaCheia() {
  var el = document.documentElement;
  var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (fn) { try { fn.call(el); } catch (e) {} }
}
function emTelaCheia() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
}
function entrarTelaCheia() {
  pedidoTelaCheia();
  setClass(byId('start'), 'hidden', true);
  st.started = true;
  try { if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen'); } catch (e) {}
}
byId('start-btn').addEventListener('click', function () {
  entrarTelaCheia();
  mostrarHud();
});
document.addEventListener('click', function () {
  if (!st.started) entrarTelaCheia();
  mostrarHud();
});
function atualizarBotaoFs() { setClass(byId('fs'), 'hidden', emTelaCheia() || !st.started); }
document.addEventListener('fullscreenchange', atualizarBotaoFs);
document.addEventListener('webkitfullscreenchange', atualizarBotaoFs);
byId('fs').addEventListener('click', function () { entrarTelaCheia(); mostrarHud(); });

// Qualquer interação traz o HUD de volta e reinicia a contagem:
// mouse (desktop), toque (TV touch), tecla (controle remoto).
var mouseTimer = null;
document.addEventListener('mousemove', function () {
  document.body.style.cursor = 'default';
  if (mouseTimer) clearTimeout(mouseTimer);
  mouseTimer = setTimeout(function () { document.body.style.cursor = 'none'; }, 3000);
  mostrarHud();
});
document.addEventListener('touchstart', mostrarHud);
document.addEventListener('keydown', mostrarHud);

// ---------- partida: cache offline primeiro, rede depois ----------
try {
  var salvo = JSON.parse(localStorage.getItem(KEY));
  if (salvo) {
    st.device = salvo.device || null;
    st.default = salvo.default || null;
    st.queue = salvo.queue || [];
    if (salvo.device && salvo.device.name) byId('start-name').textContent = salvo.device.name;
    setClass(document.body, 'vert', !!(salvo.device && salvo.device.orientation === 'vertical'));
    comecarTocando(); // já entra tocando por trás do overlay
  }
} catch (e) {}
poll();
setInterval(poll, 3000);
mostrarHud(); // liga a contagem inicial: 3s depois de ligar, o HUD some