# es una versión ligera de Node.js
FROM node:18-alpine

# esta es la carpeta dentro del contenedor
WORKDIR /app

COPY package*.json ./

# se instalan las dependencias
RUN npm install

# Se jala el resto del código
COPY . .

# Se ocupa el puerto 4000 (que es el que usas en tu app)
EXPOSE 4000

# estos son los comandos para arrancar la app
CMD ["npm", "start"]