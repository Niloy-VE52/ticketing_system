# Resident Issue Ticketing & Maintenance Dispatch System

An intelligent, full-stack resident maintenance management platform featuring automated Gmail email ingestion, Google Gemini AI issue classification, a modern React executive dashboard, a WhatsApp-style email conversation transcript with dual-color replies, and complete end-to-end email quotation and team resolution workflows.

---

## 🌟 Key Features

### 1. Automated Email Ingestion & Gemini AI Classification
- **Gmail IMAP Listener**: Periodically scans for new unseen resident maintenance emails.
- **Gemini 2.5 Flash Extraction**: Automatically parses unstructured email text into structured data:
  - **Unit / Flat / House Identifier** (e.g. `Apartment 4B`, `Flat 12A`, `Townhouse 8`).
  - **Issue Category**: Plumbing, Electrical, HVAC, Appliance, Security & Locks, Structural, Pest Control, or Other.
  - **Automated Routing**: Automatically assigns the relevant contractor team (e.g. `plumbing-team@example.com`, `electrical-team@example.com`).
- **24-Hour SLA Sweep**: Automatically monitors open tickets and tracks time remaining within the 24-hour resolution window.

### 2. Modern React Executive Dashboard
- **Live Heartbeat Status**: Real-time FastAPI backend connectivity indicator.
- **Executive Metric Cards**: Total Inbound Tickets, Active Issues, Confirmed Fixed (with resolution success rate), and Overdue SLA warnings.
- **Category Routing Breakdown**: Interactive category filter chips with real-time ticket counts.
- **Real-Time Ticket Grid**: Search by resident email, subject, body, or unit identifier, with 24-hour countdown SLA pills.
- **Demo Data Seeder & Sync**: One-click "Load Demo Data" button to test diverse realistic resident maintenance email threads.

### 3. WhatsApp-Style Email Conversation Transcript
- **Conversational Speech Bubbles**:
  - ⚪ **Dark Slate Bubble (Left)**: Resident/User incoming email request with subject badge and timestamp.
  - 🟢 **WhatsApp Emerald Green Bubble (Right)**: Our Acknowledgement & Quotation sent to the resident, with WhatsApp blue double checkmarks (`✓✓`).
  - 🔵 **Royal Blue / Indigo Bubble (Right)**: Our dispatch notification and instructions sent to the maintenance team (`ticket.assigned_team`).
  - 🟢 **Resident Approval Message**: Confirms resident acceptance of the quotation.
  - 🔵 **Designated Team Completion Report**: Final invoice and work verification email sent by the team.
- **Interactive Compose Bar**: Toggle between `[🟢 Reply to Resident]` and `[🔵 Reply to Maintenance Team]` with instant chat appending.

### 4. Acknowledgement & Bill Quotation Workflow (With Options)
- Located directly in the ticket modal under **"Send Acknowledgement & Bill Quotation"**.
- **Tiered Service Options**:
  - **Option 1 (Standard Repair & Labor)**: e.g. `$65.00` (Standard inspection, repair, 30-day labor warranty).
  - **Option 2 (Full Replacement + 1-Yr Warranty)**: e.g. `$135.00` (OEM replacement parts, comprehensive coverage).
  - **Option 3 (Priority Same-Day Expedited Service)**: e.g. `$190.00` (Dedicated contractor priority dispatch).
- **Email Dispatch**: Sends the official quotation email to the resident via SMTP.
- **Resident Approval Simulation**: One-click button to simulate the resident approving the quotation, transitioning status to `In Progress`.

### 5. Designated Team Resolution & Final Closure
- Located under **"Designated Team Resolution & Close"**.
- Form pre-populated with the designated contractor team.
- Records work completion notes, technician name, and the final invoice amount.
- **"Send Resolution Email to Resident & Close Ticket"**:
  - Dispatches the final work report and bill email to both the resident and contractor team.
  - Formally marks the ticket as **`CONFIRMED FIXED`** with resolution timestamp.

---

## 📁 Project Structure

```
ticket/
├── backend/                  # Python FastAPI Backend
│   ├── classifier.py         # Google Gemini AI classification & team routing
│   ├── mail_fetcher.py       # IMAP client for reading unseen Gmail messages
│   ├── main.py               # FastAPI application, CORS, and REST API endpoints
│   ├── models.py             # SQLAlchemy models & SQLite database schema
│   ├── notifier.py           # SMTP mailer for quotations, dispatches & closures
│   ├── ticket_service.py     # Pipeline coordinator (ingest -> classify -> notify)
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables (API keys, Gmail credentials)
├── frontend/                 # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── EmailTranscriptModal.jsx  # WhatsApp chat transcript, quotation & resolution
│   │   │   ├── Navbar.jsx                # Branding, status, auto-sync & mailbox poll
│   │   │   ├── StatsOverview.jsx         # KPI metric cards & category chips
│   │   │   └── TicketList.jsx            # Filterable tickets grid & SLA pills
│   │   ├── api.js            # Frontend REST API client
│   │   ├── App.jsx           # Main application coordinator
│   │   └── index.css         # Modern Vanilla CSS design system
│   ├── package.json
│   └── vite.config.js
├── tickets.db                # SQLite database storing tickets and communication logs
├── walkthrough.md            # Visual verification and screenshot walkthrough
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- Google Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))
- (Optional) Gmail Account with an **App Password** for live IMAP/SMTP emailing

---

### Backend Setup

1. **Activate Virtual Environment & Install Dependencies**:
   ```powershell
   # Windows PowerShell
   .venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   ```

2. **Configure Environment Variables (`backend/.env`)**:
   ```ini
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.5-flash

   # Gmail Credentials (optional for live mail ingestion/sending)
   GMAIL_ADDRESS=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password

   # Database (Neon PostgreSQL Cloud or local fallback)
   DATABASE_LINK=postgresql://neondb_owner:npg_...@ep-...neon.tech/neondb?sslmode=require

   # Team email routing
   PLUMBING_TEAM_EMAIL=plumbing-team@example.com
   ELECTRICAL_TEAM_EMAIL=electrical-team@example.com
   HVAC_TEAM_EMAIL=hvac-team@example.com
   APPLIANCE_TEAM_EMAIL=appliance-team@example.com
   SECURITY_TEAM_EMAIL=security-team@example.com
   GENERAL_TEAM_EMAIL=facilities-team@example.com
   ```

3. **Start the FastAPI Server**:
   ```powershell
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.*

---

### Frontend Setup

1. **Install Dependencies**:
   ```powershell
   cd frontend
   npm install
   ```

2. **Start the Vite Dev Server**:
   ```powershell
   npm run dev
   ```
   *Open **`http://localhost:5173`** in your browser.*

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tickets` | List all resident maintenance tickets |
| `GET` | `/tickets/stats` | Retrieve dashboard KPI counts and category distribution |
| `GET` | `/tickets/{id}` | Get detailed ticket record by ID |
| `PATCH` | `/tickets/{id}/status` | Update ticket status (`new`, `in_progress`, `confirmed_fixed`, etc.) |
| `POST` | `/tickets/{id}/confirm` | Maintenance team confirms fix and marks ticket closed |
| `POST` | `/tickets/{id}/send-quote` | Sends acknowledgement & bill quotation email with options to resident |
| `POST` | `/tickets/{id}/approve-quote` | Marks quotation approved and moves ticket to `in_progress` |
| `POST` | `/tickets/{id}/team-resolve-and-close` | Designated team sends completion email with final bill and closes ticket |
| `POST` | `/tickets/poll-now` | Manually trigger Gmail IMAP mailbox poll |
| `POST` | `/tickets/seed-samples` | Seed diverse realistic demo tickets for testing |
| `DELETE` | `/tickets/{id}` | Delete a ticket record |
