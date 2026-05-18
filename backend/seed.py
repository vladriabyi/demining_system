#!/usr/bin/env python3
"""
seed.py — заповнення бази тестовими даними.
Запуск: docker compose exec backend python seed.py
Дані: 4 базові користувачі + 10 випадкових, 6 бригад, 40 заявок.
"""
import asyncio
import random
import math
from datetime import datetime, timedelta

import bcrypt
from faker import Faker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.user import User, UserRole
from app.models.brigade import Brigade, BrigadeStatus
from app.models import report  # noqa: F401 — ensures table is created
from app.models.request import (
    DeminingRequest, RequestStatus, Priority, ExplosiveType,
    RequestStatusHistory,
)

import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://demining:demining_pass@db:5432/demining_db"
)

fake = Faker("uk_UA")
Faker.seed(42)
random.seed(42)

PASSWORD_HASH = bcrypt.hashpw(b"111111", bcrypt.gensalt()).decode()

BASE_USERS = [
    ("civilian@gmail.com",    "Цивільний Користувач",     UserRole.civilian),
    ("operator@gmail.com",    "Оператор Системи",          UserRole.operator),
    ("coordinator@gmail.com", "Координатор Розмінування",  UserRole.coordinator),
    ("admin@gmail.com",       "Адміністратор Системи",     UserRole.admin),
]

UA_LOCATIONS = [
    (49.9935,  36.2304, "м. Харків",            "Харківська обл."),
    (49.2090,  37.2795, "м. Ізюм",              "Харківська обл."),
    (49.7172,  37.6129, "м. Куп'янськ",         "Харківська обл."),
    (49.4561,  36.9126, "смт Барвінкове",        "Харківська обл."),
    (48.0159,  37.8028, "м. Краматорськ",        "Донецька обл."),
    (48.5952,  37.9269, "м. Слов'янськ",         "Донецька обл."),
    (48.6011,  38.0096, "м. Лиман",              "Донецька обл."),
    (48.0448,  37.5441, "м. Бахмут",             "Донецька обл."),
    (47.8388,  35.1396, "м. Запоріжжя",          "Запорізька обл."),
    (47.0616,  35.3767, "м. Мелітополь",         "Запорізька обл."),
    (47.3666,  35.8547, "смт Вільнянськ",        "Запорізька обл."),
    (46.6354,  32.6169, "м. Херсон",             "Херсонська обл."),
    (46.1779,  33.5694, "м. Генічеськ",          "Херсонська обл."),
    (46.8391,  32.7247, "м. Берислав",           "Херсонська обл."),
    (46.3587,  33.0089, "с. Антонівка",          "Херсонська обл."),
    (48.5679,  39.3378, "м. Сєвєродонецьк",      "Луганська обл."),
    (48.9256,  38.5005, "м. Старобільськ",       "Луганська обл."),
    (46.9750,  31.9946, "м. Миколаїв",           "Миколаївська обл."),
    (47.5681,  31.3276, "м. Вознесенськ",        "Миколаївська обл."),
    (48.4647,  35.0462, "м. Дніпро",             "Дніпропетровська обл."),
    (48.7289,  35.8836, "м. Новомосковськ",      "Дніпропетровська обл."),
    (48.5382,  35.8729, "м. Синельникове",       "Дніпропетровська обл."),
    (50.4501,  30.5234, "м. Київ",               "Київська обл."),
    (50.5479,  30.2651, "м. Буча",               "Київська обл."),
    (50.6333,  30.3444, "м. Гостомель",          "Київська обл."),
    (50.9077,  34.7981, "м. Суми",               "Сумська обл."),
    (50.3024,  34.8892, "м. Охтирка",            "Сумська обл."),
    (51.6536,  33.4799, "м. Шостка",             "Сумська обл."),
    (51.4982,  31.2893, "м. Чернігів",           "Чернігівська обл."),
    (51.0467,  32.0696, "м. Ніжин",              "Чернігівська обл."),
    (46.4825,  30.7233, "м. Одеса",              "Одеська обл."),
    (49.5883,  34.5514, "м. Полтава",            "Полтавська обл."),
    (49.0669,  33.4199, "м. Кременчук",          "Полтавська обл."),
    (48.5079,  32.2623, "м. Кропивницький",      "Кіровоградська обл."),
    (49.2331,  28.4682, "м. Вінниця",            "Вінницька обл."),
    (50.2547,  28.6587, "м. Житомир",            "Житомирська обл."),
    (49.4444,  32.0598, "м. Черкаси",            "Черкаська обл."),
]

BRIGADES_DATA = [
    ("Харківська бригада",  "БР-01", BrigadeStatus.busy,        "Протипіхотні міни, касетні боєприпаси"),
    ("Донецька бригада",    "БР-02", BrigadeStatus.busy,        "Артилерійські снаряди, ВНП"),
    ("Херсонська бригада",  "БР-03", BrigadeStatus.available,   "Протитанкові міни, інженерні загородження"),
    ("Запорізька бригада",  "БР-04", BrigadeStatus.available,   "Касетні боєприпаси, авіабомби"),
    ("Луганська бригада",   "БР-05", BrigadeStatus.busy,        "Всі типи ВНП"),
    ("Київська бригада",    "БР-06", BrigadeStatus.unavailable, "Протипіхотні міни, міни-пастки"),
]

REQUEST_TITLES = [
    "Знешкодження снаряду поблизу школи",
    "Розмінування сільськогосподарського поля",
    "Перевірка узбіччя траси",
    "Очищення лісового масиву від ВНП",
    "Обстеження берегової лінії річки",
    "Знешкодження протитанкової міни на дорозі",
    "Розмінування периметру зернового складу",
    "Перевірка під'їзних шляхів до мосту",
    "Обстеження покинутих укріплень",
    "Знешкодження касетного суббоєприпасу",
    "Розмінування дитячого майданчика",
    "Перевірка городу після земляних робіт",
    "Обстеження залізничного полотна",
    "Знешкодження ВНП біля житлового будинку",
    "Знешкодження артилерійського снаряду",
]

REQUEST_DESCRIPTIONS = [
    "Під час земляних робіт виявлено підозрілий металевий предмет. Роботи зупинено, мешканців евакуйовано.",
    "Фермер виявив підозрілі предмети на полі під час оранки. Техніка відведена. Площа ~15 га.",
    "Водій вантажівки помітив характерний виступ на узбіччі. Рух на ділянці 500 м обмежено.",
    "Лісники виявили залишки боєприпасів у лісовому масиві. Можливе мінування периметру.",
    "Місцеві жителі повідомляють про підозрілий предмет. Виїзд на місце підтвердив наявність ВНП.",
    "Охоронець складу виявив підозрілий предмет під час обходу периметру. Персонал евакуйовано.",
    "При обстеженні покинутих позицій виявлено невибухлі боєприпаси різних типів. Площа ~5 га.",
    "Дитина помітила незнайомий предмет у дворі. Майданчик огороджено, доступ заборонено.",
]


def jitter(lat, lon, km=20):
    dlat = random.uniform(-km / 111, km / 111)
    dlon = random.uniform(
        -km / (111 * abs(math.cos(math.radians(lat)))),
        km / (111 * abs(math.cos(math.radians(lat))))
    )
    return round(lat + dlat, 6), round(lon + dlon, 6)


def make_point(lat, lon):
    return f"SRID=4326;POINT({lon} {lat})"


def random_date(days_ago_max=90):
    delta = random.randint(0, days_ago_max)
    return datetime.utcnow() - timedelta(days=delta)


async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("⏳ Очищення та відтворення таблиць...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:

        # 1. Базові 4 користувачі
        base_user_objs = []
        for email, full_name, role in BASE_USERS:
            u = User(email=email, full_name=full_name,
                     hashed_password=PASSWORD_HASH, role=role, is_active=True, is_verified=True, is_verified=True)
            session.add(u)
            base_user_objs.append(u)
        await session.flush()

        # 2. 10 випадкових користувачів
        extra_users = []
        roles_pool = [UserRole.civilian] * 5 + [UserRole.operator] * 3 + [UserRole.coordinator] * 2
        random.shuffle(roles_pool)
        used_emails = {u.email for u in base_user_objs}

        for i, role in enumerate(roles_pool):
            while True:
                first = fake.first_name()
                last  = fake.last_name()
                email = f"{last.lower().replace(' ', '')}{i}@gmail.com"
                if email not in used_emails:
                    used_emails.add(email)
                    break
            u = User(email=email, full_name=f"{last} {first}",
                     hashed_password=PASSWORD_HASH, role=role, is_active=True, is_verified=True, is_verified=True)
            session.add(u)
            extra_users.append(u)
        await session.flush()

        all_users = base_user_objs + extra_users
        civilians = [u for u in all_users if u.role == UserRole.civilian]
        operators = [u for u in all_users if u.role == UserRole.operator]
        staff     = [u for u in all_users if u.role in (UserRole.operator, UserRole.coordinator)]

        # 3. 6 бригад із саперами
        brigades_created = []
        staff_shuffled = list(staff)
        random.shuffle(staff_shuffled)
        staff_idx = 0

        for name, number, status, specialization in BRIGADES_DATA:
            brigade = Brigade(
                name=name,
                number=number,
                status=status,
                specialization=specialization,
            )
            # 2–3 сапери на бригаду
            count = random.randint(2, 3)
            members = staff_shuffled[staff_idx:staff_idx + count]
            staff_idx += count
            brigade.members = members
            session.add(brigade)
            brigades_created.append(brigade)

        await session.flush()

        # 4. 40 заявок
        status_pool = (
            [RequestStatus.pending]      * 7 +
            [RequestStatus.under_review] * 6 +
            [RequestStatus.approved]     * 6 +
            [RequestStatus.in_progress]  * 8 +
            [RequestStatus.completed]    * 9 +
            [RequestStatus.rejected]     * 4
        )
        random.shuffle(status_pool)

        active_brigades = [b for b in brigades_created if b.status == BrigadeStatus.busy]

        requests_created = []
        for i in range(40):
            base_lat, base_lon, city, oblast = random.choice(UA_LOCATIONS)
            lat, lon = jitter(base_lat, base_lon, km=20)
            status = status_pool[i]

            if status in (RequestStatus.approved, RequestStatus.in_progress, RequestStatus.completed):
                assigned = random.choice(operators) if operators else None
                brigade  = random.choice(active_brigades) if active_brigades and random.random() > 0.3 else None
            elif status == RequestStatus.under_review and random.random() > 0.5:
                assigned = random.choice(operators) if operators else None
                brigade  = None
            else:
                assigned = None
                brigade  = None

            created = random_date(90)
            updated = created + timedelta(days=random.randint(0, 10))

            r = DeminingRequest(
                title=random.choice(REQUEST_TITLES),
                description=random.choice(REQUEST_DESCRIPTIONS),
                status=status,
                priority=random.choice(list(Priority)),
                explosive_type=random.choice(list(ExplosiveType)),
                location_name=f"{city}, {oblast}",
                latitude=lat,
                longitude=lon,
                location=make_point(lat, lon),
                requester_id=random.choice(civilians).id,
                assigned_to_id=assigned.id if assigned else None,
                brigade_id=brigade.id if brigade else None,
                created_at=created,
                updated_at=updated,
            )
            session.add(r)
            requests_created.append((r, status, created))

        await session.flush()

        # 5. Історія статусів
        admin_user = next(u for u in base_user_objs if u.role == UserRole.admin)
        chain_map = {
            RequestStatus.pending:      [],
            RequestStatus.under_review: [RequestStatus.pending],
            RequestStatus.approved:     [RequestStatus.pending, RequestStatus.under_review],
            RequestStatus.in_progress:  [RequestStatus.pending, RequestStatus.under_review, RequestStatus.approved],
            RequestStatus.completed:    [RequestStatus.pending, RequestStatus.under_review, RequestStatus.approved, RequestStatus.in_progress],
            RequestStatus.rejected:     [RequestStatus.pending],
        }

        for req, final_status, created_at in requests_created:
            chain = chain_map[final_status]
            t = created_at
            for j, old_status in enumerate(chain):
                new_status = chain[j + 1] if j + 1 < len(chain) else final_status
                t = t + timedelta(hours=random.randint(2, 48))
                session.add(RequestStatusHistory(
                    request_id=req.id,
                    old_status=old_status.value,
                    new_status=new_status.value,
                    changed_by=admin_user.id,
                    comment=f"Статус змінено на '{new_status.value}'",
                    changed_at=t,
                ))

        await session.commit()

    await engine.dispose()
    print()
    print("✅ Готово!")
    print("━" * 52)
    for email, _, role in BASE_USERS:
        print(f"  [{role.value:12s}] {email}")
    print("━" * 52)
    print(f"  Випадкових користувачів : 10")
    print(f"  Бригад                  : {len(BRIGADES_DATA)}")
    print(f"  Заявок                  : 40")
    print("━" * 52)
    print("  Пароль для всіх         : 111111")
    print("━" * 52)


if __name__ == "__main__":
    asyncio.run(seed())
