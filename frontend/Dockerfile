FROM node:20-alpine AS frontend_builder
WORKDIR /app/frontend
COPY frontend/ ./
RUN npm install && npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend_builder /app/frontend/dist /usr/share/nginx/html


