import os
from pathlib import Path
import sqlite3
from dotenv import load_dotenv

# Load env from backend
load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

import sys
ROOT = str(Path(__file__).resolve().parent.parent)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.models import init_db, engine, SessionLocal, Ticket, TicketStatus

print("Initializing Neon PostgreSQL tables...")
init_db()
print("Tables initialized successfully!")

db = SessionLocal()
neon_count = db.query(Ticket).count()
print(f"Current tickets in Neon DB: {neon_count}")

if neon_count == 0:
    sqlite_path = Path(__file__).resolve().parent.parent / "tickets.db"
    if sqlite_path.exists():
        print(f"Migrating records from SQLite ({sqlite_path}) to Neon...")
        s_conn = sqlite3.connect(sqlite_path)
        s_conn.row_factory = sqlite3.Row
        s_cur = s_conn.cursor()
        s_cur.execute("SELECT * FROM tickets")
        rows = s_cur.fetchall()
        
        migrated = 0
        for r in rows:
            d = dict(r)
            # Match status enum
            raw_status = d.get("status", "new")
            if isinstance(raw_status, str):
                try:
                    status_enum = TicketStatus(raw_status.lower())
                except Exception:
                    status_enum = TicketStatus.NEW
            else:
                status_enum = TicketStatus.NEW
            
            # parse dates if needed or pass string
            from datetime import datetime
            def parse_dt(v):
                if not v:
                    return None
                try:
                    return datetime.fromisoformat(v.replace(" ", "T"))
                except Exception:
                    return None

            ticket = Ticket(
                id=d.get("id"),
                resident_email=d.get("resident_email"),
                subject=d.get("subject"),
                body=d.get("body"),
                home=d.get("home"),
                category=d.get("category"),
                assigned_team=d.get("assigned_team"),
                status=status_enum,
                quote_title=d.get("quote_title"),
                quote_amount=d.get("quote_amount"),
                quote_options=d.get("quote_options"),
                quote_status=d.get("quote_status", "pending"),
                resolution_notes=d.get("resolution_notes"),
                final_bill=d.get("final_bill"),
                created_at=parse_dt(d.get("created_at")) or datetime.utcnow(),
                notified_at=parse_dt(d.get("notified_at")),
                resolved_at=parse_dt(d.get("resolved_at")),
                closed_at=parse_dt(d.get("closed_at")),
            )
            db.add(ticket)
            migrated += 1
        
        db.commit()
        print(f"Successfully migrated {migrated} tickets from SQLite to Neon PostgreSQL!")

        # Reset postgres sequence so next autoincrement ID works cleanly
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text("SELECT setval(pg_get_serial_sequence('tickets', 'id'), coalesce(max(id), 1)) FROM tickets;"))
                conn.commit()
                print("Postgres sequence updated!")
        except Exception as e:
            print("Sequence update note:", e)

print(f"Total tickets now active in Neon DB: {db.query(Ticket).count()}")
db.close()
