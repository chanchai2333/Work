# AEL DWSS

Digital Works Supervision System (static frontend + optional MariaDB backend).

## Local computer (no changes to workflow)

Just open `index.html` or `login.html` in a browser, or:

```bash
# Optional: serve with the Node server (still no DB needed)
npm install
node server.js
# then open http://localhost:8080
```

Data stays in the browser `localStorage`. The Site Locations map and all existing features continue to work.

## Cloud (Google Cloud e2-micro + MariaDB + HTTPS)

1. Point your domain’s A record to the e2-micro external IP.
2. Open firewall ports **80** and **443**.
3. Copy the project to `/opt/dwss` on the VM.
4. Run:

```bash
sudo DOMAIN=your.domain.com bash deploy/setup-e2-micro.sh
```

The script installs Node, MariaDB, nginx, and Let’s Encrypt (certbot).  
It obtains a free certificate and configures HTTPS with automatic HTTP→HTTPS redirect.

After setup the app is available at `https://your.domain.com`.  
The frontend detects the backend automatically and stores data in MariaDB. Local browser use is unaffected.

### Environment variables

| Variable     | Purpose              | Default     |
|--------------|----------------------|-------------|
| PORT         | HTTP port            | 8080        |
| DB_HOST      | MariaDB host         | 127.0.0.1   |
| DB_PORT      | MariaDB port         | 3306        |
| DB_USER      | DB user              | dwss        |
| DB_PASSWORD  | DB password          | (required)  |
| DB_NAME      | Database name        | dwss        |

### Notes for e2-micro

- 1 GB RAM is tight. The setup uses a small connection pool.
- If MariaDB fails to start, reduce `innodb_buffer_pool_size` in `/etc/mysql/mariadb.conf.d/50-server.cnf` to `64M`.
- Change the default password after first login.

## Storage

- **Cloud:** application data (diaries, inspections, wages, sites, users) is stored only in MariaDB. It is not written to browser `localStorage`.
- **Local computer:** if no database is configured, the app still uses `localStorage`.
- Theme, language, and sidebar state may still use `localStorage`. They are not application records.

When running against MariaDB the server stores **individual records** (not one big JSON blob) with a `version` column.

- Concurrent edits are detected (optimistic locking).
- If two users edit the same record, the second save receives a conflict and the page reloads with the latest data.
- You can query records with normal SQL, for example:

```sql
SELECT record_id, JSON_EXTRACT(data, '$.status') AS status
FROM records
WHERE collection = 'siteDiary';
```

- `server.js` — Express static server + `/api` for MariaDB
- `package.json` — Node dependencies
- `schema.sql` — MariaDB schema
- `scripts/cloud-storage.js` — frontend adapter (localStorage ↔ API)
- `deploy/setup-e2-micro.sh` — one-shot VM setup
- `deploy/dwss.service` — systemd unit
