# Demining System — дипломна робота

**Комп'ютерна система управління заявками на гуманітарне розмінування.**

Веб-додаток для подання заявок цивільними, координації робіт координатором, виконання операторами-саперами та адміністрування системи.

## Технічний стек

| Шар | Технології |
|-----|------------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL + **PostGIS**, Alembic |
| Auth | JWT, bcrypt, підтвердження email, скидання пароля |
| Frontend | React 18, TypeScript, Tailwind CSS, Vite, React-Leaflet |
| Інфраструктура | Docker Compose, Mailpit (dev SMTP), опційно Telegram |

## Швидкий старт (Docker)

```bash
docker compose up --build
```

| Сервіс | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Mailpit (листи реєстрації) | http://localhost:8025 |

### Міграції та тестові дані

Після першого запуску БД:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py
```

`seed.py` створює користувачів, 6 бригад (Бригада 1…6), ~40 заявок з історією статусів.

**Пароль для всіх тестових акаунтів:** `111111`

| Роль | Email | Що бачить |
|------|-------|-----------|
| Цивільний | `civilian@gmail.com` | Свої заявки, карта, подання заявки кліком на карті |
| Оператор | `operator@gmail.com` | Лише **призначені** йому заявки; може подати завершальний звіт |
| Координатор | `coordinator@gmail.com` | Усі заявки, бригади, зміна статусу, призначення |
| Адмін | `admin@gmail.com` | Усе + керування користувачами |

## Ролі та права

| Дія | Civilian | Operator | Coordinator | Admin |
|-----|:--------:|:--------:|:-------------:|:-----:|
| Карта та свої заявки | ✅ | ✅* | ✅ | ✅ |
| Створити заявку | ✅ | ❌ | ✅ | ✅ |
| Бачити всі заявки | ❌ | ❌ | ✅ | ✅ |
| Змінювати статус / пріоритет | ❌ | ❌ | ✅ | ✅ |
| Призначати оператора / бригаду | ❌ | ❌ | ✅ | ✅ |
| Подати завершальний звіт | ❌ | ✅** | ✅ | ✅ |
| Розділ «Бригади» | ❌ | ❌ | ✅ | ✅ |
| Адмін-панель | ❌ | ❌ | ✅ | ✅ |

\* Оператор бачить лише заявки з `assigned_to_id` = його id.  
\** Звіт — лише для заявок «В роботі» / «Затверджено», призначених цьому оператору.

## Основні можливості

- **Життєвий цикл заявки:** pending → under_review → approved → in_progress → completed (або rejected).
- **Журнал змін (audit):** кожна зміна статусу зберігається в `request_status_history` і відображається в картці заявки.
- **PostGIS:** координати заявок, пошук дублікатів `/api/v1/requests/nearby`.
- **Бригади:** нумеровані підрозділи (Бригада 1…6), склад, призначення на заявки.
- **Завершальний звіт** оператора → автоматичне закриття заявки.
- **Email:** верифікація реєстрації, сповіщення про статус (через Mailpit у dev).
- **Telegram** (опційно): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` у `.env` бекенду.

## Сценарій демонстрації (захист)

1. **Цивільний** (`civilian@gmail.com`) — увійти → на карті клікнути точку → подати заявку → перевірити лист у Mailpit (якщо новий акаунт).
2. **Координатор** — відкрити заявку в «Заявки» / адмін-панелі → змінити статус на «На розгляді» → «Затверджено» → призначити **оператора** та **бригаду** → показати **історію статусів**.
3. **Оператор** (`operator@gmail.com`) — побачити лише призначену заявку → «Завершити та подати звіт» → статус «Завершена», звіт у картці.
4. **Координатор** — розділ «Бригади»: статус бригади, склад, активні заявки.

## Локальний запуск без Docker

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# PostgreSQL + PostGIS (порт 5433 як у compose, або свій)
export DATABASE_URL="postgresql+asyncpg://demining:demining_pass@localhost:5433/demining_db"

alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend && npm install && npm run dev
```

Проксі Vite перенаправляє `/api` та `/uploads` на backend.

## Структура репозиторію

```
backend/          # FastAPI, models, crud, alembic
frontend/         # React + Vite
docker-compose.yml
```

## Корисні команди

```bash
# Логи
docker compose logs -f backend

# Перезаповнити БД тестовими даними (ОБЕРЕЖНО: видаляє дані)
docker compose exec backend python seed.py

# Перейменувати бригади в існуючій БД без повного seed
docker compose exec db psql -U demining -d demining_db -c "
UPDATE brigades SET name = 'Бригада 1' WHERE number = 'БР-01';
UPDATE brigades SET name = 'Бригада 2' WHERE number = 'БР-02';
UPDATE brigades SET name = 'Бригада 3' WHERE number = 'БР-03';
UPDATE brigades SET name = 'Бригада 4' WHERE number = 'БР-04';
UPDATE brigades SET name = 'Бригада 5' WHERE number = 'БР-05';
UPDATE brigades SET name = 'Бригада 6' WHERE number = 'БР-06';
"
```

## Автор

Дипломний проєкт — система управління заявками на гуманітарне розмінування.

**Репозиторій:** https://github.com/vladriabyi/demining_system
