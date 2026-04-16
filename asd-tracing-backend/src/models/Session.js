const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  childId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChildProfile', required: true, index: true },

  startTime: { type: Date, default: Date.now },
  endTime:   { type: Date, default: null },

  totalTrials:     { type: Number, default: 0 },
  completedTrials: { type: Number, default: 0 },
  abandonedTrials: { type: Number, default: 0 },
  avgAccuracyScore:{ type: Number, default: 0 },

  // Snapshot of cognitive state at end of session — for longitudinal research
  cognitiveStateSnapshot: {
    motorScore:      Number,
    attentionScore:  Number,
    vmiScore:        Number,
    compositeScore:  Number,
    difficultyLevel: Number
  },

  // Array showing difficulty level of each trial — shows learning curve
  difficultyProgression: [Number],

  deviceInfo: {
    platform:     String,
    screenWidth:  Number,
    screenHeight: Number,
    appVersion:   String
  },

  offlineSynced: { type: Boolean, default: false },
  syncedAt:      { type: Date, default: null }
});

module.exports = mongoose.model('Session', sessionSchema);