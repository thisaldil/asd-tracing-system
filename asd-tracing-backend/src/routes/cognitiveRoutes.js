const express = require('express');
const router  = express.Router();
const { getCognitiveState, getProgressTrend } = require('../controllers/cognitiveController');

router.get('/:childId',        getCognitiveState);
router.get('/:childId/trend',  getProgressTrend);

module.exports = router;