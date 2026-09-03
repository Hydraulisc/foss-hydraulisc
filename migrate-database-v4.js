const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = './database.db';

function createBackup() {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `database_backup_${timestamp}.db`);

    // Back up the raw file BEFORE opening any connection to it, to avoid
    // copying a file with uncommitted WAL pages or an open lock.
    fs.copyFileSync(DB_PATH, backupPath);
    return backupPath;
}

function runQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getRow(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function migrateDatabase() {
    const backupPath = createBackup();
    console.log(`Backup created at: ${backupPath}`);

    const db = new sqlite3.Database(DB_PATH);

    try {
        const beforeCount = await getRow(db, "SELECT COUNT(*) as count FROM users;");
        console.log(`Row count before migration: ${beforeCount.count}`);

        await runQuery(db, "BEGIN TRANSACTION;");
        console.log("Transaction started");

        await runQuery(db, "ALTER TABLE users ADD COLUMN private BOOLEAN NOT NULL DEFAULT 0;");
        console.log("Added 'private' column");

        const afterCount = await getRow(db, "SELECT COUNT(*) as count FROM users;");
        console.log(`Row count after migration: ${afterCount.count}`);

        if (beforeCount.count !== afterCount.count) {
            throw new Error(
                `Row count mismatch (before: ${beforeCount.count}, after: ${afterCount.count}). Aborting.`
            );
        }

        await runQuery(db, "COMMIT;");
        console.log("Migration completed successfully");

    } catch (error) {
        console.error("Migration failed:", error.message);
        try {
            await runQuery(db, "ROLLBACK;");
            console.log("Changes rolled back successfully");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        console.log(`Restore manually from backup if needed: ${backupPath}`);
        process.exit(1);
    } finally {
        db.close();
    }
}

migrateDatabase().catch(error => {
    console.error("Migration script failed:", error.message);
    process.exit(1);
});
