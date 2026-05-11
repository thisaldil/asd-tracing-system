const mongoose = require('mongoose');

/**
 * BehaviourTrial
 * Records a single answer in the picture-choice game.
 * One trial = child saw a scenario and tapped one image.
 */
const behaviourTrialSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },

    // Groups trials from one play session together for dashboard charts
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },

    scenarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BehaviourScenario',
      required: true,
    },

    // Which assetKey the child tapped
    selectedAssetKey: {
      type: String,
      required: true,
    },

    // Pre-computed from the scenario at save time for fast dashboard queries
    isCorrect: {
      type: Boolean,
      required: true,
    },

    // Milliseconds from images appearing → child tap
    responseTimeMs: {
      type: Number,
      required: true,
      min: 0,
    },

    // Difficulty level of the scenario at the time of the trial (snapshot)
    difficultyLevel: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
    },

    // Category snapshot (avoids joining scenario on every dashboard query)
    category: {
      type: String,
      required: true,
    },

    // Which attempt within this session (1st time seeing this scenario, 2nd, …)
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Whether the child needed the hint (gentle redirection was shown)
    hintShown: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for the most common query: "all trials for child X, newest first"
behaviourTrialSchema.index({ childId: 1, createdAt: -1 });

// For session-level aggregation
behaviourTrialSchema.index({ sessionId: 1 });

module.exports = mongoose.model('BehaviourTrial', behaviourTrialSchema);