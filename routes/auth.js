const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const db = new sqlite3.Database('./database.db');

// Middleware
const { checkRegistrationMode } = require('../middleware/auth');

// Handle login form submission
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).send('Database error');
        }

        if (!user) {
            return res.status(401).send('User not found.');
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send('Invalid password.');
        }

        // Successful login: create a session
        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.send(`Registration successful! Welcome back ${user.username}  (${user.id})`);//res.redirect('/'); // Redirect to home page
    });
});

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

    async function registerUser() {
        // Hash password upon registering
        const hashedPassword = await bcrypt.hash(password, 10);
        // Insert data to DB
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
            if (err) {
                return res.status(500).send('Error registering user.');
            }
            
            // Get the new user - include isAdmin in the SELECT
            db.get('SELECT id, username, isAdmin FROM users WHERE username = ?', [username], (err, newUser) => {
                if (err) {
                    return res.redirect('/login');
                }

                // Set session
                req.session.user = {
                    id: newUser.id,
                    username: newUser.username,
                    isAdmin: newUser.isAdmin === 1
                };
                // Save session
                req.session.save((err) => {
                    if (err) {
                        logError('Session save error', err);
                        return res.redirect('/login');
                    }
                    res.send(`Registration successful! Welcome ${newUser.username} (${newUser.id})`);//res.redirect(`/${username}`);
                });
            });
        });
    }
});

// Admin endpoint to generate invite codes
router.post('/admin/generate-invite', (req, res) => {
    const { count } = req.body;

    if (!count || isNaN(count)) {
        return res.status(400).send('Please provide a valid count.');
    }

    const codes = [];
    const insertQuery = 'INSERT INTO invites (code) VALUES (?)';

    db.serialize(() => {
        const stmt = db.prepare(insertQuery);
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(6).toString('hex');
            codes.push(code);
            stmt.run(code);
        }
        stmt.finalize();

        res.json({ codes });
    });
});

module.exports = router;
