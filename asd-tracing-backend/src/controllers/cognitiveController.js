const CognitiveState = require('../models/CognitiveState');
const TrialLog       = require('../models/TrialLog');

/**
 * GET /api/cognitive/:childId
 * Returns the current cognitive state + improvement vs baseline
 */
const getCognitiveState = async (req, res) => {
  try {
    const state = await CognitiveState.findOne({ childId: req.params.childId });
    if (!state) return res.status(404).json({ error: 'No cognitive data found for this child' });

    // Calculate improvement vs baseline (for parent dashboard)
    const improvement = {
      motor:     state.baselineMotor     ? ((state.motorScore     - state.baselineMotor)     / state.baselineMotor     * 100).toFixed(1) : null,
      attention: state.baselineAttention ? ((state.attentionScore - state.baselineAttention) / state.baselineAttention * 100).toFixed(1) : null,
      vmi:       state.baselineVMI       ? ((state.vmiScore       - state.baselineVMI)       / state.baselineVMI       * 100).toFixed(1) : null,
    };

    res.json({ state, improvementPercent: improvement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/cognitive/:childId/trend
 * Returns weekly accuracy trend for charting in parent dashboard
 */
const getProgressTrend = async (req, res) => {
  try {
    const { childId } = req.params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const trials = await TrialLog.find({
      childId,
      timestamp: { $gte: thirtyDaysAgo },
      completed: true
    }).select('metrics.accuracyScore timestamp difficultyLevel').sort({ timestamp: 1 });

    // Group by day for charting
    const byDay = {};
    trials.forEach(trial => {
      const day = trial.timestamp.toISOString().split('T')[0]; // "2025-04-10"
      if (!byDay[day]) byDay[day] = { scores: [], difficulties: [] };
      byDay[day].scores.push(trial.metrics.accuracyScore);
      byDay[day].difficulties.push(trial.difficultyLevel);
    });

    const trend = Object.entries(byDay).map(([date, data]) => ({
      date,
      avgAccuracy:   parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(3)),
      avgDifficulty: parseFloat((data.difficulties.reduce((a, b) => a + b, 0) / data.difficulties.length).toFixed(1)),
      trialCount:    data.scores.length
    }));

    res.json({ trend, totalDays: trend.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getCognitiveState, getProgressTrend };