const express = require('express');

const router = express.Router();

// privacy policy
router.get('/privacy', (req, res) => {
    res.render('legal/privacy');
});

// terms of use
router.get('/terms', (req, res) => {
    res.render('legal/terms');
});

// guidelines
router.get('/guidelines', (req, res) => {
    res.render('legal/guidelines');
});

module.exports = router;
