const mongoose = require('mongoose');

/**
 * BehaviourScenario
 * One "question" in the picture-choice game.
 * Each scenario contains exactly 2 images: one correct, one incorrect.
 * Images are stored as local asset paths (bundled in the app).
 */
const behaviourScenarioSchema = new mongoose.Schema(
  {
    // Short internal name, e.g. "eating_neat_vs_messy"
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // The question prompt shown/spoken to the child
    prompt: {
      en: { type: String, required: true }, // English
      si: { type: String, default: '' },    // Sinhala
    },

    // Thematic category — used for filtering and parent dashboard breakdown
    category: {
      type: String,
      enum: [
        'eating_habits',
        'hygiene',
        'sharing',
        'safety',
        'tidying_up',
        'greeting',
        'waiting_turns',
        'general',
      ],
      required: true,
    },

    // Difficulty level — drives adaptive selection
    // 1 = easiest (high contrast images), 3 = hardest (subtle difference)
    difficulty: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },

    // Recommended age group (in years)
    ageGroup: {
      min: { type: Number, default: 3 },
      max: { type: Number, default: 12 },
    },

    // Exactly 2 images — one correct, one incorrect
    images: {
      type: [
        {
          // Asset key matching the bundled image in the React Native app
          // e.g. "eating_neat" → app resolves to require('../assets/behaviour/eating_neat.png')
          assetKey: { type: String, required: true },
          // Human-readable label for the parent dashboard
          label: { type: String, required: true },
          // Whether tapping this image is the correct ("good behaviour") choice
          isCorrect: { type: Boolean, required: true },
        },
      ],
      validate: {
        validator: (arr) =>
          arr.length === 2 && arr.filter((i) => i.isCorrect).length === 1,
        message: 'A scenario must have exactly 2 images with exactly 1 correct answer.',
      },
    },

    // Soft-delete / A-B testing toggle
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for adaptive query: active scenarios of a given category + difficulty
behaviourScenarioSchema.index({ isActive: 1, category: 1, difficulty: 1 });

module.exports = mongoose.model('BehaviourScenario', behaviourScenarioSchema);