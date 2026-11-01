import os
import sys

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from backend.app.core.database import engine

def inspect_database():
    print("=" * 60)
    print("  PAYPAL MERCHANT GROWTH ENGINE - POSTGRESQL VIEWER")
    print("=" * 60)
    
    with engine.connect() as conn:
        res = conn.execute(text("SELECT current_database(), current_user, version();")).fetchone()
        print(f"\n[+] Connected to Database : {res[0]}")
        print(f"[+] Authenticated Role   : {res[1]}")
        print(f"[+] Engine Version       : {res[2].split(',')[0]}\n")

        print("-" * 60)
        print(f"{'TABLE NAME':<32} {'RECORD COUNT':>15}")
        print("-" * 60)

        tables_query = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)).fetchall()

        total_rows = 0
        for (table_name,) in tables_query:
            count = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()
            total_rows += count
            badge = f"{count:>15}" if count > 0 else "              0"
            print(f"{table_name:<32} {badge}")

        print("-" * 60)
        print(f"{'Total Tables: ' + str(len(tables_query)):<32} {total_rows:>15} total rows\n")

        # Sample recent merchants
        print("-" * 60)
        print("  RECENT MERCHANTS (Top 5)")
        print("-" * 60)
        merchants = conn.execute(text("SELECT id, business_name, currency, created_at FROM merchant_profiles ORDER BY created_at DESC LIMIT 5;")).fetchall()
        if not merchants:
            print("  (Clean-slate state: No merchants created yet)")
        for m in merchants:
            print(f"  • {m[1]} ({m[2]}) - ID: {m[0]} (Created: {m[3]})")

        # Sample recent users
        print("\n" + "-" * 60)
        print("  RECENT REGISTERED USERS (Top 5)")
        print("-" * 60)
        users = conn.execute(text("SELECT id, email, full_name, is_active FROM users ORDER BY created_at DESC LIMIT 5;")).fetchall()
        if not users:
            print("  (Clean-slate state: No users created yet)")
        for u in users:
            print(f"  • {u[2]} <{u[1]}> - Active: {u[3]} (ID: {u[0]})")
        print("\n" + "=" * 60)

if __name__ == "__main__":
    inspect_database()
