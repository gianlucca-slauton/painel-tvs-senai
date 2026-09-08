// ============================================================
// server.js — servidor do Mural
// Seções: sessão → senhas → rotas da equipe → rotas das TVs → estáticos
// ============================================================
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const { db, migrate } = require('./db');

migrate();

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// ---------- chave secreta p/ assinar cookies (criada 1ª vez, fica em data/) ----------
const SECRET_FILE = path.join(__dirname, 'data', 'secret.key');
let SECRET;
if (fs.existsSync(SECRET_FILE)) SECRET = fs.readFileSync(SECRET_FILE);
else {
  SECRET = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  fs.writeFileSync(SECRET_FILE, SECRET);
}

// ---------- senhas: scrypt (nativo do Node, com sal aleatório) ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
function checkPassword(pw, salvo) {
  try {
    const [salt, hash] = String(salvo).split(':');
    const teste = crypto.scryptSync(pw, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), teste);
  } catch { return false; }
}

// ---------- sessão: cookie assinado, válido 30 dias ----------
const COOKIE = 'mural_sess', DIAS = 30;
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function makeCookie(userId) {
  const payload = Buffer.from(JSON.stringify({ id: userId, exp: Date.now() + DIAS * 864e5 })).toString('base64url');
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS * 86400}`;
}
function parseCookies(req) {
  const out = {};
  for (const p of (req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}
function currentUser(req) {
  const raw = parseCookies(req)[COOKIE];
  if (!raw) return null;
  const i = raw.lastIndexOf('.');
  if (i < 0) return null;
  const payload = raw.slice(0, i), assinatura = raw.slice(i + 1);
  const a = Buffer.from(assinatura), b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url'));
    if (!dados.exp || dados.exp < Date.now()) return null;
    return db.prepare('SELECT id,name,login,role FROM users WHERE id=?').get(dados.id) || null;
  } catch { return null; }
}
function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ erro: 'Sua sessão acabou. Entre novamente.' });
  req.user = u; next();
}
const requireMaster = [requireAuth, (req, res, next) => {
  if (req.user.role !== 'master') return res.status(403).json({ erro: 'Apenas o usuário mestre pode fazer isso.' });
  next();
}];
const bad = (res, msg, code = 400) => res.status(code).json({ erro: msg });

// ---------- login / logout ----------
app.post('/api/login', (req, res) => {
  const login = String(req.body?.login || '').trim().toLowerCase();
  const senha = String(req.body?.senha || '');
  const u = db.prepare('SELECT * FROM users WHERE login=?').get(login);
  if (!u || !checkPassword(senha, u.pass_hash)) return bad(res, 'Login ou senha incorretos.', 401);
  res.setHeader('Set-Cookie', makeCookie(u.id));
  res.json({ user: { id: u.id, name: u.name, login: u.login, role: u.role } });
});
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({});
  res.json({ user: u });
});

// ---------- usuários (só o mestre) ----------
app.get('/api/users', requireMaster, (req, res) => {
  res.json({ users: db.prepare('SELECT id,name,login,role,created_at FROM users ORDER BY name').all() });
});
app.post('/api/users', requireMaster, (req, res) => {
  const nome = String(req.body?.name || '').trim();
  const login = String(req.body?.login || '').trim().toLowerCase();
  const senha = String(req.body?.senha || '');
  if (!nome) return bad(res, 'Escreva o nome da pessoa.');
  if (!/^[a-z0-9._-]{3,}$/.test(login)) return bad(res, 'Login: 3+ caracteres, sem espaços nem acentos.');
  if (senha.length < 4) return bad(res, 'A senha precisa de 4+ caracteres.');
  if (db.prepare('SELECT id FROM users WHERE login=?').get(login)) return bad(res, 'Esse login já existe.');
  const info = db.prepare("INSERT INTO users (name,login,pass_hash,role) VALUES (?,?,?, 'admin')")
    .run(nome, login, hashPassword(senha));
  res.json({ user: db.prepare('SELECT id,name,login,role FROM users WHERE id=?').get(info.lastInsertRowid) });
});
app.delete('/api/users/:id', requireMaster, (req, res) => {
  const alvo = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!alvo) return bad(res, 'Usuário não encontrado.', 404);
  if (alvo.role !== 'admin') return bad(res, 'Só administradores podem ser removidos.');
  if (alvo.id === req.user.id) return bad(res, 'Você não pode remover a si mesmo.');
  db.prepare('DELETE FROM users WHERE id=?').run(alvo.id);
  res.json({ ok: true });
});

// ---------- helpers de consultas ----------
function listDevices() {
  return db.prepare(`
    SELECT d.*, h.last_seen, h.current_media_id, h.current_playlist_id, h.paused,
           m.name AS current_media_name,
           a.playlist_id AS assigned_playlist_id,
           p.name AS assigned_playlist_name
    FROM devices d
    LEFT JOIN device_heartbeats h ON h.device_id = d.id
    LEFT JOIN media m ON m.id = h.current_media_id
    LEFT JOIN device_assignments a ON a.id = (SELECT id FROM device_assignments WHERE device_id = d.id ORDER BY id DESC LIMIT 1)
    LEFT JOIN playlists p ON p.id = a.playlist_id
    ORDER BY d.name COLLATE NOCASE`).all();
}
function listPlaylists() {
  return db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM playlist_items pi WHERE pi.playlist_id = p.id) AS item_count,
      (SELECT COALESCE(SUM(CASE WHEN m.kind != 'video' THEN COALESCE(pi.duration_seconds, m.duration_seconds, 10) ELSE 0 END), 0)
         FROM playlist_items pi JOIN media m ON m.id = pi.media_id WHERE pi.playlist_id = p.id) AS seconds,
      (SELECT COUNT(*) FROM playlist_items pi JOIN media m ON m.id = pi.media_id
         WHERE pi.playlist_id = p.id AND m.kind = 'video') AS video_count
    FROM playlists p ORDER BY p.name COLLATE NOCASE`).all();
}
// Playlist no formato que a TV consome (duração já resolvida por item).
function playlistFull(id) {
  const p = db.prepare('SELECT * FROM playlists WHERE id=?').get(id);
  if (!p) return null;
  const rows = db.prepare(`
    SELECT pi.duration_seconds AS item_duration, m.id AS media_id, m.kind, m.name,
           m.file_path, m.title, m.body, m.bg_color, m.duration_seconds
    FROM playlist_items pi JOIN media m ON m.id = pi.media_id
    WHERE pi.playlist_id = ? ORDER BY pi.position, pi.id`).all(id);
  return {
    id: p.id, name: p.name, version: p.version,
    items: rows.map(r => ({
      media_id: r.media_id, kind: r.kind, name: r.name, file_path: r.file_path,
      title: r.title, body: r.body, bg_color: r.bg_color,
      duration_seconds: r.kind === 'video' ? null : (r.item_duration ?? r.duration_seconds ?? 10)
    }))
  };
}
function sendCommand(deviceId, action) {
  db.prepare('INSERT INTO device_commands (device_id, action) VALUES (?,?)').run(deviceId, action);
}
// ---------- códigos curtos de TV ----------
// Alfabeto minúsculo sem caracteres ambíguos (sem 0/O, 1/I/L, 5/S).
// 8 caracteres = ~850 bilhões de combinações: seguro na rede local
// e simples de digitar caractere por caractere no controle da TV.
const ALFABETO_CODIGO = '23456789abcdefghjkmnpqrstuvwxyz';
function gerarTokenTV(n = 8) {
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length];
  return s;
}
// Procura a TV aceitando maiúsculas/minúsculas e ignorando traços,
// espaços e "http://" que a pessoa possa ter digitado junto.
function acharTVporToken(bruto) {
  const limpo = String(bruto || '').toLowerCase().replace(/[^0-9a-z]/g, '');
  if (limpo) {
    const r = db.prepare('SELECT * FROM devices WHERE token=? COLLATE NOCASE').get(limpo);
    if (r) return r;
  }
  return db.prepare('SELECT * FROM devices WHERE token=? COLLATE NOCASE').get(String(bruto || '')) || null;
}
// Formata o token em grupos de 4, só para leitura (ex.: h4k2-m7xq).
function fmtToken(t) { return String(t).replace(/(.{4})/g, '$1-').replace(/-$/, ''); }

const ONLINE_MS = 20000; // TV sem sinal por 40s = offline no painel

// ---------- TVs ----------
app.get('/api/devices', requireAuth, (req, res) => res.json({ devices: listDevices() }));

app.post('/api/devices', requireAuth, (req, res) => {
  const nome = String(req.body?.name || '').trim();
  const local = String(req.body?.location || '').trim();
  const orient = req.body?.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const notas = String(req.body?.notes || '').trim();
  if (!nome) return bad(res, 'Dê um nome para a TV.');
  const token = crypto.randomBytes(24).toString('base64url'); // link único e difícil de adivinhar
  const info = db.prepare('INSERT INTO devices (name,location,orientation,notes,token) VALUES (?,?,?,?,?)')
    .run(nome, local, orient, notas, token);
  res.json({ device: db.prepare('SELECT * FROM devices WHERE id=?').get(info.lastInsertRowid) });
});

app.put('/api/devices/:id', requireAuth, (req, res) => {
  const d = db.prepare('SELECT * FROM devices WHERE id=?').get(req.params.id);
  if (!d) return bad(res, 'TV não encontrada.', 404);
  const nome = String(req.body?.name ?? d.name).trim();
  const orient = req.body?.orientation === 'vertical' ? 'vertical' : 'horizontal';
  if (!nome) return bad(res, 'A TV precisa de um nome.');
  db.prepare('UPDATE devices SET name=?, location=?, orientation=?, notes=? WHERE id=?').run(
    nome, String(req.body?.location ?? d.location).trim(), orient,
    String(req.body?.notes ?? d.notes).trim(), d.id);
  res.json({ device: db.prepare('SELECT * FROM devices WHERE id=?').get(d.id) });
});

app.delete('/api/devices/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM devices WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Revogar o link antigo e gerar outro (ex.: se vazar).
app.post('/api/devices/:id/token', requireAuth, (req, res) => {
    const token = gerarTokenTV();
  const info = db.prepare('UPDATE devices SET token=? WHERE id=?').run(token, req.params.id);
  if (!info.changes) return bad(res, 'TV não encontrada.', 404);
  res.json({ token });
});

// Painel de controle de uma TV: tudo que a tela precisa, num pedido só.
app.get('/api/devices/:id/control', requireAuth, async (req, res) => {
  const d = db.prepare('SELECT * FROM devices WHERE id=?').get(req.params.id);
  if (!d) return bad(res, 'TV não encontrada.', 404);
  const link = `${req.protocol}://${req.get('host')}/tv/${d.token}`;
    const hostHint = `${req.get('host')}/tv/${fmtToken(d.token)}`;
  const qr = await QRCode.toDataURL(link, { width: 360, margin: 1, color: { dark: '#1C1B16', light: '#FFFCF4' } });
  const hb = db.prepare('SELECT * FROM device_heartbeats WHERE device_id=?').get(d.id) || null;
  const cm = hb?.current_media_id ? db.prepare('SELECT name FROM media WHERE id=?').get(hb.current_media_id) : null;
  const cp = hb?.current_playlist_id ? db.prepare('SELECT name FROM playlists WHERE id=?').get(hb.current_playlist_id) : null;
  const a = db.prepare('SELECT playlist_id FROM device_assignments WHERE device_id=? ORDER BY id DESC LIMIT 1').get(d.id);
  const fila = db.prepare('SELECT id, playlist_id FROM play_queue WHERE device_id=? ORDER BY position, id').all(d.id);
  res.json({
    device: d, link, qr, host_hint: hostHint, hb,
    current_media_name: cm?.name || null,
    current_playlist_name: cp?.name || null,
    assignment: a ? playlistFull(a.playlist_id) : null,
    queue: fila.map(e => ({ entry_id: e.id, playlist: playlistFull(e.playlist_id) })),
    playlists: listPlaylists()
  });
});

// "Exibir agora": vira playlist padrão + comando para começar já.
app.post('/api/devices/:id/display', requireAuth, (req, res) => {
  const d = db.prepare('SELECT * FROM devices WHERE id=?').get(req.params.id);
  if (!d) return bad(res, 'TV não encontrada.', 404);
  const p = db.prepare('SELECT id FROM playlists WHERE id=?').get(Number(req.body?.playlist_id));
  if (!p) return bad(res, 'Playlist não encontrada.');
  const n = db.prepare('SELECT COUNT(*) AS n FROM playlist_items WHERE playlist_id=?').get(p.id).n;
  if (!n) return bad(res, 'Essa playlist está vazia. Adicione mídias a ela primeiro.');
  db.prepare('INSERT INTO device_assignments (device_id, playlist_id) VALUES (?,?)').run(d.id, p.id);
  db.prepare('DELETE FROM play_queue WHERE device_id=? AND playlist_id=?').run(d.id, p.id); // saiu da fila, virou o padrão
  sendCommand(d.id, 'play');
  res.json({ ok: true });
});

app.post('/api/devices/:id/queue', requireAuth, (req, res) => {
  const d = db.prepare('SELECT * FROM devices WHERE id=?').get(req.params.id);
  if (!d) return bad(res, 'TV não encontrada.', 404);
  const p = db.prepare('SELECT id FROM playlists WHERE id=?').get(Number(req.body?.playlist_id));
  if (!p) return bad(res, 'Playlist não encontrada.');
  if (db.prepare('SELECT id FROM play_queue WHERE device_id=? AND playlist_id=?').get(d.id, p.id))
    return bad(res, 'Essa playlist já está na fila.');
  const max = db.prepare('SELECT COALESCE(MAX(position),0) AS m FROM play_queue WHERE device_id=?').get(d.id).m;
  db.prepare('INSERT INTO play_queue (device_id, playlist_id, position) VALUES (?,?,?)').run(d.id, p.id, max + 1);
  res.json({ ok: true });
});

app.delete('/api/devices/:id/queue/:entryId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM play_queue WHERE id=? AND device_id=?').run(req.params.entryId, req.params.id);
  res.json({ ok: true });
});

app.post('/api/devices/:id/command', requireAuth, (req, res) => {
  const acao = String(req.body?.action || '');
  if (!['skip', 'pause', 'resume', 'back'].includes(acao)) return bad(res, 'Ação desconhecida.');
  const d = db.prepare('SELECT id FROM devices WHERE id=?').get(req.params.id);
  if (!d) return bad(res, 'TV não encontrada.', 404);
  sendCommand(d.id, acao);
  res.json({ ok: true });
});

// Painel de status geral.
app.get('/api/status', requireAuth, (req, res) => {
  const agora = Date.now();
  res.json({
    devices: listDevices().map(d => ({
      id: d.id, name: d.name, location: d.location, orientation: d.orientation, notes: d.notes, token: d.token,
      online: !!d.last_seen && (agora - Date.parse(d.last_seen)) < ONLINE_MS,
      last_seen: d.last_seen, paused: !!d.paused,
      current_media_name: d.current_media_name || null,
      assigned_playlist_id: d.assigned_playlist_id || null,
      assigned_playlist_name: d.assigned_playlist_name || null
    }))
  });
});

// ---------- biblioteca de mídias ----------
const aceitos = ['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/ogg'];
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => { // nome novo e seguro no disco; o nome bonito fica no banco
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, Date.now().toString(36) + crypto.randomBytes(6).toString('hex') + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024, files: 1 }, // 200 MB por arquivo
  fileFilter: (req, file, cb) => cb(aceitos.includes(file.mimetype) ? null : new Error('tipo'), aceitos.includes(file.mimetype))
});

app.get('/api/media', requireAuth, (req, res) => {
  res.json({ media: db.prepare(`
    SELECT m.*, (SELECT COUNT(*) FROM playlist_items pi WHERE pi.media_id = m.id) AS usos
    FROM media m ORDER BY m.id DESC`).all() });
});

app.post('/api/media/upload', requireAuth, upload.single('arquivo'), (req, res) => {
  if (!req.file) return bad(res, 'Escolha um arquivo.');
  const kind = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  const nome = (req.body?.nome || '').trim() || path.basename(req.file.originalname, path.extname(req.file.originalname));
  const info = db.prepare(`INSERT INTO media (kind,name,file_path,mime,size_bytes,duration_seconds)
                           VALUES (?,?,?,?,?,?)`)
    .run(kind, nome, `/uploads/${req.file.filename}`, req.file.mimetype, req.file.size, kind === 'image' ? 10 : null);
  res.json({ media: db.prepare('SELECT * FROM media WHERE id=?').get(info.lastInsertRowid) });
});

app.post('/api/media/text', requireAuth, (req, res) => {
  const titulo = String(req.body?.title || '').trim();
  const texto = String(req.body?.body || '').trim();
  const cor = /^#[0-9a-fA-F]{6}$/.test(req.body?.bg_color || '') ? req.body.bg_color : '#14634A';
  const dur = Math.min(7200, Math.max(1, Number(req.body?.duration_seconds) || 10));
  if (!titulo && !texto) return bad(res, 'Escreva ao menos um título ou um texto.');
  const nome = titulo || texto.slice(0, 40);
  const info = db.prepare(`INSERT INTO media (kind,name,title,body,bg_color,duration_seconds)
                           VALUES ('text',?,?,?,?,?)`).run(nome, titulo, texto, cor, dur);
  res.json({ media: db.prepare('SELECT * FROM media WHERE id=?').get(info.lastInsertRowid) });
});

app.put('/api/media/:id', requireAuth, (req, res) => {
  const m = db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
  if (!m) return bad(res, 'Mídia não encontrada.', 404);
  const nome = String(req.body?.name ?? m.name).trim() || m.name;
  const dur = req.body?.duration_seconds === null ? null
    : Math.min(7200, Math.max(1, Number(req.body?.duration_seconds ?? m.duration_seconds) || 10));
  db.prepare(`UPDATE media SET name=?, title=?, body=?, bg_color=?, duration_seconds=? WHERE id=?`).run(
    nome,
    m.kind === 'text' ? String(req.body?.title ?? m.title) : m.title,
    m.kind === 'text' ? String(req.body?.body ?? m.body) : m.body,
    m.kind === 'text' && /^#[0-9a-fA-F]{6}$/.test(req.body?.bg_color || '') ? req.body.bg_color : m.bg_color,
    m.kind === 'video' ? null : dur,
    m.id);
  res.json({ ok: true });
});

app.delete('/api/media/:id', requireAuth, (req, res) => {
  const m = db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
  if (!m) return bad(res, 'Mídia não encontrada.', 404);
  db.prepare('DELETE FROM media WHERE id=?').run(m.id);
  if (m.file_path) { try { fs.unlinkSync(path.join(__dirname, m.file_path)); } catch {} }
  res.json({ ok: true });
});


// Exibir uma mídia direto em uma TV, sem montar playlist antes:
// cria (ou reaproveita) uma playlist só com essa mídia e a coloca no ar.
app.post('/api/media/:id/display', requireAuth, (req, res) => {
  const m = db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
  if (!m) return bad(res, 'Mídia não encontrada.', 404);
  const d = db.prepare('SELECT * FROM devices WHERE id=?').get(Number(req.body?.device_id));
  if (!d) return bad(res, 'TV não encontrada.', 404);

  const info = db.transaction(() => {
    // Reaproveita se já existe uma playlist de 1 item só com esta mídia e este nome
    let plId = null;
    const candidatas = db.prepare('SELECT id FROM playlists WHERE name = ?').all(m.name);
    for (const c of candidatas) {
      const itens = db.prepare('SELECT media_id FROM playlist_items WHERE playlist_id=?').all(c.id);
      if (itens.length === 1 && itens[0].media_id === m.id) { plId = c.id; break; }
    }
    if (!plId) {
      const pl = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(m.name);
      plId = pl.lastInsertRowid;
      db.prepare('INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds) VALUES (?,?,0,NULL)')
        .run(plId, m.id);
    }
    db.prepare('INSERT INTO device_assignments (device_id, playlist_id) VALUES (?,?)').run(d.id, plId);
    db.prepare('DELETE FROM play_queue WHERE device_id=? AND playlist_id=?').run(d.id, plId);
    sendCommand(d.id, 'play');
    return plId;
  })();

  res.json({ ok: true, playlist_id: info });
});

// ---------- playlists ----------
app.get('/api/playlists', requireAuth, (req, res) => res.json({ playlists: listPlaylists() }));

app.post('/api/playlists', requireAuth, (req, res) => {
  const nome = String(req.body?.name || '').trim() || 'Nova playlist';
  const info = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(nome);
  res.json({ playlist: db.prepare('SELECT * FROM playlists WHERE id=?').get(info.lastInsertRowid) });
});

app.put('/api/playlists/:id', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM playlists WHERE id=?').get(req.params.id);
  if (!p) return bad(res, 'Playlist não encontrada.', 404);
  const nome = String(req.body?.name || '').trim() || p.name;
  db.prepare('UPDATE playlists SET name=?, version=version+1 WHERE id=?').run(nome, p.id); // version++: TVs com ela no ar se atualizam
  res.json({ ok: true });
});

app.post('/api/playlists/:id/duplicate', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM playlists WHERE id=?').get(req.params.id);
  if (!p) return bad(res, 'Playlist não encontrada.', 404);
  const novo = db.transaction(() => {
    const info = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(`Cópia de ${p.name}`);
    const id = info.lastInsertRowid;
    const itens = db.prepare('SELECT media_id, duration_seconds FROM playlist_items WHERE playlist_id=? ORDER BY position, id').all(p.id);
    itens.forEach((it, i) => db.prepare('INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds) VALUES (?,?,?,?)')
      .run(id, it.media_id, i, it.duration_seconds));
    return id;
  })();
  res.json({ playlist: db.prepare('SELECT * FROM playlists WHERE id=?').get(novo) });
});

app.delete('/api/playlists/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM playlists WHERE id=?').run(req.params.id); // CASCADE tira itens, vínculos e fila
  res.json({ ok: true });
});

// Formato do editor: duração crua por item (null = usa a da mídia).
app.get('/api/playlists/:id/full', requireAuth, (req, res) => {
  const p = db.prepare('SELECT id,name,version FROM playlists WHERE id=?').get(req.params.id);
  if (!p) return bad(res, 'Playlist não encontrada.', 404);
  const rows = db.prepare(`
    SELECT pi.id AS item_id, pi.media_id, pi.duration_seconds,
           m.kind, m.name, m.file_path, m.mime, m.title, m.body, m.bg_color, m.duration_seconds AS media_duration, m.size_bytes
    FROM playlist_items pi JOIN media m ON m.id = pi.media_id
    WHERE pi.playlist_id = ? ORDER BY pi.position, pi.id`).all(p.id);
  res.json({
    playlist: p,
    items: rows.map(r => ({
      item_id: r.item_id, media_id: r.media_id, duration_seconds: r.duration_seconds,
      media: { id: r.media_id, kind: r.kind, name: r.name, file_path: r.file_path, mime: r.mime,
               title: r.title, body: r.body, bg_color: r.bg_color, duration_seconds: r.media_duration, size_bytes: r.size_bytes }
    }))
  });
});

// Salva a lista inteira (ordem + durações) de uma vez: simples e à prova de erros.
app.put('/api/playlists/:id/items', requireAuth, (req, res) => {
  const p = db.prepare('SELECT id FROM playlists WHERE id=?').get(req.params.id);
  if (!p) return bad(res, 'Playlist não encontrada.', 404);
  const itens = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!itens) return bad(res, 'Lista inválida.');
  const insere = db.prepare('INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds) VALUES (?,?,?,?)');
  db.transaction(() => {
    db.prepare('DELETE FROM playlist_items WHERE playlist_id=?').run(p.id);
    itens.forEach((it, i) => {
      const mediaId = Number(it.media_id);
      if (!db.prepare('SELECT id FROM media WHERE id=?').get(mediaId))
        throw Object.assign(new Error('Mídia inexistente na lista.'), { status: 400 });
      const dur = (it.duration_seconds === null || it.duration_seconds === undefined) ? null
        : Math.min(7200, Math.max(1, Number(it.duration_seconds) || 10));
      insere.run(p.id, mediaId, i, dur);
    });
    db.prepare('UPDATE playlists SET version=version+1 WHERE id=?').run(p.id);
  })();
  res.json({ ok: true });
});

// ---------- endpoint da TV: heartbeat + estado + comandos, numa tacada só ----------
app.post('/api/player/state', (req, res) => {
    const d = acharTVporToken(String(req.body?.token || ''));
  if (!d) return bad(res, 'Link de TV inválido.', 404);
  const { current_media_id = null, current_playlist_id = null, paused = false, finished_queue_entry = null } = req.body || {};

  // 1) sinal de vida + o que está passando agora
  db.prepare(`INSERT INTO device_heartbeats (device_id,last_seen,current_media_id,current_playlist_id,paused)
              VALUES (?,?,?,?,?)
              ON CONFLICT(device_id) DO UPDATE SET last_seen=excluded.last_seen,
                current_media_id=excluded.current_media_id, current_playlist_id=excluded.current_playlist_id,
                paused=excluded.paused`)
    .run(d.id, new Date().toISOString(), current_media_id, current_playlist_id, paused ? 1 : 0);

  // 2) a TV avisou que terminou uma playlist da fila? então ela sai da fila
  if (finished_queue_entry !== null && finished_queue_entry !== undefined) {
    db.prepare('DELETE FROM play_queue WHERE id=? AND device_id=?').run(finished_queue_entry, d.id);
  }

  // 3) comandos pendentes do painel → entregues agora
  const comandos = db.prepare(`SELECT id, action FROM device_commands
    WHERE device_id=? AND delivered_at IS NULL ORDER BY id`).all(d.id);
  if (comandos.length) db.prepare('UPDATE device_commands SET delivered_at=datetime(\'now\') WHERE device_id=? AND delivered_at IS NULL').run(d.id);

  const a = db.prepare('SELECT playlist_id FROM device_assignments WHERE device_id=? ORDER BY id DESC LIMIT 1').get(d.id);
  const fila = db.prepare('SELECT id, playlist_id FROM play_queue WHERE device_id=? ORDER BY position, id').all(d.id);
  res.json({
    device: { id: d.id, name: d.name, orientation: d.orientation },
    default: a ? playlistFull(a.playlist_id) : null,
    queue: fila.map(e => ({ entry_id: e.id, playlist: playlistFull(e.playlist_id) })),
    commands: comandos
  });
});

// ---------- arquivos e páginas ----------
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true })); // cache longo: a TV sobrevive a quedas de rede
app.use(express.static(path.join(__dirname, 'public')));

const PAGINA_404_TV = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Link inválido</title><style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}</style></head>
<body><div><h1>Link inválido</h1><p>Este link de TV não existe mais ou foi renovado.<br>Peça um novo link para quem administra o Mural.</p></div></body></html>`;

app.get('/tv/:token([A-Za-z0-9_-]+)', (req, res) => {
  const d = acharTVporToken(req.params.token);
  if (!d) return res.status(404).send(PAGINA_404_TV);
  res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ---------- erros amigáveis (ex.: arquivo grande, formato errado) ----------
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return bad(res, 'O arquivo é maior que o limite de 200 MB.', 413);
  if (err.message === 'tipo') return bad(res, 'Formato não aceito. Use JPG, PNG, WEBP, GIF, MP4, WEBM ou OGG.');
  if (err.status) return bad(res, err.message, err.status);
  console.error(err);
  bad(res, 'Algo deu errado no servidor. Tente de novo.', 500);
});

app.listen(PORT, () => {
  const ips = [];
  for (const lista of Object.values(os.networkInterfaces()))
    for (const n of lista || []) if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
  console.log('\n  MURAL está ligado! Deixe esta janela aberta.\n');
  console.log(`  Neste computador:   http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Em outras telas:    http://${ip}:${PORT}`));
  console.log('\n  Dica: use o endereço com IP (o da linha de cima) no navegador\n  das outras TVs e celulares.\n');
});