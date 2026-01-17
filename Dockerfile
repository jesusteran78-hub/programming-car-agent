FROM node:20-alpine

# Force rebuild: 2026-01-17-v2.2
ARG CACHEBUST=2

# Instalar FFmpeg para combinar video + audio
RUN apk add --no-cache ffmpeg

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Variables de entorno por defecto (se sobreescriben en el servidor)
ENV PORT=3000

# Comando para iniciar
CMD ["node", "sales_agent.js"]
