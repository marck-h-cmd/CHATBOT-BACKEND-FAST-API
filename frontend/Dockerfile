FROM node:20-alpine

WORKDIR /app

# Copiar package.json y lock file
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Iniciar servidor de Vite en modo desarrollo
CMD ["npm", "run", "dev"]
