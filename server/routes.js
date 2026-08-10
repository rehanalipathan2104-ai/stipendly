import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';
import { requireAuth, requireAdmin } from './auth.js';

const router = Router();

function parseJSON(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeInternship(row) {
  if (!row) return null;
  return {
    id: row.id,
    provider_id: row.provider_id,
    title: row.title,
    company_name: row.company_name,
    domain: row.domain,
    domain_verified: !!row.domain_verified,
    domain_verified_at: row.domain_verified_at
      ? new Date(row.domain_verified_at).toISOString()
      : null,
    location: row.location,
    is_remote: !!row.is_remote,
    duration_weeks: row.duration_weeks,
    stipend_min: row.stipend_min,
    stipend_max: row.stipend_max,
    description: row.description,
    requirements: row.requirements,
    skills: parseJSON(row.skills, []),
    category: row.category,
    status: row.status,
    dismiss_reason: row.dismiss_reason,
    honour_score: row.honour_score,
    risk_assessment: parseJSON(row.risk_assessment, null),
    risk_assessed_at: row.risk_assessed_at
      ? new Date(row.risk_assessed_at).toISOString()
      : null,
    application_count: row.application_count,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

function normalizeProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_admin: !!row.is_admin,
    is_banned: !!row.is_banned,
    avatar_url: row.avatar_url,
    bio: row.bio,
    company_name: row.company_name,
    website: row.website,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function normalizeReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    internship_id: row.internship_id,
    reporter_id: row.reporter_id,
    flag_code: row.flag_code,
    details: row.details,
    ai_analysis: parseJSON(row.ai_analysis, null),
    status: row.status,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function normalizeApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    internship_id: row.internship_id,
    student_id: row.student_id,
    cover_letter: row.cover_letter,
    resume_text: row.resume_text,
    status: row.status,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function normalizeHonourEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    internship_id: row.internship_id,
    delta: row.delta,
    reason: row.reason,
    severity: row.severity,
    source: row.source,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function normalizeFlagGlossary(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    severity: row.severity,
    points: row.points,
    description: row.description,
  };
}

function normalizeResumeDraft(row) {
  if (!row) return null;
  return {
    id: row.id,
    student_id: row.student_id,
    title: row.title,
    content: row.content,
    target_internship_id: row.target_internship_id,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

// ---- Auth routes ----
router.post('/auth/signup', async (req, res) => {
  const { signUp: authSignUp } = await import('./auth.js');
  const { email, password, full_name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const result = await authSignUp(email, password, full_name || email.split('@')[0], role || 'student');
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ token: result.token, profile: normalizeProfile(result.profile) });
});

router.post('/auth/signin', async (req, res) => {
  const { signIn: authSignIn } = await import('./auth.js');
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const result = await authSignIn(email, password);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ token: result.token, profile: normalizeProfile(result.profile) });
});

router.get('/auth/me', requireAuth, async (req, res) => {
  res.json({ profile: normalizeProfile(req.user) });
});

// ---- Profiles ----
router.get('/profiles/:id', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
  const profile = normalizeProfile(rows[0]);
  if (req.user.id !== req.params.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  res.json({ profile });
});

router.patch('/profiles/:id', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const allowed = ['company_name', 'website', 'bio', 'avatar_url', 'full_name'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (updates.length) {
    values.push(req.params.id);
    await pool.query(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, values);
  }
  const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
  res.json({ profile: normalizeProfile(rows[0]) });
});

router.get('/profiles', requireAdmin, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM profiles ORDER BY created_at DESC');
  res.json({ profiles: rows.map(normalizeProfile) });
});

router.patch('/profiles/:id/ban', requireAdmin, async (req, res) => {
  const banned = req.body.is_banned ? 1 : 0;
  await pool.query('UPDATE profiles SET is_banned = ? WHERE id = ?', [banned, req.params.id]);
  if (banned) {
    await pool.query(
      "UPDATE internships SET status = 'banned' WHERE provider_id = ? AND status NOT IN ('closed')",
      [req.params.id],
    );
  }
  res.json({ success: true });
});

// ---- Internships ----
router.get('/internships', requireAuth, async (req, res) => {
  const { status, provider_id } = req.query;
  const conditions = [];
  const values = [];
  if (status) { conditions.push('status = ?'); values.push(status); }
  if (provider_id) { conditions.push('provider_id = ?'); values.push(provider_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM internships ${where} ORDER BY created_at DESC`, values);
  res.json({ internships: rows.map(normalizeInternship) });
});

router.get('/internships/:id', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Internship not found' });
  const internship = normalizeInternship(rows[0]);
  if (
    internship.status !== 'active' &&
    internship.provider_id !== req.user.id &&
    !req.user.is_admin
  ) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  res.json({ internship });
});

router.post('/internships', requireAuth, async (req, res) => {
  const id = uuidv4();
  const b = req.body;
  await pool.query(
    `INSERT INTO internships (id, provider_id, title, company_name, domain, location, is_remote,
      duration_weeks, stipend_min, stipend_max, description, requirements, skills, category,
      status, risk_assessment, risk_assessed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'active', ?, NOW())`,
    [
      id, req.user.id, b.title, b.company_name || '', b.domain || null, b.location || null,
      b.is_remote ? 1 : 0, b.duration_weeks || null, b.stipend_min || null, b.stipend_max || null,
      b.description, b.requirements, JSON.stringify(b.skills || []), b.category || null,
      JSON.stringify(b.risk_assessment || null),
    ],
  );
  const [rows] = await pool.query('SELECT * FROM internships WHERE id = ?', [id]);
  res.json({ internship: normalizeInternship(rows[0]) });
});

router.patch('/internships/:id', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const internship = rows[0];
  if (internship.provider_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const allowed = ['title', 'company_name', 'domain', 'location', 'is_remote', 'duration_weeks',
    'stipend_min', 'stipend_max', 'description', 'requirements', 'skills', 'category',
    'status', 'dismiss_reason', 'domain_verified', 'risk_assessment'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === 'skills' || key === 'risk_assessment') {
        updates.push(`${key} = ?`);
        values.push(JSON.stringify(req.body[key]));
      } else if (key === 'is_remote' || key === 'domain_verified') {
        updates.push(`${key} = ?`);
        values.push(req.body[key] ? 1 : 0);
      } else {
        updates.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
  }
  if (updates.length) {
    values.push(req.params.id);
    await pool.query(`UPDATE internships SET ${updates.join(', ')} WHERE id = ?`, values);
  }
  const [updated] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
  res.json({ internship: normalizeInternship(updated[0]) });
});

router.delete('/internships/:id', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  if (rows[0].provider_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  await pool.query('DELETE FROM internships WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ---- Honour events ----
router.get('/internships/:id/honour-events', requireAuth, async (req, res) => {
  const [intRows] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
  if (!intRows.length) return res.status(404).json({ error: 'Not found' });
  const internship = intRows[0];
  if (internship.provider_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const [rows] = await pool.query(
    'SELECT * FROM honour_events WHERE internship_id = ? ORDER BY created_at DESC',
    [req.params.id],
  );
  res.json({ events: rows.map(normalizeHonourEvent) });
});

router.post('/internships/:id/honour-events', requireAuth, async (req, res) => {
  const id = uuidv4();
  const { delta, reason, severity, source } = req.body;
  await pool.query(
    'INSERT INTO honour_events (id, internship_id, delta, reason, severity, source) VALUES (?,?,?,?,?,?)',
    [id, req.params.id, delta, reason, severity || 'medium', source || 'report'],
  );
  const [rows] = await pool.query('SELECT * FROM honour_events WHERE id = ?', [id]);
  await recalcHonourScore(req.params.id);
  res.json({ event: normalizeHonourEvent(rows[0]) });
});

async function recalcHonourScore(internshipId) {
  const [events] = await pool.query(
    'SELECT COALESCE(SUM(delta), 0) as total FROM honour_events WHERE internship_id = ?',
    [internshipId],
  );
  const score = Math.max(100 + events[0].total, 0);
  await pool.query('UPDATE internships SET honour_score = ?, updated_at = NOW() WHERE id = ?', [
    score,
    internshipId,
  ]);
  if (score < 40) {
    await pool.query(
      "UPDATE internships SET status = 'banned', updated_at = NOW() WHERE id = ? AND status NOT IN ('banned','closed')",
      [internshipId],
    );
    const [rows] = await pool.query('SELECT provider_id FROM internships WHERE id = ?', [internshipId]);
    if (rows.length) {
      await pool.query('UPDATE profiles SET is_banned = 1 WHERE id = ?', [rows[0].provider_id]);
    }
  }
}

// ---- Reports ----
router.get('/internships/:id/reports', requireAuth, async (req, res) => {
  const [intRows] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
  if (!intRows.length) return res.status(404).json({ error: 'Not found' });
  const internship = intRows[0];
  const isOwner = internship.provider_id === req.user.id;
  const isAdmin = req.user.is_admin;
  const [rows] = await pool.query(
    'SELECT * FROM reports WHERE internship_id = ? ORDER BY created_at DESC',
    [req.params.id],
  );
  const filtered = rows.filter((r) => {
    if (isAdmin) return true;
    if (isOwner) return true;
    return r.reporter_id === req.user.id;
  });
  res.json({ reports: filtered.map(normalizeReport) });
});

router.post('/internships/:id/reports', requireAuth, async (req, res) => {
  const id = uuidv4();
  const { flag_code, details, ai_analysis } = req.body;
  await pool.query(
    'INSERT INTO reports (id, internship_id, reporter_id, flag_code, details, ai_analysis) VALUES (?,?,?,?,?,?)',
    [id, req.params.id, req.user.id, flag_code, details, JSON.stringify(ai_analysis || null)],
  );
  const [rows] = await pool.query('SELECT * FROM reports WHERE id = ?', [id]);
  res.json({ report: normalizeReport(rows[0]) });
});

router.patch('/reports/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
  const [rows] = await pool.query('SELECT * FROM reports WHERE id = ?', [req.params.id]);
  res.json({ report: normalizeReport(rows[0]) });
});

router.get('/reports', requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT r.*, i.title as internship_title, i.honour_score as internship_honour_score,
           p.full_name as reporter_name
    FROM reports r
    LEFT JOIN internships i ON r.internship_id = i.id
    LEFT JOIN profiles p ON r.reporter_id = p.id
    ORDER BY r.created_at DESC
  `);
  const reports = rows.map((r) => ({
    ...normalizeReport(r),
    internship: r.internship_title
      ? { title: r.internship_title, honour_score: r.internship_honour_score }
      : undefined,
    reporter: { full_name: r.reporter_name },
  }));
  res.json({ reports });
});

// ---- Applications ----
router.get('/applications', requireAuth, async (req, res) => {
  const { student_id, internship_id } = req.query;
  const conditions = [];
  const values = [];
  if (student_id) { conditions.push('a.student_id = ?'); values.push(student_id); }
  if (internship_id) { conditions.push('a.internship_id = ?'); values.push(internship_id); }

  let where = '';
  if (conditions.length) {
    where = `WHERE ${conditions.join(' AND ')}`;
  } else {
    return res.json({ applications: [] });
  }

  const [rows] = await pool.query(
    `SELECT a.*, i.title as internship_title, i.company_name as internship_company_name,
            i.stipend_min as internship_stipend_min, i.stipend_max as internship_stipend_max,
            i.provider_id as internship_provider_id,
            p.full_name as student_name, p.email as student_email
     FROM applications a
     LEFT JOIN internships i ON a.internship_id = i.id
     LEFT JOIN profiles p ON a.student_id = p.id
     ${where} ORDER BY a.created_at DESC`,
    values,
  );

  const applications = rows.map((r) => ({
    ...normalizeApplication(r),
    internship: r.internship_title
      ? {
          id: r.internship_id,
          title: r.internship_title,
          company_name: r.internship_company_name,
          stipend_min: r.internship_stipend_min,
          stipend_max: r.internship_stipend_max,
          provider_id: r.internship_provider_id,
        }
      : null,
    student: r.student_name
      ? { id: r.student_id, full_name: r.student_name, email: r.student_email }
      : null,
  }));

  const visible = applications.filter((a) => {
    if (req.user.is_admin) return true;
    if (a.student_id === req.user.id) return true;
    return a.internship && a.internship.provider_id === req.user.id;
  });

  res.json({ applications: visible });
});

router.post('/applications', requireAuth, async (req, res) => {
  const id = uuidv4();
  const { internship_id, cover_letter, resume_text } = req.body;
  await pool.query(
    'INSERT INTO applications (id, internship_id, student_id, cover_letter, resume_text) VALUES (?,?,?,?,?)',
    [id, internship_id, req.user.id, cover_letter || '', resume_text || ''],
  );
  await pool.query(
    'UPDATE internships SET application_count = application_count + 1 WHERE id = ?',
    [internship_id],
  );
  const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [id]);
  res.json({ application: normalizeApplication(rows[0]) });
});

router.patch('/applications/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const app = rows[0];
  const [intRows] = await pool.query('SELECT provider_id FROM internships WHERE id = ?', [
    app.internship_id,
  ]);
  const isOwner = intRows.length && intRows[0].provider_id === req.user.id;
  if (app.student_id !== req.user.id && !isOwner && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  await pool.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
  const [updated] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
  res.json({ application: normalizeApplication(updated[0]) });
});

router.delete('/applications/:id', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  if (rows[0].student_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  await pool.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ---- Flag glossary ----
router.get('/flag-glossary', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM flag_glossary ORDER BY points DESC');
  res.json({ glossary: rows.map(normalizeFlagGlossary) });
});

router.post('/flag-glossary', requireAdmin, async (req, res) => {
  const id = uuidv4();
  const { code, label, severity, points, description } = req.body;
  await pool.query(
    'INSERT INTO flag_glossary (id, code, label, severity, points, description) VALUES (?,?,?,?,?,?)',
    [id, code, label, severity || 'medium', points || 10, description || null],
  );
  const [rows] = await pool.query('SELECT * FROM flag_glossary WHERE id = ?', [id]);
  res.json({ flag: normalizeFlagGlossary(rows[0]) });
});

router.patch('/flag-glossary/:id', requireAdmin, async (req, res) => {
  const { label, severity, points, description } = req.body;
  await pool.query(
    'UPDATE flag_glossary SET label = ?, severity = ?, points = ?, description = ? WHERE id = ?',
    [label, severity, points, description, req.params.id],
  );
  const [rows] = await pool.query('SELECT * FROM flag_glossary WHERE id = ?', [req.params.id]);
  res.json({ flag: normalizeFlagGlossary(rows[0]) });
});

router.delete('/flag-glossary/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM flag_glossary WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ---- Resume drafts ----
router.get('/resume-drafts', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM resume_drafts WHERE student_id = ? ORDER BY updated_at DESC',
    [req.user.id],
  );
  res.json({ drafts: rows.map(normalizeResumeDraft) });
});

router.post('/resume-drafts', requireAuth, async (req, res) => {
  const id = uuidv4();
  const { title, content } = req.body;
  await pool.query(
    'INSERT INTO resume_drafts (id, student_id, title, content) VALUES (?,?,?,?)',
    [id, req.user.id, title || 'Untitled resume', content || ''],
  );
  const [rows] = await pool.query('SELECT * FROM resume_drafts WHERE id = ?', [id]);
  res.json({ draft: normalizeResumeDraft(rows[0]) });
});

router.delete('/resume-drafts/:id', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM resume_drafts WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  if (rows[0].student_id !== req.user.id) return res.status(403).json({ error: 'Not allowed' });
  await pool.query('DELETE FROM resume_drafts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ---- Admin: all internships ----
router.get('/admin/internships', requireAdmin, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM internships ORDER BY created_at DESC');
  res.json({ internships: rows.map(normalizeInternship) });
});

export default router;
