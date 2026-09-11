# Resident Issue Ticketing — Backend Service

FastAPI service powering the automated resident issue ticketing platform.

## What it does
1. **Gmail Ingestion**: Fetches unseen resident maintenance emails via IMAP (`mail_fetcher.py`).
2. **Gemini Classification**: Extracts Unit Identifier, Issue Category, Summary, and assigns contractor teams (`classifier.py`).
3. **Database & ORM**: Persists tickets in SQLite (`models.py`, `tickets.db`).
4. **Email Dispatcher**: Sends notifications, service quotations, and completion emails via SMTP (`notifier.py`).
5. **REST API**: Serves endpoints for the React frontend, quotation workflows, and team resolutions (`main.py`).

## Running the Backend
From the project root:
```powershell
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API docs: `http://127.0.0.1:8000/docs`

For complete system setup and full-stack instructions, refer to the root [README.md](../README.md).
