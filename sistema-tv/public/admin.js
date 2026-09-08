'use strict';
/* ============================================================
   Mural — painel administrativo (interface toda em JS puro)
   ============================================================ */

// ---------- utilidades básicas ----------
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Ícones (traço simples, sempre acompanhados de rótulo nos botões)
const IC = {
  play:'<polygon points="5 3 19 12 5 21 5 3"/>',
  pause:'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  skip:'<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
  rotate:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  tv:'<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  video:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  type:'<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  queue:'<line x1="3" y1="6" x2="13" y2="6"/><line x1="3" y1="12" x2="13" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/><line x1="17" y1="8" x2="17" y2="18"/><line x1="12" y1="13" x2="22" y2="13"/>',
  up:'<polyline points="18 15 12 9 6 15"/>',
  down:'<polyline points="6 9 12 15 18 9"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  arrowleft:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  grip:'<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>'
};
const ic = (n, s = 20) =>
  `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

// Formatações amigáveis (sem números crus na cara do usuário)
function fmtDur(s) {
  s = Math.round(s || 0);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), r = s % 60, h = Math.floor(m / 60);
  if (!h) return r ? `${m} min ${String(r).padStart(2,'0')} s` : `${m} min`;
  return `${h} h ${String(m % 60).padStart(2,'0')} min`;
}
function fmtAgo(iso) {
  if (!iso) return 'nunca';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 10) return 'agora mesmo';
  if (s < 60) return `há ${Math.floor(s)} s`;
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} dia(s)`;
}
const fmtBytes = b => !b ? '' : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`;

// ---------- estado global + cliente da API ----------
const state = { user: null };
let pollTimer = null;
const startPoll = (fn, ms) => { stopPoll(); pollTimer = setInterval(fn, ms); };
const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };

async function api(method, url, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) {
    if (r.status === 401) { state.user = null; showLogin(); }
    throw new Error(data.erro || 'Não foi possível concluir. Tente de novo.');
  }
  return data;
}

// ---------- toast + modal ----------
function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast' + (tipo === 'err' ? ' err' : '');
  t.innerHTML = `${ic(tipo === 'err' ? 'x' : 'check', 18)} ${esc(msg)}`;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2800);
}
function openModal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal">${html}</div></div>`;
  const ov = root.firstElementChild;
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
  const f = ov.querySelector('input,textarea,button'); if (f) f.focus();
  return ov;
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };

// Confirmação em linguagem simples.
function confirmar(titulo, texto, rotulo = 'Excluir') {
  return new Promise(resolve => {
    const ov = openModal(`<h3>${esc(titulo)}</h3><p>${esc(texto)}</p>
      <div class="row end"><button class="btn" id="c-no">Cancelar</button>
      <button class="btn danger" id="c-yes">${ic('trash')} ${esc(rotulo)}</button></div>`);
    ov.querySelector('#c-no').onclick = () => { closeModal(); resolve(false); };
    ov.querySelector('#c-yes').onclick = () => { closeModal(); resolve(true); };
  });
}
// Pergunta com campo de texto.
function perguntar(titulo, label, valor = '') {
  return new Promise(resolve => {
    const ov = openModal(`<h3>${esc(titulo)}</h3>
      <label class="field"><span>${esc(label)}</span><input type="text" id="p-in" value="${esc(valor)}"></label>
      <div class="row end"><button class="btn" id="p-no">Cancelar</button>
      <button class="btn primary" id="p-ok">Salvar</button></div>`);
    const done = v => { closeModal(); resolve(v); };
    ov.querySelector('#p-ok').onclick = () => done(ov.querySelector('#p-in').value.trim());
    ov.querySelector('#p-no').onclick = () => done(null);
    ov.querySelector('#p-in').addEventListener('keydown', e => { if (e.key === 'Enter') done(ov.querySelector('#p-in').value.trim()); });
  });
}
async function copiarTexto(t) {
  try { await navigator.clipboard.writeText(t); toast('Copiado!'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copiado!'); }
    catch { toast('Não deu para copiar sozinho. Selecione o texto e copie.', 'err'); }
    ta.remove();
  }
}

// ---------- topo / navegação / relógio ----------
let clockTimer = null;
function renderShell() {
  const u = state.user;
  $('#topbar').classList.remove('hidden');
  $('#topbar').innerHTML = `
    <a class="brand" href="#/tvs"><span class="brand-badge"><img src="./icons/senai.svg" alt=""></span>
      <span class="brand-txt">Painel<small>TVs SENAI</small></span></a>
    <nav>
      <a href="#/tvs" data-nav="tvs">${ic('tv',18)} Minhas TVs</a>
      <a href="#/playlists" data-nav="playlists">${ic('folder',18)} Playlists</a>
      <a href="#/biblioteca" data-nav="biblioteca">${ic('image',18)} Biblioteca</a>
      ${u.role === 'master' ? `<a href="#/admins" data-nav="admins">${ic('users',18)} Administradores</a>` : ''}
      <span class="clock" id="clock"></span>
      <button id="logout" class="btn small">${ic('logout',18)} Sair</button>
    </nav>`;
  $('#logout').onclick = async () => { await api('POST', '/api/logout'); state.user = null; showLogin(); };
  if (!clockTimer) clockTimer = setInterval(() => {
    const el = $('#clock'); if (!el) return;
    el.textContent = new Date().toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' })
      + ' — ' + new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  }, 1000);
}
function setActiveNav(k) { $$('#topbar nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === k)); }

// ---------- login ----------
function showLogin() {
  stopPoll();
  $('#topbar').classList.add('hidden');
  app.innerHTML = `<div class="login-wrap"><div class="login-card">
    <div class="login-stripe"></div>
    <div class="login-in">
    <div style="margin-bottom:14px"><img src="./icons/senai.svg" alt="" style="height:56px;display:block"></div>
      <h1>Painel de controle</h1>
      <h2 style: margin=0;>TVs SENAI</h2>
      <p class="sub">Entre com o seu login.</p>
      <hr>
      <div id="login-erro"></div>
      <form id="login-form">
        <label class="field"><span>Login</span><input type="text" name="login" autocomplete="username" required></label>
        <label class="field"><span>Senha</span><input type="password" name="senha" autocomplete="current-password" required></label>
        <button class="btn primary" style="width:100%">Entrar</button>
      </form>
    </div></div></div>`;
  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const { user } = await api('POST', '/api/login', { login: fd.get('login'), senha: fd.get('senha') });
      state.user = user;
      renderShell();
      location.hash = '#/tvs';
      navigate();
    } catch (err) {
      $('#login-erro').innerHTML = `<div class="login-erro">${esc(err.message)}</div>`;
    }
  };
}

// ============================================================
// TELA: Minhas TVs (passo 1 do fluxo)
// ============================================================
async function viewDevices() {
  setActiveNav('tvs');
  app.innerHTML = `<div class="page">
    <div class="page-head">
      <div><h1>Minhas TVs</h1><p class="sub">Toque em <strong>Abrir controle</strong> para escolher o que a TV mostra.</p></div>
      <button class="btn primary" id="novo-dev">${ic('plus')} Nova TV</button>
    </div>
    <div id="dev-list" class="grid-devs"><div class="loading">Carregando…</div></div>
  </div>`;
  $('#novo-dev').onclick = () => formDevice();
  await refreshDevices();
  startPoll(refreshDevices, 4000);
}
async function refreshDevices() {
  let data;
  try { data = await api('GET', '/api/status'); } catch { return; }
  const box = $('#dev-list'); if (!box) return;
  if (!data.devices.length) {
    box.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:46px">
      ${ic('tv', 44)}<h3 style="margin-top:10px">Nenhuma TV cadastrada ainda</h3>
      <p class="sub" style="margin:6px auto 16px">Toque em <strong>Nova TV</strong> aí em cima para começar.</p></div>`;
    return;
  }
  box.innerHTML = data.devices.map(d => `
    <article class="card dev-card" style="margin:0">
      <div class="dev-top"><span class="tag">${esc(d.location || 'Sem local')}</span>
        <span class="dot-line ${d.online ? 'on' : ''}"><span class="dot ${d.online ? 'on' : ''}"></span>${d.online ? 'Online' : 'Sem sinal'}</span></div>
      <h3>${esc(d.name)}</h3>
      <p class="onair">${ic('play',15)} No ar: <strong>${esc(d.assigned_playlist_name || 'nada ainda')}</strong></p>
      <p class="muted small">${d.paused ? 'Pausada' : d.online ? (d.current_media_name ? `Tocando: ${esc(d.current_media_name)}` : 'Ligada e aguardando') : 'TV desligada ou sem internet'}</p>
      <div class="row"><button class="btn primary" data-go="${d.id}">${ic('tv')} Abrir controle</button></div>
      <div class="dev-menu">
        <button class="link-btn" data-edit="${d.id}">${ic('edit',17)} Editar</button>
        <button class="link-btn" data-copy="${d.id}">${ic('link',17)} Copiar link</button>
        <button class="link-btn danger" data-del="${d.id}" data-nome="${esc(d.name)}">${ic('trash',17)} Excluir</button>
      </div>
    </article>`).join('');
  $$('[data-go]', box).forEach(b => b.onclick = () => { location.hash = `#/tv/${b.dataset.go}`; });
  $$('[data-edit]', box).forEach(b => b.onclick = () => {
    const d = data.devices.find(x => x.id == b.dataset.edit); formDevice(d);
  });
  $$('[data-copy]', box).forEach(b => b.onclick = () => {
    const d = data.devices.find(x => x.id == b.dataset.copy);
    copiarTexto(`${location.origin}/tv/${d.token}`);
  });
  $$('[data-del]', box).forEach(b => b.onclick = async () => {
    if (await confirmar('Excluir TV', `"${b.dataset.nome}" vai sair da lista e o link dela para de funcionar. Confirma?`)) {
      try { await api('DELETE', `/api/devices/${b.dataset.del}`); toast('TV excluída'); refreshDevices(); }
      catch (e) { toast(e.message, 'err'); }
    }
  });
}
// Formulário de nova TV / edição
function formDevice(d) {
  const ed = !!d;
  const ov = openModal(`<h3>${ed ? 'Editar TV' : 'Nova TV'}</h3>
    <label class="field"><span>Nome da TV</span><input type="text" id="f-nome" value="${esc(d?.name || '')}" placeholder="Ex.: TV da entrada"></label>
    <label class="field"><span>Onde ela fica</span><input type="text" id="f-local" value="${esc(d?.location || '')}" list="locais" placeholder="Ex.: Biblioteca">
      <datalist id="locais"><option>Biblioteca</option><option>Secretaria</option><option>Sala de Aula 1</option><option>Sala dos Professores</option><option>Cantina</option><option>Auditório</option><option>Recepção</option></datalist></label>
    <div class="field"><span>Posição na parede</span>
      <div class="row">
        <label class="btn" style="min-height:44px"><input type="radio" name="f-ori" value="horizontal" ${d?.orientation !== 'vertical' ? 'checked' : ''} style="margin-right:8px">Deitada (horizontal)</label>
        <label class="btn" style="min-height:44px"><input type="radio" name="f-ori" value="vertical" ${d?.orientation === 'vertical' ? 'checked' : ''} style="margin-right:8px">Em pé (vertical)</label>
      </div>
      <p class="muted small" style="margin:6px 0 0">Escolha "Em pé" só se a imagem aparecer deitada na TV.</p></div>
    <label class="field"><span>Observações (opcional)</span><input type="text" id="f-notas" value="${esc(d?.notes || '')}" placeholder="Ex.: TV de 43 polegadas na entrada"></label>
    <div class="row end"><button class="btn" id="f-cancel">Cancelar</button>
      <button class="btn primary" id="f-ok">${ic('check')} Salvar</button></div>`);
  ov.querySelector('#f-cancel').onclick = closeModal;
  ov.querySelector('#f-ok').onclick = async () => {
    const corpo = {
      name: ov.querySelector('#f-nome').value,
      location: ov.querySelector('#f-local').value,
      orientation: ov.querySelector('[name=f-ori]:checked').value,
      notes: ov.querySelector('#f-notas').value
    };
    try {
      if (ed) await api('PUT', `/api/devices/${d.id}`, corpo);
      else {
        const { device } = await api('POST', '/api/devices', corpo);
        toast('TV criada! Abra o controle para pegar o link.');
        closeModal(); location.hash = `#/tv/${device.id}`; return;
      }
      toast('TV salva'); closeModal(); refreshDevices();
    } catch (e) { toast(e.message, 'err'); }
  };
}

// ============================================================
// TELA: Controle de uma TV (passos 2 e 3 do fluxo)
// ============================================================
async function viewControl(id) {
  setActiveNav('tvs');
  app.innerHTML = `<div class="page" id="ctl"><div class="loading">Carregando…</div></div>`;
  await refreshControl(id);
  startPoll(() => refreshControl(id), 4000);
}
async function refreshControl(id) {
  let d;
  try { d = await api('GET', `/api/devices/${id}/control`); }
  catch (e) { toast(e.message, 'err'); location.hash = '#/tvs'; return; }
  const el = $('#ctl'); if (!el) return;
  const online = d.hb && d.hb.last_seen && (Date.now() - Date.parse(d.hb.last_seen)) < 40000;
  const pausada = !!d.hb?.paused;
  const noAr = d.assignment;

  el.innerHTML = `
    <a class="back" href="#/tvs">${ic('arrowleft')} Todas as TVs</a>
    <div class="steps">
      <span class="step-n done">${ic('check',15)}</span> TV: <strong>&nbsp;${esc(d.device.name)}</strong>
      <span class="sep">→</span><span class="step-n">2</span> escolha a playlist abaixo
      <span class="sep">→</span><span class="step-n">3</span> toque em <strong>&nbsp;Exibir agora</strong>
    </div>

    <section class="card live-card">
      <div class="live-head">
        <span class="dot ${online ? 'on' : ''}"></span>
        <h2>${esc(d.device.name)}</h2>
        <span class="tag">${esc(d.device.location || 'Sem local')}</span>
        <span class="tag ${online ? 'verde' : 'cinza'}">${online ? (pausada ? 'PAUSADA' : 'NO AR') : 'SEM SINAL'}</span>
      </div>
      <div class="live-body">
        <div><span class="lbl">No ar (padrão)</span><strong>${esc(noAr ? noAr.name : 'Nenhuma playlist')}</strong></div>
        <div><span class="lbl">Item em exibição</span><strong>${esc(d.current_media_name || '—')}</strong></div>
        <div><span class="lbl">Último sinal</span><strong>${fmtAgo(d.hb?.last_seen)}</strong></div>
      </div>
      <div class="ctl-row">
        <button class="btn" id="c-skip">${ic('skip')} Pular item</button>
        <button class="btn" id="c-pause">${pausada ? ic('play') + ' Retomar' : ic('pause') + ' Pausar'}</button>
        <button class="btn" id="c-back">${ic('rotate')} Voltar ao padrão</button>
        <button class="btn" id="c-copy2">${ic('link')} Copiar link da TV</button>
      </div>
      ${!online ? `<div class="aviso-off">Esta TV não está dando sinal. Confira se ela está ligada, com o link aberto e conectada à internet. A tela atualiza sozinha quando ela voltar.</div>` : ''}
    </section>

    ${d.queue.length ? `<section class="card"><h3>${ic('queue')} Fila — toca depois da playlist atual</h3>
      <ul class="fila-list">${d.queue.map(q => `
        <li><div><strong>${esc(q.playlist?.name || 'playlist apagada')}</strong>
          <span class="muted small"> • ${q.playlist ? q.playlist.items.length + ' itens' : ''}</span></div>
          <button class="link-btn danger" data-qdel="${q.entry_id}">${ic('x',17)} Tirar da fila</button></li>`).join('')}
      </ul></section>` : ''}

    <section class="card">
      <h3>Trocar a programação desta TV</h3>
      <p class="sub">"Exibir agora" troca na hora. "Na fila" deixa para tocar quando a atual terminar.</p>
      <ul class="pl-list">
        ${d.playlists.length ? d.playlists.map(p => `
          <li><div><strong>${esc(p.name)}</strong><br>
            <span class="muted small">${p.item_count} itens • ${fmtDur(p.seconds)}${p.video_count ? ' + vídeos' : ''}</span></div>
            <div class="row">
              ${p.id === noAr?.id ? '<span class="tag verde">No ar</span>' : ''}
              <button class="btn small" data-fila="${p.id}">${ic('queue',17)} Na fila</button>
              <button class="btn primary small" data-exibir="${p.id}">${ic('play',17)} Exibir agora</button>
            </div></li>`).join('')
        : '<li><p class="sub">Nenhuma playlist ainda. Crie uma em <strong>Playlists</strong> no menu.</p></li>'}
      </ul>
    </section>

    <section class="card">
      <h3>Ligar esta TV ao Painel</h3>
      <ol class="howto">
      
        <li>Na TV, abra o aplicativo do navegador e digite o link.</li>
        <li>Toque na tela da TV para começar. Pronto — ela cuida do resto.</li>
      </ol>
      <div class="linkrow">
        <input type="text" readonly value="${esc(d.link)}" onclick="this.select()">
        <button class="btn" id="c-copy">${ic('copy')} Copiar</button>
      </div>
      <div class="qrrow"><img src="${d.qr}" alt="QR Code do link desta TV">
        <p class="sub">O QR serve para testar no celular: aponte a câmera e a mesma tela abre lá.</p></div>
      <button class="btn ghost-danger" id="c-regen">${ic('rotate')} Gerar um link novo (o antigo para de funcionar)</button>


      
    </section>`;

  // ações
  $('#c-copy').onclick = () => copiarTexto(d.link);
  $('#c-copy2').onclick = () => copiarTexto(d.link);
  $('#c-skip').onclick = () => command(id, 'skip', 'Vou pular o item na TV');
  $('#c-pause').onclick = () => command(id, pausada ? 'resume' : 'pause', pausada ? 'Retomando' : 'Pausando a TV');
  $('#c-back').onclick = () => command(id, 'back', 'Voltando ao padrão');
  $('#c-regen').onclick = async () => {
    if (await confirmar('Gerar novo link', 'O link atual (e o QR) param de funcionar. As TVs usando o link antigo precisarão do novo. Confirma?', 'Gerar novo')) {
      await api('POST', `/api/devices/${id}/token`);
      toast('Link novo gerado. Copie e leve até a TV.');
      refreshControl(id);
    }
  };
  $$('[data-exibir]', el).forEach(b => b.onclick = async () => {
    try { await api('POST', `/api/devices/${id}/display`, { playlist_id: +b.dataset.exibir }); toast('Enviado! A TV troca em segundos.'); refreshControl(id); }
    catch (e) { toast(e.message, 'err'); }
  });
  $$('[data-fila]', el).forEach(b => b.onclick = async () => {
    try { await api('POST', `/api/devices/${id}/queue`, { playlist_id: +b.dataset.fila }); toast('Entrou na fila.'); refreshControl(id); }
    catch (e) { toast(e.message, 'err'); }
  });
  $$('[data-qdel]', el).forEach(b => b.onclick = async () => {
    try { await api('DELETE', `/api/devices/${id}/queue/${b.dataset.qdel}`); toast('Tirada da fila.'); refreshControl(id); }
    catch (e) { toast(e.message, 'err'); }
  });
}
async function command(id, acao, msg) {
  try { await api('POST', `/api/devices/${id}/command`, { action: acao }); toast(msg); }
  catch (e) { toast(e.message, 'err'); }
}

// ============================================================
// TELA: Playlists
// ============================================================
async function viewPlaylists() {
  setActiveNav('playlists');
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Playlists</h1>
      <p class="sub">Uma playlist é a fila de mídias que a TV repete sozinha, do começo ao fim, em loop.</p></div>
      <button class="btn primary" id="nova-pl">${ic('plus')} Nova playlist</button></div>
    <div id="pl-list"><div class="loading">Carregando…</div></div></div>`;
  $('#nova-pl').onclick = async () => {
    const nome = await perguntar('Nova playlist', 'Nome da playlist', 'Nova playlist');
    if (nome === null) return;
    try {
      const { playlist } = await api('POST', '/api/playlists', { name: nome });
      location.hash = `#/playlist/${playlist.id}`;
    } catch (e) { toast(e.message, 'err'); }
  };
  await refreshPlaylists();
}
async function refreshPlaylists() {
  let data; try { data = await api('GET', '/api/playlists'); } catch { return; }
  const box = $('#pl-list'); if (!box) return;
  if (!data.playlists.length) {
    box.innerHTML = `<div class="card" style="text-align:center;padding:46px">
      ${ic('folder',44)}<h3 style="margin-top:10px">Nenhuma playlist ainda</h3>
      <p class="sub" style="margin:6px auto">Toque em <strong>Nova playlist</strong> para criar a primeira.</p></div>`;
    return;
  }
  box.innerHTML = `<ul class="pl-rows">${data.playlists.map(p => `
    <li><div><h3><a href="#/playlist/${p.id}" style="color:inherit;text-decoration:none">${esc(p.name)}</a></h3>
      <span class="muted small">${p.item_count} itens • ${fmtDur(p.seconds)}${p.video_count ? ' + vídeos' : ''}</span></div>
      <div class="row">
        <a class="btn small" href="#/playlist/${p.id}">${ic('edit',17)} Abrir</a>
        <button class="link-btn" data-dup="${p.id}">${ic('copy',17)} Duplicar</button>
        <button class="link-btn" data-ren="${p.id}">${ic('type',17)} Renomear</button>
        <button class="link-btn danger" data-del="${p.id}" data-nome="${esc(p.name)}">${ic('trash',17)} Excluir</button>
      </div></li>`).join('')}</ul>`;
  $$('[data-dup]', box).forEach(b => b.onclick = async () => {
    try { await api('POST', `/api/playlists/${b.dataset.dup}/duplicate`); toast('Playlist duplicada'); refreshPlaylists(); }
    catch (e) { toast(e.message, 'err'); }
  });
  $$('[data-ren]', box).forEach(b => b.onclick = async () => {
    const p = data.playlists.find(x => x.id == b.dataset.ren);
    const nome = await perguntar('Renomear playlist', 'Novo nome', p.name);
    if (!nome) return;
    try { await api('PUT', `/api/playlists/${p.id}`, { name: nome }); refreshPlaylists(); }
    catch (e) { toast(e.message, 'err'); }
  });
  $$('[data-del]', box).forEach(b => b.onclick = async () => {
    if (await confirmar('Excluir playlist', `"${b.dataset.nome}" será apagada. TVs que a exibem ficarão sem programação até você escolher outra. Confirma?`)) {
      try { await api('DELETE', `/api/playlists/${b.dataset.del}`); toast('Playlist excluída'); refreshPlaylists(); }
      catch (e) { toast(e.message, 'err'); }
    }
  });
}

// ============================================================
// TELA: Editor de playlist (reordenar arrastando, duração por item)
// ============================================================
async function viewEditor(id) {
  setActiveNav('playlists');
  let p, items, lib, uidSeq = 1;
  try {
    const full = await api('GET', `/api/playlists/${id}/full`);
    p = full.playlist; items = full.items.map(it => ({ ...it, uid: 'u' + uidSeq++ }));
    lib = (await api('GET', '/api/media')).media;
  } catch (e) { toast(e.message, 'err'); location.hash = '#/playlists'; return; }

  const thumb = m => m.kind === 'image' ? `<img src="${esc(m.file_path)}" alt="">`
    : m.kind === 'video' ? `<video src="${esc(m.file_path)}#t=0.5" muted preload="metadata"></video>`
    : `<div class="thumb-mini" style="width:100%;height:100%;border:none;border-radius:0;background:${esc(m.bg_color)};color:${claro(m.bg_color) ? '#1C1B16' : '#fff'}">${esc(m.title || m.name)}</div>`;
  function claro(hex) {
    const h = (hex || '#000').replace('#','');
    const n = parseInt(h, 16);
    return (0.2126*(n>>16&255) + 0.7152*(n>>8&255) + 0.0722*(n&255)) > 150;
  }
  const totalTxt = () => {
    let s = 0, temVideo = false;
    items.forEach(it => {
      if (it.media.kind === 'video') { temVideo = true; return; }
      s += it.duration_seconds ?? it.media.duration_seconds ?? 10;
    });
    return fmtDur(s) + (temVideo ? ' + vídeos' : '');
  };

  app.innerHTML = `<div class="page">
    <a class="back" href="#/playlists">${ic('arrowleft')} Todas as playlists</a>
    <div class="ed-head">
      <div><label class="field" style="margin:0"><span>Nome da playlist</span>
        <input type="text" id="pl-nome" value="${esc(p.name)}"></label></div>
      <div class="row"><span class="total" id="pl-total">${totalTxt()}</span>
        <span class="saved-flag" id="pl-saved">${ic('check',16)} Salvo</span>
        <button class="btn" id="pl-tv">${ic('tv')} Exibir em uma TV…</button>
        <button class="btn primary" id="pl-add">${ic('plus')} Adicionar mídia</button></div>
    </div>
    <p class="sub">Arraste pela barra de bolinhas (ou use as setas) para mudar a ordem. A playlist repete do início automaticamente. Tudo é salvo sozinho.</p>
    <ul class="it-list" id="it-list"></ul>
  </div>`;

  const lista = $('#it-list');
  function renderItens() {
    lista.innerHTML = items.length ? items.map((it, i) => `
      <li draggable="true" data-uid="${it.uid}">
        <span class="grip" title="Arraste para reordenar">${ic('grip')}</span>
        <div class="thumb">${thumb(it.media)}</div>
        <div class="it-info"><strong>${esc(it.media.name)}</strong>
          <span class="muted small">${it.media.kind === 'image' ? 'Imagem' : it.media.kind === 'video' ? 'Vídeo' : 'Aviso de texto'}</span></div>
        <label class="dur">${it.media.kind === 'video'
          ? '<span class="muted small">vídeo inteiro</span>'
          : `<input type="number" min="1" max="7200" value="${it.duration_seconds ?? it.media.duration_seconds ?? 10}" data-dur="${i}"><span>s</span>`}</label>
        <button class="ibtn" data-mv="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Mover para cima">${ic('up',18)}</button>
        <button class="ibtn" data-mv="down" data-i="${i}" ${i === items.length - 1 ? 'disabled' : ''} title="Mover para baixo">${ic('down',18)}</button>
        <button class="ibtn danger" data-rm="${i}" title="Tirar da playlist">${ic('trash',18)}</button>
      </li>`).join('')
      : `<li style="justify-content:center;border-style:dashed;background:transparent;box-shadow:none;padding:34px">
           <span class="muted">Playlist vazia — toque em <strong>Adicionar mídia</strong>.</span></li>`;
    $('#pl-total').textContent = totalTxt();
  }
  let salvoTimer;
  async function persist() {
    try {
      await api('PUT', `/api/playlists/${id}/items`,
        { items: items.map(it => ({ media_id: it.media_id, duration_seconds: it.duration_seconds })) });
      const f = $('#pl-saved');
      f.classList.add('show'); clearTimeout(salvoTimer);
      salvoTimer = setTimeout(() => f.classList.remove('show'), 1600);
    } catch (e) { toast(e.message, 'err'); }
  }

  renderItens();

  // duração por item
  lista.addEventListener('change', e => {
    const inp = e.target.closest('[data-dur]'); if (!inp) return;
    items[+inp.dataset.dur].duration_seconds = Math.min(7200, Math.max(1, Number(inp.value) || 10));
    persist(); $('#pl-total').textContent = totalTxt();
  });
  // mover / remover
  lista.addEventListener('click', async e => {
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const i = +mv.dataset.i, j = mv.dataset.mv === 'up' ? i - 1 : i + 1;
      [items[i], items[j]] = [items[j], items[i]];
      renderItens(); persist(); return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) { items.splice(+rm.dataset.rm, 1); renderItens(); persist(); toast('Mídia tirada da playlist'); }
  });
  // arrastar para reordenar
  let dragUid = null;
  lista.addEventListener('dragstart', e => {
    const li = e.target.closest('li[data-uid]');
    if (!li) { e.preventDefault(); return; }
    dragUid = li.dataset.uid; li.classList.add('drag');
    try { e.dataTransfer.setData('text/plain', dragUid); } catch {}
  });
  lista.addEventListener('dragover', e => {
    e.preventDefault();
    const li = lista.querySelector(`li[data-uid="${dragUid}"]`); if (!li) return;
    const depois = [...lista.querySelectorAll('li[data-uid]:not(.drag)')].reduce((melhor, atual) => {
      const r = atual.getBoundingClientRect(), off = e.clientY - r.top - r.height / 2;
      return (off < 0 && off > melhor.off) ? { off, el: atual } : melhor;
    }, { off: -Infinity, el: null }).el;
    if (depois == null) lista.appendChild(li); else if (depois !== li) lista.insertBefore(li, depois);
  });
  lista.addEventListener('drop', e => e.preventDefault());
  lista.addEventListener('dragend', async () => {
    const ordem = [...lista.querySelectorAll('li[data-uid]')].map(li => items.find(it => it.uid === li.dataset.uid));
    lista.querySelectorAll('li').forEach(x => x.classList.remove('drag'));
    if (ordem.length === items.length && ordem.some((it, i) => it !== items[i])) { items = ordem; persist(); }
  });

  // renomear
  $('#pl-nome').addEventListener('change', async e => {
    try { await api('PUT', `/api/playlists/${id}`, { name: e.target.value }); toast('Nome salvo'); }
    catch (err) { toast(err.message, 'err'); }
  });
  // adicionar mídias (modal com a biblioteca)
  $('#pl-add').onclick = () => {
    let added = 0;
    const ov = openModal(`<h3>Adicionar mídia</h3>
      <p class="sub">Toque nos itens para juntar na playlist. Depois feche.</p>
      <div class="pick-grid">${lib.map(m => `
        <button class="pick" data-id="${m.id}">${thumb(m)}<span>${esc(m.name)}</span></button>`).join('')}</div>
      <div class="row end" style="margin-top:14px"><button class="btn primary" id="pick-done">Concluir</button></div>`);
    $$('.pick', ov).forEach(b => b.onclick = () => {
      const m = lib.find(x => x.id == b.dataset.id);
      items.push({ media_id: m.id, duration_seconds: null, media: m, uid: 'u' + uidSeq++ });
      persist(); renderItens(); b.classList.add('picked'); added++;
    });
    ov.querySelector('#pick-done').onclick = closeModal;
  };
  // exibir agora numa TV, direto daqui (atalho do fluxo de 3 passos)
  $('#pl-tv').onclick = async () => {
    if (!items.length) { toast('Adicione mídias antes de exibir.', 'err'); return; }
    let devs; try { devs = (await api('GET', '/api/status')).devices; } catch { return; }
    const ov = openModal(`<h3>Exibir "${esc(p.name)}" em qual TV?</h3>
      <ul class="pl-list">${devs.map(d => `
        <li><div><strong>${esc(d.name)}</strong><br><span class="muted small">${esc(d.location || '')}</span></div>
        <button class="btn primary small" data-tv="${d.id}">${ic('play',17)} Exibir aqui</button></li>`).join('')}</ul>`);
    $$('[data-tv]', ov).forEach(b => b.onclick = async () => {
      try {
        await api('POST', `/api/devices/${b.dataset.tv}/display`, { playlist_id: id });
        closeModal(); toast('Enviado! A TV troca em segundos.');
      } catch (e) { toast(e.message, 'err'); }
    });
  };
}

// ============================================================
// TELA: Biblioteca de mídias
// ============================================================
const CORES = [['#C8102E','Vermelho'],['#FFFFFF','Branco'],['#111111','Preto'],['#1B3A5F','Azul-escuro']];
async function viewLibrary() {
  setActiveNav('biblioteca');
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Biblioteca</h1>
      <p class="sub">Imagens, vídeos e avisos de texto que podem entrar em qualquer playlist.</p></div>
      <div class="row">
        <button class="btn" id="bt-text">${ic('type')} Criar aviso de texto</button>
        <button class="btn primary" id="bt-up">${ic('upload')} Enviar imagem ou vídeo</button>
      </div></div>
    <input type="file" id="file-in" multiple hidden
      accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg">
    <div id="lib-grid"><div class="loading">Carregando…</div></div></div>`;
  $('#bt-up').onclick = () => $('#file-in').click();
  $('#file-in').onchange = e => { uploadFiles([...e.target.files]); e.target.value = ''; };
  $('#bt-text').onclick = () => formAviso();
  await refreshLibrary();
}
async function refreshLibrary() {
  let data; try { data = await api('GET', '/api/media'); } catch { return; }
  const box = $('#lib-grid'); if (!box) return;
  if (!data.media.length) {
    box.innerHTML = `<div class="card" style="text-align:center;padding:46px">${ic('image',44)}
      <h3 style="margin-top:10px">Biblioteca vazia</h3>
      <p class="sub" style="margin:6px auto">Envie imagens e vídeos do computador, ou crie avisos de texto aqui mesmo.</p></div>`;
    return;
  }
  const prev = m => m.kind === 'image' ? `<img src="${esc(m.file_path)}" alt="">`
    : m.kind === 'video' ? `<video src="${esc(m.file_path)}#t=0.5" muted preload="metadata"></video>`
    : `<div style="width:100%;height:100%;background:${esc(m.bg_color)};color:${claro2(m.bg_color)?'#1C1B16':'#fff'};
        display:flex;align-items:center;justify-content:center;font-weight:800;padding:10px;text-align:center;font-size:14px">${esc(m.title||m.name)}</div>`;
  box.innerHTML = `<div class="grid-lib">${data.media.map(m => `
    <article class="lib-card"><div class="lib-prev">${prev(m)}</div>
      <div class="lib-body"><strong>${esc(m.name)}</strong>
        <span class="muted small">${m.kind === 'image' ? 'Imagem' : m.kind === 'video' ? 'Vídeo' : 'Aviso de texto'} •
          ${m.kind === 'video' ? 'duração do vídeo' : fmtDur(m.duration_seconds)}
          ${m.size_bytes ? ' • ' + fmtBytes(m.size_bytes) : ''}${m.usos ? ` • usada em ${m.usos} playlist(s)` : ' • fora de playlists'}</span></div>
      <div class="lib-menu">
              <div class="lib-menu">
        <button class="link-btn" data-play="${m.id}">${ic('tv',17)} Exibir na TV</button>
        <button class="link-btn" data-edit="${m.id}">${ic('edit',17)} Editar</button>
        <button class="link-btn danger" data-del="${m.id}" data-nome="${esc(m.name)}">${ic('trash',17)} Excluir</button>
      </div></article>`).join('')}</div>`;
  $$('[data-edit]', box).forEach(b => b.onclick = () => {
    const m = data.media.find(x => x.id == b.dataset.edit);
    m.kind === 'text' ? formAviso(m) : formMedia(m);
  });
  $$('[data-del]', box).forEach(b => b.onclick = async () => {
    if (await confirmar('Excluir mídia', `"${b.dataset.nome}" sai de todas as playlists em que estiver. Confirma?`)) {
      try { await api('DELETE', `/api/media/${b.dataset.del}`); toast('Mídia excluída'); refreshLibrary(); }
      catch (e) { toast(e.message, 'err'); }
    }
  });
  $$('[data-play]', box).forEach(b => b.onclick = () => {
    const m = data.media.find(x => x.id == b.dataset.play);
    exibirMidiaNaTV(m);
  });

// Escolhe a TV e manda a mídia direto pro ar (sem montar playlist na mão)
async function exibirMidiaNaTV(m) {
  let devs;
  try { devs = (await api('GET', '/api/status')).devices; }
  catch (e) { toast(e.message, 'err'); return; }
  if (!devs.length) { toast('Cadastre uma TV primeiro, em Minhas TVs.', 'err'); return; }
  const ov = openModal(`<h3>Exibir "${esc(m.name)}" em qual TV?</h3>
    <p class="sub">A mídia entra no ar na hora e fica repetindo até você trocar a programação da TV.</p>
    <ul class="pl-list">${devs.map(d => `
      <li><div><strong>${esc(d.name)}</strong><br>
        <span class="muted small">${esc(d.location || '')} • ${d.online ? 'online' : 'sem sinal'}</span></div>
        <button class="btn primary small" data-tv="${d.id}">${ic('play',17)} Exibir aqui</button></li>`).join('')}</ul>`);
  $$('[data-tv]', ov).forEach(btn => btn.onclick = async () => {
    try {
      await api('POST', `/api/media/${m.id}/display`, { device_id: +btn.dataset.tv });
      closeModal();
      toast('Enviado! A TV troca em segundos.');
    } catch (e) { toast(e.message, 'err'); }
  });
}

}
function claro2(hex) {
  const n = parseInt((hex || '#000').replace('#',''), 16);
  return (0.2126*(n>>16&255) + 0.7152*(n>>8&255) + 0.0722*(n&255)) > 150;
}
function swatches(selecionada) { 
  return `<div class="swatches">${CORES.map(([c, n]) => `
    <label><input type="radio" name="bg" value="${c}" ${c === selecionada ? 'checked' : ''}>
    <span class="sw" style="background:${c}"></span>${n}</label>`).join('')}</div>`;
}
// Criação/edição de aviso de texto
function formAviso(m) {
  const ed = !!m;
  const ov = openModal(`<h3>${ed ? 'Editar aviso' : 'Novo aviso de texto'}</h3>
    <label class="field"><span>Título (grande na TV)</span><input type="text" id="t-titulo" value="${esc(m?.title || '')}"></label>
    <label class="field"><span>Texto</span><textarea id="t-texto" placeholder="Ex.: Reunião de pais quinta às 19h">${esc(m?.body || '')}</textarea></label>
        <div class="field"><span>Cor de fundo</span>${swatches(m?.bg_color || '#C8102E')}</div>
    <label class="field" style="max-width:160px"><span>Segundos na tela</span>
      <input type="number" id="t-dur" min="1" max="7200" value="${m?.duration_seconds || 10}"></label>
    <div class="row end"><button class="btn" id="t-cancel">Cancelar</button>
      <button class="btn primary" id="t-ok">${ic('check')} Salvar</button></div>`);
  ov.querySelector('#t-cancel').onclick = closeModal;
  ov.querySelector('#t-ok').onclick = async () => {
    const corpo = {
      title: ov.querySelector('#t-titulo').value,
      body: ov.querySelector('#t-texto').value,
      bg_color: ov.querySelector('[name=bg]:checked').value,
      duration_seconds: +ov.querySelector('#t-dur').value
    };
    try {
      if (ed) { corpo.name = m.name; await api('PUT', `/api/media/${m.id}`, corpo); }
      else await api('POST', '/api/media/text', corpo);
      toast('Aviso salvo'); closeModal(); refreshLibrary();
    } catch (e) { toast(e.message, 'err'); }
  };
}
// Edição de imagem/vídeo (nome + duração padrão de imagens)
function formMedia(m) {
  const ov = openModal(`<h3>Editar "${esc(m.name)}"</h3>
    <label class="field"><span>Nome</span><input type="text" id="m-nome" value="${esc(m.name)}"></label>
    ${m.kind === 'image' ? `<label class="field" style="max-width:160px"><span>Segundos na tela (padrão)</span>
      <input type="number" id="m-dur" min="1" max="7200" value="${m.duration_seconds || 10}"></label>` : ''}
    <div class="row end"><button class="btn" id="m-cancel">Cancelar</button>
      <button class="btn primary" id="m-ok">${ic('check')} Salvar</button></div>`);
  ov.querySelector('#m-cancel').onclick = closeModal;
  ov.querySelector('#m-ok').onclick = async () => {
    try {
      await api('PUT', `/api/media/${m.id}`, {
        name: ov.querySelector('#m-nome').value,
        duration_seconds: m.kind === 'image' ? +ov.querySelector('#m-dur').value : null
      });
      toast('Salvo'); closeModal(); refreshLibrary();
    } catch (e) { toast(e.message, 'err'); }
  };
}
// Upload com barra de progresso, um arquivo por vez na fila
function uploadFiles(files) {
  if (!files.length) return;
  openModal(`<h3>Enviando mídias…</h3><div class="prog"><div id="up-bar"></div></div>
    <p class="sub" id="up-msg">Preparando…</p>`);
  let i = 0;
  const proximo = () => {
    if (i >= files.length) { closeModal(); toast('Enviado!'); refreshLibrary(); return; }
    const f = files[i];
    const fd = new FormData();
    fd.append('arquivo', f);
    fd.append('nome', f.name.replace(/\.[^.]+$/, ''));
    const x = new XMLHttpRequest();
    x.open('POST', '/api/media/upload');
    x.upload.onprogress = e => {
      if (!e.lengthComputable) return;
      $('#up-bar').style.width = (e.loaded / e.total * 100) + '%';
      $('#up-msg').textContent = `Enviando ${i + 1} de ${files.length}: ${f.name}`;
    };
    x.onload = () => {
      if (x.status >= 400) { let m = 'O envio falhou.'; try { m = JSON.parse(x.responseText).erro; } catch {} toast(m, 'err'); }
      i++; $('#up-bar').style.width = '0%'; proximo();
    };
    x.onerror = () => { toast('Falha de rede ao enviar.', 'err'); i++; proximo(); };
    x.send(fd);
  };
  proximo();
}

// ============================================================
// TELA: Administradores (só o usuário mestre)
// ============================================================
async function viewUsers() {
  setActiveNav('admins');
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Administradores</h1>
      <p class="sub">Pessoas que podem cadastrar TVs, playlists e mídias.</p></div></div>
    <section class="card"><h3>Criar novo administrador</h3>
      <div class="row" style="align-items:flex-end">
        <label class="field" style="flex:1;min-width:180px;margin:0"><span>Nome</span><input type="text" id="u-nome"></label>
        <label class="field" style="flex:1;min-width:140px;margin:0"><span>Login</span><input type="text" id="u-login"></label>
        <label class="field" style="flex:1;min-width:140px;margin:0"><span>Senha</span><input type="text" id="u-senha"></label>
        <button class="btn primary" id="u-ok">${ic('plus')} Criar</button>
      </div></section>
    <div id="u-list"><div class="loading">Carregando…</div></div></div>`;
  $('#u-ok').onclick = async () => {
    try {
      await api('POST', '/api/users', { name: $('#u-nome').value, login: $('#u-login').value, senha: $('#u-senha').value });
      toast('Administrador criado'); refreshUsers();
      $('#u-nome').value = $('#u-login').value = $('#u-senha').value = '';
    } catch (e) { toast(e.message, 'err'); }
  };
  await refreshUsers();
}
async function refreshUsers() {
  let data; try { data = await api('GET', '/api/users'); } catch (e) { toast(e.message, 'err'); return; }
  const box = $('#u-list'); if (!box) return;
  box.innerHTML = `<ul class="pl-rows">${data.users.map(u => `
    <li><div><h3>${esc(u.name)} ${u.role === 'master' ? '<span class="tag">Mestre</span>' : ''}</h3>
      <span class="muted small">login: ${esc(u.login)}</span></div>
      ${u.role === 'admin' ? `<button class="link-btn danger" data-del="${u.id}" data-nome="${esc(u.name)}">${ic('trash',17)} Remover</button>` : ''}</li>`).join('')}</ul>`;
  $$('[data-del]', box).forEach(b => b.onclick = async () => {
    if (await confirmar('Remover administrador', `"${b.dataset.nome}" perde o acesso ao painel. Confirma?`)) {
      try { await api('DELETE', `/api/users/${b.dataset.del}`); toast('Removido'); refreshUsers(); }
      catch (e) { toast(e.message, 'err'); }
    }
  });
}

// ---------- roteador simples (por hash) ----------
const rotas = [
  [/^#?\/?(tvs)?$/, () => viewDevices()],
  [/^#\/tv\/(\d+)$/, m => viewControl(+m[1])],
  [/^#\/playlists$/, () => viewPlaylists()],
  [/^#\/playlist\/(\d+)$/, m => viewEditor(+m[1])],
  [/^#\/biblioteca$/, () => viewLibrary()],
  [/^#\/admins$/, () => viewUsers()],
];
function navigate() {
  stopPoll(); closeModal();
  const h = location.hash || '#/tvs';
  for (const [re, fn] of rotas) { const m = h.match(re); if (m) return fn(m); }
  viewDevices();
}
window.addEventListener('hashchange', navigate);

// ---------- início ----------
(async () => {
  try { const { user } = await api('GET', '/api/me'); state.user = user; } catch {}
  if (state.user) { renderShell(); navigate(); } else showLogin();
})();