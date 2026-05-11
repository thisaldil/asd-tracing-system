const express = require('express');
const router = express.Router();
const BehaviourTrial = require('../models/BehaviourTrial');
const BehaviourScenario = require('../models/BehaviourScenario');
const { requireAuth } = require('../middleware/auth');

// ─── POST /api/behaviour/trials ──────────────────────────────────────────────
/**
 * Record a single answer (one tap in the picture-choice game).
 *
 * Body:
 *   childId          (required)
 *   sessionId        (required)
 *   scenarioId       (required)
 *   selectedAssetKey (required) — which image the child tapped
 *   responseTimeMs   (required) — ms from images appearing → tap
 *   hintShown        (optional, default false)
 *   attemptNumber    (optional, default 1)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      childId,
      sessionId,
      scenarioId,
      selectedAssetKey,
      responseTimeMs,
      hintShown = false,
      attemptNumber = 1,
    } = req.body;

    // Validate required fields
    if (!childId || !sessionId || !scenarioId || !selectedAssetKey || responseTimeMs == null) {
      return res.status(400).json({
        error: 'Missing required fields: childId, sessionId, scenarioId, selectedAssetKey, responseTimeMs',
      });
    }

    // Fetch scenario to verify the answer and snapshot metadata
    const scenario = await BehaviourScenario.findById(scenarioId).lean();
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Determine correctness by matching tapped assetKey against scenario images
    const tappedImage = scenario.images.find((img) => img.assetKey === selectedAssetKey);
    if (!tappedImage) {
      return res.status(400).json({
        error: `selectedAssetKey "${selectedAssetKey}" does not exist in this scenario`,
      });
    }

    const isCorrect = tappedImage.isCorrect;

    // Save the trial with snapshotted category + difficulty
    // (so dashboard queries never need to join back to the scenario)
    const trial = await BehaviourTrial.create({
      childId,
      sessionId,
      scenarioId,
      selectedAssetKey,
      isCorrect,
      responseTimeMs,
      difficultyLevel: scenario.difficulty,
      category: scenario.category,
      hintShown,
      attemptNumber,
    });

    res.status(201).json({
      message: 'Trial recorded',
      trial: {
        _id: trial._id,
        isCorrect,
        responseTimeMs: trial.responseTimeMs,
        difficultyLevel: trial.difficultyLevel,
        category: trial.category,
        createdAt: trial.createdAt,
      },
    });
  } catch (err) {
    console.error('[BehaviourTrials] POST / error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.message });
    }
    res.status(500).json({ error: 'Failed to record trial', details: err.message });
  }
});

// ─── GET /api/behaviour/trials ───────────────────────────────────────────────
/**
 * Fetch trial history for a child.
 *
 * Query params:
 *   childId    (required)
 *   sessionId  (optional) — filter to one session
 *   limit      (optional, default 50)
 *   skip       (optional, default 0) — for pagination
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { childId, sessionId, limit = 50, skip = 0 } = req.query;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const query = { childId };
    if (sessionId) query.sessionId = sessionId;

    const [trials, total] = await Promise.all([
      BehaviourTrial.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      BehaviourTrial.countDocuments(query),
    ]);

    res.json({
      total,
      count: trials.length,
      skip: parseInt(skip, 10),
      trials,
    });
  } catch (err) {
    console.error('[BehaviourTrials] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch trials', details: err.message });
  }
});

// ─── GET /api/behaviour/trials/session/:sessionId ────────────────────────────
/**
 * Get a summary of one session: accuracy, avg response time, per-category breakdown.
 * Used at end-of-session screen to show parent a quick summary.
 */
router.get('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const trials = await BehaviourTrial.find({ sessionId: req.params.sessionId })
      .sort({ createdAt: 1 })
      .lean();

    if (trials.length === 0) {
      return res.status(404).json({ error: 'No trials found for this session' });
    }

    const totalTrials = trials.length;
    const correctTrials = trials.filter((t) => t.isCorrect).length;
    const accuracy = Math.round((correctTrials / totalTrials) * 100);
    const avgResponseTimeMs = Math.round(
      trials.reduce((sum, t) => sum + t.responseTimeMs, 0) / totalTrials
    );

    // Per-category accuracy breakdown
    const byCategory = {};
    for (const trial of trials) {
      if (!byCategory[trial.category]) {
        byCategory[trial.category] = { total: 0, correct: 0 };
      }
      byCategory[trial.category].total += 1;
      if (trial.isCorrect) byCategory[trial.category].correct += 1;
    }
    const categoryBreakdown = Object.entries(byCategory).map(([category, data]) => ({
      category,
      total: data.total,
      correct: data.correct,
      accuracy: Math.round((data.correct / data.total) * 100),
    }));

    res.json({
      sessionId: req.params.sessionId,
      totalTrials,
      correctTrials,
      accuracy,
      avgResponseTimeMs,
      categoryBreakdown,
    });
  } catch (err) {
    console.error('[BehaviourTrials] GET /session/:sessionId error:', err);
    res.status(500).json({ error: 'Failed to fetch session summary', details: err.message });
  }
});

module.exports = router;