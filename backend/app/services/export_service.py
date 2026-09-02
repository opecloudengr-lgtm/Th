import csv
import io

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

from app.schemas.dashboard import ParticipantRow

HEADERS = [
    "Full Name", "Email", "Phone", "Ticket Type", "Ticket Code", "Ticket Status",
    "VIP Level", "Seat", "Payment Status", "Amount Paid", "Registered At", "Checked In",
]


def _row_values(p: ParticipantRow) -> list[str]:
    return [
        p.full_name,
        p.email,
        p.phone or "",
        p.ticket_type,
        p.ticket_code or "",
        p.ticket_status.value if p.ticket_status else "",
        p.vip_label or "",
        p.seat_label or "",
        p.payment_status.value if p.payment_status else "free",
        str(p.amount_paid) if p.amount_paid is not None else "",
        p.registered_at.strftime("%Y-%m-%d %H:%M"),
        "Yes" if p.checked_in else "No",
    ]


def export_csv(rows: list[ParticipantRow]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(HEADERS)
    for p in rows:
        writer.writerow(_row_values(p))
    return buf.getvalue().encode("utf-8")


def export_xlsx(rows: list[ParticipantRow]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Participants"
    ws.append(HEADERS)
    for p in rows:
        ws.append(_row_values(p))
    for col in ws.columns:
        max_len = max((len(str(c.value)) for c in col if c.value is not None), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def export_pdf(rows: list[ParticipantRow], event_title: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), title=f"{event_title} - Participants")
    data = [HEADERS] + [_row_values(p) for p in rows]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6D28D9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#DDDDDD")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F5FF")]),
            ]
        )
    )
    doc.build([table])
    return buf.getvalue()
