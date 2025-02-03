const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { version } = require('./package.json');
const { sanitizeText } = require('./middleware/forceTextDirections');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const globals = JSON.parse(fs.readFileSync('global-variables.json', 'utf8'));

const app = express();
const db = new sqlite3.Database('./database.db');

// Function to initialize the database and create tables if they don't exist
const initializeDatabase = () => {
    db.serialize(() => {
        // Create Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                pfp TEXT NOT NULL,
                theme TEXT NOT NULL,
                biography TEXT NOT NULL,
                isAdmin BOOLEAN DEFAULT 0 NOT NULL,
                indexable BOOLEAN DEFAULT 1 NOT NULL
            )
        `);

        // Create Invites table
        db.run(`
            CREATE TABLE IF NOT EXISTS invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                used INTEGER DEFAULT 0
            )
        `);

        // Create Posts table
        // Ty sooox for helping with post db - @SleepingAmi
        db.run(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                filename TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            )
        `);

        // Enable foreign key support
        db.run('PRAGMA foreign_keys = ON');
        console.log('Database initialized with required tables.');
    });
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Session configuration
app.use(session({
    secret: globals.sessionKey,
    resave: true,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
        secure: false,                  // Set to true for HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,    // 24 hours
        path: '/',
        sameSite: 'lax'                 // Added for security
    },
    rolling: true                       // Refresh session with each request
}));

function sanitizeContent(text) {
    const returnable =  sanitizeHtml(text, {
        allowedTags: ['b', 'i', 'a'], // Allow specific tags
        allowedAttributes: {
            a: ['href'], // Allow links with href attribute
        },
        disallowedTagsMode: 'recursiveEscape', // Remove disallowed tags
    });
    return sanitizeText(returnable);
}

// Static files and views
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// FEEEEEEEEEED
app.get('/', async (req, res) => {
    try {
        db.all(`
            SELECT posts.*, users.username, users.pfp
            FROM posts
            JOIN users ON posts.user_id = users.id
            ORDER BY posts.created_at DESC
            LIMIT 15
        `, (err, rows) => {
            if (err) {
                console.log(err);
                return res.render('pages/404', {
                    hydrauliscECode: "89",
                    errorMessage: "Method not Allowed.",
                    username: req.session.user?.username || null,
                    ownId: req.session.user?.id || null,
                });
            }

            // Sanitize each post's content
            const sanitizedPosts = rows.map((post) => ({
                ...post,
                title: sanitizeContent(post.title),
            }));

            res.render('pages/index', {
                username: req.session.user?.username || null,
                isPublic: globals.isPublic,
                isAdmin: req.session.user?.isAdmin || null,
                ownId: req.session.user?.id || null,
                posts: sanitizedPosts, // Each row includes sanitized posts and user info
            });
        });

    } catch (error) {
        res.render('pages/404', {
            hydrauliscECode: "91",
            errorMessage: "Unable to update Unmodified Data.",
            username: req.session.user?.username || null,
            ownId: req.session.user?.id || null,
        });
    }
})

// Welpum
app.get('/welcome', (req, res) => {
    res.render('pages/welcome', {
        version
    })
})

// Auth?
app.get('/register/:inviteCode?', (req, res) => {
    res.render('pages/register', {
        isPublic: globals.isPublic,
        inviteMode: globals.inviteMode,
        inviteCode: req.params.inviteCode
    })
})
app.get('/login', (req, res) => {
    res.render('pages/login', {
        isPublic: globals.isPublic,
        inviteMode: globals.inviteMode
    })
})

// Get user profiles... maybe
app.get('/user/:id', (req, res) => {
    // Check if it's a user page
    db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, pageUser) => {
        if (err) {
            console.error(err);
            return res.render('pages/404', {
                hydrauliscECode: "91",
                errorMessage: "Unable to update Unmodified Data.",
                username: null,
                ownId: null
            });
        }

        if (pageUser) {
            // Get user's posts
                db.all('SELECT * FROM posts WHERE user_id = ? ORDER BY id',
                    [pageUser.id],
                    (err, posts) => {
                        if (err) {
                            console.error(err);
                            return res.render('pages/404', {
                                hydrauliscECode: "92",
                                errorMessage: "Session Not Found/Already Updated.",
                                username: null,
                                ownId: null
                            });
                        }

                        res.render('pages/user', {
                            ownId: req.session.user?.id || null,
                            userIdToCheck: pageUser.id,
                            usersPage: pageUser.username,
                            usersPfp: pageUser.pfp,
                            username: req.session.user?.username || null,
                            isPublic: globals.isPublic,
                            followingList: [],
                            follows: null,
                            usersBiography: pageUser.biography,
                            uploads: posts,
                            isAdmin: req.session.user?.isAdmin || null,
                            banner: pageUser.banner,
                            discriminator: pageUser.discriminator || '0000'
                        });
                    }
                );
        } else {
            // Not a user page, send 404 with error message
            res.render('pages/404', {
                hydrauliscECode: "85",
                errorMessage: "The requested resource was not found, the system took too long to respond, the system is offline, or you do not have access to view the requested resource.",
                username: req.session.user?.username || null,
                ownId: req.session.user?.id || null
            });
        }
    });
})

// Imagine Settings
app.get('/settings', (req, res) => {
    if(req.session.user?.id) {
        db.get('SELECT * FROM users WHERE username = ?', [req.session.user.username], (err, userDetail) => {
            if (err) {
                console.error(err);
                return res.render('pages/404', {
                    hydrauliscECode: "92",
                    errorMessage: "Session Not Found/Already Updated.",
                    username: null,
                    ownId: req.session.user.id
                });
            }

            if(req.session.user.isAdmin) {
                db.all('SELECT id, username, isAdmin FROM users ORDER BY id', [], (err, users) => {
                    if (err) {
                        logError('Failed to load users', err);
                        return res.redirect('/');
                    }
            
                    res.render('pages/settings', {
                        isAdmin: userDetail.isAdmin,
                        username: userDetail.username,
                        usersBiography: userDetail.biography,
                        ownId: userDetail.id,
                        version,
                        pfp: userDetail.pfp,
                        users,
                        banner: userDetail.banner,
                        discriminator: userDetail.discriminator || '0000'
                    })
                });
            } else {
                res.render('pages/settings', {
                    isAdmin: userDetail.isAdmin,
                    username: userDetail.username,
                    usersBiography: userDetail.biography,
                    ownId: userDetail.id,
                    version,
                    pfp: userDetail.pfp,
                    banner: userDetail.banner,
                    discriminator: userDetail.discriminator || '0000'
                })
            }
        });
    } else {
        res.redirect('/login');
    }
})

// Upload files lmao
app.get('/upload', (req, res) => {
    if(req.session.user?.id) {
        db.get('SELECT * FROM users WHERE username = ?', [req.session.user.username], (err, userDetail) => {
            if (err) {
                console.error(err);
                return res.render('pages/404', {
                    hydrauliscECode: "92",
                    errorMessage: "Session Not Found/Already Updated.",
                    username: null,
                    ownId: req.session.user.id
                });
            }

            if(req.session.user.isAdmin) {
                db.all('SELECT id, username, isAdmin FROM users ORDER BY id', [], (err, users) => {
                    if (err) {
                        logError('Failed to load users', err);
                        return res.redirect('/');
                    }
            
                    res.render('pages/upload', {
                        isAdmin: userDetail.isAdmin,
                        username: userDetail.username,
                        usersBiography: userDetail.biography,
                        ownId: userDetail.id,
                        version,
                        pfp: userDetail.pfp,
                        users
                    })
                });
            } else {
                res.render('pages/upload', {
                    isAdmin: userDetail.isAdmin,
                    username: userDetail.username,
                    usersBiography: userDetail.biography,
                    ownId: userDetail.id,
                    version,
                    pfp: userDetail.pfp
                })
            }
        });
    } else {
        res.render('pages/404', {
            hydrauliscECode: "89",
            errorMessage: "Method not Allowed.",
            username: req.session.user?.username || null,
            ownId: req.session.user?.id || null
        });;
    }
})

// Start server
const PORT = globals.hostPort || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeDatabase(); // Initialize the database when the server starts
});
