const TrialLog      = require('../models/TrialLog');
const CognitiveState= require('../models/CognitiveState');
const Session       = require('../models/Session');
const { computeTrialScores, updateCognitiveState, getDifficultyParameters } = require('../services/adaptiveEngine');

/**
 * POST /api/trials
 * Called by the app after each single tracing attempt completes
 */
const submitTrial = async (req, res) => {
  try {
    const {
      childId, sessionId, trialNumber,
      shapeId, shapeCategory, difficultyLevel,
      metrics, touchPathSample, completed
    } = req.body;

    // 1. Compute trial scores from raw metrics
    const trialScores = computeTrialScores(metrics);

    // 2. Save the trial log to MongoDB
    const trial = await TrialLog.create({
      childId, sessionId, trialNumber,
      shapeId, shapeCategory, difficultyLevel,
      metrics: { ...metrics, accuracyScore: trialScores.accuracyScore },
      touchPathSample,
      rewardDisplayed: trialScores.accuracyScore >= 0.60,
      completed
    });

    // 3. Get current cognitive state for this child
    let cogState = await CognitiveState.findOne({ childId });

    // If first trial ever — create initial state and lock baseline
    if (!cogState) {
      cogState = await CognitiveState.create({
        childId,
        baselineMotor:     trialScores.motorRaw,
        baselineAttention: trialScores.attentionRaw,
        baselineVMI:       trialScores.vmiRaw,
        baselineLockedAt:  new Date()
      });
    }

    // 4. Update cognitive state with adaptive algorithm
    const updatedFields = updateCognitiveState(cogState, trialScores);

    // Save adaptation trigger to trial log
    await TrialLog.findByIdAndUpdate(trial._id, {
      adaptationTriggered: updatedFields.adaptationTriggered
    });

    // Update cognitive state in database
    await CognitiveState.findOneAndUpdate(
      { childId },
      { $set: updatedFields },
      { new: true }
    );

    // 5. Return next trial parameters to the app
    const nextParams = getDifficultyParameters(updatedFields.difficultyLevel);

    res.status(201).json({
      success: true,
      trialId: trial._id,
      accuracyScore: trialScores.accuracyScore,
      rewardTriggered: trialScores.accuracyScore >= 0.60,
      nextTrialParams: nextParams,
      currentDifficultyLevel: updatedFields.difficultyLevel,
      adaptationTriggered: updatedFields.adaptationTriggered
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/trials/child/:childId
 * For parent dashboard — get all trials for a child
 */
const getTrialsForChild = async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const trials = await TrialLog.find({ childId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-touchPathSample'); // exclude raw path data for dashboard (too heavy)

    const total = await TrialLog.countDocuments({ childId });

    res.json({ trials, total, limit, skip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { submitTrial, getTrialsForChild };