const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { deleteFile } = require('../middleware/auth');

const router = express.Router();
const db = new sqlite3.Database('./database.db');

// Add CORS middleware for all routes in this router
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

function sanitizeText(text) {
    const cleansedHTML = text.replace(/[<>"&]/g, function (match) {
      return {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '&': '&amp;',
      }[match];
    });
    return cleansedHTML;
}


// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
    // Check if the file's MIME type is in the allowed list
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error(`Invalid file type. Only ${JSON.stringify(allowedMimeTypes)} are allowed!`), false); // Reject the file
    }
};

// Post Storage
const upload = multer({
    dest: "public/uploads/",
    fileFilter: fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (?)
});

// Healthcheck
router.get('/', (req, res) => {
    res.json({ online: true, "X-Powered-By": "Express", "healthcheck": "passing", "documentation": "https://about.hydraulisc.net/docs/hydraulisc/api" })
})

// Cookie Acceptance
router.post('/accept-cookies', (req, res) => {
    res.cookie('cookiesAccepted', 'true', { 
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year, give or take
        httpOnly: true, 
        secure: false, 
        sameSite: 'lax' 
    });
    res.redirect(req.get("Referrer") || "/");
});

// Upload.
router.post("/upload", upload.single("file"), (req, res) => {
    if(!req.session.user) return res.status(401).send('Not authenticated');
    if(!req.file) return res.status(400).send('No file!');
    const userId = req.session.user.id;
    var uploadTitle = undefined;
    if(!req.body.title) {
        uploadTitle = "";
    } else {
        uploadTitle = sanitizeText(req.body.title);
    }
    const { filename } = req.file;
  
    db.run(
        `INSERT INTO posts (user_id, title, created_at, filename) VALUES (?, ?, ?, ?)`, [userId, uploadTitle, new Date().toISOString(), filename], function (err) {
            if (err) return res.status(500).send("Database error");
            res.redirect('/');
        }
    );
});

// Upload Avatar
const avatar = multer({
    dest: "public/avatars/",
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (?)
});
router.post("/avatarUpdate", avatar.single("avatar"), (req, res) => {
    if(!req.session.user) return res.status(401).send('Not authenticated');
    if(!req.file) return res.status(400).send('No file!');
    const userId = req.session.user.id;
    const { filename } = req.file;
  
    db.run(
        `UPDATE users SET pfp = ? WHERE id = ?`, [`/avatars/${filename}`, userId], function (err) {
            if (err) {
                console.log(err);
                return res.status(500).send("Database error");
            }
            res.redirect('/settings');
        }
    );
});

// Upload Banner
const banner = multer({
    dest: "public/banners/",
    fileFilter: fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit (?)
});
router.post("/bannerUpdate", banner.single("banner"), (req, res) => {
    if(!req.session.user) return res.status(401).send('Not authenticated');
    if(!req.file) return res.status(400).send('No file!');
    const { filename } = req.file;
    const userId = req.session.user.id;
  
    db.run(
        `UPDATE users SET banner = ? WHERE id = ?`, [`/banners/${filename}`, userId], function (err) {
            if (err) return res.status(500).send("Database error");
            res.redirect('/settings');
        }
    );
});

router.post('/posts/:postId/delete', (req, res) => {
    // missing session check
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const postId = req.params.postId;
    const userId = req.session.user.id;

    // input validation looks good
    if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
    }

    const query = `SELECT * FROM posts WHERE id = ?`;

    db.get(query, [postId], (err, post) => {
        if (err) {
            return res.status(500).json({ 'Database error': err });
        }
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // authorization check looks good
        if (post.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized - You can only delete your own posts' });
        }

        // consider adding error handling here:
        // try {
        //     await deleteFile(post.filename);
        // } catch (error) {
        //     console.error('File deletion failed:', error);
        // }
        deleteFile(post.filename);

        // consider wrapping in a transaction
        // db.run('BEGIN TRANSACTION');
        db.run(`DELETE FROM posts WHERE id = ?`, [postId], function (err) {
            if (err) {
                // db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete post' });
            }
            // db.run('COMMIT');
            res.redirect(req.get("Referrer") || "/");
        });
    });
});

// Public endpoint to get user posts by ID
router.get('/:userId/posts/:limit?', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        let limit = parseInt(req.params.limit) || 10;
        
        // Validate inputs
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        limit = Math.min(Math.max(limit, 1), 50); // Ensure between 1-50
        
        // Get user info and posts in a single query
        db.get(
            `SELECT username, pfp, discriminator FROM users WHERE id = ?`,
            [userId],
            (err, user) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                // Get the posts
                db.all(
                    `SELECT id, title, created_at, updated_at, filename
                     FROM posts 
                     WHERE user_id = ?
                     ORDER BY created_at DESC
                     LIMIT ?`,
                    [userId, limit],
                    (err, posts) => {
                        if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }
                        
                        // Format the response
                        const response = {
                            user: {
                                id: userId,
                                username: user.username,
                                pfp: user.pfp,
                                discriminator: user.discriminator
                            },
                            posts: posts.map(post => ({
                                id: post.id,
                                title: post.title,
                                created_at: post.created_at,
                                updated_at: post.updated_at,
                                filename: post.filename,
                                url: `/uploads/${post.filename}` // Add full URL path
                            }))
                        };
                        
                        res.json(response);
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error in API endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;