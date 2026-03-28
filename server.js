const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';
const DATA_FILE = path.join(__dirname, 'data', 'rsvps.json');
const BACKUPS_DIR = path.join(__dirname, 'data', 'backups');

app.use(express.json());
app.use(express.static('public'));

// --- Data helpers ---

function readRsvps() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeRsvps(rsvps) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(rsvps, null, 2));
}

// --- Auth middleware ---

function requireAdmin(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Clave incorrecta' });
  }
  next();
}

// --- API Routes ---

// Crear RSVP
app.post('/api/rsvp', (req, res) => {
  const { name, type, adults, kids, allergies } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  const validTypes = ['individual', 'family'];
  const rsvpType = validTypes.includes(type) ? type : 'individual';

  const rsvp = {
    id: crypto.randomUUID(),
    name: name.trim(),
    type: rsvpType,
    adults: rsvpType === 'family' ? Math.max(0, parseInt(adults) || 0) : 0,
    kids: rsvpType === 'family' ? Math.max(1, parseInt(kids) || 1) : 1,
    allergies: (allergies || '').trim(),
    createdAt: new Date().toISOString()
  };

  const rsvps = readRsvps();
  rsvps.push(rsvp);
  writeRsvps(rsvps);

  res.status(201).json({ success: true, message: 'Tu lechuza ha sido enviada!' });
});

// Listar RSVPs (admin)
app.get('/api/rsvps', requireAdmin, (req, res) => {
  res.json(readRsvps());
});

// Eliminar RSVP (admin)
app.delete('/api/rsvps/:id', requireAdmin, (req, res) => {
  const rsvps = readRsvps();
  const filtered = rsvps.filter(r => r.id !== req.params.id);

  if (filtered.length === rsvps.length) {
    return res.status(404).json({ error: 'RSVP no encontrado' });
  }

  writeRsvps(filtered);
  res.json({ success: true });
});

// --- Backup system ---

function createBackup() {
  if (!fs.existsSync(DATA_FILE)) return;

  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().slice(0, 13).replace(/[T:]/g, '-');
  const backupFile = path.join(BACKUPS_DIR, `rsvps-${timestamp}.json`);

  fs.copyFileSync(DATA_FILE, backupFile);

  // Limpiar backups viejos (mantener ultimos 48)
  const backups = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('rsvps-') && f.endsWith('.json'))
    .sort()
    .reverse();

  backups.slice(48).forEach(f => {
    fs.unlinkSync(path.join(BACKUPS_DIR, f));
  });
}

// Backup cada hora
setInterval(createBackup, 60 * 60 * 1000);

// --- Start ---

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Admin key: ${ADMIN_KEY}`);
});
