const fs = require('fs');
const path = require('path');

/**
 * Helper function to determine if invite only, private or public instance
 * @returns {Boolean, Boolean, Boolean}
 */
function checkRegistrationMode(req, res, next) {
    const globals = JSON.parse(fs.readFileSync('global-variables.json', 'utf8'));

    if (!globals.isPublic && !globals.inviteMode) {
        return res.status(403).send("Registration is currently disabled.");
    }

    if (globals.inviteMode && !req.body.inviteCode) {
        return res.status(400).send("Invite code is required.");
    }

    next();
}


/**
 * Middleware to check if the user is an admin
 * @returns {Boolean}
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

/**
 * Helper function to delete a file safely
 */
function deleteFile(filename) {
    const filePath = path.join(__dirname, '../public/uploads/', filename);
    fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error(`Error deleting file: ${filePath}`, err);
        }
    });
}

module.exports = { checkRegistrationMode, requireAdmin, deleteFile };
