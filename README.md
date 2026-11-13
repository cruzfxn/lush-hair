# Zitachi Luxury Hair
An **opinionated, typesafe monorepo storefront** for Zitachi Luxury Hair, built with **Next.js**, **NestJS**, **PostgreSQL**, **Tailwind CSS**, and pre-configured **GitHub Actions** for CI/CD.

---
## Features

- **Full-Stack & Typesafe:** End-to-end type safety from the database to your UI.  
- **Modern Stack:** Built with Next.js App Router, NestJS, and PostgreSQL.  
- **Monorepo:** Organized with pnpm workspaces for clean, manageable code.  
- **CI/CD Ready:** Includes a starter workflow for GitHub Actions.  
- **Database Included:** Comes with a Docker Compose setup for a local PostgreSQL instance.  
- **Styled with Tailwind CSS:** A utility-first CSS framework for rapid UI development.

---
## 🛠️ Tech Stack

Frontend: Next.js (App Router)

Backend: NestJS

Database: PostgreSQL

Styling: Tailwind CSS

ORM: TypeORM

Monorepo: pnpm Workspaces

CI/CD: GitHub Actions

Container: Docker

## Zitachi Luxury Hair storefront

The Next.js storefront is branded as **Zitachi Luxury Hair**, with the wordmark **ZITACHI** and **LUXURY HAIR** beneath it. The tagline is **Beauty Beyond Ordinary**. Storefront copy, theme colors, logo paths, and social sharing assets are configured in [`apps/web/src/site-config.ts`](apps/web/src/site-config.ts). The supplied black-background logo is used on dark sections; the compact text wordmark is used in the header.

New product image uploads to Cloudinary use the `zitachi/products` folder. Previously uploaded assets keep their existing paths.

## 🚀 Getting Started

Follow these steps to get the project running locally.

### 🧩 Prerequisites

- **Node.js** (v18 or later)  
- **pnpm**  
- **Docker**

---

## ⚙️ Installation & Setup

### 🧩 Clone the repository:

```bash
git clone https://github.com/ikramkharbouch/Next.js-NestJS-E-commerce-Starter.git
cd Next.js-NestJS-E-commerce-Starter
```

### 📦 Install dependencies:

This command will install dependencies for all applications and packages in the monorepo.

```bash
pnpm install
```

### 🐘 Start the Database

This will start a PostgreSQL container in the background:

```bash
docker-compose up -d
```

### ▶️ Running the Project

To start both the frontend (web) and backend (api) applications in development mode, run the following command from the project root.

```bash
pnpm dev
```

Next.js frontend - <http://localhost:3000>  
NestJS backend - <http://localhost:3001>


### 📂 Project Structure

This project uses a pnpm workspace monorepo structure:

```bash
apps/ # Contains the main applications
web/ # The Next.js frontend
api/ # The NestJS backend
```

### 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## Private staging deployment (Vercel + Render)

These instructions deploy the web app to Vercel and the NestJS API plus PostgreSQL to Render. Keep staging private by setting `STAGING_PASSWORD` in Vercel. Requests to the web app then require HTTP Basic Authentication; the web app also sends `X-Robots-Tag: noindex, nofollow, noarchive` on staging responses.

### 1. Prepare and push the repository to GitHub

1. Create a new **private** repository on GitHub. Do not upload the local `.env` file.
2. From the project directory, check that `.env` is ignored and not already tracked:

   ```bash
   git check-ignore -v .env
   git ls-files --error-unmatch .env
   ```

   The first command should show the `.gitignore` rule. The second should fail with “pathspec did not match” because `.env` is not tracked. `.env.example` is safe to commit because it contains placeholders only.
3. Review the files before staging them. If `.env` appears in `git status` as an untracked or staged file, stop and remove it from the staging area before committing. Never use `git add .env`.
4. Add the GitHub repository as `origin` if needed, then commit and push your source:

   ```bash
   git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_PRIVATE_REPOSITORY.git
   git add .
   git status --short
   git commit -m "Prepare private staging deployment"
   git push -u origin main
   ```

   If the remote is already configured, skip `git remote add`. Verify the final staged file list does not contain `.env` before committing.

### 2. Create PostgreSQL and deploy the API on Render

1. In Render, create a PostgreSQL database. Keep it in the same region as the API service. Once it is ready, copy its **Internal Database URL** for the API service; keep the **External Database URL** for the one-off commands from your computer.
2. Create a new **Web Service** from the GitHub repository. Use the repository root as the service root so pnpm can read the root workspace and lockfile. Set:

   - Build command: `pnpm install --frozen-lockfile && pnpm --filter api build`
   - Start command: `pnpm --filter api start:prod`

   Render provides the listening `PORT`; the API binds to `0.0.0.0` and uses that port.
3. In the API service’s environment settings, add:

   - `NODE_ENV` = `production`
   - `JWT_SECRET` = a newly generated, long random secret
   - `DATABASE_URL` = the database’s **Internal Database URL**
   - `DATABASE_SSL` = `false` for Render’s internal database URL (use `true` only when your connection route requires TLS)
   - `TYPEORM_SYNCHRONIZE` = `false`
   - `CORS_ORIGINS` = the Vercel staging origin, for example `https://your-store.vercel.app` (comma-separate additional exact origins)
   - `API_PUBLIC_URL` = the public API service URL, for example `https://your-api.onrender.com`
   - `IMAGE_STORAGE` = `local`, or `cloudinary` with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` set in Render

   You do not need `POSTGRES_*` values when `DATABASE_URL` is set. Leave `PORT` to Render. Deploy the service and wait for it to become healthy.

**Database migrations are required before launch.** TypeORM synchronization is automatically enabled only when `NODE_ENV=development`, unless explicitly overridden with `TYPEORM_SYNCHRONIZE`. Do not enable it on a deployed database. This starter does not provide production migrations for its current schema; create and apply proper TypeORM migrations before launching with real data.

### 3. Deploy the web app to Vercel

1. Import the same GitHub repository into Vercel and select `apps/web` as the project’s **Root Directory**. Vercel supports separate projects from monorepo subdirectories; make sure the deployment includes the root pnpm workspace files if prompted.
2. Add these project environment variables for the **Preview** staging environment:

   - `NEXT_PUBLIC_API_URL` = the public Render API URL, with no trailing slash
   - `STAGING_PASSWORD` = a long, unique staging-only password

   `NEXT_PUBLIC_API_URL` is public configuration. Do not prefix credentials or other secrets with `NEXT_PUBLIC_`.
3. Deploy. Open the Vercel URL and enter username `staging` and the password you configured when the browser prompts for Basic Authentication. To leave the gate disabled, omit `STAGING_PASSWORD`; keep it set for a private staging deployment.

### 4. Point the API and web app at each other

The API’s `CORS_ORIGINS` must contain the exact Vercel origin (scheme and hostname, without a path). The web app’s `NEXT_PUBLIC_API_URL` must contain the public Render API URL. After changing either setting, redeploy the relevant service so its new environment is applied.

For developer-machine commands against the hosted database, copy Render’s **External Database URL** into the root `.env` as `DATABASE_URL` and set `DATABASE_SSL=true` if Render’s external connection requires TLS. Keep the URL secret and do not commit `.env`.

### 5. Seed staging and promote your admin account from your computer

Use the `--allow-non-local-db` flag only after checking that `.env` points to the intended staging database. Both commands refuse remote hosts without that explicit flag:

```bash
pnpm --filter api seed:dev -- --allow-non-local-db
```

Register your own account through the staging website, then promote that exact email:

```bash
pnpm --filter api make:admin -- you@example.com --allow-non-local-db
```

The commands use `DATABASE_URL` (or the split `POSTGRES_*` values), honor `DATABASE_SSL=true`, and never synchronize the schema. Log out and back in after promotion so the new admin role is included in your token.

### 6. Check staging

1. Visit `https://your-api.onrender.com/health`; it should return `{"status":"ok"}`.
2. Visit the Vercel URL in a private browser window. It should ask for Basic Authentication. After signing in, confirm the storefront loads and product images display.
3. Register your account, run the admin promotion command above, sign in again, then open `/admin` and confirm product administration is available.
4. In browser developer tools, inspect the document response headers for `X-Robots-Tag: noindex, nofollow, noarchive`. Confirm API calls succeed and that the API’s configured CORS origin is the Vercel URL.

### Environment variable reference

The root [.env.example](.env.example) lists every application variable without real credentials. API-only server variables include `JWT_SECRET`, `DATABASE_URL` or the `POSTGRES_*` group, `DATABASE_SSL`, `PORT`, `CORS_ORIGINS`, `TYPEORM_SYNCHRONIZE`, `API_PUBLIC_URL`, `IMAGE_STORAGE`, and the optional Cloudinary credentials. Web variables are `NEXT_PUBLIC_API_URL` and optional `STAGING_PASSWORD`. Only `NEXT_PUBLIC_API_URL` is intentionally made available to browser code.
