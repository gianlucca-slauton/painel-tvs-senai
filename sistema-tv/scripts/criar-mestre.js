// ============================================================
// criar-mestre.js — cria o primeiro usuário mestre.
// Roda pelo terminal:  npm run criar-mestre
// A senha não aparece na tela enquanto você digita (é proposital).
// ============================================================
const crypto = require('crypto');
const readline = require('readline');
const { db, migrate } = require('../db');

migrate();

if (!process.stdin.isTTY) {
  console.error('\nAbra este programa pela janela do Mural (CRIAR-USUARIO-MESTRE.bat).');
  process.exit(1);
}

// Uma ÚNICA linha de comando para todas as perguntas. É ela quem controla
// o teclado; usar dois métodos diferentes ao mesmo tempo causava travamento.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on('SIGINT', () => {          // Ctrl+C em qualquer momento
  ocultando = false;             // garante que a próxima mensagem apareça
  console.log('\nCancelado. Nada foi criado.');
  process.exit(1);
});

// Pergunta normal (o que é digitado aparece na tela).
const perguntar = (texto) => new Promise(r => rl.question(texto, resp => r(resp.trim())));

// Senha oculta: a linha de comando escreve na tela cada tecla pressionada.
// Desligamos essa escrita só durante esta pergunta — o que for digitado
// não aparece, mas funciona normalmente (inclusive apagar com backspace).
const escreverDeVerdade = process.stdout.write.bind(process.stdout);
let ocultando = false;
rl.output.write = function (chunk, encoding, cb) {
  return ocultando ? true : escreverDeVerdade(chunk, encoding, cb);
};
function perguntarOculto(texto) {
  return new Promise(resolve => {
    escreverDeVerdade(texto);
    ocultando = true;
    rl.question('', resposta => {
      ocultando = false;
      escreverDeVerdade('\n');
      resolve(resposta.trim());
    });
  });
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}

(async () => {
  console.log('\n=== MURAL — criar usuário mestre ===\n');

  const nome = await perguntar('Seu nome completo: ');
  if (!nome) { console.log('O nome é obrigatório. Rode de novo.'); process.exit(1); }

  const login = (await perguntar('Login (uma palavra, ex.: maria): ')).toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(login)) {
    console.log('Login inválido: use 3+ caracteres, sem espaços nem acentos. Rode de novo.');
    process.exit(1);
  }
  if (db.prepare('SELECT id FROM users WHERE login=?').get(login)) {
    console.log('Já existe alguém com esse login. Rode de novo e escolha outro.');
    process.exit(1);
  }

  const senha = await perguntarOculto('Senha (mínimo 4 caracteres): ');
  if (senha.length < 4) { console.log('Senha muito curta. Rode de novo.'); process.exit(1); }
  const senha2 = await perguntarOculto('Repita a senha: ');
  if (senha !== senha2) { console.log('As senhas não conferem. Rode de novo.'); process.exit(1); }

  const mestres = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='master'").get().n;
  if (mestres > 0) console.log('\nAviso: já existe um usuário mestre. Este será criado mesmo assim.');

  db.prepare("INSERT INTO users (name, login, pass_hash, role) VALUES (?,?,?, 'master')")
    .run(nome, login, hashPassword(senha));

  escreverDeVerdade(`\nPronto! Usuário mestre "${login}" criado.\n`);
  escreverDeVerdade('Agora rode o sistema com INICIAR-MURAL.bat (ou: npm start).\n');
  rl.close();
  process.exit(0);
})();