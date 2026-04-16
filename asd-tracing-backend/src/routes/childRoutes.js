const express  = require('express');
const router   = express.Router();
const ChildProfile = require('../models/ChildProfile');
const CognitiveState = require('../models/CognitiveState');

// Create child profile
router.post('/', async (req, res) => {
  try {
    const child = await ChildProfile.create(req.body);
    // Immediately create empty cognitive state for this child
    await CognitiveState.create({ childId: child._id });
    res.status(201).json(child);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all children for a parent
router.get('/parent/:parentId', async (req, res) => {
  try {
    const children = await ChildProfile.find({ parentId: req.params.parentId });
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;