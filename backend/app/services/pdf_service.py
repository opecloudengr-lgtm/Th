import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.models.ticket import Ticket
from app.services.qr_service import generate_qr_png


def generate_ticket_pdf(ticket: Ticket) -> bytes:
    registration = ticket.registration
    event = registration.event

    buf = io.BytesIO()
    page_size = landscape(A5)
    c = canvas.Canvas(buf, pagesize=page_size)
    width, height = page_size

    theme = event.theme_color or "#6D28D9"
    try:
        theme_color = colors.HexColor(theme)
    except Exception:
        theme_color = colors.HexColor("#6D28D9")

    # Header band
    c.setFillColor(theme_color)
    c.rect(0, height - 28 * mm, width, 28 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(12 * mm, height - 12 * mm, event.title[:42])
    c.setFont("Helvetica", 10)
    when = event.start_at.strftime("%A, %d %B %Y  ·  %I:%M %p")
    c.drawString(12 * mm, height - 20 * mm, when)

    # Body
    c.setFillColor(colors.HexColor("#111111"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(12 * mm, height - 38 * mm, registration.full_name)
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#444444"))
    venue = event.venue_name or event.online_url or "Online"
    c.drawString(12 * mm, height - 45 * mm, venue)
    if event.city:
        c.drawString(12 * mm, height - 51 * mm, event.city)

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(theme_color)
    c.drawString(12 * mm, height - 62 * mm, f"TICKET TYPE: {registration.ticket_type.name.upper()}")
    c.drawString(12 * mm, height - 68 * mm, f"VIP LEVEL: {ticket.vip_display.upper()}")
    if ticket.seat:
        c.drawString(12 * mm, height - 74 * mm, f"SEAT: {ticket.seat.label.upper()}")

    c.setFillColor(colors.HexColor("#888888"))
    c.setFont("Helvetica", 8)
    c.drawString(12 * mm, 10 * mm, f"Ticket code: {ticket.ticket_code}")
    c.drawString(12 * mm, 6 * mm, "This QR code is unique and single-use. Do not share it.")

    # QR code
    qr_png = generate_qr_png(ticket.secure_token)
    from reportlab.lib.utils import ImageReader

    qr_size = 42 * mm
    c.drawImage(
        ImageReader(io.BytesIO(qr_png)),
        width - qr_size - 12 * mm,
        12 * mm,
        width=qr_size,
        height=qr_size,
        preserveAspectRatio=True,
    )

    c.showPage()
    c.save()
    return buf.getvalue()
