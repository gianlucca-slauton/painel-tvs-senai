// ============================================================
// criar-mestre.js — cria o primeiro usuário mestre.
// Roda pelo arquivo CRIAR-USUARIO-MESTRE.bat (ou: npm run criar-mestre)
// A senha não aparece: cada tecla vira um ponto "•" na tela.
// ============================================================
const crypto = require('crypto');
const readline = require('readline');
const { db, migrate } = require('../db');

migrate();

if (!process.stdin.isTTY) {
  console.error('\nAbra este programa pela janela do Mural (CRIAR-USUARIO-MESTRE.bat).');
  process.exit(1);
}

// Caractere exibido para cada letra digitada da senha. Troque aqui se
// quiser outro símbolo (ex.: '*' ou '·').
const MASCARA_SENHA = '•';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ---------- modo "senha" ----------
const escreverDeVerdade = process.stdout.write.bind(process.stdout);
let ocultando = false;   // true enquanto uma senha está sendo digitada
let perguntaAtual = '';  // texto da pergunta (ex.: "Senha (mínimo 4 caracteres): ")
let teclas = 0;          // quantos • desenhar

// Enquanto a senha está sendo digitada, engolimos o que o readline
// tenta escrever (era assim que ele mostraria os caracteres reais).
// Quem desenha somos nós, com pontinhos.
rl.output.write = function (chunk, encoding, cb) {
  if (ocultando) return true;
  return escreverDeVerdade(chunk, encoding, cb);
};

// Redesenha a linha da senha: volta ao início, apaga e escreve
// pergunta + um • para cada caractere já digitado.
function desenharSenha() {
  const temCursor = typeof process.stdout.cursorTo === 'function';
  if (temCursor) {
    ocultando = false;                    // deixa os comandos de cursor passarem
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
    escreverDeVerdade(perguntaAtual + MASCARA_SENHA.repeat(teclas));
    ocultando = true;
  } else {
    escreverDeVerdade('\r\x1b[K' + perguntaAtual + MASCARA_SENHA.repeat(teclas));
  }
}

// A cada tecla na senha, atualiza a contagem e redesenha.
// O valor verdadeiro fica guardado dentro do próprio readline —
// aqui nós só cuidamos do desenho.
rl.input.on('keypress', () => {
  if (!ocultando) return;
  teclas = rl.line.length;
  desenharSenha();
});

rl.on('SIGINT', () => {          // Ctrl+C em qualquer momento
  console.log('\nCancelado. Nada foi criado.');
  process.exit(1);
});

// Pergunta normal (o que é digitado aparece na tela).
const perguntar = (texto) => new Promise(r => rl.question(texto, resp => r(resp.trim())));

// Senha mascarada: cada caractere vira um • na tela.
function perguntarOculto(texto) {
  return new Promise(resolve => {
    perguntaAtual = texto;
    teclas = 0;
    ocultando = true;
    rl.question(texto, resposta => {
      ocultando = false;
      rl.history = []; rl.historyIndex = -1;  // seta ↑ não revela a senha depois
      escreverDeVerdade('\n');
      resolve(resposta.trim());
    });
    desenharSenha();  // já mostra a pergunta com zero pontinhos
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

    db.prepare("INSERT INTO users (name, login, pass_hash, role, owner) VALUES (?,?,?, 'master', 1)")
    .run(nome, login, hashPassword(senha));

  escreverDeVerdade(`\nPronto! Usuário mestre "${login}" criado.\n`);
  escreverDeVerdade('Agora rode o sistema com INICIAR-MURAL.bat (ou: npm start).\n');
  rl.close();
  process.exit(0);
})();