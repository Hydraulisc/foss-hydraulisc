const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const authRoutes = require('./routes/auth');
const { hostPort, inviteMode, isPublic, sessionKey } = require('./global-variables.json');

const app = express();
const db = new sqlite3.Database('./database.db');

// Function to initialize the database and create tables if they don't exist
const initializeDatabase = () => {
    db.serialize(() => {
        // Create Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                isAdmin BOOLEAN DEFAULT 0
            )
        `);

        // Create Invites table
        db.run(`
            CREATE TABLE IF NOT EXISTS invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                used INTEGER DEFAULT 0
            )
        `);

        console.log('Database initialized with required tables.');
    });
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Session configuration
app.use(session({
    secret: sessionKey,
    resave: true,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
        secure: false,      // Set to true for HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        sameSite: 'lax'    // Added for security
    },
    rolling: true          // Refresh session with each request
}));

// Static files and views
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.render('pages/index',
        username
    )
})

app.get('/welcome', (req, res) => {
    res.render('pages/welcome')
})

app.get('/register', (req, res) => {
    res.render('pages/register', {
        isPublic,
        inviteMode
    })
})

app.get('/login', (req, res) => {
    res.render('pages/login', {
        isPublic,
        inviteMode
    })
})

// Start server
const PORT = hostPort || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeDatabase(); // Initialize the database when the server starts
});
