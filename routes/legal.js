const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Dynamic Routes
const viewsPath = path.join(__dirname, '../views/legal');

fs.readdirSync(viewsPath).forEach(file => {
    if (file.endsWith('.ejs')) {
        const route = '/' + path.basename(file, '.ejs'); // filename for route
        const view = path.join('legal', file); // view path
  
        // Define the route
        router.get(route, (req, res) => {
            res.render(view); // render using the relative view path
        });
        //console.log(`Mounted GET route at ${route} for view ${view}`);
    }
});

module.exports = router;
