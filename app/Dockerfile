FROM node:20

WORKDIR /app

# Kopiraj package files
COPY package*.json ./
RUN npm install

# Kopiraj source code
COPY . .

# Kreiraj direktorije i postavi ispravne permisije (unutar dockera ovo bude!)
RUN mkdir -p /uploads /logs && \
    chown -R node:node /uploads /logs && \
    ls -l /

# Switch na non-root user
USER node

EXPOSE 3000

CMD ["node", "app.js"]