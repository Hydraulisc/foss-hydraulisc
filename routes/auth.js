const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto');
const globals = JSON.parse(fs.readFileSync('global-variables.json', 'utf8'));
const { sanitizeText } = require('../middleware/forceTextDirections');

const router = express.Router();
const db = new sqlite3.Database('./database.db');

// Middleware
const { checkRegistrationMode, requireAdmin } = require('../middleware/auth');
function sanitizeUsername(text) {
    const cleansedHTML = text.replace(/[<>"&]/g, function (match) {
      return {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '&': '&amp;',
      }[match];
    });
    return sanitizeText(cleansedHTML);
}
async function assignDiscriminator(username) {
    return new Promise((resolve, reject) => {
        // Fetch existing discriminators for the given username
        db.all(
            `SELECT discriminator FROM users WHERE username = ?`,
            [username],
            (err, rows) => {
                if (err) return reject(err);

                // Convert rows to a Set of existing discriminators
                const discriminators = new Set(rows.map(row => row.discriminator));

                // Loop through all possible four-digit discriminators
                for (let i = 1; i <= 9999; i++) {
                    const discriminator = i.toString().padStart(4, '0'); // Ensure four digits
                    if (!discriminators.has(discriminator)) {
                        return resolve(discriminator); // Return the first available discriminator
                    }
                }

                // If no discriminator is found
                reject(new Error('No available discriminator found.'));
            }
        );
    });
}


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
    const fullUsername = username;
    // Split "Ami#0001" into username & discriminator
    const match = fullUsername.match(/^(.+)#(\d{4})$/);
    if (!match) {
        return res.status(400).send('Invalid username format. Use Username#0001.');
    }

    const sanitizeUsername = sanitizeText(match[1]);
    const discriminator = match[2];

    if (!sanitizeUsername || !password) {
        return res.status(400).send('Username and password are required.');
    }

    db.get(
        'SELECT * FROM users WHERE username = ? AND discriminator = ?',
        [sanitizeUsername, discriminator],
        async (err, user) => {
            if (err) return res.status(500).send('Database error');
            if (!user) return res.status(401).send('User not found.');

            // Check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).send('Invalid password.');

            // Successful login
            req.session.user = {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                isAdmin: user.isAdmin === 1
            };

            res.redirect('/'); // Redirect to home page
        }
    );
});

// Registration route
router.post('/register/:inviteCode?', checkRegistrationMode, async (req, res) => {
    const inviteCode = req.params.inviteCode || req.body.inviteCode; // Prioritize URL param
    const { username, password } = req.body;
    const globals = JSON.parse(fs.readFileSync('global-variables.json', 'utf8'));
    const sanitizedUsername = sanitizeUsername(username);
    if (!sanitizedUsername || sanitizedUsername.trim() === '') {
        return res.status(400).json({ "89": "Method not Allowed" });
    }

    try {
        // Check if this will be the first user
        const firstUser = await isFirstUser();

        // Invite code validation
        if (globals.inviteMode) {
            if (!inviteCode) return res.status(400).send('Invite code is required');

            const query = 'SELECT * FROM invites WHERE code = ? AND used = 0';
            const invite = await new Promise((resolve, reject) => {
                db.get(query, [inviteCode], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!invite) return res.status(400).send('Invalid or used invite code');

            // Mark invite as used
            await new Promise((resolve, reject) => {
                db.run('UPDATE invites SET used = 1 WHERE code = ?', [inviteCode], function (err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Proceed to register user
        await registerUser(firstUser);
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).send('An error occurred during registration');
    }

    async function registerUser(isFirstUser) {
        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Assign a unique discriminator
            const discriminator = await assignDiscriminator(sanitizedUsername.trim());

            // Insert user with admin status if first user
            db.run(
                'INSERT INTO users (username, password, pfp, theme, biography, isAdmin, indexable, discriminator, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    sanitizedUsername.trim(),
                    hashedPassword,
                    '/img/defaultpfp.png',
                    'default',
                    'User has not written their Bio.',
                    isFirstUser ? 1 : 0,
                    1,
                    discriminator,
                    'english'
                ],
                function (err) {
                    if (err) return res.status(500).send(`Error registering user, ${err}`);

                    // Fetch the new user data
                    db.get(
                        'SELECT id, username, isAdmin FROM users WHERE id = ?',
                        [this.lastID],
                        (err, newUser) => {
                            if (err) return res.redirect('/login');

                            // Set session
                            req.session.user = {
                                id: newUser.id,
                                username: newUser.username,
                                isAdmin: newUser.isAdmin === 1,
                                language: newUser.language,
                            };
                            req.session.save((err) => {
                                if (err) {
                                    console.error('Session save error:', err);
                                    return res.redirect('/login');
                                }
                                res.redirect('/newlyregistered'); // Redirect to home page
                            });
                        }
                    );
                }
            );
        } catch (error) {
            console.error('Discriminator assignment error:', error);
            return res.status(500).send('Error assigning a unique discriminator.');
        }
    }
});

// Log out route
router.post('/logout', async (req, res) => {
    if(!req.session.user) {
        return res.status(401).send('Not authenticated')
    } else {
        // Successful logout attempt: clear session
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                logError('Error during logout', err);
                return res.status(500).send('Error logging out');
            }

            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    }
})

// Admin endpoint to generate invite codes
router.post('/admin/generate-invite', requireAdmin, (req, res) => {
    const { count } = req.body;

    if (!count || isNaN(count)) {
        return res.status(400).send('Please provide a valid count.');
    }

    const codes = [];
    var prettyLinks = [];
    const insertQuery = 'INSERT INTO invites (code) VALUES (?)';

    db.serialize(() => {
        const stmt = db.prepare(insertQuery);
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(16).toString('hex');
            codes.push(code);
            prettyLinks.push(`${globals.protocol}://${globals.siteDomain}/register/${code}`);
            stmt.run(code);
        }
        stmt.finalize();

        res.json({ codes: codes, directLinks: prettyLinks });
    });
});

module.exports = router;