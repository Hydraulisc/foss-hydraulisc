const fs = require('fs');

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

module.exports = { checkRegistrationMode };
