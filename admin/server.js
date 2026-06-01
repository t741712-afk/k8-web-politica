const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const { Pool } = require('pg');

const app    = express();
const SECRET = process.env.JWT_SECRET || 'ppf-admin-secret-2027';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'ppf2027';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

const pool = new Pool({
  host:     process.env.DB_HOST     || 'postgres',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'ppf',
  user:     process.env.DB_USER     || 'ppf',
  password: process.env.DB_PASSWORD || 'ppf123',
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// POST /admin/api/login
app.post('/admin/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER || password !== ADMIN_PASS)
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = jwt.sign({ username }, SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// GET /admin/api/stats
app.get('/admin/api/stats', auth, async (req, res) => {
  try {
    const [aff, news] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM affiliates'),
      pool.query('SELECT COUNT(*) AS count FROM newsletter'),
    ]);
    res.json({
      affiliates: parseInt(aff.rows[0].count),
      newsletter: parseInt(news.rows[0].count),
      totalAffiliates: parseInt(aff.rows[0].count) + 24817,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/api/affiliates
app.get('/admin/api/affiliates', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, apellidos, email, provincia, created_at FROM affiliates ORDER BY created_at DESC LIMIT 100'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /admin/api/affiliates/:id
app.delete('/admin/api/affiliates/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM affiliates WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/api/newsletter
app.get('/admin/api/newsletter', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, created_at FROM newsletter ORDER BY created_at DESC LIMIT 100'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/api/provinces
app.get('/admin/api/provinces', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT provincia, COUNT(*) AS count FROM affiliates GROUP BY provincia ORDER BY count DESC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve SPA for all /admin routes
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(4000, () => console.log('Admin PPF en :4000'));
