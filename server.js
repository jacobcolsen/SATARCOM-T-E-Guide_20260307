// ============================================================
//  STARCOM T&E — Shared Data Server
//  Run this on one machine; team members browse to:
//    http://[this-machine's-IP]:3000
//
//  Usage (dev):  node server.js
//  Usage (exe):  double-click starcom-server.exe
// ============================================================

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// When running as a bundled .exe (pkg), resolve paths next to the exe.
// When running as a plain script, use the script's directory.
const APP_DIR   = process.pkg ? path.dirname(process.execPath) : __dirname;
const DATA_FILE = path.join(APP_DIR, 'data.json');

// ── Serve the HTML app files ──────────────────────────────
app.use(express.static(APP_DIR));

// ── Data helpers ──────────────────────────────────────────
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { programs: [], programData: {} };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── API endpoints ─────────────────────────────────────────

// GET /api/all — client fetches this on every page load to hydrate localStorage
app.get('/api/all', (req, res) => {
  res.json(readData());
});

// POST /api/programs/list — save the program list (array of {id, name, ...})
app.post('/api/programs/list', (req, res) => {
  try {
    const data = readData();
    data.programs = req.body;
    writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error('Write error (list):', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/programs/data/:id — save one program's full state
app.post('/api/programs/data/:id', (req, res) => {
  try {
    const data = readData();
    if (!data.programData) data.programData = {};
    data.programData[req.params.id] = req.body;
    writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error('Write error (program):', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/programs/data/:id — remove a program
app.delete('/api/programs/data/:id', (req, res) => {
  try {
    const data = readData();
    if (data.programData) delete data.programData[req.params.id];
    writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  // Collect non-loopback IPv4 addresses
  const ips = [];
  Object.values(os.networkInterfaces()).forEach(iface => {
    (iface || []).forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    });
  });

  const line = '═'.repeat(52);
  console.log(`\n╔${line}╗`);
  console.log(`║  STARCOM T&E Server — RUNNING${' '.repeat(22)}║`);
  console.log(`╠${line}╣`);
  console.log(`║  Local:   http://localhost:${PORT}${' '.repeat(23)}║`);
  ips.forEach(ip => {
    const url = `http://${ip}:${PORT}`;
    console.log(`║  Network: ${url.padEnd(41)}║`);
  });
  console.log(`╠${line}╣`);
  console.log(`║  Share the Network URL with your team.${' '.repeat(13)}║`);
  console.log(`║  Keep this window open while others are working.  ║`);
  console.log(`║  Press Ctrl+C to stop.${' '.repeat(29)}║`);
  console.log(`╚${line}╝\n`);
});
