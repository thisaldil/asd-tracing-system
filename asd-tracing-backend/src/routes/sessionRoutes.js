const express = require('express');
const router  = express.Router();
const Session = require('../models/Session');
const CognitiveState = require('../models/CognitiveState');

// Start a new session
router.post('/start', async (req, res) => {
  try {
    const session = await Session.create({ childId: req.body.childId, deviceInfo: req.body.deviceInfo });
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// End a session — save summary and cognitive snapshot
router.patch('/:sessionId/end', async (req, res) => {
  try {
    const state = await CognitiveState.findOne({ childId: req.body.childId });
    const session = await Session.findByIdAndUpdate(
      req.params.sessionId,
      {
        endTime: new Date(),
        ...req.body,
        cognitiveStateSnapshot: state ? {
          motorScore: state.motorScore,
          attentionScore: state.attentionScore,
          vmiScore: state.vmiScore,
          compositeScore: state.compositeScore,
          difficultyLevel: state.difficultyLevel
        } : null
      },
      { new: true }
    );
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;