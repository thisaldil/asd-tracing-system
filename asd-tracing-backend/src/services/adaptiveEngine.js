// Exponential Moving Average weight
// 0.3 = 30% new trial, 70% history — prevents single trial from swinging score wildly
const EMA_ALPHA = 0.3;

/**
 * Computes per-trial scores from raw touch metrics
 * Input: raw metrics object from the device
 * Output: normalized scores 0.0 – 1.0
 */
function computeTrialScores(metrics) {
  const {
    pathDeviation,    // avg px deviation from ideal path
    hesitationCount,  // pauses > 800ms
    startAccuracy,    // 0–1
    endAccuracy,      // 0–1
    velocityVariance  // lower = smoother
  } = metrics;

  // Motor score: path deviation normalised (100px = completely off path = 0)
  const motorRaw = Math.max(0, 1 - (pathDeviation / 80));

  // Attention score: hesitation count normalised (5+ pauses = 0)
  const attentionRaw = Math.max(0, 1 - (hesitationCount / 5));

  // Visual-motor integration: average of start and end point accuracy
  const vmiRaw = (startAccuracy + endAccuracy) / 2;

  // Smoothness bonus: reduces velocity variance penalty
  const smoothnessBonus = Math.max(0, 1 - velocityVariance);

  // Composite accuracy for this single trial
  const accuracyScore = (
    motorRaw    * 0.40 +
    attentionRaw* 0.25 +
    vmiRaw      * 0.25 +
    smoothnessBonus * 0.10
  );

  return {
    motorRaw:     parseFloat(motorRaw.toFixed(4)),
    attentionRaw: parseFloat(attentionRaw.toFixed(4)),
    vmiRaw:       parseFloat(vmiRaw.toFixed(4)),
    accuracyScore:parseFloat(accuracyScore.toFixed(4))
  };
}

/**
 * Updates the cognitive state using EMA after each trial
 * This is the core adaptive algorithm
 */
function updateCognitiveState(currentState, trialScores) {
  const { motorRaw, attentionRaw, vmiRaw, accuracyScore } = trialScores;

  // EMA update: smooth new score into running average
  const newMotor   = EMA_ALPHA * motorRaw    + (1 - EMA_ALPHA) * currentState.motorScore;
  const newAttn    = EMA_ALPHA * attentionRaw + (1 - EMA_ALPHA) * currentState.attentionScore;
  const newVMI     = EMA_ALPHA * vmiRaw       + (1 - EMA_ALPHA) * currentState.vmiScore;

  // Composite score with research-justified weights
  const composite = newMotor * 0.50 + newAttn * 0.30 + newVMI * 0.20;

  // Staircase difficulty adjustment
  let newDifficulty   = currentState.difficultyLevel;
  let consecutiveCorrect = currentState.consecutiveCorrect;
  let consecutiveErrors  = currentState.consecutiveErrors;
  let adaptationTriggered = 'none';

  if (accuracyScore >= 0.85) {
    // Success
    consecutiveCorrect += 1;
    consecutiveErrors   = 0;
    // Promote after 3 consecutive correct (prevents lucky streak promotion)
    if (consecutiveCorrect >= 3) {
      newDifficulty = Math.min(5, newDifficulty + 1);
      consecutiveCorrect = 0;
      adaptationTriggered = 'difficulty_up';
    }
  } else if (accuracyScore < 0.50) {
    // Struggling — immediate demotion (errorless learning principle)
    consecutiveErrors  += 1;
    consecutiveCorrect  = 0;
    if (consecutiveErrors >= 2) {
      newDifficulty = Math.max(1, newDifficulty - 1);
      consecutiveErrors = 0;
      adaptationTriggered = 'difficulty_down';
    } else {
      adaptationTriggered = 'guidance_added';
    }
  } else {
    // In the middle — maintain
    consecutiveCorrect = 0;
    consecutiveErrors  = 0;
  }

  return {
    motorScore:          parseFloat(newMotor.toFixed(4)),
    attentionScore:      parseFloat(newAttn.toFixed(4)),
    vmiScore:            parseFloat(newVMI.toFixed(4)),
    compositeScore:      parseFloat(composite.toFixed(4)),
    difficultyLevel:     newDifficulty,
    consecutiveCorrect,
    consecutiveErrors,
    totalTrialsCompleted: currentState.totalTrialsCompleted + 1,
    adaptationTriggered,
    lastUpdated: new Date()
  };
}

/**
 * Gets shape parameters for a given difficulty level
 * This is what the app uses to render the next shape
 */
function getDifficultyParameters(level) {
  const params = {
    1: { shapeSize: 300, dotSpacing: 'wide',  guidance: 'full',    timerEnabled: false, pathComplexity: 'simple'  },
    2: { shapeSize: 240, dotSpacing: 'medium', guidance: 'voice',   timerEnabled: false, pathComplexity: 'medium'  },
    3: { shapeSize: 180, dotSpacing: 'close',  guidance: 'subtle',  timerEnabled: true,  pathComplexity: 'medium'  },
    4: { shapeSize: 130, dotSpacing: 'tight',  guidance: 'none',    timerEnabled: true,  pathComplexity: 'complex' },
    5: { shapeSize: 110, dotSpacing: 'tight',  guidance: 'none',    timerEnabled: true,  pathComplexity: 'complex' },
  };
  return params[level] || params[1];
}

module.exports = { computeTrialScores, updateCognitiveState, getDifficultyParameters };