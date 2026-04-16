const express = require('express');
const router  = express.Router();
const { submitTrial, getTrialsForChild } = require('../controllers/trialController');

router.post('/',                    submitTrial);
router.get('/child/:childId',       getTrialsForChild);

module.exports = router;