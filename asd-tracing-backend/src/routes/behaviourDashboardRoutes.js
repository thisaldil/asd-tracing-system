const express = require('express');
const router = express.Router();
const BehaviourTrial = require('../models/BehaviourTrial');
const { requireAuth } = require('../middleware/auth');

// ─── GET /api/behaviour/dashboard/:childId ────────────────────────────────────
/**
 * Full dashboard summary for a child — used by the parent dashboard screen.
 *
 * Returns:
 *   - Overall accuracy (all time)
 *   - Accuracy trend over last 7 sessions (for line chart)
 *   - Per-category accuracy breakdown (for bar chart)
 *   - Average response time trend (attention proxy)
 *   - Hint usage rate (scaffolding dependency)
 *   - Current difficulty level reached
 */
router.get('/:childId', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;

    const allTrials = await BehaviourTrial.find({ childId })
      .sort({ createdAt: -1 })
      .lean();

    if (allTrials.length === 0) {
      return res.json({
        childId,
        message: 'No trials recorded yet',
        totalTrials: 0,
        overallAccuracy: null,
        currentDifficultyLevel: 1,
        categoryBreakdown: [],
        sessionTrend: [],
        avgResponseTimeTrend: [],
        hintUsageRate: null,
      });
    }

    const totalTrials = allTrials.length;
    const correctTrials = allTrials.filter((t) => t.isCorrect).length;
    const overallAccuracy = Math.round((correctTrials / totalTrials) * 100);

    // Current difficulty = difficulty of the most recent trial
    const currentDifficultyLevel = allTrials[0].difficultyLevel;

    // Hint usage rate
    const hintsShown = allTrials.filter((t) => t.hintShown).length;
    const hintUsageRate = Math.round((hintsShown / totalTrials) * 100);

    // ── Per-category accuracy breakdown ──────────────────────────────────────
    const categoryMap = {};
    for (const trial of allTrials) {
      if (!categoryMap[trial.category]) {
        categoryMap[trial.category] = { total: 0, correct: 0, totalResponseMs: 0 };
      }
      categoryMap[trial.category].total += 1;
      if (trial.isCorrect) categoryMap[trial.category].correct += 1;
      categoryMap[trial.category].totalResponseMs += trial.responseTimeMs;
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      total: data.total,
      correct: data.correct,
      accuracy: Math.round((data.correct / data.total) * 100),
      avgResponseTimeMs: Math.round(data.totalResponseMs / data.total),
    }));

    // ── Session-level trend (last 10 sessions) ────────────────────────────────
    // Group trials by sessionId preserving time order
    const sessionMap = new Map();
    for (const trial of [...allTrials].reverse()) { // oldest first
      const sid = trial.sessionId.toString();
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, { sessionId: sid, trials: [], date: trial.createdAt });
      }
      sessionMap.get(sid).trials.push(trial);
    }

    const sessionTrend = Array.from(sessionMap.values())
      .slice(-10) // last 10 sessions
      .map((session) => {
        const total = session.trials.length;
        const correct = session.trials.filter((t) => t.isCorrect).length;
        const avgMs = Math.round(
          session.trials.reduce((sum, t) => sum + t.responseTimeMs, 0) / total
        );
        return {
          sessionId: session.sessionId,
          date: session.date,
          totalTrials: total,
          accuracy: Math.round((correct / total) * 100),
          avgResponseTimeMs: avgMs,
        };
      });

    // ── Avg response time trend (last 20 trials) — attention proxy ────────────
    const avgResponseTimeTrend = allTrials
      .slice(0, 20)
      .reverse()
      .map((t, i) => ({
        trialIndex: i + 1,
        responseTimeMs: t.responseTimeMs,
        isCorrect: t.isCorrect,
        date: t.createdAt,
      }));

    res.json({
      childId,
      totalTrials,
      overallAccuracy,
      currentDifficultyLevel,
      hintUsageRate,
      categoryBreakdown,
      sessionTrend,
      avgResponseTimeTrend,
    });
  } catch (err) {
    console.error('[BehaviourDashboard] GET /:childId error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: err.message });
  }
});

// ─── GET /api/behaviour/dashboard/:childId/progress ──────────────────────────
/**
 * Lightweight progress check — used for quick parent home screen widget.
 * Returns only the headline numbers, no heavy aggregation.
 */
router.get('/:childId/progress', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;

    // Only fetch what we need — last 30 trials
    const recentTrials = await BehaviourTrial.find({ childId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('isCorrect difficultyLevel responseTimeMs hintShown createdAt')
      .lean();

    if (recentTrials.length === 0) {
      return res.json({ childId, hasData: false });
    }

    const correct = recentTrials.filter((t) => t.isCorrect).length;
    const recentAccuracy = Math.round((correct / recentTrials.length) * 100);
    const currentDifficulty = recentTrials[0].difficultyLevel;
    const avgResponseTimeMs = Math.round(
      recentTrials.reduce((sum, t) => sum + t.responseTimeMs, 0) / recentTrials.length
    );

    res.json({
      childId,
      hasData: true,
      recentAccuracy,        // % correct in last 30 trials
      currentDifficulty,     // 1 | 2 | 3
      avgResponseTimeMs,     // attention indicator
      trialsInWindow: recentTrials.length,
      lastActivityAt: recentTrials[0].createdAt,
    });
  } catch (err) {
    console.error('[BehaviourDashboard] GET /:childId/progress error:', err);
    res.status(500).json({ error: 'Failed to fetch progress', details: err.message });
  }
});

module.exports = router;