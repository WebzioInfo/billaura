# Deployment Guide (Vercel)

## Prerequisites
- Vercel account
- A MySQL database (e.g. Aiven, PlanetScale, Railway)

## Environment Variables
Before deploying, make sure to configure the following environment variables in your Vercel project settings:

### Required Variables:
- `DATABASE_URL`: Connection string to your MySQL database.
- `JWT_SECRET`: A secure random string (minimum 64 chars recommended) for access tokens.
- `JWT_REFRESH_SECRET`: A secure random string (minimum 64 chars recommended) for refresh tokens.
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (e.g., `https://your-frontend.vercel.app`).
- `NODE_ENV`: Should be set to `production`.

### Optional Variables (Enable as needed):
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: For email functionality.
- `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`: For file uploads.
- `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`: To override default token expirations.
- `API_PREFIX`: Defaults to `api`.

## Deployment Steps
1. Push your code to GitHub.
2. Import the project into Vercel.
3. Vercel should auto-detect NestJS. Ensure the build command is `npm run build` and install command is `npm install`.
4. Add the environment variables from the list above.
5. Deploy!

The backend should start successfully now that optional variables no longer block the bootstrap process.
