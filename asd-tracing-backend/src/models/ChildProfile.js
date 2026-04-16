const mongoose = require('mongoose');

const childProfileSchema = new mongoose.Schema({
  parentId: {
    type: String, // Firebase Auth UID
    required: true,
    index: true
  },
  alias: {
    type: String,
    required: true,
    // Never store real names — ethics requirement
    // Parent sets alias like "My Child" or "StarFish"
  },
  age: {
    type: Number,
    required: true,
    min: 3,
    max: 18
  },
  asdSeverityLevel: {
    type: Number,
    enum: [1, 2, 3], // 1=mild, 2=moderate, 3=severe (DSM-5)
    required: true
  },
  verbalAbility: {
    type: String,
    enum: ['non-verbal', 'limited', 'verbal'],
    required: true
  },
  dominantHand: {
    type: String,
    enum: ['left', 'right', 'unknown'],
    default: 'unknown'
  },
  sensoryProfile: {
    soundSensitive:     { type: Boolean, default: false },
    lightSensitive:     { type: Boolean, default: false },
    preferredRewardType:{ type: String, enum: ['visual', 'audio', 'both'], default: 'visual' }
  },
  consentRecorded: {
    type: Boolean,
    required: true,
    default: false
    // Must be true before ANY data is saved — ethical requirement
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChildProfile', childProfileSchema);