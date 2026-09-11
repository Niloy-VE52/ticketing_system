import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.classifier import classify_issue
from backend.models import Ticket, TicketStatus
from backend.notifier import notify_team

logger = logging.getLogger("ticket_service")

RESOLUTION_WINDOW = timedelta(hours=24)


def process_incoming_mail(db: Session, subject: str, sender: str, body: str) -> Ticket:
    """
    Steps 1-5 of the workflow:
    Resident emails issue -> system reads it -> creates ticket ->
    assigns home/category -> notifies the right team.
    """
    ticket = Ticket(
        resident_email=sender,
        subject=subject,
        body=body,
        status=TicketStatus.NEW,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    classification = classify_issue(subject, sender, body)
    ticket.home = classification["home"]
    ticket.category = classification["category"]
    ticket.assigned_team = classification["assigned_team"]
    db.commit()

    # try:
    #     notify_team(ticket)
    #     ticket.status = TicketStatus.NOTIFIED
    #     ticket.notified_at = datetime.utcnow()
    # except Exception:
    #     logger.exception("Failed to notify team for ticket %s", ticket.id)
    db.commit()
    db.refresh(ticket)

    return ticket


def confirm_fix(db: Session, ticket_id: int) -> Ticket | None:
    """Team confirms the fix -> ticket closed. Maps to 'Teams Confirms Fix' -> 'Ticket Closed'."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return None

    ticket.status = TicketStatus.CONFIRMED_FIXED
    ticket.resolved_at = datetime.utcnow()
    ticket.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket


def sweep_overdue_tickets(db: Session) -> list[Ticket]:
    """
    Runs periodically. Maps to the 'Resolved within 24 hours?' check:
    any ticket still open past the 24h window with no confirmation gets
    closed as unconfirmed ('No Confirmation Received' -> 'Ticket Closed').
    """
    cutoff = datetime.utcnow() - RESOLUTION_WINDOW
    overdue = (
        db.query(Ticket)
        .filter(
            Ticket.status.in_([TicketStatus.NEW, TicketStatus.NOTIFIED, TicketStatus.IN_PROGRESS]),
            Ticket.created_at <= cutoff,
        )
        .all()
    )

    for ticket in overdue:
        ticket.status = TicketStatus.CLOSED_NO_CONFIRMATION
        ticket.closed_at = datetime.utcnow()
        logger.warning("Ticket %s closed with no confirmation after 24h", ticket.id)

    if overdue:
        db.commit()

    return overdue