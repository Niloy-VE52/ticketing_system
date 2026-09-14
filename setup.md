# Setup & Quickstart Guide

This guide walks you through setting up and running the **Resident Issue Ticketing & AI Dispatch Hub** locally from scratch.

---

## 📋 Prerequisites

Ensure the following tools are installed on your machine:
- **Python**: Version 3.10 or higher (`python --version`)
- **Node.js**: Version 18 or higher (`node --version`)
- **uv** (recommended) or **pip**: For fast Python dependency management
- **npm**: Included with Node.js

---

## ⚙️ Environment Configuration

### 1. Backend Configuration (`backend/.env`)

Create or update `backend/.env` in the `backend/` directory (or workspace root):

```env
# Database (leave empty to automatically use local SQLite: tickets.db)
DATABASE_URL=
DATABASE_LINK=

# Google Gemini API Key (Required for AI issue classification)
GEMINI_API_KEY=your_gemini_api_key_here

# Gmail Ingestion & Notifications (Optional for live inbox scanning)
EMAIL_ACCOUNT=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
IMAP_SERVER=imap.gmail.com

# Department Routing Emails
PLUMBING_TEAM_EMAIL=plumbing-team@example.com
ELECTRICAL_TEAM_EMAIL=electrical-team@example.com
HVAC_TEAM_EMAIL=hvac-team@example.com
SECURITY_TEAM_EMAIL=security-team@example.com
APPLIANCE_TEAM_EMAIL=appliance-team@example.com
GENERAL_TEAM_EMAIL=facilities-team@example.com

# Authentication & Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
AUTH_SECRET_KEY=resident-tickets-super-secret-jwt-key
```

### 2. Frontend Configuration (`frontend/.env`)

In `frontend/.env` (optional for local development, defaults to `http://localhost:8000`):

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🚀 Running the Application

### Step 1: Start the Backend Server

Open your terminal in the `backend/` directory:

```powershell
cd backend

# Option A: Using uv (fastest)
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Option B: Using standard Python / pip
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

> **Verification**: Open [http://localhost:8000/docs](http://localhost:8000/docs) to verify FastAPI interactive API documentation is accessible.

---

### Step 2: Start the Frontend Dev Server

Open a second terminal in the `frontend/` directory:

```powershell
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```

> **Access Application**: Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🔑 Login & Demo Profiles

The login screen features a minimalist design with **1-click Quick Fill** pills:

| Role | Username | Password | Access Level |
|---|---|---|---|
| **Property Director** | `admin` | `admin123` | Full administrative & dispatch access |
| **Property Manager** | `manager` | `manager123` | Operational management & ticket triage |
| **Maintenance Lead** | `tech` | `tech123` | Field technician & issue resolution |

---

## 🎯 Dashboard Features & Usage

### 1. Minimalistic Table View
- **Columns**: `Ticket id`, `email`, `House details`, `issue`, `Department`, `Issue date`, `status`, `Ticket status`, and `Action`.
- **WhatsApp Unseen Indicator**:
  - **`● Unseen`**: Highlighted in green for new, unread tickets.
  - **`✓✓ Seen`**: Displays blue double checkmarks once the ticket has been opened.
- **Inline Text Expansion**: Click **"Show more"** / **"Show less"** to view lengthy issue descriptions without leaving the table.
- **Show More Tickets**: A button at the bottom expands more table rows as needed.

### 2. WhatsApp-Style Follow-Up Appending
- When new emails or follow-ups arrive from a resident email that is **already in the database**, the system automatically **appends the new message into the existing conversation thread** instead of creating a duplicate ticket.
- The ticket is moved to the top of the table with the `● Unseen` status mark.

### 3. Split Window: Ticket Details & Live Chat Transcript
- Click any row or the **"Open"** button to open the 2-column split modal:
  - **Left Column**: Resident Owner Name, Unit/House details, Email, Department, Issue Date, and Ticket Status dropdown.
  - **Right Column**:
    - **Header**: `Transcript` with the **Live Chat Stream** indicator on the left and a clean **Close (Esc)** button on the right.
    - **Conversational Chat Bubbles**: WhatsApp-style layout displaying resident messages (left) and team updates (right).
    - **Email Forward to Team**:
      - `to:` Destination email (prefilled with designated team).
      - `body:` Message or notes for the contractor.
      - `send`: Simulates email forwarding and appends the message into the transcript in real-time.

---

## 🛠️ Common Troubleshooting

### 1. Port 8000 Already in Use (`[WinError 10013]`)
If you see socket permission or port in use errors:
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Stop the process by PID
taskkill /PID <PID_NUMBER> /F
```

### 2. Frontend Cannot Reach Backend
- Verify backend is running on `http://127.0.0.1:8000`.
- Verify `VITE_API_BASE_URL` in `frontend/.env` is set correctly or left default.
- Check the backend health pill in the top-right navbar (`API Connected`).

### 3. Testing with Sample Data
- Click the **"Load Demo Data"** button in the top navbar to instantly seed realistic resident maintenance conversations (Plumbing, Electrical, HVAC, Security).
