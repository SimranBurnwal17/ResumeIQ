const express = require('express');
const multer = require('multer');
const router = express.Router();
const Scan = require('../models/Scan');
const JobMatch = require('../models/JobMatch');
const { processScan } = require('../services/scanWorker');
const { protect } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
  },
});

// POST /api/scans — start a new scan
router.post(
  '/',
  protect,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'jd', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const resumeFile = req.files?.resume?.[0];
      const jdFile = req.files?.jd?.[0];
      const jdText = req.body.jdText?.trim();
      const location = req.body.location?.trim() || '';

      if (!resumeFile) {
        return res.status(400).json({ error: 'Resume file is required.' });
      }
      if (!jdFile && !jdText) {
        return res.status(400).json({ error: 'A job description file or text is required.' });
      }

      const scan = await Scan.create({
        userId: req.user._id,
        resumeFileName: resumeFile.originalname,
        jdFileName: jdFile?.originalname || 'pasted_jd.txt',
        status: 'queued',
      });

      // Run processing in background — don't await so response returns immediately
      processScan(
        scan._id.toString(),
        req.user._id.toString(),
        Array.from(resumeFile.buffer),
        resumeFile.originalname,
        jdFile ? Array.from(jdFile.buffer) : null,
        jdFile?.originalname || '',
        jdFile ? null : jdText,
        location
      );

      res.status(202).json({
        scanId: scan._id,
        status: 'queued',
        message: 'Analysis started. Poll /api/scans/:id/status for updates.',
      });
    } catch (err) {
      console.error('[POST /scans]', err.message);
      res.status(500).json({ error: err.message || 'Failed to start scan.' });
    }
  }
);

// GET /api/scans/:id/status — poll for progress
router.get('/:id/status', protect, async (req, res) => {
  try {
    const scan = await Scan.findOne(
      { _id: req.params.id, userId: req.user._id },
      'status error matchScore createdAt'
    );
    if (!scan) return res.status(404).json({ error: 'Scan not found.' });

    const STATUS_PROGRESS = {
      queued: 5, parsing: 20, scoring: 55,
      fetching_jobs: 80, done: 100, failed: null,
    };

    res.json({
      status: scan.status,
      progress: STATUS_PROGRESS[scan.status] ?? 0,
      error: scan.error,
      matchScore: scan.status === 'done' ? scan.matchScore : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch status.' });
  }
});

// GET /api/scans/:id — full result
router.get('/:id', protect, async (req, res) => {
  try {
    const scan = await Scan.findOne(
      { _id: req.params.id, userId: req.user._id },
      '-resumeText -jdText -resumeEmbedding -jdEmbedding'
    );
    if (!scan) return res.status(404).json({ error: 'Scan not found.' });
    if (scan.status !== 'done') {
      return res.status(202).json({ status: scan.status, message: 'Scan not yet complete.' });
    }
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch scan.' });
  }
});

// GET /api/scans/:id/jobs — matched jobs
router.get('/:id/jobs', protect, async (req, res) => {
  try {
    const scan = await Scan.findOne(
      { _id: req.params.id, userId: req.user._id },
      'status'
    );
    if (!scan) return res.status(404).json({ error: 'Scan not found.' });
    if (scan.status !== 'done') {
      return res.status(202).json({ message: 'Jobs not yet available.' });
    }

    const minScore = parseInt(req.query.minScore) || 0;
    const filter = { scanId: req.params.id };
    if (minScore) filter.matchScore = { $gte: minScore };

    const jobs = await JobMatch.find(filter)
      .sort({ matchScore: -1 })
      .limit(50)
      .select('-__v');

    res.json({ count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch jobs.' });
  }
});

// GET /api/scans — list all scans
router.get('/', protect, async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('status matchScore resumeFileName jdFileName createdAt');
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: 'Could not list scans.' });
  }
});

module.exports = router;