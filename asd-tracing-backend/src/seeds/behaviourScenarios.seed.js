/**
 * behaviourScenarios.seed.js
 *
 * Run once to populate your BehaviourScenario collection with starter data.
 *
 * Usage:
 *   node behaviourScenarios.seed.js
 *
 * Requires MONGO_URI in your .env file.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BehaviourScenario = require('../models/BehaviourScenario');

// Support multiple ways to supply the Mongo URI:
// 1) Put MONGO_URI in .env (default),
// 2) Use environment variables MONGODB_URI or MONGO_URI, or
// 3) Pass the URI as the first CLI argument: `node behaviourScenarios.seed.js "mongodb://..."`
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.argv[2];

if (!MONGO_URI) {
  console.error('\n❌ Missing MongoDB URI. Provide it via one of:\n' +
    '  • .env file: MONGO_URI=your_uri\n' +
    '  • env var: MONGODB_URI or MONGO_URI\n' +
    '  • CLI arg: node src/seeds/behaviourScenarios.seed.js "your_uri"\n');
  process.exit(1);
}

// ─── Seed data ────────────────────────────────────────────────────────────────
// assetKey maps to: require(`../assets/behaviour/${assetKey}.png`) in the RN app
// Images to create: place PNGs in /assets/behaviour/ in your React Native project

const scenarios = [

  // ── EATING HABITS ──────────────────────────────────────────────────────────
  {
    name: 'eating_utensil_vs_hands',
    prompt: {
      en: 'Which one shows good eating?',
      si: 'හොඳ ආහාර ගැනීම කුමක්ද?',
    },
    category: 'eating_habits',
    difficulty: 1,
    ageGroup: { min: 3, max: 10 },
    images: [
      { assetKey: 'eating_spoon_neat', label: 'Eating with spoon', isCorrect: true },
      { assetKey: 'eating_hands_messy', label: 'Eating with hands messily', isCorrect: false },
    ],
  },
  {
    name: 'eating_sitting_vs_walking',
    prompt: {
      en: 'Where should we eat our food?',
      si: 'කෑම කෑමට හොඳ තැන කුමක්ද?',
    },
    category: 'eating_habits',
    difficulty: 2,
    ageGroup: { min: 4, max: 12 },
    images: [
      { assetKey: 'eating_sitting_table', label: 'Sitting at table to eat', isCorrect: true },
      { assetKey: 'eating_walking_around', label: 'Walking while eating', isCorrect: false },
    ],
  },

  // ── HYGIENE ────────────────────────────────────────────────────────────────
  {
    name: 'handwash_vs_dirty_hands',
    prompt: {
      en: 'What do we do before eating?',
      si: 'කෑමට පෙර අපි කුමක් කරමු?',
    },
    category: 'hygiene',
    difficulty: 1,
    ageGroup: { min: 3, max: 10 },
    images: [
      { assetKey: 'hands_washing_soap', label: 'Washing hands with soap', isCorrect: true },
      { assetKey: 'hands_dirty_reaching', label: 'Reaching for food with dirty hands', isCorrect: false },
    ],
  },
  {
    name: 'brushing_teeth_vs_skipping',
    prompt: {
      en: 'Which one keeps teeth healthy?',
      si: 'දත් සෞඛ්‍ය සම්පන්නව තබා ගන්නේ කෙසේද?',
    },
    category: 'hygiene',
    difficulty: 2,
    ageGroup: { min: 4, max: 12 },
    images: [
      { assetKey: 'brushing_teeth_morning', label: 'Brushing teeth', isCorrect: true },
      { assetKey: 'skipping_teeth_candy', label: 'Eating candy without brushing', isCorrect: false },
    ],
  },

  // ── SHARING ────────────────────────────────────────────────────────────────
  {
    name: 'sharing_toy_vs_grabbing',
    prompt: {
      en: 'Which child is being kind?',
      si: 'කුමන දරුවා කාරුණික ද?',
    },
    category: 'sharing',
    difficulty: 1,
    ageGroup: { min: 3, max: 10 },
    images: [
      { assetKey: 'sharing_toy_smiling', label: 'Sharing a toy with a smile', isCorrect: true },
      { assetKey: 'grabbing_toy_crying', label: 'Grabbing toy, other child crying', isCorrect: false },
    ],
  },
  {
    name: 'sharing_snack_vs_hiding',
    prompt: {
      en: 'What is the good thing to do with snacks?',
      si: 'කෙටි ආහාර සමඟ හොඳ දෙය කුමක්ද?',
    },
    category: 'sharing',
    difficulty: 2,
    ageGroup: { min: 4, max: 12 },
    images: [
      { assetKey: 'sharing_snack_friends', label: 'Sharing snack with friends', isCorrect: true },
      { assetKey: 'hiding_snack_alone', label: 'Hiding snack behind back', isCorrect: false },
    ],
  },

  // ── SAFETY ─────────────────────────────────────────────────────────────────
  {
    name: 'road_crossing_zebra_vs_random',
    prompt: {
      en: 'Where is the safe place to cross the road?',
      si: 'පාර හරහා යාමට ආරක්ෂිත තැන කුමක්ද?',
    },
    category: 'safety',
    difficulty: 1,
    ageGroup: { min: 4, max: 12 },
    images: [
      { assetKey: 'crossing_zebra_lines', label: 'Crossing at zebra lines', isCorrect: true },
      { assetKey: 'crossing_random_spot', label: 'Crossing in the middle of road', isCorrect: false },
    ],
  },
  {
    name: 'stranger_danger_vs_talking',
    prompt: {
      en: 'What should you do if a stranger offers you sweets?',
      si: 'අමුතු කෙනෙකු රසකැවිලි දෙන්නට හදන්නේ නම් කුමක් කළ යුතු ද?',
    },
    category: 'safety',
    difficulty: 3,
    ageGroup: { min: 5, max: 12 },
    images: [
      { assetKey: 'safety_walk_away_adult', label: 'Walking away to find a known adult', isCorrect: true },
      { assetKey: 'safety_taking_sweets', label: 'Taking sweets from stranger', isCorrect: false },
    ],
  },

  // ── TIDYING UP ─────────────────────────────────────────────────────────────
  {
    name: 'toys_packed_vs_scattered',
    prompt: {
      en: 'What should we do with toys after playing?',
      si: 'සෙල්ලම් කිරීමෙන් පසු සෙල්ලම් බඩු සමඟ කුමක් කළ යුතු ද?',
    },
    category: 'tidying_up',
    difficulty: 1,
    ageGroup: { min: 3, max: 10 },
    images: [
      { assetKey: 'toys_packed_box', label: 'Packing toys into box', isCorrect: true },
      { assetKey: 'toys_scattered_floor', label: 'Leaving toys all over floor', isCorrect: false },
    ],
  },

  // ── GREETING ───────────────────────────────────────────────────────────────
  {
    name: 'greeting_wave_vs_ignore',
    prompt: {
      en: 'What do we do when we see someone we know?',
      si: 'හඳුනන කෙනෙකු දුටු විට අපි කුමක් කරමු?',
    },
    category: 'greeting',
    difficulty: 1,
    ageGroup: { min: 3, max: 10 },
    images: [
      { assetKey: 'greeting_wave_smile', label: 'Waving and smiling', isCorrect: true },
      { assetKey: 'greeting_turning_away', label: 'Turning away and ignoring', isCorrect: false },
    ],
  },

  // ── WAITING TURNS ──────────────────────────────────────────────────────────
  {
    name: 'queue_waiting_vs_pushing',
    prompt: {
      en: 'How do we wait for our turn?',
      si: 'අපේ වාරය බලා සිටින්නේ කෙසේද?',
    },
    category: 'waiting_turns',
    difficulty: 1,
    ageGroup: { min: 3, max: 10 },
    images: [
      { assetKey: 'queue_standing_calm', label: 'Standing calmly in line', isCorrect: true },
      { assetKey: 'queue_pushing_front', label: 'Pushing to the front', isCorrect: false },
    ],
  },
  {
    name: 'game_waiting_turn_vs_snatching',
    prompt: {
      en: 'Whose turn is it to play?',
      si: 'සෙල්ලම් කිරීමට කාගේ වාරය ද?',
    },
    category: 'waiting_turns',
    difficulty: 2,
    ageGroup: { min: 4, max: 12 },
    images: [
      { assetKey: 'game_waiting_patiently', label: 'Waiting patiently for turn', isCorrect: true },
      { assetKey: 'game_snatching_controller', label: 'Snatching the game away', isCorrect: false },
    ],
  },
];

// ─── Run seed ─────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const data of scenarios) {
      const exists = await BehaviourScenario.findOne({ name: data.name });
      if (exists) {
        console.log(`⏭  Skipped (already exists): ${data.name}`);
        skipped++;
      } else {
        await BehaviourScenario.create(data);
        console.log(`✅ Created: ${data.name}`);
        created++;
      }
    }

    console.log(`\n🌱 Seed complete — ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();