# Full Production Deployment Guide

This guide covers deploying the **Resident Issue Ticketing & Maintenance Dispatch System** to production.

---

## 🏗️ Architecture Overview

The system consists of three distinct layers:
1. **Cloud Database**: **Neon PostgreSQL** (serverless AWS cloud database — already active).
2. **Backend Web Service**: **FastAPI** with `APScheduler` (running 24/7 background jobs to poll Gmail via IMAP every 2 minutes and sweep 24-hour overdue SLAs every 15 minutes).
3. **Frontend Application**: **React 19 + Vite** Single-Page Application (SPA).

> [!IMPORTANT]
> **Why continuous hosting is required for the backend**:
> The backend uses `APScheduler` to poll Gmail and close overdue tickets in the background. Because of this, the backend must be hosted on a platform that keeps processes running continuously (such as **Render**, **Railway**, **Fly.io**, **Docker**, or an **Ubuntu VPS**). Do not deploy the backend to serverless functions (like AWS Lambda or Vercel serverless) because they freeze when idle.

---

## 🚀 Method 1: Cloud PaaS (Recommended & Fastest)

This is the easiest, zero-maintenance setup: **Render** (for Backend) + **Vercel** (for Frontend).

### Part A: Deploy Backend to [Render.com](https://render.com/)

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Configure the settings:
   - **Name**: `resident-ticket-backend`
   - **Region**: Closest to your users (e.g. `Ohio (US East)` matches your Neon DB region).
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
5. Scroll to **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `DATABASE_LINK` | `postgresql://neondb_owner:npg_Qh0Pt3ndKYWp@ep-square-shadow-a57jcjbq-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
   | `GEMINI_API_KEY` | Your Google Gemini API Key |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `GMAIL_ADDRESS` | `your-email@gmail.com` |
   | `GMAIL_APP_PASSWORD` | Your 16-character Gmail App Password |
   | `IMAP_HOST` | `imap.gmail.com` |
   | `GMAIL_QUERY` | `UNSEEN` |
   | `PLUMBING_TEAM_EMAIL` | `plumbing-team@example.com` |
   | `ELECTRICAL_TEAM_EMAIL` | `electrical-team@example.com` |
   | `HVAC_TEAM_EMAIL` | `hvac-team@example.com` |
   | `APPLIANCE_TEAM_EMAIL` | `appliance-team@example.com` |
   | `SECURITY_TEAM_EMAIL` | `security-team@example.com` |
   | `GENERAL_TEAM_EMAIL` | `facilities-team@example.com` |
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://resident-ticket-backend.onrender.com`).

---

### Part B: Deploy Frontend to [Vercel](https://vercel.com/)

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** $\rightarrow$ **Project**.
2. Select your repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and choose `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://resident-ticket-backend.onrender.com` *(your Render backend URL from Part A)* |
5. Click **Deploy**.
6. Your frontend will be live on a global CDN URL (e.g., `https://resident-tickets.vercel.app`).

---

## 🐳 Method 2: Docker & Docker Compose (Self-Hosted)

If you have a Linux server or want to run everything with Docker:

### 1. Prerequisites
Ensure `docker` and `docker compose` are installed:
```bash
docker --version
docker compose version
```

### 2. Configure Environment
Ensure `backend/.env` is configured with your credentials.

### 3. Build and Run
From the project root:
```bash
# Build and start in detached mode
docker compose up --build -d
```

### 4. Verify Containers
```bash
docker compose ps
docker compose logs -f backend
```
- Frontend will be accessible at: `http://<your-server-ip>:5173`
- Backend API will be accessible at: `http://<your-server-ip>:8000`

---

## 🖥️ Method 3: Ubuntu / Debian VPS (Production Guide)

For deployment on a dedicated VPS (DigitalOcean, AWS EC2, Linode, or Hetzner).

### 1. Server Preparation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git nginx certbot python3-certbot-nginx
```

### 2. Clone Repository
```bash
cd /var/www
sudo git clone https://github.com/your-username/ticket.git
sudo chown -R $USER:$USER /var/www/ticket
cd /var/www/ticket
```

### 3. Setup Python Backend Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 4. Create Systemd Service for FastAPI
Create `/etc/systemd/system/ticket-backend.service`:
```ini
[Unit]
Description=Resident Issue Ticketing FastAPI Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/ticket/backend
Environment="PATH=/var/www/ticket/.venv/bin"
EnvironmentFile=/var/www/ticket/backend/.env
ExecStart=/var/www/ticket/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ticket-backend
sudo systemctl start ticket-backend
sudo systemctl status ticket-backend
```

### 5. Build the React Frontend
```bash
cd /var/www/ticket/frontend
# Install Node.js if needed (e.g. via NodeSource 20.x)
npm install
# Set production backend URL before building
export VITE_API_BASE_URL=https://api.yourdomain.com
npm run build
```

### 6. Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/ticket`:
```nginx
# Frontend SPA
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/ticket/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and test Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ticket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Install Free SSL with Let's Encrypt
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## 🔒 Production Security Checklist

1. **CORS Origins**:
   In `backend/main.py`, replace `allow_origins=["*"]` with your specific frontend domain:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "https://yourdomain.com",
           "https://resident-tickets.vercel.app",
       ],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
2. **Gmail App Password**:
   - Keep `GMAIL_APP_PASSWORD` strictly inside environment variables; never commit `.env` to Git.
3. **Database Security**:
   - Your Neon DB connection string includes `sslmode=require` which ensures all SQL queries are encrypted in transit via TLS.
4. **Health Check Endpoint**:
   - Set up an external monitor (like UptimeRobot or BetterUptime) pointing to `https://api.yourdomain.com/tickets/stats` to alert you if the server ever goes down.
