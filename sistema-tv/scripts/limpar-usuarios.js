// ============================================================
// limpar-usuarios.js — apaga TODOS os usuários do Mural
// (incluindo o mestre). TVs, playlists, mídias e o restante
// do sistema NÃO são afetados.
// Roda pelo arquivo LIMPAR-USUARIOS.bat
// ============================================================
const readline = require('readline');
const { db, migrate } = require('../db');

migrate();

if (!process.stdin.isTTY) {
  console.error('\nAbra este programa pelo arquivo LIMPAR-USUARIOS.bat.');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const perguntar = (t) => new Promise(r => rl.question(t, a => r(a.trim())));

(async () => {
  console.log('\n=== MURAL — limpar todos os usuários ===\n');

  const usuarios = db.prepare('SELECT name, login, role FROM users ORDER BY id').all();
  if (!usuarios.length) {
    console.log('Não há usuários cadastrados. Nada a fazer.');
    rl.close(); process.exit(0);
  }

  console.log('Usuários que serão APAGADOS:');
  usuarios.forEach(u =>
    console.log(`  - ${u.name} (login: ${u.login})${u.role === 'master' ? '  [mestre]' : ''}`));

  console.log('\nImportante:');
  console.log(' - TVs, playlists, mídias e links das TVs NÃO são afetados.');
  console.log(' - Depois disso, NINGUÉM entra no painel até que um novo');
  console.log('   usuário mestre seja criado com o CRIAR-USUARIO-MESTRE.bat');

  const conf = await perguntar('\nDigite APAGAR (em maiúsculas) para confirmar: ');
  if (conf !== 'APAGAR') {
    console.log('Cancelado. Nada foi alterado.');
    rl.close(); process.exit(0);
  }

  const n = db.prepare('DELETE FROM users').run().changes;
  console.log(`\nPronto: ${n} usuário(s) apagado(s). O painel ficou sem acesso.`);
  console.log('Próximo passo: rode o CRIAR-USUARIO-MESTRE.bat para criar o novo mestre.');
  rl.close(); process.exit(0);
})();