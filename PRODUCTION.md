# Production deployment

## Required configuration

Copy `backend/.env.example` to `backend/.env`. For production, set at least:

- `NODE_ENV=production`
- `MONGODB_URI` to a managed MongoDB replica set/Atlas connection
- `JWT_SECRET` and `JWT_REFRESH_SECRET` to independent random values of at least 32 characters
- `FRONTEND_URL` to the public HTTPS origin (comma-separated when more than one is required)
- `BACKEND_URL` to the public HTTPS API origin
- Cloudinary, Resend and Firebase credentials for uploads, email and push notifications

Never commit `.env` files. Rotate any secret that has previously been committed or shared.

## Deploy

With Docker available:

```sh
docker compose up --build -d
```

The frontend listens on port `8080`; terminate TLS at the load balancer/reverse proxy. `/api` and Socket.IO are proxied internally to the backend. For separate frontend/backend hosting, build the frontend with `VITE_API_BASE_URL=https://api.example.com/api` and set both public HTTPS origins in the backend environment.

## Release checks

```sh
cd backend && npm ci && npm run check && npm audit --omit=dev
cd ../frontend && npm ci && npm run build && npm audit --omit=dev
```

Use `GET /health` for liveness and `GET /ready` for readiness. Configure platform log collection, database backups, uptime monitoring, error monitoring and secret rotation before serving real users.
