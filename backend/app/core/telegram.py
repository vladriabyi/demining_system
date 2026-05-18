import httpx
from app.core.config import settings


async def send_notification(message: str) -> None:
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, json={
                "chat_id": settings.TELEGRAM_CHAT_ID,
                "text": message,
                "parse_mode": "HTML",
            })
    except Exception:
        pass


async def notify_request_updated(
    request_id: int,
    title: str,
    location_name: str,
    status: str,
    assignee_name: str | None = None,
    brigade_name:  str | None = None,
) -> None:
    status_map = {
        "pending":      "⏳ Очікує",
        "under_review": "🔍 На розгляді",
        "approved":     "✅ Затверджено",
        "in_progress":  "🔧 Виконується",
        "completed":    "✔️ Завершено",
        "rejected":     "❌ Відхилено",
    }
    status_label = status_map.get(status, status)

    lines = [
        f"📋 <b>Заявка #{request_id}</b>: {title}",
        f"📍 {location_name}",
        f"🔄 Статус: {status_label}",
    ]
    if assignee_name:
        lines.append(f"👤 Оператор: {assignee_name}")
    if brigade_name:
        lines.append(f"🪖 Бригада: {brigade_name}")

    await send_notification("\n".join(lines))
