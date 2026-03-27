# Backend deployment notes

This file contains quick steps to deploy the backend cheaply using Docker + Render or Docker Hub.

1. Prepare production `.env` from `.env.production.example` and set secrets.
2. Build locally

```bash
cd backend
docker build -t youruser/yachi-backend:latest .
```

3. Push to Docker Hub

```bash
docker login
docker push youruser/yachi-backend:latest
```

4. On Render: create a new Web Service and point to Docker image or connect the GitHub repo and set the build command to `docker build`.

CI: see `.github/workflows/backend-deploy.yml`. Set these repository secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_PASSWORD`, optional `RENDER_SERVICE_ID`, `RENDER_API_KEY`.

Notes:
- Migrations: Ensure `db:migrate` runs as a release task or create a migration job in Render.
- Health checks: use `npm run health:check` or point Render to `/health` if exposed.
