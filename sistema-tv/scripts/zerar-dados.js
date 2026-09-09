// ============================================================
// zerar-dados.js — apaga SELETIVAMENTE os dados do Mural.
// Você escolhe o que apagar (um ou vários de uma vez):
//   1. Usuários
//   2. TVs (cadastros, links, status, filas e comandos)
//   3. Playlists
//   4. Mídias da biblioteca
//   5. Arquivos enviados (pasta uploads)
//   T. Tudo de uma vez
// Pode rodar com o servidor ligado (a exclusão é por dentro do banco).
// Roda pelo arquivo ZERAR-DADOS.bat
// ============================================================
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_ARQUIVO = path.join(__dirname, '..', 'data', 'mural.db');
const PASTA_UPLOADS = path.join(__dirname, '..', 'uploads');

if (!process.stdin.isTTY) {
  console.error('\nAbra este programa pelo arquivo ZERAR-DADOS.bat.');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const perguntar = (t) => new Promise(r => rl.question(t, a => r(a.trim())));

// ---------- abre o banco só se ele existir ----------
if (!fs.existsSync(DB_ARQUIVO)) {
  console.log('\nO sistema ainda não tem banco de dados (nunca rodou aqui).');
  console.log('Não há nada para apagar.');
  rl.close(); process.exit(0);
}
const { db, migrate } = require('../db');
migrate();

// ---------- o que pode ser apagado ----------
const ALVOS = [
  {
    num: '1', nome: 'Usuários (todos os acessos ao painel)',
    contar: () => db.prepare('SELECT COUNT(*) n FROM users').get().n,
    apagar: () => db.prepare('DELETE FROM users').run().changes,
    consequencia: 'Ninguém entra no painel até criar um novo mestre (CRIAR-USUARIO-MESTRE.bat).'
  },
  {
    num: '2', nome: 'TVs (cadastros, links, status, filas e comandos)',
    contar: () => db.prepare('SELECT COUNT(*) n FROM devices').get().n,
    apagar: () => db.prepare('DELETE FROM devices').run().changes, // cascata: heartbeats, vínculos, fila, comandos
    consequencia: 'Os links atuais MORREM: as TVs mostrarão "Link inválido". Será preciso cadastrar de novo e digitar links novos nelas.'
  },
  {
    num: '3', nome: 'Playlists (todas as listas)',
    contar: () => db.prepare('SELECT COUNT(*) n FROM playlists').get().n,
    apagar: () => db.prepare('DELETE FROM playlists').run().changes, // cascata: itens, vínculos e fila
    consequencia: 'As TVs ficam sem programação ("Sem programação agora"), mas os links delas continuam valendo.'
  },
  {
    num: '4', nome: 'Mídias da biblioteca (imagens, vídeos e avisos)',
    contar: () => db.prepare('SELECT COUNT(*) n FROM media').get().n,
    apagar: () => db.prepare('DELETE FROM media').run().changes, // cascata tira os itens das playlists
    consequencia: 'As playlists ficarão VAZIAS (não apagadas). Você pode remontá-las com novas mídias.'
  },
  {
    num: '5', nome: 'Arquivos enviados (vídeos/imagens na pasta uploads)',
    contar: () => {
      if (!fs.existsSync(PASTA_UPLOADS)) return 0;
      return fs.readdirSync(PASTA_UPLOADS).filter(f =>
        fs.statSync(path.join(PASTA_UPLOADS, f)).isFile()).length;
    },
    apagar: () => {
      let apagados = 0;
      if (fs.existsSync(PASTA_UPLOADS)) {
        for (const f of fs.readdirSync(PASTA_UPLOADS)) {
          const completo = path.join(PASTA_UPLOADS, f);
          try { if (fs.statSync(completo).isFile()) { fs.unlinkSync(completo); apagados++; } } catch (e) {}
        }
      }
      return apagados;
    },
    consequencia: 'Os arquivos saem do disco. Mídias cadastradas que usarem esses arquivos exibirão uma tela preta/erro na TV até serem reenviadas.'
  }
];

// ---------- interpreta a resposta do menu ----------
// Aceita: "3" | "1 3 5" | "1,3,5" | "135" | "T" (tudo) | Enter ou 0 (cancelar)
function interpretar(txt) {
  const t = txt.trim().toLowerCase();
  if (t === '' || t === '0') return null;                       // cancelar
  if (t === 't' || t === 'tudo') return ALVOS.map(a => a.num);  // tudo
  const digitos = t.replace(/[^1-5]/g, '').split('');
  if (!digitos.length) return undefined;                        // inválido
  return [...new Set(digitos)];                                 // sem repetidos
}

(async () => {
  console.log('\n=== MURAL — zerar dados (você escolhe o quê) ===\n');

  // ----- menu com contagem atual de cada coisa -----
  console.log('O que você quer apagar? Digite os números (ex.: 1  e  3  →  "1 3" ou "13")\n');
  for (const a of ALVOS) {
    const n = a.contar();
    console.log(`  ${a.num}. ${a.nome}  —  ${n} item(ns) agora`);
  }
  console.log('\n  T. TUDO de uma vez        0 ou Enter = cancelar');

  // ----- lê a escolha (repete se for inválida) -----
  let escolha;
  while (true) {
    const resp = await perguntar('\nSua escolha: ');
    escolha = interpretar(resp);
    if (escolha === undefined) { console.log('Não entendi. Digite números de 1 a 5 (ex.: "1 4"), ou T para tudo, ou 0 para sair.'); continue; }
    break;
  }
  if (escolha === null) { console.log('Cancelado. Nada foi alterado.'); rl.close(); process.exit(0); }

  const selecionados = ALVOS.filter(a => escolha.includes(a.num));

  // ----- resumo + consequências antes da confirmação -----
  console.log('\nVai ser APAGADO:');
  for (const a of selecionados) {
    console.log(`  [${a.num}] ${a.nome}`);
    console.log(`       efeito: ${a.consequencia}`);
  }

  const conf = await perguntar('\nDigite APAGAR (em maiúsculas) para confirmar: ');
  if (conf !== 'APAGAR') {
    console.log('Cancelado. Nada foi alterado.');
    rl.close(); process.exit(0);
  }

  // ----- executa: banco numa transação só; uploads por arquivo -----
  const deBanco = selecionados.filter(a => a.num !== '5');
  if (deBanco.length) {
    db.transaction(() => { for (const a of deBanco) a.apagar(); })();
  }
  for (const a of selecionados) {
    const n = a.num === '5' ? a.apagar() : null;
    if (a.num === '5') console.log(`  [ok] Arquivos apagados: ${n}`);
    else console.log(`  [ok] ${a.nome.split(' (')[0]} — apagado(s)`);
  }

  console.log('\nPronto. Nada disso volta (os dados de exemplo só aparecem num banco novo).');
  const temUser = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (!temUser) console.log('Próximo passo: CRIAR-USUARIO-MESTRE.bat para recuperar o acesso ao painel.');
  rl.close(); process.exit(0);
})().catch(e => {
  console.error('\nDeu erro ao apagar:', e.message);
  console.error('Nada foi alterado se o erro aconteceu antes da confirmação.');
  rl.close(); process.exit(1);
});