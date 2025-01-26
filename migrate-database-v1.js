const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Add columns if they don't exist
const migrations = [
    {
        name: 'pfp',
        type: 'TEXT',
        defaultValue: '/avatars/defaultpfp.png'
    },
    {
        name: 'theme',
        type: 'TEXT',
        defaultValue: 'default'
    },
    {
        name: 'biography',
        type: 'TEXT',
        defaultValue: 'User has not written their Bio.'
    },
    {
        name: 'indexable',
        type: 'BOOLEAN',
        defaultValue: '1'
    },
    {
        name: 'banner',
        type: 'TEXT',
        defaultValue: null
    },
    {
        name: 'discriminator',
        type: 'TEXT',
        defaultValue: '0001'
    },
];

const uploadsMigrations = [
    {
        name: 'filename',
        type: 'TEXT',
        defaultValue: null
    },
];

// Function to check if a column exists
function columnExists(tableName, columnName, callback) {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
            return callback(err);
        }
        const exists = columns.some((col) => col.name === columnName);
        callback(null, exists);
    });
}

// Function to apply migrations
function applyMigrations() {
    migrations.forEach(({ name, type, defaultValue }) => {
        columnExists('users', name, (err, exists) => {
            if (err) {
                console.error(`Error checking column ${name}:`, err.message);
                return;
            }

            if (!exists) {
                // Add the column
                db.run(`ALTER TABLE users ADD COLUMN ${name} ${type}`, (err) => {
                    if (err) {
                        console.error(`Error adding column ${name}:`, err.message);
                        return;
                    }
                    console.log(`Column ${name} added.`);

                    // Update existing rows with the default value
                    if (defaultValue !== null) {
                        db.run(
                            `UPDATE users SET ${name} = ? WHERE ${name} IS NULL`,
                            [defaultValue],
                            (err) => {
                                if (err) {
                                    console.error(`Error setting default value for ${name}:`, err.message);
                                } else {
                                    console.log(`Default values set for column ${name}.`);
                                }
                            }
                        );
                    }
                });
            } else {
                console.log(`Column ${name} already exists. Skipping migration.`);
            }
        });
    });
}

function applyPostMigrations() {
    uploadsMigrations.forEach(({ name, type, defaultValue }) => {
        columnExists('posts', name, (err, exists) => {
            if (err) {
                console.error(`Error checking column ${name}:`, err.message);
                return;
            }

            if (!exists) {
                // Add the column
                db.run(`ALTER TABLE posts ADD COLUMN ${name} ${type}`, (err) => {
                    if (err) {
                        console.error(`Error adding column ${name}:`, err.message);
                        return;
                    }
                    console.log(`Column ${name} added.`);

                    // Update existing rows with the default value
                    if (defaultValue !== null) {
                        db.run(
                            `UPDATE posts SET ${name} = ? WHERE ${name} IS NULL`,
                            [defaultValue],
                            (err) => {
                                if (err) {
                                    console.error(`Error setting default value for ${name}:`, err.message);
                                } else {
                                    console.log(`Default values set for column ${name}.`);
                                }
                            }
                        );
                    }
                });
            } else {
                console.log(`Column ${name} already exists. Skipping migration.`);
            }
        });
    });
}

// Apply migrations
applyMigrations();
applyPostMigrations();

// Close the database connection
db.close((err) => {
    if (err) {
        console.error('Error closing the database:', err.message);
    } else {
        console.log('Database migration completed.');
    }
});
