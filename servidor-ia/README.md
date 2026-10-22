---
title: Songbook IA
emoji: 🎼
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

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

## Publicar de graça (Hugging Face Spaces)

O workflow `.github/workflows/servidor-ia.yml` cria e atualiza o Space sozinho; o app acha o endereço sozinho
(a publicação do app grava `data/servidor-ia.json`). Só uma vez, à mão:

1. Crie a conta em <https://huggingface.co/join> (grátis, sem cartão).
2. Gere um token de escrita em <https://huggingface.co/settings/tokens> → **Create new token** → tipo **Write**.
3. No GitHub do app: **Settings → Secrets and variables → Actions → New repository secret**, nome `HF_TOKEN`,
   valor = o token. (Opcional: `ANTHROPIC_API_KEY` para o "Tirar dúvidas" e `YT_COOKIES` com o conteúdo do
   cookies.txt.)
4. Em **Actions**, rode **Publicar o servidor da IA** e depois **Publicar no GitHub Pages** (ou só faça um push).

O servidor gratuito dorme depois de uns dias sem uso; o app o acorda ao abrir (a primeira resposta demora ~1 min).

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
`IA_WHISPER` (small), `IA_CREPE` (full). Testes: `python -m pytest tests`.
