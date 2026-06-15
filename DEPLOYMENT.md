# VPS Docker CI/CD Deployment

This app can stay on Netlify, but VPS production should run the Docker image. The container serves the built Vite app and the `/api/extract-text` endpoint from `server.js`.

## Local Docker test

```bash
cp .env.example .env
# Fill OPENAI_API_KEY in .env
docker compose up --build
```

Open `http://localhost:3000`.

## VPS requirements

- Docker and Docker Compose plugin installed.
- A deploy user that can run Docker.
- Port `APP_PORT` open in the VPS firewall, or reverse proxy traffic to that port with Nginx/Caddy.

## GitHub Actions setup

Add these repository secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PROJECT_PATH` optional, deploy path on the VPS. If missing, `DEPLOY_PATH` variable or `/opt/screenshot-to-docx` is used.
- `OPENAI_API_KEY` optional if the VPS project already has it in `.env`; otherwise add it as a secret.
- `VPS_PORT` optional, defaults to `22`
- `GHCR_USERNAME` optional, needed if the GHCR package is private
- `GHCR_TOKEN` optional, a GitHub PAT with `read:packages` for private GHCR pulls

Add these repository variables if needed:

- `APP_PORT` optional, defaults to `3000`
- `OPENAI_MODEL` optional, defaults to `gpt-5.4-mini`
- `DEPLOY_PATH` optional, defaults to `/opt/screenshot-to-docx`

Push to `main` or run the workflow manually. The pipeline builds and pushes an image to GitHub Container Registry, copies a production `docker-compose.yml` to the VPS, writes the runtime `.env`, pulls the new image, and restarts the service.

## Reverse proxy example

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
