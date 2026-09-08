// ============================================================
// db.js — abre o banco SQLite e aplica as migrações em ordem.
// Usa o SQLite que JÁ VEM DENTRO do Node.js (módulo "node:sqlite"),
// então a instalação nunca precisa compilar nada (sem Python, sem
// ferramentas de build). Requer Node.js LTS 22.13+ (24 é ótimo).
// O banco é um arquivo comum (data/mural.db): backup = copiar o arquivo.
// ============================================================
const path = require('path');
const fs = require('fs');

// Se o Node for antigo demais, avisamos de forma amigável — sem erro técnico.
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error('\n  Ops: esta versão do Node.js não tem o banco de dados embutido.');
  console.error('  O Mural precisa do Node.js LTS 22 (atualizado) ou mais novo.');
  console.error('  Instale a versão LTS em https://nodejs.org (pode instalar por cima)');
  console.error('  e rode o INSTALAR-MURAL.bat novamente.\n');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbRaw = new DatabaseSync(path.join(DATA_DIR, 'mural.db'));
dbRaw.exec('PRAGMA journal_mode = WAL;');   // mais rápido e tolerante a quedas
dbRaw.exec('PRAGMA foreign_keys = ON;');    // apagar mídia/playlist limpa os vínculos
dbRaw.exec('PRAGMA busy_timeout = 5000;');  // se duas TVs escreverem junto, uma espera até 5s

// Pequena camada de compatibilidade, para o resto do código continuar igual:
//   db.prepare(sql).get() / .all() / .run()
//   db.exec(sql)
//   db.transaction(fn)  → devolve uma função que roda fn entre BEGIN e COMMIT
const db = {
  exec: (sql) => dbRaw.exec(sql),
  prepare: (sql) => dbRaw.prepare(sql),
  transaction: (fn) => (...args) => {
    dbRaw.exec('BEGIN IMMEDIATE');
    try {
      const resultado = fn(...args);
      dbRaw.exec('COMMIT');
      return resultado;
    } catch (e) {
      try { dbRaw.exec('ROLLBACK'); } catch {}
      throw e;
    }
  }
};

// Migrações versionadas: cada arquivo .sql em /migrations roda
// exatamente uma vez, em ordem alfabética, e fica registrado.
function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const feitas = new Set(db.prepare('SELECT name FROM _migrations').all().map(r => r.name));
  const dir = path.join(__dirname, 'migrations');
  for (const arquivo of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    if (feitas.has(arquivo)) continue;
    const sql = fs.readFileSync(path.join(dir, arquivo), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(arquivo);
    })();
    console.log('  Migração aplicada:', arquivo);
  }
}

module.exports = { db, migrate };