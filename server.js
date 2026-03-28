const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
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

// --- Email ---

function buildGoogleCalendarUrl() {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Cumple de Juanma - 8 años! 🦉',
    dates: '20260417T183000/20260417T213000',
    location: 'Zona Prado, Adolfo Berro 912',
    details: 'Fiesta temática Harry Potter. ¡Nos vemos en Hogwarts!'
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function buildIcsContent() {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'DTSTART:20260417T183000',
    'DTEND:20260417T213000',
    'SUMMARY:Cumple de Juanma - 8 años! 🦉',
    'LOCATION:Zona Prado\\, Adolfo Berro 912',
    'DESCRIPTION:Fiesta temática Harry Potter. ¡Nos vemos en Hogwarts!',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function buildConfirmationEmail(name) {
  const googleCalUrl = buildGoogleCalendarUrl();
  const icsBase64 = Buffer.from(buildIcsContent()).toString('base64');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background:#2a0a0a; font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:500px; margin:0 auto; padding:2rem; text-align:center; color:#f0e6d3;">

    <div style="font-size:2.5rem; margin-bottom:0.5rem;">🦉</div>

    <p style="font-size:0.85rem; letter-spacing:3px; color:#d4a843; text-transform:uppercase;">El Ministerio de la Magia confirma que</p>
    <h1 style="color:#ffd700; font-size:1.8rem; margin:0.5rem 0;">¡${name}, tu lechuza llegó!</h1>

    <div style="margin:1.5rem auto; width:200px; height:2px; background:linear-gradient(90deg,transparent,#ae0001 20%,#ffd700 50%,#ae0001 80%,transparent);"></div>

    <div style="background:rgba(174,0,1,0.15); border:1px solid rgba(174,0,1,0.3); border-radius:12px; padding:1.5rem; margin:1.5rem 0;">
      <p style="color:#d4a843; font-size:0.75rem; letter-spacing:2px; text-transform:uppercase; margin:0 0 0.3rem;">Cuándo</p>
      <p style="font-size:1.1rem; margin:0;">Viernes 17 de Abril, 2026</p>
      <p style="color:#d4a843; margin:0;">18:30 a 21:30 hs</p>

      <div style="width:60px; height:1px; background:linear-gradient(90deg,transparent,#ae0001,transparent); margin:1rem auto;"></div>

      <p style="color:#d4a843; font-size:0.75rem; letter-spacing:2px; text-transform:uppercase; margin:0 0 0.3rem;">Dónde</p>
      <p style="font-size:1.1rem; margin:0;">Zona Prado</p>
      <p style="color:#d4a843; margin:0;">Adolfo Berro 912</p>
    </div>

    <p style="color:#d4a843; font-size:0.9rem; margin-bottom:1rem;">Agregá el evento a tu calendario:</p>

    <a href="${googleCalUrl}" target="_blank" style="display:inline-block; padding:0.8rem 1.5rem; background:linear-gradient(135deg,#ae0001,#d4163c); color:#ffd700; text-decoration:none; border-radius:8px; font-weight:bold; font-family:Georgia,serif; font-size:0.95rem; border:1px solid rgba(255,215,0,0.3);">📅 Google Calendar</a>

    <p style="color:#6a3030; font-size:0.8rem; margin-top:1.5rem;">⚡ Hecho con magia ⚡</p>
  </div>
</body>
</html>`;
}

async function sendConfirmationEmail(email, name) {
  if (!RESEND_API_KEY || !email) return;

  try {
    const icsContent = buildIcsContent();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Cumple de Juanma <onboarding@resend.dev>',
        to: [email],
        subject: '🦉 ¡Confirmaste para el cumple de Juanma!',
        html: buildConfirmationEmail(name),
        attachments: [{
          filename: 'cumple-juanma.ics',
          content: Buffer.from(icsContent).toString('base64')
        }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Error enviando email:', err);
    }
  } catch (err) {
    console.error('Error enviando email:', err.message);
  }
}

// Crear RSVP
app.post('/api/rsvp', (req, res) => {
  const { name, type, adults, kids, allergies, email } = req.body;

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
    email: (email || '').trim(),
    allergies: (allergies || '').trim(),
    createdAt: new Date().toISOString()
  };

  const rsvps = readRsvps();
  rsvps.push(rsvp);
  writeRsvps(rsvps);

  // Enviar email en background (no bloquea la respuesta)
  sendConfirmationEmail(rsvp.email, rsvp.name);

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
