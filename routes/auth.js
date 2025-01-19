const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const db = new sqlite3.Database('./database.db');

// Middleware
const { checkRegistrationMode } = require('../middleware/auth');

/**
 * Helper function to check if this is the first user in the system
 * @returns {Promise<boolean>} True if no users exist in the database
 */
async function isFirstUser() {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            if (err) reject(err);
            resolve(row.count === 0);
        });
    });
}

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
            username: user.username,
            isAdmin: user.isAdmin === 1
        };

        res.redirect('/'); // Redirect to home page
    });
});

// Registration route
router.post('/register', checkRegistrationMode, async (req, res) => {
    const { inviteCode, username, password } = req.body;
    const globals = JSON.parse(fs.readFileSync('global-variables.json', 'utf8'));

    try {
        // Check if this will be the first user
        const firstUser = await isFirstUser();

        // Invite code validation
        if (globals.inviteMode) {
            const query = 'SELECT * FROM invites WHERE code = ? AND used = 0';
            db.get(query, [inviteCode], (err, invite) => {
                if (err) return res.status(500).send('Database error');
                if (!invite) return res.status(400).send('Invalid or used invite code');

                // Mark invite as used
                db.run('UPDATE invites SET used = 1 WHERE code = ?', [inviteCode], () => {
                    registerUser(firstUser);
                });
            });
        } else {
            registerUser(firstUser);
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send('An error occurred during registration');
    }

    async function registerUser(isFirstUser) {
        // Hash password upon registering
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user with admin status if first user
        db.run(
            'INSERT INTO users (username, password, isAdmin, pfp, theme, biography) VALUES (?, ?, ?, ?, ?, ?)',
            [username.trim(), hashedPassword, isFirstUser ? 1 : 0, 'https://firebasestorage.googleapis.com/v0/b/hydraulisc.appspot.com/o/defaultpfp.png?alt=media&token=6f61981c-9f14-48a3-b32d-a3edf506ec95&format=webp', 'default', 'User has not written their Bio.'],
            function (err) {
                if (err) {
                    return res.status(500).send('Error registering user.');
                }

                // Get the new user with their admin status
                db.get(
                    'SELECT id, username, isAdmin FROM users WHERE id = ?',
                    [this.lastID],
                    (err, newUser) => {
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
                            res.redirect('/'); // Redirect to home page
                        });
                    }
                );
            }
        );
    }
});

// Log out route ?
router.post('/logout', async (req, res) => {
    if(!req.session.user) {
        return res.status(401).send('Not authenticated')
    } else {
        // Successful logout attempt: clear session
        req.session.user = {
            id: null,
            username: null,
            isAdmin: null
        };
    }
})

/**
 * Middleware to check if the user is an admin
 */
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).send('Not authenticated');
    }

    if (!req.session.user.isAdmin) {
        return res.status(403).send('Forbidden - Admin access required');
    }

    next();
}

// Admin endpoint to generate invite codes
router.post('/admin/generate-invite', requireAdmin, (req, res) => {
    const { count } = req.body;

    if (!count || isNaN(count)) {
        return res.status(400).send('Please provide a valid count.');
    }

    const codes = [];
    const insertQuery = 'INSERT INTO invites (code) VALUES (?)';

    db.serialize(() => {
        const stmt = db.prepare(insertQuery);
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(16).toString('hex');
            codes.push(code);
            stmt.run(code);
        }
        stmt.finalize();

        res.json({ codes });
    });
});

module.exports = router;