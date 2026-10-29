# Servidor da IA da partitura (Python)

Transforma áudio em notas para a partitura do Songbook, com mais fidelidade que o modelo que roda no celular:

- **Demucs** separa a voz dos instrumentos: a voz é ouvida sozinha e a banda à parte (sem vozes emboladas);
- **Basic Pitch** (Spotify) ouve a música inteira de uma vez (sem as emendas de 5 s do aparelho);
- **CREPE** confere a afinação cantada (nota meio tom ou uma oitava fora vai para a altura certa);
- limpeza: tira o eco (harmônico) das notas graves, junta a nota longa partida pelo vibrato sem juntar a mesma nota
  cantada de novo (outra sílaba) e tira os estalos;
- **YouTube**: cole o link; o **yt-dlp** baixa só o áudio (WAV temporário, apagado assim que a partitura sai). Vídeo
  com restrição de idade: ponha um `cookies.txt` (formato Netscape, exportado do navegador logado) nesta pasta;
- **Letra sincronizada** (`/letra`): o **Whisper** ouve a voz separada e cada linha da letra ganha o instante em
  que é cantada no vídeo.

Medido em 11 trechos de músicas reais (MUSDB18, voz isolada como gabarito): a melodia certa passou de **34%** do
tempo (a música inteira junta, como no celular) para **70%** (voz separada + limpeza).

## No seu computador, de graça (recomendado)

Sem crédito para acabar e sem fila de ninguém: o servidor roda no seu PC e um túnel grátis da Cloudflare (sem conta)
dá o endereço https que o celular alcança de qualquer lugar. De quebra, o YouTube quase não bloqueia a internet de casa.

1. Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) (grátis para uso pessoal) e abra-o.
   O PC precisa de uns 8 GB de memória livre.
2. Baixe o projeto (no GitHub: **Code → Download ZIP**) e descompacte.
3. Na pasta `servidor-ia`: dois cliques em **`iniciar-windows.bat`** (Windows) ou rode `./iniciar.sh` (Mac/Linux).
   A primeira vez monta tudo e leva uns 15 minutos; as outras, segundos.
4. Abre a página <http://localhost:7860> com um QR code: leia com a câmera do celular. O Songbook abre já usando o PC
   (fica em **Ajustes → Servidor no seu computador**).

**Sem o Docker** (não instala, ou o PC não tem virtualização), no Windows: com qualquer Python instalado (marque
"Add python.exe to PATH"), dê dois cliques em **`iniciar-windows-sem-docker.bat`**. O servidor precisa do 3.11: se o
seu for outro (3.12, 3.13, 3.14…), `preparar_python.py` baixa o Python 3.11 portátil (o zip "embeddable" oficial do
python.org) para `servidor-ia\python311`, sem instalar nada e sem administrador (serve no notebook corporativo). A primeira vez instala tudo na pasta `.venv` (uns 15 minutos e
5 GB); depois abre a mesma página com o QR code. Deixe a janela preta aberta enquanto usa (fechar desliga o servidor).
No Mac/Linux, o mesmo com `python3.11 iniciar_pc.py` depois da instalação de "Rodar no seu computador" (abaixo).

### No notebook da empresa, pelo VS Code (sem administrador)

1. Abra a pasta do projeto no VS Code. Precisa de algum Python instalado (o da loja da empresa ou o do python.org
   "só para mim" serve; o 3.11 portátil é baixado sozinho).
2. **Terminal → Executar tarefa → Ligar o servidor da IA (partitura e letra)** (a tarefa está em `.vscode/tasks.json`
   e chama o `iniciar-windows-sem-docker.bat`). A primeira vez instala tudo em `servidor-ia\.venv` (uns 15 minutos).
3. Se o QR code aparecer em <http://localhost:7860>, leia com o celular e pronto.
4. Se não aparecer (a rede da empresa bloqueia o túnel da Cloudflare): na aba **Portas** do VS Code (ao lado do
   Terminal), **Encaminhar uma porta** → `7860`, entre com a conta do GitHub, clique com o botão direito na porta →
   **Visibilidade da porta → Pública** e abra o endereço `https://…devtunnels.ms` que aparece: é a mesma página, com
   o QR code apontando para ele. Há também a tarefa "… só com as Portas do VS Code (sem Cloudflare)", que nem tenta
   o túnel da Cloudflare.

Com o servidor do computador ligado, a tela **Importar o áudio** manda o arquivo (ou o link do YouTube) para ele, sem
gastar crédito de ninguém; se ele não responder, o celular faz a partitura sozinho.

Deixe o PC ligado enquanto usa. O servidor volta sozinho quando o Docker Desktop abre, mas o endereço do túnel muda a
cada vez: abra <http://localhost:7860> e leia o QR code de novo. Com o PC desligado, o app volta para o servidor da
nuvem (abaixo), se houver. Parar: `docker compose down` nesta pasta. Ver o que está fazendo: `docker compose logs -f ia`.

## Publicar de graça (Modal)

O workflow `.github/workflows/servidor-ia.yml` publica o servidor no [Modal](https://modal.com) (US$ 30 de uso
grátis por mês, https, liga só quando alguém usa) e a publicação do app grava o endereço em `data/servidor-ia.json`:
quem usa o app não configura nada. Só uma vez, à mão:

1. Entre em <https://modal.com/signup> com a conta do GitHub.
2. Crie um token em <https://modal.com/settings/tokens> → **New token** (aparecem dois valores: ID e Secret).
3. No GitHub do app: **Settings → Secrets and variables → Actions → New repository secret**:
   `MODAL_TOKEN_ID` (o ID) e `MODAL_TOKEN_SECRET` (o Secret). Opcionais: `ANTHROPIC_API_KEY` ("Tirar dúvidas") e
   `YT_COOKIES` (o conteúdo do cookies.txt).
4. Em **Actions**, rode **Publicar o servidor da IA** (a primeira montagem leva uns 15 minutos); a publicação do app
   roda sozinha em seguida.

### Lumen com IA (`ANTHROPIC_API_KEY`)

Com a chave da API da Anthropic (<https://console.anthropic.com> → **API Keys**, paga por uso) no secret
`ANTHROPIC_API_KEY`, o Lumen (o assistente do app) passa a responder com IA: o Claude Sonnet lê o acervo do Drive
(cantos, Hinário, nomes dos arquivos e o texto dos PDFs), o que o app manda junto (a liturgia do dia, os cantos
sugeridos, a biblioteca e os repertórios de quem pergunta) e, se precisar, a internet, e cita de onde tirou cada coisa.
Roda numa máquina pequena do Modal (a função `lumen`), separada da das partituras. A publicação lê o texto dos PDFs do
acervo (`indexar_acervo.py`, até 800 arquivos novos por vez, guardados entre as publicações) e roda sozinha toda
segunda-feira para ler os que entraram no Drive. Sem a chave, o Lumen continua com a busca gratuita no aparelho.

## Rodar no seu computador

```bash
cd servidor-ia
python3.11 -m venv .venv && . .venv/bin/activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
pip install --no-deps basic-pitch==0.4.0
uvicorn app:app --host 0.0.0.0 --port 8000
```

Precisa do `ffmpeg` instalado. No app: **Ajustes → IA da partitura**, cole o endereço (ex.: `https://meu-servidor:8000`).

| Rota | |
|---|---|
| `GET /saude` | o que o servidor tem (separação, Whisper, cookies) |
| `POST /transcrever` | `arquivo` (multipart) → notas |
| `POST /youtube` | `{"url": "..."}` → notas |
| `POST /letra` | `{"url": "...", "linhas": [...]}` → início e fim de cada linha |

Variáveis: `IA_ORIGENS` (CORS), `IA_CHAVE` (senha, cabeçalho `X-Chave`), `IA_TAREFAS`, `IA_MAX_MB`, `IA_COOKIES`,
`IA_WHISPER` (small), `IA_CREPE` (tiny; `full` é mais lento e só um pouco mais preciso), `IA_THREADS` (núcleos por modelo), `IA_CACHE` (onde ficam o áudio e a voz separada de cada vídeo, para a letra e a partitura não baixarem nem separarem duas vezes). Testes: `python -m pytest tests`.
