import os

import bcrypt
from databases import Database

POSTGRES_USER = os.getenv("POSTGRES_USER", "temp")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "temp")
POSTGRES_DB = os.getenv("POSTGRES_DB", "advcompro")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

DATABASE_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}/{POSTGRES_DB}"
)

database = Database(DATABASE_URL)


async def connect_db():
    await database.connect()


async def disconnect_db():
    await database.disconnect()


async def setup_db():
    # Create the campus before users and items that refer to it.
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS organizations (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            tier VARCHAR(20) NOT NULL DEFAULT 'standard'
                CHECK (tier IN ('standard', 'enterprise')),
            seat_limit INTEGER NOT NULL DEFAULT 500 CHECK (seat_limit > 0),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    await database.execute(
        """
        INSERT INTO organizations (slug, name)
        VALUES ('kmitl', 'KMITL')
        ON CONFLICT (slug) DO NOTHING
        """
    )
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            email VARCHAR(255) PRIMARY KEY,
            password TEXT NOT NULL,
            token TEXT,
            create_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    # These additions also work when the boilerplate users table already exists.
    await database.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id "
        "INTEGER REFERENCES organizations(id)"
    )
    await database.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role "
        "VARCHAR(20) NOT NULL DEFAULT 'student'"
    )
    await database.execute(
        """
        UPDATE users SET organization_id = (
            SELECT id FROM organizations WHERE slug = 'kmitl'
        ) WHERE organization_id IS NULL
        """
    )
    await database.execute("ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL")

    # Per-user plans: the role column holds the RBAC role / plan
    # ('admin', 'free' or 'pro'). Older databases used 'student' for
    # ordinary users, which is the same thing as 'free'.
    await database.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'free'")
    await database.execute("UPDATE users SET role = 'free' WHERE role = 'student'")
    # Admin user management: deactivated accounts can't log in, and
    # last_login_at lets the admin find inactive accounts.
    await database.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"
    )
    await database.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ"
    )

    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            item_id UUID PRIMARY KEY,
            organization_id INTEGER NOT NULL REFERENCES organizations(id),
            reported_by VARCHAR(255) NOT NULL REFERENCES users(email),
            type VARCHAR(10) NOT NULL CHECK (type IN ('lost', 'found')),
            name VARCHAR(200) NOT NULL CHECK (length(btrim(name)) > 0),
            category VARCHAR(100) NOT NULL CHECK (length(btrim(category)) > 0),
            location VARCHAR(200) NOT NULL CHECK (length(btrim(location)) > 0),
            description TEXT,
            photo_url TEXT,
            contact VARCHAR(255) NOT NULL,
            status VARCHAR(10) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'claimed', 'archived')),
            date_reported TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    # Additive migration for existing installations; no rows are deleted.
    async with database.transaction():
        await database.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS colour VARCHAR(100)")
        await database.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS brand VARCHAR(100)")
        await database.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ")
        await database.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ")
        await database.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ")
        # Legacy reports were timestamped when inserted. Legacy closed items
        # cannot be edited, so updated_at is our best historical event estimate.
        await database.execute("UPDATE items SET created_at = date_reported WHERE created_at IS NULL")
        await database.execute("UPDATE items SET claimed_at = updated_at WHERE status = 'claimed' AND claimed_at IS NULL")
        await database.execute("UPDATE items SET archived_at = updated_at WHERE status = 'archived' AND archived_at IS NULL")
        await database.execute("ALTER TABLE items ALTER COLUMN created_at SET DEFAULT NOW()")
        await database.execute("ALTER TABLE items ALTER COLUMN created_at SET NOT NULL")

    await database.execute(
        "CREATE INDEX IF NOT EXISTS idx_items_org_status "
        "ON items (organization_id, status)"
    )

    demo_password = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode("utf-8")
    await database.execute(
        """
        INSERT INTO users (email, password, organization_id)
        VALUES (:email, :password, (SELECT id FROM organizations WHERE slug = 'kmitl'))
        ON CONFLICT (email) DO NOTHING
        """,
        {"email": "demo@example.com", "password": demo_password},
    )


async def get_user_by_email(email: str):
    return await database.fetch_one(
        "SELECT email, password, token, create_at, is_active FROM users WHERE email = :email",
        {"email": email},
    )


async def update_user_token(email: str, token: str):
    await database.execute(
        "UPDATE users SET token = :token WHERE email = :email",
        {"email": email, "token": token},
    )

async def create_user(email: str, password_hash: str):
    await database.execute(
        """
        INSERT INTO users (email, password, organization_id)
        VALUES (:email, :password, (SELECT id FROM organizations WHERE slug = 'kmitl'))
        """,
        {"email": email, "password": password_hash},
    )
