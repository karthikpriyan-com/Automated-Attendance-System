// Reports: student-wise, subject-wise, daily, monthly (+ CSV) and low-attendance list
const router = require('express').Router();
const { db, LOW, summaryFor } = require('../db');
const { auth, role } = require('../middleware');

// GET /api/reports?type=student|subject|daily|monthly&subject=SUB1&value=2026-11-12|2026-11&format=csv
router.get('/', auth, role('faculty', 'admin'), (req, res) => {
  const { type = 'student', subject, value, format } = req.query;
  if (!['student', 'subject', 'daily', 'monthly'].includes(type)) return res.status(400).json({ error: 'Unknown report type' });

  let allowed = (req.user.role === 'admin'
    ? db.prepare('SELECT id FROM subjects').all()
    : db.prepare('SELECT id FROM subjects WHERE faculty_id=?').all(req.user.id)).map(x => x.id);
  if (subject) {
    if (!allowed.includes(subject)) return res.status(403).json({ error: 'You cannot view this subject' });
    allowed = [subject];
  }

  let rows = [];
  if (allowed.length) {
    const where = [`a.subject_id IN (${allowed.map(() => '?').join(',')})`], args = [...allowed];
    if (type === 'daily' && value) { where.push('a.date = ?'); args.push(value); }
    if (type === 'monthly' && value) { where.push('a.date LIKE ?'); args.push(value + '%'); }
    const bySubject = type === 'subject';
    rows = db.prepare(`SELECT ${bySubject ? 'sub.id AS id, sub.name AS name' : 'st.id AS id, st.name AS name'},
        SUM(a.status='Present') AS present, COUNT(*) AS total
      FROM attendance a JOIN students st ON st.id = a.student_id JOIN subjects sub ON sub.id = a.subject_id
      WHERE ${where.join(' AND ')} GROUP BY ${bySubject ? 'sub.id' : 'st.id'} ORDER BY id`).all(...args)
      .map(r => {
        const percent = Math.round(r.present / r.total * 100);
        return { id: r.id, name: r.name, present: r.present, total: r.total, percent, status: percent < LOW ? 'Low' : 'OK' };
      });
  }

  if (format === 'csv') {
    const csv = ['ID,Name,Present,Total,Percent,Status']
      .concat(rows.map(r => `${r.id},"${r.name}",${r.present},${r.total},${r.percent},${r.status}`)).join('\n');
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="attendance_report.csv"' });
    return res.send(csv);
  }
  res.json({ type, threshold: LOW, rows });
});

// GET /api/reports/low  -> students whose overall attendance is under the threshold
router.get('/low', auth, role('faculty', 'admin'), (req, res) => {
  const list = db.prepare('SELECT id,name FROM students ORDER BY id').all()
    .map(s => ({ ...s, ...summaryFor(s.id).overall }))
    .filter(s => s.total && s.percent < LOW);
  res.json({ threshold: LOW, students: list });
});

module.exports = router;
