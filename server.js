/**
 * DWSS server – multi-user ready
 * - Serves static files
 * - Per-record API with optimistic locking (version column)
 * - MariaDB when DB_PASSWORD is set; local/static mode otherwise
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let pool = null;
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'dwss',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dwss',
  waitForConnections: true,
  connectionLimit: 4,
  queueLimit: 0
};

async function initDb() {
  if (!process.env.DB_PASSWORD) {
    console.log('[DB] No DB_PASSWORD — static/local mode');
    return;
  }
  try {
    pool = mysql.createPool(DB_CONFIG);
    const conn = await pool.getConnection();
    await conn.query(`
      CREATE TABLE IF NOT EXISTS records (
        collection   VARCHAR(64)  NOT NULL,
        record_id    VARCHAR(128) NOT NULL,
        data         JSON         NOT NULL,
        version      INT          NOT NULL DEFAULT 1,
        updated_by   VARCHAR(128) DEFAULT NULL,
        updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (collection, record_id),
        INDEX idx_collection (collection)
      ) ENGINE=InnoDB
    `);
    conn.release();
    await seedDefaultUsers();
    console.log('[DB] MariaDB ready (multi-user records table)');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    pool = null;
  }
}

// ---------- Health ----------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mode: pool ? 'cloud' : 'local', db: !!pool, multiUser: !!pool });
});

async function keepExistingPassword(collection, id, clean) {
  if (collection !== 'usersDb' && collection !== 'users') return clean;
  if (clean.password) return clean;
  const [rows] = await pool.query(
    'SELECT data FROM records WHERE collection = ? AND record_id = ?',
    [collection, id]
  );
  if (!rows.length) return clean;
  const current = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
  if (current && current.password) {
    clean.password = current.password;
    if (current.passwordChanged != null) clean.passwordChanged = current.passwordChanged;
    if (current.passwordChangedAt) clean.passwordChangedAt = current.passwordChangedAt;
    if (current.passwordExpiresAt) clean.passwordExpiresAt = current.passwordExpiresAt;
  }
  return clean;
}

async function seedDefaultUsers() {
  const [rows] = await pool.query(
    'SELECT record_id, data FROM records WHERE collection = ?',
    ['usersDb']
  );
  const defaults = [
    { id: 1, name: 'Admin', email: 'admin@ael-dwss.com', username: 'admin', password: 'admin123', organization: 'SYSTEM_VENDOR', companyName: 'AEL - Associated Engineers Ltd.', role: 'admin', department: 'System Administration', projectIds: ['DE/2026/05', 'DE/2025/02', 'DE/2025/09'], permissions: { level: 5, canChangeStatus: true, canManageUsers: true, name: 'Administrator' } },
    { id: 2, name: 'Kenneth Daluz', email: 'kenneth.daluz@dsd.gov.hk', username: 'kenneth', password: 'officer123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'eg', department: 'Engineer Grade', projectIds: ['DE/2026/05', 'DE/2025/02'], permissions: { level: 4, canChangeStatus: false, canManageUsers: false, name: 'Engineer Grade' } },
    { id: 3, name: 'TANG Chi Long, Gary', email: 'gcifang@dsd.gov.hk', username: 'garytang', password: 'aei123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'ig', department: 'Inspector Grade', projectIds: ['DE/2026/05'], permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: 'Inspector Grade' } },
    { id: 4, name: 'FUNG Wai Ching', email: 'wcfung04@dsd.gov.hk', username: 'wcfung', password: 'wsg123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'wsg', department: 'Works Supervisor Grade', projectIds: ['DE/2026/05'], permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: 'Works Supervisor Grade' } },
    { id: 10, name: 'CHA Chi Ming', email: 'cmcha02@dsd.gov.hk', username: 'cmcha', password: 'ig123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'ig', department: 'Inspector Grade', projectIds: ['DE/2025/02', 'DE/2025/09'], permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: 'Inspector Grade' } },
    { id: 5, name: 'John Smith', email: 'john.smith@rec-ael.com', username: 'john', password: 'inspector123', organization: 'CONTRACTOR', companyName: 'REC - AEL Joint Venture', role: 'sa', department: 'Site Agent', projectIds: ['DE/2025/02'], permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: 'Site Agent' } },
    { id: 6, name: 'Sarah Johnson', email: 'sarah.j@rec-ael.com', username: 'sarah', password: 'contractor123', organization: 'CONTRACTOR', companyName: 'REC - AEL Joint Venture', role: 'ssa', department: 'Sub-Site Agent', projectIds: ['DE/2025/09'], permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: 'Sub-Site Agent' } },
    { id: 7, name: 'Robert Chen', email: 'robert.chen@rec-ael.com', username: 'robert', password: 'rso123', organization: 'CONTRACTOR', companyName: 'REC - AEL Joint Venture', role: 'rso', department: 'Registered Safety Officer', projectIds: ['DE/2026/05', 'DE/2025/02'], permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: 'Registered Safety Officer' } },
    { id: 8, name: 'WONG Lap Pan', email: 'lpwong@abc-eng.com', username: 'lpwong', password: 'sub123', organization: 'SUBCONTRACTOR', companyName: 'ABC Engineering Ltd.', role: 'subcontractor', department: 'Subcontractor Team A', projectIds: ['DE/2026/05'], permissions: { level: 1, canChangeStatus: false, canManageUsers: false, name: 'Subcontractor' } },
    { id: 9, name: 'Emma Wilson', email: 'emma.w@xyz-supply.com', username: 'emma', password: 'supplier123', organization: 'SUPPLIER', companyName: 'XYZ Materials Supply Co.', role: 'supplier', department: 'Material Supplier', projectIds: ['DE/2026/05'], permissions: { level: 1, canChangeStatus: false, canManageUsers: false, name: 'Supplier' } }
  ].map(u => Object.assign({
    contractNo: 'Contract No. DE/2024/12',
    status: 'online',
    passwordChanged: false,
    passwordChangedAt: null,
    passwordExpiresAt: null
  }, u));

  const byId = {};
  const byName = {};
  rows.forEach(function (row) {
    const user = parseRecord(row.data);
    const entry = { row: row, user: user };
    byId[String(row.record_id)] = entry;
    if (user && user.username) byName[String(user.username).toLowerCase()] = entry;
  });

  for (const user of defaults) {
    const current = byId[String(user.id)] || byName[String(user.username).toLowerCase()];
    if (!current) {
      await pool.query(
        'INSERT INTO records (collection, record_id, data, version) VALUES (?, ?, ?, 1)',
        ['usersDb', String(user.id), JSON.stringify(user)]
      );
      console.log('[DB] Added missing account', user.username);
      continue;
    }
    const existing = current.user || {};
    const alreadyChanged = existing.passwordChanged === true || existing.passwordChanged === 1 || existing.passwordChanged === 'true';
    if (alreadyChanged || (existing.password && existing.password !== user.password)) continue;
    existing.password = user.password;
    existing.username = user.username;
    existing.status = existing.status || 'online';
    await pool.query(
      'UPDATE records SET data = ? WHERE collection = ? AND record_id = ?',
      [JSON.stringify(existing), 'usersDb', current.row.record_id]
    );
    console.log('[DB] Restored default password for', user.username, '->', user.password);
  }
}

async function keepExistingPdf(collection, id, clean) {
  const [rows] = await pool.query(
    'SELECT data FROM records WHERE collection = ? AND record_id = ?',
    [collection, id]
  );
  if (!rows.length) return clean;
  const current = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
  if (!current) return clean;
  // Keep heavy fields when the client sent a light list row
  ['pdfData', 'annotations', 'formData', 'statusHistory'].forEach(function (key) {
    if ((clean[key] == null || clean[key] === '' || (Array.isArray(clean[key]) && clean[key].length === 0 && current[key] && current[key].length)) && current[key]) {
      clean[key] = current[key];
    }
  });
  return clean;
}

function parseRecord(data) {
  if (data == null) return {};
  if (Buffer.isBuffer(data)) data = data.toString('utf8');
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return {}; }
  }
  return data;
}

function stripSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  delete copy.password;
  return copy;
}

const activeSessions = new Map();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function sessionKey(user) {
  return String(user.id || user.username || '').toLowerCase();
}

function createSession(user) {
  const token = require('crypto').randomBytes(24).toString('hex');
  const now = Date.now();
  activeSessions.set(sessionKey(user), {
    token,
    username: user.username || user.name || '',
    startedAt: now,
    lastSeen: now
  });
  return token;
}

function activeSession(user) {
  const key = sessionKey(user);
  const current = activeSessions.get(key);
  if (!current) return null;
  if (Date.now() - current.lastSeen > SESSION_TIMEOUT_MS) {
    activeSessions.delete(key);
    return null;
  }
  return current;
}

function tokenFromRequest(req) {
  const header = String(req.headers['x-session-token'] || '').trim();
  if (header) return header;
  if (req.body && req.body.sessionToken) return String(req.body.sessionToken).trim();
  return '';
}

function requireActiveSession(req, res, next) {
  // Local/static mode has no sessions
  if (!pool) return next();
  const token = tokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'session_expired', message: 'You have been logged out.' });
  }
  for (const session of activeSessions.values()) {
    if (session.token === token) {
      if (Date.now() - session.lastSeen > SESSION_TIMEOUT_MS) {
        for (const [k, s] of activeSessions.entries()) {
          if (s.token === token) activeSessions.delete(k);
        }
        return res.status(401).json({ error: 'session_expired', message: 'Your session has expired.' });
      }
      session.lastSeen = Date.now();
      return next();
    }
  }
  return res.status(401).json({
    error: 'logged_out_elsewhere',
    message: 'You have been logged out because this account signed in from another browser or computer.'
  });
}

app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'no_database' });
  const username = String((req.body && req.body.username) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  const projectId = (req.body && req.body.projectId) || '';
  if (!username || !password) return res.status(400).json({ error: 'missing_credentials' });

  try {
    const [rows] = await pool.query(
      'SELECT record_id, data, version FROM records WHERE collection IN (?, ?)',
      ['usersDb', 'users']
    );
    let matched = null;
    for (const row of rows) {
      const user = parseRecord(row.data);
      const names = [user.username, user.email, user.name].map(v => String(v || '').trim().toLowerCase());
      if (names.includes(username) && String(user.password || '') === password) {
        matched = user;
        matched.id = matched.id || row.record_id;
        matched._version = row.version;
        break;
      }
    }
    if (!matched) return res.status(401).json({ error: 'invalid_credentials' });
    if (matched.status === 'offline') return res.status(403).json({ error: 'disabled' });

    const isAdmin = matched.role === 'admin' || matched.userRole === 'admin';
    if (!isAdmin) {
      if (!Array.isArray(matched.projectIds) || !matched.projectIds.includes(projectId)) {
        return res.status(403).json({ error: 'no_project_access', projects: matched.projectIds || [] });
      }
    }

    const forceLogout = !!(req.body && req.body.forceLogout);
    const existing = activeSession(matched);
    if (existing && !forceLogout) {
      return res.status(409).json({
        error: 'already_logged_in',
        message: 'This user is already logged in from another browser or computer. Log out there first.',
        canForceLogout: true
      });
    }
    if (existing && forceLogout) {
      activeSessions.delete(sessionKey(matched));
    }

    const safe = stripSecrets(matched);
    safe.sessionToken = createSession(matched);
    res.json({ ok: true, user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'no_database' });
  const username = String((req.body && req.body.username) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (!username || !password) return res.status(400).json({ error: 'missing_credentials' });
  try {
    const [rows] = await pool.query(
      'SELECT data FROM records WHERE collection IN (?, ?)',
      ['usersDb', 'users']
    );
    for (const row of rows) {
      const user = parseRecord(row.data);
      const names = [user.username, user.email, user.name].map(v => String(v || '').trim().toLowerCase());
      if (names.includes(username) && String(user.password || '') === password) {
        return res.json({ ok: true });
      }
    }
    res.status(401).json({ error: 'invalid_credentials' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/auth/online', (req, res) => {
  const now = Date.now();
  const online = [];
  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastSeen > SESSION_TIMEOUT_MS) {
      activeSessions.delete(key);
      continue;
    }
    online.push({
      id: key,
      username: session.username || '',
      startedAt: session.startedAt,
      lastSeen: session.lastSeen
    });
  }
  res.json({ online });
});

app.post('/api/auth/logout', (req, res) => {
  const token = String((req.body && req.body.sessionToken) || req.headers['x-session-token'] || '').trim();
  if (token) {
    for (const [key, session] of activeSessions.entries()) {
      if (session.token === token) activeSessions.delete(key);
    }
  }
  res.json({ ok: true });
});

app.post('/api/auth/heartbeat', (req, res) => {
  const token = String((req.body && req.body.sessionToken) || '');
  for (const session of activeSessions.values()) {
    if (session.token === token) {
      session.lastSeen = Date.now();
      return res.json({ ok: true });
    }
  }
  res.status(401).json({ error: 'session_expired' });
});

// ---------- Change password on the server ----------
app.post('/api/auth/change-password', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'no_database' });
  const userId = String((req.body && req.body.userId) || '').trim();
  const username = String((req.body && req.body.username) || '').trim().toLowerCase();
  const currentPassword = String((req.body && req.body.currentPassword) || '');
  const newPassword = String((req.body && req.body.newPassword) || '');
  if ((!userId && !username) || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT collection, record_id, data, version FROM records WHERE collection IN (?, ?)',
      ['usersDb', 'users']
    );
    let matches = [];
    for (const row of rows) {
      const user = parseRecord(row.data);
      const names = [user.username, user.email, user.name].map(v => String(v || '').trim().toLowerCase());
      const idMatch = userId && (String(row.record_id) === userId || String(user.id) === userId);
      const nameMatch = username && names.includes(username);
      if (idMatch || nameMatch) matches.push({ row, user });
    }
    if (!matches.length) return res.status(404).json({ error: 'user_not_found' });
    const withPassword = matches.find(m => String(m.user.password || '') === currentPassword);
    if (!withPassword) return res.status(401).json({ error: 'current_password_incorrect' });
    if (newPassword === currentPassword) return res.status(400).json({ error: 'same_password' });

    const changedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString();
    for (const matched of matches) {
      await pool.query(
        `UPDATE records
         SET data = JSON_SET(data,
               '$.password', ?,
               '$.passwordChanged', true,
               '$.passwordChangedAt', ?,
               '$.passwordExpiresAt', ?),
             version = version + 1
         WHERE collection = ? AND record_id = ?`,
        [newPassword, changedAt, expiresAt, matched.row.collection, matched.row.record_id]
      );
    }

    const [check] = await pool.query(
      'SELECT data FROM records WHERE collection = ? AND record_id = ?',
      [withPassword.row.collection, withPassword.row.record_id]
    );
    const saved = check.length ? parseRecord(check[0].data) : null;
    if (!saved || String(saved.password || '') !== newPassword) {
      return res.status(500).json({ error: 'password_not_stored' });
    }
    res.json({ ok: true, user: stripSecrets(saved) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- List records in a collection ----------

function fmtShort(d) {
  if (!d || isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = String(d.getFullYear()).slice(-2);
  return day + '-' + month + '-' + year;
}

function parseLooseDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  // ISO or YYYY-MM-DD
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // DD-Mon-YYYY or DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? 2000 + parseInt(m1[3], 10) : parseInt(m1[3], 10);
    d = new Date(y, parseInt(m1[2], 10) - 1, parseInt(m1[1], 10));
    if (!isNaN(d.getTime())) return d;
  }
  const m2 = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m2) {
    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const y = m2[3].length === 2 ? 2000 + parseInt(m2[3], 10) : parseInt(m2[3], 10);
    d = new Date(y, months[m2[2].toLowerCase()], parseInt(m2[1], 10));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

async function summariseCollection(collection, projectId, dateField, closedStatuses) {
  const [rows] = await pool.query(
    `SELECT JSON_UNQUOTE(JSON_EXTRACT(data, '$.status')) AS status,
            JSON_UNQUOTE(JSON_EXTRACT(data, ?)) AS dt,
            JSON_UNQUOTE(JSON_EXTRACT(data, '$.project')) AS project
     FROM records WHERE collection = ?`,
    ['$.' + dateField, collection]
  );
  const closedSet = new Set(closedStatuses.map(s => s.toLowerCase()));
  let total = 0, closed = 0;
  let lastSubmitted = null, lastPassed = null;
  const monthly = {};
  const years = new Set();
  for (const row of rows) {
    if (projectId && String(row.project || '') !== String(projectId)) continue;
    total++;
    const status = String(row.status || '').toLowerCase();
    const isClosed = closedSet.has(status);
    if (isClosed) closed++;
    const d = parseLooseDate(row.dt);
    if (d) {
      if (!lastSubmitted || d > lastSubmitted) lastSubmitted = d;
      if (isClosed && (!lastPassed || d > lastPassed)) lastPassed = d;
      const y = String(d.getFullYear());
      const m = d.getMonth();
      years.add(y);
      if (!monthly[y]) monthly[y] = [0,0,0,0,0,0,0,0,0,0,0,0];
      monthly[y][m]++;
    }
  }
  const percent = total > 0 ? Math.round((closed / total) * 100) : 0;
  return {
    total,
    closed,
    pending: total - closed,
    percent,
    lastSubmitted: lastSubmitted ? fmtShort(lastSubmitted) : 'N/A',
    lastPassed: lastPassed ? fmtShort(lastPassed) : 'N/A',
    years: Array.from(years).sort(),
    monthly
  };
}

app.get('/api/dashboard/summary', async (req, res) => {
  if (!pool) return res.json({ diary: null, inspection: null, wage: null });
  const projectId = String(req.query.projectId || '').trim();
  try {
    const [diary, inspection, wage] = await Promise.all([
      summariseCollection('siteDiary', projectId, 'date', ['closed']),
      summariseCollection('inspection', projectId, 'date', ['closed']),
      summariseCollection('wage', projectId, 'periodStart', ['endorsed', 'closed'])
    ]);
    res.json({ diary, inspection, wage, generatedAt: Date.now() });
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ error: err.message });
  }
});


const LIST_FIELDS = [
  'id','status','statusText','site','date','period','periodStart','periodEnd',
  'submittedBy','inspector','type','typeText','project','approvalStatus',
  'createdAt','author','siteName'
];

app.get('/api/records/:collection/list', async (req, res) => {
  if (!pool) return res.json([]);
  if (req.params.collection === 'usersDb' || req.params.collection === 'users') {
    return res.status(403).json({ error: 'accounts_not_available_to_browser' });
  }
  try {
    const extracts = LIST_FIELDS.map(f =>
      `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${f}')) AS ${f}`
    ).join(', ');
    const [rows] = await pool.query(
      `SELECT record_id, ${extracts},
              (JSON_EXTRACT(data, '$.pdfData') IS NOT NULL
               AND JSON_TYPE(JSON_EXTRACT(data, '$.pdfData')) <> 'NULL'
               AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.pdfData')) <> '') AS has_pdf,
              version, updated_by, updated_at
       FROM records WHERE collection = ?`,
      [req.params.collection]
    );
    const list = rows.map(r => {
      const obj = { id: r.record_id };
      LIST_FIELDS.forEach(f => {
        if (r[f] != null && r[f] !== 'null') obj[f] = r[f];
      });
      obj._version = r.version;
      obj._updatedBy = r.updated_by;
      obj._updatedAt = r.updated_at;
      obj.hasPdf = !!r.has_pdf;
      return obj;
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/records/:collection', async (req, res) => {
  if (!pool) return res.json([]);
  if (req.params.collection === 'usersDb' || req.params.collection === 'users') {
    return res.status(403).json({ error: 'accounts_not_available_to_browser' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT record_id,
              JSON_REMOVE(data, '$.pdfData') AS data,
              (JSON_EXTRACT(data, '$.pdfData') IS NOT NULL
               AND JSON_TYPE(JSON_EXTRACT(data, '$.pdfData')) <> 'NULL'
               AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.pdfData')) <> '') AS has_pdf,
              version, updated_by, updated_at
       FROM records WHERE collection = ?`,
      [req.params.collection]
    );
    const list = rows.map(r => {
      const obj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      obj._version = r.version;
      obj._updatedBy = r.updated_by;
      obj._updatedAt = r.updated_at;
      obj.hasPdf = !!r.has_pdf;
      return obj;
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/record', async (req, res) => {
  if (!pool) return res.json(null);
  const collection = String(req.query.collection || '');
  const id = String(req.query.id || '');
  if (!collection || !id) return res.status(400).json({ error: 'missing_id' });
  if (collection === 'usersDb' || collection === 'users') {
    return res.status(403).json({ error: 'accounts_not_available_to_browser' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT data, version, updated_by, updated_at FROM records WHERE collection = ? AND record_id = ?',
      [collection, id]
    );
    if (!rows.length) return res.status(404).json(null);
    const r = rows[0];
    const obj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    obj._version = r.version;
    obj._updatedBy = r.updated_by;
    obj._updatedAt = r.updated_at;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/record', requireActiveSession, async (req, res) => {
  const collection = String(req.query.collection || '');
  const id = String(req.query.id || '');
  if (!collection || !id) return res.status(400).json({ error: 'missing_id' });
  req.params.collection = collection;
  req.params.id = id;
  return saveRecord(req, res);
});
app.get('/api/records/:collection/:id', async (req, res) => {
  if (!pool) return res.json(null);
  if (req.params.collection === 'usersDb' || req.params.collection === 'users') {
    return res.status(403).json({ error: 'accounts_not_available_to_browser' });
  }
  try {
    const id = decodeURIComponent(req.params.id);
    const [rows] = await pool.query(
      'SELECT data, version, updated_by, updated_at FROM records WHERE collection = ? AND record_id = ?',
      [req.params.collection, id]
    );
    if (!rows.length) return res.status(404).json(null);
    const r = rows[0];
    const obj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    obj._version = r.version;
    obj._updatedBy = r.updated_by;
    obj._updatedAt = r.updated_at;
    if (req.params.collection === 'usersDb' || req.params.collection === 'users') {
      delete obj.password;
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Create or update (optimistic lock) ----------
async function saveRecord(req, res) {
  if (!pool) return res.json({ ok: true, mode: 'local' });
  const collection = req.params.collection;
  const id = decodeURIComponent(req.params.id);
  const body = req.body || {};
  const expectedVersion = body._version || null;
  const updatedBy = body._updatedBy || req.headers['x-user'] || null;

  const clean = await keepExistingPdf(collection, id, await keepExistingPassword(collection, id, (() => {
    const c = { ...body };
    delete c._version;
    delete c._updatedBy;
    delete c._updatedAt;
    return c;
  })()));

  try {
    const [existing] = await pool.query(
      'SELECT version FROM records WHERE collection = ? AND record_id = ?',
      [collection, id]
    );

    if (existing.length) {
      const current = existing[0].version;
      if (expectedVersion != null && Number(expectedVersion) !== current) {
        return res.status(409).json({
          error: 'conflict',
          message: 'Record was modified by someone else',
          currentVersion: current
        });
      }
      const newVersion = current + 1;
      await pool.query(
        'UPDATE records SET data = ?, version = ?, updated_by = ? WHERE collection = ? AND record_id = ?',
        [JSON.stringify(clean), newVersion, updatedBy, collection, id]
      );
      return res.json({ ok: true, version: newVersion });
    } else {
      await pool.query(
        'INSERT INTO records (collection, record_id, data, version, updated_by) VALUES (?, ?, ?, 1, ?)',
        [collection, id, JSON.stringify(clean), updatedBy]
      );
      return res.json({ ok: true, version: 1 });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

app.put('/api/records/:collection/:id', requireActiveSession, saveRecord);

// ---------- Delete ----------
app.delete('/api/records/:collection/:id', requireActiveSession, async (req, res) => {
  if (!pool) return res.json({ ok: true });
  try {
    await pool.query(
      'DELETE FROM records WHERE collection = ? AND record_id = ?',
      [req.params.collection, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Bulk sync a collection (upsert + delete missing + conflict check) ----------
app.post('/api/records/:collection/bulk', requireActiveSession, async (req, res) => {
  if (!pool) return res.json({ ok: true });
  const collection = req.params.collection;
  const items = Array.isArray(req.body) ? req.body : [];

  // Safety: refuse to wipe an entire collection with an empty payload
  // unless the client explicitly confirms with ?allowEmpty=1
  if (items.length === 0 && req.query.allowEmpty !== '1') {
    return res.status(400).json({
      error: 'empty_payload',
      message: 'Refusing to replace collection with empty list. Pass ?allowEmpty=1 to confirm.'
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Current records in DB
    const [existingRows] = await conn.query(
      'SELECT record_id, version FROM records WHERE collection = ?',
      [collection]
    );
    const existing = {};
    existingRows.forEach(r => { existing[r.record_id] = r.version; });

    const incomingIds = new Set();

    for (const item of items) {
      const id = String(item.id || item.record_id || '');
      if (!id) continue;
      incomingIds.add(id);

      const clean = await keepExistingPdf(collection, id, await keepExistingPassword(collection, id, (() => {
        const c = { ...item };
        delete c._version;
        delete c._updatedBy;
        delete c._updatedAt;
        return c;
      })()));

      const expected = item._version != null ? Number(item._version) : null;

      if (existing[id] !== undefined) {
        // Conflict check
        if (expected != null && expected !== existing[id]) {
          await conn.rollback();
          return res.status(409).json({
            error: 'conflict',
            message: 'Record ' + id + ' was modified by someone else',
            recordId: id,
            currentVersion: existing[id]
          });
        }
        const newVer = existing[id] + 1;
        await conn.query(
          'UPDATE records SET data = ?, version = ?, updated_by = ? WHERE collection = ? AND record_id = ?',
          [JSON.stringify(clean), newVer, item._updatedBy || null, collection, id]
        );
      } else {
        await conn.query(
          'INSERT INTO records (collection, record_id, data, version, updated_by) VALUES (?, ?, ?, 1, ?)',
          [collection, id, JSON.stringify(clean), item._updatedBy || null]
        );
      }
    }

    // Delete records that are no longer in the incoming list
    for (const oldId of Object.keys(existing)) {
      if (!incomingIds.has(oldId)) {
        await conn.query(
          'DELETE FROM records WHERE collection = ? AND record_id = ?',
          [collection, oldId]
        );
      }
    }

    await conn.commit();
    res.json({ ok: true, count: items.length });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ---------- Static ----------
app.use(express.static(ROOT, { index: 'index.html', extensions: ['html'] }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const file = path.join(ROOT, 'index.html');
  if (fs.existsSync(file)) return res.sendFile(file);
  res.status(404).send('Not found');
});

initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DWSS] http://0.0.0.0:${PORT}  mode=${pool ? 'cloud/multi-user' : 'local'}`);
  });
});
