const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// Number of invites to generate
const INVITES_TO_GENERATE = 5;

// Database connection
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Function to generate invite codes
function generateInviteCode() {
    return crypto.randomBytes(6).toString('hex'); // 12-character hex string
}

// Insert invite codes into the database
function createInvites(count) {
    const invites = Array.from({ length: count }, generateInviteCode);

    const insertQuery = 'INSERT INTO invites (code) VALUES (?)';
    db.serialize(() => {
        const stmt = db.prepare(insertQuery);
        invites.forEach((code) => {
            stmt.run(code, (err) => {
                if (err) {
                    console.error('Error inserting invite:', err.message);
                }
            });
        });
        stmt.finalize();

        console.log('Generated invite codes:');
        console.log(invites.join('\n'));
    });
}

// Generate invites
createInvites(INVITES_TO_GENERATE);

// Close the database connection
db.close((err) => {
    if (err) {
        console.error('Error closing the database:', err.message);
    } else {
        console.log('Database connection closed.');
    }
});
