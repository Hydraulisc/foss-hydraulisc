const express = require('express');
const router = express.Router();
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const db = new sqlite3.Database('./database.db');

// Middleware
const { checkRegistrationMode } = require('../middleware/auth');

// Registration route
router.post('/register', checkRegistrationMode, async (req, res) => {
    const { inviteCode, username, password } = req.body;
    const globals = JSON.parse(fs.readFileSync('global-variables.json', 'utf8'));

    // Invite code validation
    if (globals.inviteMode) {
        const query = 'SELECT * FROM invites WHERE code = ? AND used = 0';
        db.get(query, [inviteCode], (err, invite) => {
            if (err) return res.status(500).send('Database error');
            if (!invite) return res.status(400).send('Invalid or used invite code');

            // Mark invite as used
            db.run('UPDATE invites SET used = 1 WHERE code = ?', [inviteCode], () => {
                registerUser();
            });
        });
    } else {
        registerUser();
    }

    function registerUser() {
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) return res.status(500).send('Database error');
            res.send('Registration successful!');
        });
    }
});

// Admin endpoint to generate invite codes
router.post('/admin/generate-invite', (req, res) => {
    const { count } = req.body;
    const codes = [];

    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(6).toString('hex');
        codes.push(code);
        db.run('INSERT INTO invites (code) VALUES (?)', [code]);
    }

    res.json({ codes });
});

module.exports = router;
