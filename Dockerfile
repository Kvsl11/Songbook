# Servidor do app no Render (ou qualquer lugar com Docker): a API /api/* e o áudio dos vídeos para a IA escrever
# a partitura. A cada publicação vêm as versões mais novas do yt-dlp e do bgutil (o YouTube muda e eles acompanham):
# - yt-dlp com os resolvedores de desafio do YouTube (yt-dlp[default]) e o Node como interpretador de JavaScript;
# - bgutil: gera a prova de origem (PO Token) que o YouTube pede a quem não é navegador (servidor em 127.0.0.1:4416).
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git ffmpeg python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*
# o servidor do bgutil e o complemento do yt-dlp na mesma versão (a última publicada)
RUN TAG=$(git ls-remote --tags --refs https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git | sed 's#.*/##' | sort -V | tail -1) \
  && git clone --depth 1 --branch "$TAG" https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil \
  && cd /opt/bgutil/server && npm ci && npx tsc \
  && pip3 install --no-cache-dir --break-system-packages -U "yt-dlp[default]" "bgutil-ytdlp-pot-provider==$TAG"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY public ./public
ENV PORT=10000
EXPOSE 10000
# o gerador de prova de origem fica rodando ao lado do servidor do app
CMD ["sh", "-c", "node /opt/bgutil/server/build/main.js & exec node server/index.js"]
