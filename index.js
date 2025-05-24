const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { version } = require('./package.json');
const { sanitizeText } = require('./middleware/forceTextDirections');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const globals = JSON.parse(fs.readFileSync('global-variables.json', 'utf8'));
const cookieParser = require('cookie-parser');

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
                indexable BOOLEAN DEFAULT 1 NOT NULL,
                discriminator TEXT NOT NULL,
                language TEXT NOT NULL
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

        // Registered OAuth Clients
        db.run(`
            CREATE TABLE IF NOT EXISTS oauth_clients (
                id TEXT PRIMARY KEY,
                secret TEXT NOT NULL,
                redirect_uri TEXT NOT NULL,
                name TEXT,
                owner INTEGER
            );
        `);

        // Authorisation Codes
        db.run(`
            CREATE TABLE IF NOT EXISTS oauth_codes (
                code TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                redirect_uri TEXT NOT NULL
            );
        `);

        // Access Tokens
        db.run(`
            CREATE TABLE IF NOT EXISTS oauth_tokens (
                token TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            );
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
        secure: false,                  // Set to true if you use a valid **LOCAL!!** SSL certificate for HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,    // 24 hours
        path: '/',
        sameSite: 'lax'                 // Added for security
    },
    rolling: true                       // Refresh session with each request
}));
app.use(cookieParser());

function checkCookies(req, res) {
    if (!req.cookies.cookiesAccepted) {
        return false;
    } else {
        return true;
    }
}

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

// Dynamic Routes
const middlewarePath = path.join(__dirname, 'routes');
fs.readdirSync(middlewarePath).forEach(file => {
    if (file.endsWith('.js')) {
        const route = '/' + path.basename(file, '.js'); // filename without .js
        const middleware = require(path.join(middlewarePath, file));
  
        app.use(route, middleware);
        console.log(`Mounted middleware at ${route} from ${file}`);
    }
});

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
                    cookies: checkCookies(req)
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
                cookies: checkCookies(req)
            });
        });

    } catch (error) {
        res.render('pages/404', {
            hydrauliscECode: "91",
            errorMessage: "Unable to update Unmodified Data.",
            username: req.session.user?.username || null,
            ownId: req.session.user?.id || null,
            cookies: checkCookies(req)
        });
    }
})

// Welpum
app.get('/welcome', (req, res) => {
    res.render('pages/welcome', {
        version,
        cookies: checkCookies(req)
    })
})
app.get('/404', (req, res) => {
    res.render('pages/404', {
        hydrauliscECode: "85",
        errorMessage: "The requested resource was not found, the system took too long to respond, the system is offline, or you do not have access to view the requested resource.",
        username: req.session.user?.username || null,
        ownId: req.session.user?.id || null,
        cookies: checkCookies(req)
    });
})

// Auth?
app.get('/register/:inviteCode?', (req, res) => {
    const redirectTo = req.query.next && req.query.next.startsWith('/')
    ? req.query.next
    : '/';
    res.render('pages/register', {
        isPublic: globals.isPublic,
        inviteMode: globals.inviteMode,
        inviteCode: req.params.inviteCode,
        next: redirectTo
    })
})
app.get('/login', (req, res) => {
    const redirectTo = req.query.next && req.query.next.startsWith('/')
    ? req.query.next
    : '/';
    res.render('pages/login', {
        isPublic: globals.isPublic,
        inviteMode: globals.inviteMode,
        next: redirectTo
    })
})
app.get('/newlyregistered', (req, res) => {
    if(req.session.user?.id) {
        db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, pageUser) => {
            res.render('partials/registerSuccess', {
                newUser: pageUser.username + "#" + pageUser.discriminator,
                username: req.session.user?.username || null,
                ownId: req.session.user?.id || null,
                cookies: checkCookies(req)
            })
        })
    } else {
        return res.render('pages/404', {
            hydrauliscECode: "85",
            errorMessage: "The requested resource was not found, the system took too long to respond, the system is offline, or you do not have access to view the requested resource.",
            username: req.session.user?.username || null,
            ownId: req.session.user?.id || null
        });
    }
})

// Get user profiles... maybe
app.get('/user/:id?', (req, res) => {
    if(!req.params.id) return res.render('pages/404', { hydrauliscECode: "85", errorMessage: "The requested resource was not found, the system took too long to respond, the system is offline, or you do not have access to view the requested resource.", username: req.session.user?.username || null, ownId: req.session.user?.id || null })
    // Check if it's a user page
    db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, pageUser) => {
        if (err) {
            console.error(err);
            return res.render('pages/404', {
                hydrauliscECode: "82",
                errorMessage: "Undefined.",
                username: req.session.user?.username || null,
                ownId: req.session.user?.id || null,
                cookies: checkCookies(req)
            });
        }

        if (pageUser) {
            // Get user's posts
                db.all('SELECT * FROM posts WHERE user_id = ? ORDER BY id DESC',
                    [pageUser.id],
                    (err, posts) => {
                        if (err) {
                            console.error(err);
                            return res.render('pages/404', {
                                hydrauliscECode: "92",
                                errorMessage: "Session Not Found/Already Updated.",
                                username: req.session.user?.username || null,
                                ownId: req.session.user?.id || null,
                                cookies: checkCookies(req)
                            });
                        }

                        res.render('pages/user', {
                            ownId: req.session.user?.id || null,
                            userIdToCheck: pageUser.id,
                            usersPage: sanitizeText(pageUser.username),
                            usersPfp: pageUser.pfp,
                            username: req.session.user?.username || null,
                            isPublic: globals.isPublic,
                            followingList: [],
                            follows: null,
                            usersBiography: pageUser.biography,
                            uploads: posts,
                            isAdmin: req.session.user?.isAdmin || null,
                            banner: pageUser.banner,
                            discriminator: pageUser.discriminator || '0000',
                            cookies: checkCookies(req)
                        });
                    }
                );
        } else {
            // Not a user page, send 404 with error message
            res.render('pages/404', {
                hydrauliscECode: "85",
                errorMessage: "The requested resource was not found, the system took too long to respond, the system is offline, or you do not have access to view the requested resource.",
                username: req.session.user?.username || null,
                ownId: req.session.user?.id || null,
                cookies: checkCookies(req)
            });
        }
    });
})

// P-P-P-POSTS!!! Post pages
app.get('/post/:id?', (req, res) => {
    const postId = req.params.id;

    if (!postId) {
        return res.render('pages/404', {
            hydrauliscECode: "85",
            errorMessage: "The requested resource was not found, the system took too long to respond, the system is offline, or you do not have access to view the requested resource.",
            username: req.session.user?.username || null,
            ownId: req.session.user?.id || null,
            cookies: checkCookies(req)
        });
    }

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('pages/404', {
                hydrauliscECode: "82",
                errorMessage: "Undefined.",
                username: req.session.user?.username || null,
                ownId: req.session.user?.id || null,
                cookies: checkCookies(req)
            });
        }

        if (!post) {
            return res.render('pages/404', {
                hydrauliscECode: "85",
                errorMessage: "The requested resource was not found, the system took too long to respond, the system is offline, or you do not have access to view the requested resource.",
                username: req.session.user?.username || null,
                ownId: req.session.user?.id || null,
                cookies: checkCookies(req)
            });
        }

        // Sanitize post fields
        const sanitizedPost = {
            ...post,
            title: sanitizeContent(post.title)
        };

        // Fetch the user attached to this post
        db.get('SELECT id, username, discriminator, pfp FROM users WHERE id = ?', [post.user_id], (err, author) => {
            if (err) {
                console.error('Database error:', err);
                return res.render('pages/404', {
                    hydrauliscECode: "82",
                    errorMessage: "Undefined.",
                    username: req.session.user?.username || null,
                    ownId: req.session.user?.id || null,
                    cookies: checkCookies(req)
                });
            }

            if (!author) {
                return res.render('pages/404', {
                    hydrauliscECode: "96",
                    errorMessage: "Account Deleted/Suspended.",
                    username: req.session.user?.username || null,
                    ownId: req.session.user?.id || null,
                    cookies: checkCookies(req)
                });
            }

            // Sanitize author fields
            const sanitizedAuthor = {
                ...author,
                title: sanitizeContent(author.username)
            };

            res.render('pages/posts', {
                ownId: req.session.user?.id || null,
                username: req.session.user?.username || null,
                isAdmin: req.session.user?.isAdmin || null,
                post: sanitizedPost, // post.data
                author: sanitizedAuthor, // author.data
                cookies: checkCookies(req)
            });
        });
    });
});

// Imagine Settings
app.get('/settings', (req, res) => {
    if(req.session.user?.id) {
        db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, userDetail) => {
            if (err) {
                console.error(err);
                return res.render('pages/404', {
                    hydrauliscECode: "92",
                    errorMessage: "Session Not Found/Already Updated.",
                    username: null,
                    ownId: req.session.user.id,
                    cookies: checkCookies(req)
                });
            }

            db.all(
                'SELECT * FROM oauth_clients WHERE owner = ?',
                [req.session.user.id],
                (err, apps) => {
                    if (err) return res.status(500).send('Database error');
                    if(req.session.user.isAdmin) {
                        db.all('SELECT id, username, discriminator, isAdmin FROM users ORDER BY id', [], (err, users) => {
                            if (err) {
                                console.log('Failed to load users', err);
                                return res.redirect('/');
                            }
                            db.all('SELECT id, redirect_uri, name FROM oauth_clients ORDER BY id', [], (err, oauths) => {
                                if (err) {
                                    console.log('Failed to load oauth_clients', err);
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
                                    oauths,
                                    banner: userDetail.banner,
                                    discriminator: userDetail.discriminator || '0000',
                                    cookies: checkCookies(req),
                                    inviteMode: globals.inviteMode,
                                    apps
                                })
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
                            users: [],
                            banner: userDetail.banner,
                            discriminator: userDetail.discriminator || '0000',
                            cookies: checkCookies(req),
                            apps
                        })
                    }
                }
            )
        });
    } else {
        res.redirect('/login?next=%2Fsettings');
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
                    ownId: req.session.user.id,
                    cookies: checkCookies(req)
                });
            }

            res.render('pages/upload', {
                isAdmin: userDetail.isAdmin,
                username: userDetail.username,
                usersBiography: userDetail.biography,
                ownId: userDetail.id,
                version,
                pfp: userDetail.pfp,
                cookies: checkCookies(req)
            })
        });
    } else {
        res.redirect('/login?next=%2Fupload');
    }
})

// Start server
const PORT = globals.hostPort || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeDatabase(); // Initialize the database when the server starts
});
