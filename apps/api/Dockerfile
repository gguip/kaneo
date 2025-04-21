# Use uma imagem base do Bun
FROM oven/bun:latest as base

# Defina o diretório de trabalho
WORKDIR /app

# Instale Python e ferramentas de compilação necessárias
RUN apt-get update && \
    apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copie apenas os arquivos necessários para a API
COPY package.json .
COPY tsconfig.json .
COPY src/ ./src/
COPY drizzle/ ./drizzle/
COPY drizzle.config.ts .

# Instale as dependências
RUN bun install

# Exponha a porta
EXPOSE 1337

# Comando para iniciar a aplicação
CMD ["bun", "run", "src/index.ts"]