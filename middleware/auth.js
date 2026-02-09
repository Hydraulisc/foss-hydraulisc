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


/**
 * Absolute web path to the built-in default profile picture.
 *
 * This avatar is shipped with the application and MUST NOT be deleted.
 * It is intentionally stored outside the user-upload lifecycle.
 *
 * Changing this value should be treated as a breaking change.
 */
const DEFAULT_AVATAR_PATH = "/img/defaultpfp.png";

/**
 * Safely deletes a user's previous profile picture.
 *
 * Deletion rules:
 * - No-op if the path is null/undefined
 * - No-op if the avatar is the non-deletable default
 * - Deletion is hard-locked to the public avatars directory
 * - Path traversal is prevented via basename extraction
 *
 * This function is intentionally tolerant:
 * - Missing files (ENOENT) are ignored
 * - All other filesystem errors are logged but not thrown
 *
 * @param {string} pfpPath - Stored avatar path from the database (e.g. "/avatars/<uuid>")
 * @returns {void}
 */
function deleteAvatarIfAllowed(pfpPath) {
    if (!pfpPath) return;
    if (pfpPath === DEFAULT_AVATAR_PATH) return;

    // Only allow deletion inside /public/avatars
    const filename = path.basename(pfpPath);
    const avatarDir = path.join(__dirname, "../public/avatars");
    const filePath = path.join(avatarDir, filename);

    fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.error("Avatar deletion failed:", filePath, err);
        }
    });
}

module.exports = { checkRegistrationMode, requireAdmin, deleteFile, deleteAvatarIfAllowed };
