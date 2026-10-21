# Servidor do app no Render (ou qualquer lugar com Docker): a API /api/* e o áudio dos vídeos para a IA escrever
# a partitura (yt-dlp). A cada publicação o yt-dlp vem na versão mais nova (o YouTube muda e ele acompanha).
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY public ./public
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server/index.js"]
