const mongoose = require('mongoose');

// Each touch point recorded during tracing
const touchPointSchema = new mongoose.Schema({
  t: Number,  // timestamp in ms from trial start
  x: Number,  // x coordinate in pixels
  y: Number   // y coordinate in pixels
}, { _id: false });

const trialLogSchema = new mongoose.Schema({
  childId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ChildProfile', required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  trialNumber: { type: Number, required: true }, // trial number within session

  // What shape was shown
  shapeId:       { type: String, required: true }, // e.g. "elephant_cloud_01"
  shapeCategory: { type: String, enum: ['animal', 'fruit', 'plant', 'geometric'] },

  difficultyLevel: { type: Number, min: 1, max: 5 }, // difficulty AT START of trial

  // All the measurements — this is your raw research data
  metrics: {
    pathDeviation:    Number, // avg px distance from ideal path
    maxDeviation:     Number, // worst single point
    completionTimeMs: Number, // total time to complete
    hesitationCount:  Number, // pauses > 800ms
    liftCount:        Number, // finger lifted mid-trace
    startAccuracy:    Number, // 0–1, how close to green start dot
    endAccuracy:      Number, // 0–1, how close to red end dot
    velocityVariance: Number, // smoothness — lower is smoother
    accuracyScore:    Number  // composite 0–1 for this trial
  },

  // Sampled touch path (every 5th point at 60Hz = 12 points/sec)
  // This is the raw motor data for research analysis
  touchPathSample: [touchPointSchema],

  // What the adaptive engine did after this trial
  adaptationTriggered: {
    type: String,
    enum: ['none', 'enlarged', 'guidance_added', 'difficulty_up', 'difficulty_down'],
    default: 'none'
  },

  rewardDisplayed: { type: Boolean, default: false },
  completed:       { type: Boolean, default: false }, // false = abandoned

  timestamp: { type: Date, default: Date.now }
});

// Index for fast queries: "get all trials for child X in date range"
trialLogSchema.index({ childId: 1, timestamp: -1 });

module.exports = mongoose.model('TrialLog', trialLogSchema);