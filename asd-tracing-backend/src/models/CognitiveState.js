const mongoose = require('mongoose');

const cognitiveStateSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChildProfile',
    required: true,
    unique: true // One cognitive state document per child
  },

  // Live scores — updated after every trial using EMA
  motorScore:     { type: Number, default: 0.3, min: 0, max: 1 },
  attentionScore: { type: Number, default: 0.3, min: 0, max: 1 },
  vmiScore:       { type: Number, default: 0.3, min: 0, max: 1 },
  compositeScore: { type: Number, default: 0.3, min: 0, max: 1 },

  // Current difficulty level for next trial (staircase algorithm)
  difficultyLevel: { type: Number, default: 1, min: 1, max: 5 },

  // Baseline scores — locked at onboarding, never updated
  // These are your research pre-test values
  baselineMotor:     { type: Number, default: null },
  baselineAttention: { type: Number, default: null },
  baselineVMI:       { type: Number, default: null },
  baselineLockedAt:  { type: Date, default: null },

  totalTrialsCompleted: { type: Number, default: 0 },
  consecutiveCorrect:   { type: Number, default: 0 }, // for staircase logic
  consecutiveErrors:    { type: Number, default: 0 },

  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CognitiveState', cognitiveStateSchema);