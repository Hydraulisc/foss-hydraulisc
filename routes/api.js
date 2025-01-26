const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const router = express.Router();
const db = new sqlite3.Database('./database.db');

// Create post
const upload = multer({
    dest: "public/uploads/",
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (?)
});
router.post("/upload", upload.single("file"), (req, res) => {
    if(!req.session.user) return res.status(401).send('Not authenticated');
    if(!req.file) return res.status(400).send('No file!');
    const userId = req.session.user.id;
    const uploadTitle = req.body.title;
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

module.exports = router;