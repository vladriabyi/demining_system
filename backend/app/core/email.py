"""
Email notifications via SMTP (aiosmtplib).
Якщо SMTP_HOST не задано — всі функції тихо повертаються без відправки.
"""
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings


async def _send(to: str, subject: str, html: str) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        return
    msg = MIMEMultipart("alternative")
    msg["From"]    = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"]      = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_TLS,
        )
    except Exception:
        pass  # не блокуємо основний потік


def _base(content: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="uk"><head><meta charset="UTF-8">
<style>
  body{{font-family:Arial,sans-serif;background:#0a0f1a;color:#e2e8f0;margin:0;padding:20px}}
  .card{{background:#0c1220;border:1px solid rgba(255,255,255,0.08);border-radius:16px;max-width:560px;margin:0 auto;padding:32px}}
  .logo{{font-size:13px;font-weight:800;letter-spacing:2px;color:#fbbf24;margin-bottom:24px}}
  h2{{font-size:20px;font-weight:800;margin:0 0 8px}}
  p{{font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 12px}}
  .btn{{display:inline-block;background:#fbbf24;color:#0a0f1a;font-weight:700;font-size:14px;
        padding:12px 28px;border-radius:12px;text-decoration:none;margin:16px 0}}
  .badge{{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}}
  .footer{{font-size:11px;color:#475569;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)}}
</style></head><body><div class="card">
<div class="logo">💣 DEMINING SYSTEM</div>
{content}
<div class="footer">Це автоматичне повідомлення. Не відповідайте на нього.</div>
</div></body></html>"""


async def send_verification_email(to: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify?token={token}"
    html = _base(f"""
<h2>Підтвердіть вашу пошту 📬</h2>
<p>Вітаємо, <strong>{full_name}</strong>!</p>
<p>Для завершення реєстрації в системі гуманітарного розмінування підтвердіть вашу електронну адресу.</p>
<a href="{link}" class="btn">✅ Підтвердити пошту</a>
<p>Або скопіюйте посилання:</p>
<p style="word-break:break-all;font-size:12px;color:#64748b">{link}</p>
<p style="font-size:12px;color:#64748b">Посилання дійсне 24 години.</p>""")
    await _send(to, "Підтвердження реєстрації — Demining System", html)


STATUS_MAP = {
    "pending":      ("⏳", "Очікує розгляду",  "#94a3b8"),
    "under_review": ("🔍", "На розгляді",      "#60a5fa"),
    "approved":     ("✅", "Затверджено",       "#a78bfa"),
    "in_progress":  ("🔧", "Виконується",       "#fb923c"),
    "completed":    ("✔️", "Завершено",         "#4ade80"),
    "rejected":     ("❌", "Відхилено",         "#f87171"),
}

async def send_status_change_email(
    to: str, to_name: str, request_id: int,
    request_title: str, location: str, status: str,
) -> None:
    icon, label, color = STATUS_MAP.get(status, ("📋", status, "#94a3b8"))
    link = f"{settings.FRONTEND_URL}/requests"
    html = _base(f"""
<h2>Статус вашої заявки змінився</h2>
<p>Вітаємо, <strong>{to_name}</strong>!</p>
<p>Статус заявки <strong>#{request_id} «{request_title}»</strong> було оновлено:</p>
<p style="margin:16px 0">
  <span class="badge" style="background:{color}22;color:{color};border:1px solid {color}44">
    {icon} {label}
  </span>
</p>
<p>📍 Локація: {location}</p>
<a href="{link}" class="btn">Переглянути заявку</a>""")
    await _send(to, f"Заявка #{request_id}: {label} — Demining System", html)


async def send_completion_report_email(
    to: str, to_name: str, request_id: int,
    request_title: str, location: str,
) -> None:
    html = _base(f"""
<h2>✔️ Вашу заявку виконано!</h2>
<p>Вітаємо, <strong>{to_name}</strong>!</p>
<p>Заявка <strong>#{request_id} «{request_title}»</strong> успішно завершена.</p>
<p>📍 Локація: {location}</p>
<p>Наші сапери провели знешкодження та склали завершальний звіт.</p>
<p style="font-size:12px;color:#4ade80;font-weight:600">Дякуємо за вашу небайдужість та допомогу в забезпеченні безпеки!</p>""")
    await _send(to, f"Заявку #{request_id} завершено — Demining System", html)
