# Imagen base más compatible
FROM node:18-slim

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de aplicación
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production || npm install --production

# Copiar todo el código
COPY . .

# Crear directorio para auth si no existe
RUN mkdir -p auth_info_baileys

# Puerto para health check
EXPOSE 8000

# Usuario no-root para seguridad (opcional pero recomendado)
USER node

# Comando de inicio
CMD ["node", "bot-baileys.js"]