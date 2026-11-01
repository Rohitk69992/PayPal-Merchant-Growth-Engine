# MIGRATIONS_GUIDE.md
## Alembic Database Migrations Guide
### PayPal Merchant Growth Engine — Schema Evolution & Lifecycle

---

## 1. Principles of Database Migration

1. **Explicit Evolution**: Direct manual schema mutations (e.g. ad-hoc `ALTER TABLE` via GUI tools) without corresponding Alembic migration versions are forbidden.
2. **Deterministic Versioning**: Every schema change is represented as an immutable Python script inside `backend/alembic/versions/`.
3. **Data Preservation**: Migrations must protect existing production and merchant records. Dropping columns or tables without planned data backfills or deprecation cycles is prohibited.
4. **Bidirectional Safety**: Every migration must define both an `upgrade()` function and a corresponding `downgrade()` function to allow safe rollbacks.

---

## 2. Alembic Directory Structure

```text
├── alembic.ini                    # Alembic global configuration (reads %(here)s/backend/alembic)
└── backend/
    └── alembic/
        ├── env.py                 # Connects via app settings, imports Base.metadata
        ├── README
        ├── script.py.mako         # Template for generated revision files
        └── versions/              # Migration revision scripts
            └── edbbe21f9457_001_initial_schema.py
```

---

## 3. Migration Commands Quick Reference

| Task | Command | Description |
|---|---|---|
| **Check Current Version** | `alembic current` | Displays the current revision applied to the target database |
| **Inspect Pending Migrations** | `alembic check` | Validates whether declarative models have unmigrated changes |
| **Generate New Migration** | `alembic revision --autogenerate -m "description"` | Compares SQLAlchemy declarative models against PostgreSQL and generates revision script |
| **Apply All Migrations** | `alembic upgrade head` | Migrates the database forward to the newest available revision |
| **Apply Single Migration** | `alembic upgrade +1` | Migrates the database forward by exactly one revision step |
| **Rollback Single Migration** | `alembic downgrade -1` | Rolls back the database by one revision step |
| **Rollback to Empty Baseline** | `alembic downgrade base` | Reverts all migrations back to an empty database |
| **Inspect Revision History** | `alembic history --verbose` | Displays chronological list of all changesets and revision messages |

---

## 4. How `env.py` Integrates with the Application

In `backend/alembic/env.py`, Alembic does not duplicate database credentials. Instead, it imports settings and declarative metadata directly from the application core:

```python
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
import backend.app.models  # Registers all 32 declarative models

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata
```

This ensures that whenever `DATABASE_URL` is configured (whether local PostgreSQL on laptop or cloud-hosted PostgreSQL), Alembic automatically connects to the exact same database as FastAPI.

---

## 5. Reviewing Generated Migrations

Before applying an auto-generated migration:
1. Open the generated script in `backend/alembic/versions/<revision>_<slug>.py`.
2. Inspect `upgrade()` for unintended table drops or column type conversions.
3. Inspect `downgrade()` to verify that inverse operations cleanly restore previous constraints and tables.
4. Test the roundtrip locally:
   ```powershell
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
   ```
