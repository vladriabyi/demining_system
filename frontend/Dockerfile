FROM node:20-alpine
WORKDIR /app

# Копіюємо залежності
COPY package*.json ./

# Встановлюємо залежності (ігноруємо node_modules з хосту)
RUN npm install

# Копіюємо вихідний код (без node_modules — вони вже є)
COPY . .

# Видаляємо node_modules якщо скопіювались з хосту, використовуємо свіжі
RUN rm -rf node_modules && npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
