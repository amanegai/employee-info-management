# 社員情報管理 — 多阶段镜像（前端 dist → Maven 打入 JAR → JRE 运行）
# 与 start-app.ps1 相同：frontend/dist 由 maven-resources-plugin 复制到 classpath:/static/

FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk-jammy AS backend-build
WORKDIR /build
COPY --from=frontend-build /build/frontend/dist ./frontend/dist
COPY backend ./backend
WORKDIR /build/backend
RUN apt-get update \
    && apt-get install -y --no-install-recommends dos2unix \
    && dos2unix mvnw \
    && chmod +x mvnw \
    && ./mvnw -q clean package -DskipTests \
    && apt-get purge -y dos2unix \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && mkdir -p /app/data/files /app/config \
    && chown -R appuser:appuser /app
COPY --from=backend-build /build/backend/target/employee-management-1.0.0.jar /app/app.jar
USER appuser
EXPOSE 8080
ENV TZ=Asia/Tokyo
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
CMD ["--spring.config.additional-location=optional:file:/app/config/"]
