const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

function createBackup() {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `database_backup_${timestamp}.db`);
    fs.copyFileSync('./database.db', backupPath);
    return backupPath;
}

const db = new sqlite3.Database('./database.db');

function runQuery(query) {
    return new Promise((resolve, reject) => {
        db.run(query, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function getTableSchema(tableName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
            if (err) reject(err);
            else resolve(row?.sql);
        });
    });
}

async function migrateDatabase() {
    try {
        const backupPath = createBackup();
        console.log(`Backup created at: ${backupPath}`);

        const originalSchema = await getTableSchema('users');
        console.log("Original schema:", originalSchema);

        await runQuery("BEGIN TRANSACTION;");
        console.log("Transaction started");

        await runQuery("ALTER TABLE users RENAME TO users_old;");
        console.log("Renamed old table");

        await runQuery(`
           CREATE TABLE users (
               id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
               username TEXT NOT NULL,
               password TEXT NOT NULL,
               pfp TEXT NOT NULL,
               theme TEXT NOT NULL,
               biography TEXT NOT NULL,
               isAdmin BOOLEAN DEFAULT 0 NOT NULL,
               indexable BOOLEAN DEFAULT 1,
               discriminator TEXT NOT NULL,
               banner TEXT
           );
       `);
        console.log("Created new table");

        try {
            await runQuery(`
               INSERT INTO users (id, username, password, isAdmin, theme, pfp, biography, indexable, discriminator, banner)
               SELECT id, username, password, isAdmin, theme, pfp, biography, indexable, discriminator, banner 
               FROM users_old;
           `);
            console.log("Copied data");
        } catch (copyError) {
            console.error("Detailed copy error:", copyError.message);
            throw copyError;
        }

        await runQuery("DROP TABLE users_old;");
        console.log("Dropped old table");

        await runQuery("COMMIT;");
        console.log("Migration completed successfully");

    } catch (error) {
        console.error("Migration failed:", error);
        try {
            await runQuery("ROLLBACK;");
            console.log("Changes rolled back successfully");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError);
        }
        process.exit(1);
    } finally {
        db.close();
    }
}

migrateDatabase().catch(error => {
    console.error("Migration script failed:", error);
    process.exit(1);
});