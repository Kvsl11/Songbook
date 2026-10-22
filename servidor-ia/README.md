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
