const express = require('express');
const router = express.Router();
const BehaviourScenario = require('../models/BehaviourScenario');
const BehaviourTrial = require('../models/BehaviourTrial');
const { protect } = require('../middleware/authMiddleware'); // reuse your existing auth middleware

// ─── Helper: Adaptive difficulty selection ───────────────────────────────────
/**
 * Looks at the child's last N trials and decides which difficulty to serve next.
 *
 * Rules:
 *   accuracy > 85% across last 5 trials  → bump difficulty up (max 3)
 *   accuracy < 60% across last 5 trials  → drop difficulty down (min 1)
 *   otherwise                            → keep current difficulty
 *
 * Returns: { targetDifficulty: 1|2|3, currentAccuracy: number }
 */
async function getAdaptiveDifficulty(childId, currentDifficulty) {
  const WINDOW = 5; // look at last 5 trials

  const recentTrials = await BehaviourTrial.find({ childId })
    .sort({ createdAt: -1 })
    .limit(WINDOW)
    .select('isCorrect difficultyLevel')
    .lean();

  if (recentTrials.length < 3) {
    // Not enough data yet — stay at current difficulty
    return { targetDifficulty: currentDifficulty, currentAccuracy: null };
  }

  const correct = recentTrials.filter((t) => t.isCorrect).length;
  const accuracy = correct / recentTrials.length;

  let targetDifficulty = currentDifficulty;
  if (accuracy > 0.85) targetDifficulty = Math.min(3, currentDifficulty + 1);
  else if (accuracy < 0.6) targetDifficulty = Math.max(1, currentDifficulty - 1);

  return { targetDifficulty, currentAccuracy: Math.round(accuracy * 100) };
}

// ─── GET /api/behaviour/scenarios/next ───────────────────────────────────────
/**
 * Returns the next scenario for a child, adaptively chosen.
 *
 * Query params:
 *   childId       (required)
 *   difficulty    (optional, current difficulty 1-3, default 1)
 *   category      (optional, filter by category)
 *   excludeIds    (optional, comma-separated scenarioIds to avoid repeating in session)
 */
router.get('/next', protect, async (req, res) => {
  try {
    const { childId, difficulty = 1, category, excludeIds } = req.query;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const currentDifficulty = parseInt(difficulty, 10);
    const { targetDifficulty, currentAccuracy } = await getAdaptiveDifficulty(
      childId,
      currentDifficulty
    );

    // Build query
    const query = {
      isActive: true,
      difficulty: targetDifficulty,
    };

    if (category) query.category = category;

    // Exclude scenarios already shown this session
    if (excludeIds) {
      const excluded = excludeIds.split(',').filter(Boolean);
      if (excluded.length > 0) {
        query._id = { $nin: excluded };
      }
    }

    // Count matching scenarios
    const count = await BehaviourScenario.countDocuments(query);

    if (count === 0) {
      // Fallback: relax difficulty constraint if nothing available
      delete query.difficulty;
      const fallbackCount = await BehaviourScenario.countDocuments(query);
      if (fallbackCount === 0) {
        return res.status(404).json({ error: 'No scenarios available' });
      }
    }

    // Pick a random matching scenario
    const finalCount = await BehaviourScenario.countDocuments(query);
    const randomSkip = Math.floor(Math.random() * finalCount);
    const scenario = await BehaviourScenario.findOne(query).skip(randomSkip).lean();

    // Shuffle image order so correct answer isn't always on the same side
    const shuffledImages = [...scenario.images].sort(() => Math.random() - 0.5);

    res.json({
      scenario: { ...scenario, images: shuffledImages },
      adaptiveInfo: {
        servedDifficulty: scenario.difficulty,
        currentAccuracy,
        difficultyChanged: scenario.difficulty !== currentDifficulty,
      },
    });
  } catch (err) {
    console.error('[BehaviourScenarios] GET /next error:', err);
    res.status(500).json({ error: 'Failed to fetch scenario', details: err.message });
  }
});

// ─── GET /api/behaviour/scenarios ────────────────────────────────────────────
// List all scenarios (admin / seed check use)
router.get('/', protect, async (req, res) => {
  try {
    const { category, difficulty, isActive = 'true' } = req.query;
    const query = { isActive: isActive === 'true' };
    if (category) query.category = category;
    if (difficulty) query.difficulty = parseInt(difficulty, 10);

    const scenarios = await BehaviourScenario.find(query).sort({ category: 1, difficulty: 1 }).lean();
    res.json({ count: scenarios.length, scenarios });
  } catch (err) {
    console.error('[BehaviourScenarios] GET / error:', err);
    res.status(500).json({ error: 'Failed to list scenarios', details: err.message });
  }
});

// ─── POST /api/behaviour/scenarios ───────────────────────────────────────────
// Add a new scenario (admin use / future CMS)
router.post('/', protect, async (req, res) => {
  try {
    const scenario = await BehaviourScenario.create(req.body);
    res.status(201).json({ message: 'Scenario created', scenario });
  } catch (err) {
    console.error('[BehaviourScenarios] POST / error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.message });
    }
    res.status(500).json({ error: 'Failed to create scenario', details: err.message });
  }
});

// ─── PUT /api/behaviour/scenarios/:id ────────────────────────────────────────
// Update a scenario (admin use)
router.put('/:id', protect, async (req, res) => {
  try {
    const scenario = await BehaviourScenario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    res.json({ message: 'Scenario updated', scenario });
  } catch (err) {
    console.error('[BehaviourScenarios] PUT /:id error:', err);
    res.status(500).json({ error: 'Failed to update scenario', details: err.message });
  }
});

// ─── DELETE /api/behaviour/scenarios/:id (soft delete) ───────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const scenario = await BehaviourScenario.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    res.json({ message: 'Scenario deactivated', scenario });
  } catch (err) {
    console.error('[BehaviourScenarios] DELETE /:id error:', err);
    res.status(500).json({ error: 'Failed to deactivate scenario', details: err.message });
  }
});

module.exports = router;