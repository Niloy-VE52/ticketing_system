from datetime import datetime, timedelta
import logging
import os
from pathlib import Path
import sys

# Ensure backend directory is in Python path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
ROOT_DIR = BACKEND_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Load .env from backend or root
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from backend.mail_fetcher import fetch_mail
    from backend.models import Ticket, TicketStatus, get_db, init_db, SessionLocal
    from backend.ticket_service import confirm_fix, process_incoming_mail, sweep_overdue_tickets
except ImportError:
    from mail_fetcher import fetch_mail
    from models import Ticket, TicketStatus, get_db, init_db, SessionLocal
    from ticket_service import confirm_fix, process_incoming_mail, sweep_overdue_tickets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="Resident Issue Ticketing")

# Enable CORS for React frontend (Vite dev server default is 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()


def poll_mailbox_job():
    """Runs on a schedule: fetches unseen resident emails and creates tickets for each."""
    db = SessionLocal()
    try:
        for subject, sender, body in fetch_mail():
            logger.info("New resident email from %s: %s", sender, subject)
            process_incoming_mail(db, subject, sender, body or "")
    except Exception:
        logger.exception("Mailbox poll failed")
    finally:
        db.close()


def sweep_overdue_job():
    db = SessionLocal()
    try:
        sweep_overdue_tickets(db)
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    init_db()
    # every 2 min: check inbox for new resident emails
    scheduler.add_job(poll_mailbox_job, "interval", minutes=2, id="poll_mailbox")
    # every 15 min: close out tickets that blew past the 24h window
    scheduler.add_job(sweep_overdue_job, "interval", minutes=15, id="sweep_overdue")
    scheduler.start()


@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown()


class StatusUpdateRequest(BaseModel):
    status: str


@app.get("/tickets")
def list_tickets(db: Session = Depends(get_db)):
    return db.query(Ticket).order_by(Ticket.created_at.desc()).all()


@app.get("/tickets/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Ticket).count()
    new_count = db.query(Ticket).filter(Ticket.status == TicketStatus.NEW).count()
    notified_count = db.query(Ticket).filter(Ticket.status == TicketStatus.NOTIFIED).count()
    in_progress_count = db.query(Ticket).filter(Ticket.status == TicketStatus.IN_PROGRESS).count()
    confirmed_count = db.query(Ticket).filter(Ticket.status == TicketStatus.CONFIRMED_FIXED).count()
    overdue_count = db.query(Ticket).filter(Ticket.status == TicketStatus.CLOSED_NO_CONFIRMATION).count()
    closed_count = db.query(Ticket).filter(Ticket.status == TicketStatus.CLOSED).count()

    categories = {}
    tickets = db.query(Ticket.category).all()
    for (cat,) in tickets:
        key = cat or "unclassified"
        categories[key] = categories.get(key, 0) + 1

    return {
        "total": total,
        "new": new_count,
        "notified": notified_count,
        "in_progress": in_progress_count,
        "confirmed_fixed": confirmed_count,
        "closed_no_confirmation": overdue_count,
        "closed": closed_count,
        "active": new_count + notified_count + in_progress_count,
        "categories": categories,
    }


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    return ticket


@app.patch("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: int, payload: StatusUpdateRequest, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    status_str = payload.status.lower()
    valid_statuses = {s.value: s for s in TicketStatus}
    if status_str not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Choose from: {list(valid_statuses.keys())}")

    ticket.status = valid_statuses[status_str]
    if ticket.status == TicketStatus.CONFIRMED_FIXED:
        ticket.resolved_at = datetime.utcnow()
        ticket.closed_at = datetime.utcnow()
    elif ticket.status in [TicketStatus.CLOSED, TicketStatus.CLOSED_NO_CONFIRMATION]:
        ticket.closed_at = datetime.utcnow()
    elif ticket.status == TicketStatus.NOTIFIED and not ticket.notified_at:
        ticket.notified_at = datetime.utcnow()

    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/tickets/{ticket_id}/confirm")
def confirm_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Maintenance team hits this once the fix is done -> 'Teams Confirms Fix' -> 'Ticket Closed'."""
    ticket = confirm_fix(db, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    return ticket


class QuoteOption(BaseModel):
    label: str
    price: str
    description: str = ""


class QuoteRequest(BaseModel):
    quote_title: str
    quote_amount: str
    quote_options: list[dict] | list[str] | str
    notes: str = ""


class ApproveQuoteRequest(BaseModel):
    selected_option: str = ""


class TeamResolveRequest(BaseModel):
    resolution_notes: str
    final_bill: str
    technician_name: str = ""


@app.post("/tickets/{ticket_id}/send-quote")
def send_ticket_quote(ticket_id: int, req: QuoteRequest, db: Session = Depends(get_db)):
    """Sends acknowledgement email with bill quotation and options to resident."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    import json
    opts_str = json.dumps(req.quote_options) if not isinstance(req.quote_options, str) else req.quote_options

    ticket.quote_title = req.quote_title
    ticket.quote_amount = req.quote_amount
    ticket.quote_options = opts_str
    ticket.quote_status = "sent"

    try:
        try:
            from backend.notifier import send_acknowledgement_and_quote
        except ImportError:
            from notifier import send_acknowledgement_and_quote
        send_acknowledgement_and_quote(ticket, req.quote_title, req.quote_amount, req.quote_options, req.notes)
    except Exception as e:
        logger.exception("Failed to send quotation email: %s", e)

    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/tickets/{ticket_id}/approve-quote")
def approve_ticket_quote(ticket_id: int, req: ApproveQuoteRequest, db: Session = Depends(get_db)):
    """Resident approves the quotation -> status moves to in_progress."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    ticket.quote_status = "approved"
    ticket.status = TicketStatus.IN_PROGRESS
    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/tickets/{ticket_id}/team-resolve-and-close")
def team_resolve_and_close(ticket_id: int, req: TeamResolveRequest, db: Session = Depends(get_db)):
    """Designated team sends final completion email with invoice/notes to resident and closes ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    ticket.resolution_notes = req.resolution_notes
    ticket.final_bill = req.final_bill
    ticket.status = TicketStatus.CONFIRMED_FIXED
    ticket.resolved_at = datetime.utcnow()
    ticket.closed_at = datetime.utcnow()

    try:
        try:
            from backend.notifier import send_team_resolution_and_close
        except ImportError:
            from notifier import send_team_resolution_and_close
        send_team_resolution_and_close(ticket, req.resolution_notes, req.final_bill, req.technician_name)
    except Exception as e:
        logger.exception("Failed to send resolution email: %s", e)

    db.commit()
    db.refresh(ticket)
    return ticket


@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    db.delete(ticket)
    db.commit()
    return {"deleted": True, "id": ticket_id}


@app.post("/tickets/poll-now")
def poll_now():
    """Manual trigger for testing instead of waiting on the scheduler."""
    poll_mailbox_job()
    return {"status": "polled"}


@app.post("/tickets/seed-samples")
def seed_samples(db: Session = Depends(get_db)):
    """Seeds realistic resident email conversations for dashboard testing."""
    sample_data = [
        {
            "resident_email": "marcus.vance@oakwood-residents.com",
            "subject": "Urgent: Water leaking under kitchen sink - Apt 4B",
            "body": "Hi Management,\n\nI noticed water pooling beneath our kitchen sink since this morning in Apartment 4B. It seems to be dripping steadily from the main pipe fitting under the cabinet and has started soaking into the wood flooring.\n\nCould someone from the plumbing team please come inspect and fix it as soon as possible before it damages the lower unit?\n\nThanks,\nMarcus Vance\nUnit 4B (Phone: 555-0192)",
            "home": "Apartment 4B",
            "category": "plumbing",
            "assigned_team": "plumbing-team@example.com",
            "status": TicketStatus.IN_PROGRESS,
            "created_at": datetime.utcnow() - timedelta(hours=3, minutes=15),
            "notified_at": datetime.utcnow() - timedelta(hours=3, minutes=10),
        },
        {
            "resident_email": "elena.rostova@highland-estates.net",
            "subject": "Main circuit breaker keeps tripping in Flat 12A",
            "body": "Hello maintenance team,\n\nWhenever we turn on the microwave or living room AC unit, the breaker for Flat 12A switches off completely. We had to reset it 4 times today and we noticed a slight buzzing sound near the panel.\n\nPlease send an electrical technician right away. We are working from home and need power restored reliably.\n\nBest regards,\nElena Rostova\nFlat 12A",
            "home": "Flat 12A",
            "category": "electrical",
            "assigned_team": "electrical-team@example.com",
            "status": TicketStatus.NOTIFIED,
            "created_at": datetime.utcnow() - timedelta(hours=1, minutes=45),
            "notified_at": datetime.utcnow() - timedelta(hours=1, minutes=40),
        },
        {
            "resident_email": "david.chen@gmail.com",
            "subject": "Heater blowing cold air - Townhouse 8",
            "body": "Hi there,\n\nOur central heating unit in Townhouse 8 stopped producing warm air last night. The thermostat is set to 72F but the vents are only blowing room-temperature or cold air. Outside temps are dropping into the 40s tonight with a toddler at home.\n\nAppreciate urgent HVAC assistance.\n\nThank you,\nDavid Chen\nTownhouse 8",
            "home": "Townhouse 8",
            "category": "hvac",
            "assigned_team": "hvac-team@example.com",
            "status": TicketStatus.NEW,
            "created_at": datetime.utcnow() - timedelta(minutes=42),
            "notified_at": None,
        },
        {
            "resident_email": "sarah.jenkins@outlook.com",
            "subject": "Refrigerator making loud grinding noise - Unit 203",
            "body": "Good afternoon,\n\nThe refrigerator compressor in Unit 203 is making a persistent grinding noise and the freezer isn't staying as cold as usual. Ice cream is melting in the freezer drawer.\n\nCan appliance repair take a look sometime tomorrow morning?\n\nSarah Jenkins\nUnit 203",
            "home": "Unit 203",
            "category": "appliance",
            "assigned_team": "appliance-team@example.com",
            "status": TicketStatus.CONFIRMED_FIXED,
            "created_at": datetime.utcnow() - timedelta(hours=18),
            "notified_at": datetime.utcnow() - timedelta(hours=17, minutes=50),
            "resolved_at": datetime.utcnow() - timedelta(hours=2),
            "closed_at": datetime.utcnow() - timedelta(hours=2),
        },
        {
            "resident_email": "anthony.miller@valleyview.org",
            "subject": "Front electronic gate keycard reader unresponsive - Building C",
            "body": "Hello,\n\nThe proximity fob reader at the Building C main entrance is completely black/unresponsive. Residents are having to prop the security door open with a brick, which is a major security risk.\n\nPlease have the security & locks team look into this urgently.\n\nAnthony Miller\nResident Council, Bldg C",
            "home": "Building C",
            "category": "security",
            "assigned_team": "security-team@example.com",
            "status": TicketStatus.CLOSED_NO_CONFIRMATION,
            "created_at": datetime.utcnow() - timedelta(hours=26),
            "notified_at": datetime.utcnow() - timedelta(hours=25, minutes=50),
            "closed_at": datetime.utcnow() - timedelta(hours=2),
        }
    ]

    added = []
    for item in sample_data:
        ticket = Ticket(**item)
        db.add(ticket)
        added.append(item["subject"])

    db.commit()
    return {"seeded": len(added), "tickets": added}
