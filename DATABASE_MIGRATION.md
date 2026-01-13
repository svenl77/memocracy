# Database Migration Guide: SQLite → PostgreSQL/MySQL

## ⚠️ WICHTIG: Vor Production Deployment

Die App verwendet aktuell **SQLite** für Development. Für Production **MUSS** auf PostgreSQL oder MySQL migriert werden.

## Warum Migration?

- SQLite unterstützt keine gleichzeitigen Schreibzugriffe
- Keine echte Skalierbarkeit
- Keine Replikation möglich
- Risiko von Database-Locks bei hoher Last

## Migration zu PostgreSQL

### 1. PostgreSQL-Datenbank erstellen

**Auf Cloudways:**
1. Gehe zu "Applications" → "Databases"
2. Erstelle neue PostgreSQL-Datenbank
3. Notiere: Host, Port, Database Name, Username, Password

**Lokal (für Testing):**
```bash
# Mit Docker
docker run --name postgres-solana-vote \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=solana_vote \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Prisma Schema aktualisieren

**Option A: Separate Schema für Production**

Erstelle `prisma/schema.postgresql.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Kopiere alle Models aus schema.prisma
// ... (gleiche Models wie in schema.prisma)
```

**Option B: Ein Schema mit Umgebungswechsel**

Ändere `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Ändere von "sqlite" zu "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Environment Variable setzen

```env
# Production
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
```

### 4. Migration ausführen

```bash
# Prisma Client generieren
npx prisma generate

# Migration erstellen (für Schema-Änderungen)
npx prisma migrate dev --name init_postgresql

# Oder: Migration deployen (Production)
npx prisma migrate deploy
```

### 5. Daten migrieren (optional)

**Hinweis:** Wenn du keine alten Daten brauchst, kannst du einfach eine frische Datenbank erstellen.

Falls du Daten migrieren möchtest:

```bash
# Export aus SQLite
sqlite3 dev.db .dump > dump.sql

# Import nach PostgreSQL (manuell anpassen)
psql -h host -U user -d dbname < dump.sql
```

**Oder mit Prisma Studio:**
1. Export aus SQLite: `npx prisma studio` (SQLite)
2. Import nach PostgreSQL: `npx prisma studio` (PostgreSQL)

## Migration zu MySQL

Ähnlich wie PostgreSQL, aber:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

```env
DATABASE_URL="mysql://user:password@host:3306/dbname"
```

## Prisma Schema ist bereits kompatibel

Das aktuelle Schema funktioniert mit PostgreSQL/MySQL ohne Änderungen!

**Hinweis:** SQLite-spezifische Features werden nicht verwendet, daher ist die Migration einfach.

## Testing

Nach Migration testen:

```bash
# Health Check
curl http://localhost:3000/api/health

# Database Connectivity
npx prisma studio
```

## Rollback (falls nötig)

Falls Probleme auftreten:

1. Backup vor Migration erstellen
2. `DATABASE_URL` zurück auf SQLite setzen
3. `npx prisma migrate reset` (⚠️ löscht alle Daten!)

## Production Checklist

- [ ] PostgreSQL/MySQL-Datenbank erstellt
- [ ] `DATABASE_URL` in Production-Umgebung gesetzt
- [ ] Prisma Schema auf PostgreSQL/MySQL umgestellt
- [ ] `npx prisma migrate deploy` ausgeführt (erstellt frische Datenbank)
- [ ] Health Check funktioniert (`/api/health`)
- [ ] Backup-Strategie eingerichtet

**Hinweis:** Alte Coins müssen nicht migriert werden - die Datenbank wird frisch erstellt.
