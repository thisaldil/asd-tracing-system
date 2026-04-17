const Session = require('../models/Session');
const TrialLog = require('../models/TrialLog');
const CognitiveState = require('../models/CognitiveState');

exports.getDashboard = async (req, res) => {
  try {
    const { childId } = req.params;

    const totalSessions = await Session.countDocuments({ childId });
    const totalTrials = await TrialLog.countDocuments({ childId });

    const trials = await TrialLog.find({ childId })
      .sort({ timestamp: -1 });

    const avgAccuracy =
      trials.length > 0
        ? (
            trials.reduce(
              (sum, t) => sum + (t.metrics.accuracyScore || 0),
              0
            ) / trials.length
          ).toFixed(3)
        : 0;

    const recentAccuracy = trials
      .slice(0, 7)
      .reverse()
      .map(t => t.metrics.accuracyScore);

    const latestSession = await Session.findOne({ childId })
      .sort({ startTime: -1 });

    const cognitive = await CognitiveState.findOne({ childId });

    res.json({
      totalSessions,
      totalTrials,
      avgAccuracy,
      recentAccuracy,
      latestSession,
      cognitive
    });
  } catch (error) {
    res.status(500).json({
      message: 'Dashboard load failed',
      error: error.message
    });
  }
};