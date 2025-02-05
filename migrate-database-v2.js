const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run("BEGIN TRANSACTION;", (err) => {
        if (err) return console.error("Error starting transaction:", err.message);
    });

    // Rename the old table
    db.run("ALTER TABLE users RENAME TO users_old;", (err) => {
        if (err) return console.error("Error renaming table:", err.message);
    });

    // Create a new table with the correct UNIQUE constraint
    db.run(`
        CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                pfp TEXT NOT NULL,
                theme TEXT NOT NULL,
                biography TEXT NOT NULL,
                isAdmin BOOLEAN DEFAULT 0 NOT NULL,
                indexable BOOLEAN DEFAULT 1 NOT NULL,
                discriminator TEXT NOT NULL,
                banner TEXT
        )
    `, (err) => {
        if (err) return console.error("Error creating new table:", err.message);
    });

    // Copy data from the old table to the new table
    db.run(`
        INSERT INTO users (id, username, password, isAdmin, theme, pfp, biography, indexable, discriminator, banner)
        SELECT id, username, password, isAdmin, theme, pfp, biography, indexable, discriminator, banner FROM users_old;
    `, (err) => {
        if (err) return console.error("Error copying data:", err.message);
    });

    // Drop the old table
    db.run("DROP TABLE users_old;", (err) => {
        if (err) return console.error("Error dropping old table:", err.message);
    });

    db.run("COMMIT;", (err) => {
        if (err) return console.error("Error committing transaction:", err.message);
        console.log("Database migration completed successfully.");
    });

    db.close();
});
