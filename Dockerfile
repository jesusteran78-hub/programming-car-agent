FROM node:20-alpine

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
