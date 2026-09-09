Para o uso em servidor local:

MANUAL DO SISTEMA — MURAL / Painel TVs SENAI
Sinalização digital para rede local — versão para servidor local (Windows)
Sistema interno. O painel só é acessível por quem tem login. As TVs acessam por link próprio, sem login.


1. O que você precisa
Node.js	Versão LTS 22 ou mais nova — baixe em https://nodejs.org (botão verde, next → next → finish)
Pasta do sistema	A pasta do Mural em um lugar definitivo (ex.: C:\mural)
Navegador nas TVs	Samsung Internet, LG Web Browser, Chrome etc. Se a TV não tiver, use um Fire TV Stick/Chromecast ou um mini PC


2. Instalação
Execute "instalar-painel.bat"
Ele verifica o Node.js, baixa os componentes e já cria o banco de dados.

Quando pedir, responda:
Nome completo, login e senha

**Guarde bem esse login e senha: é o usuário mestre.**

Se o instalador avisar que o Node é antigo demais: instale a versão LTS do site e rode o instalador de novo.


3. Ligar o sistema
Execute "iniciar-painel.bat"
Será aberta uma janela com os endereços do sistema. Deixe essa janela aberta pois ela mantém o servidor ligado.

Acesse o endereço designado em um navegador e use seu login.


O que faz:

INSTALAR-MURAL.bat	Instala os componentes, cria o banco e pede os dados do usuário mestre	
INICIAR-PAINEL.bat	Liga o servidor. A janela preta deve ficar aberta	
CRIAR-USUARIO-MESTRE.bat	Cria um usuário mestre no primeiro acesso.
LIMPAR-USUARIOS.bat	Apaga todos os usuários (TVs, playlists e mídias ficam)	
ZERAR-DADOS.bat		Apaga dados à sua escolha, com um menu



Anderson Dias França Júnior & Gianlucca Souza Lauton sob a orientação do Prof. Gabriel Eduardo — SENAI "Morvan Figueiredo" - Mooca. Todos os direitos reservados. © 2026.