const express = require('express');
const router = express.Router();
const pool = require('../database'); 

router.get('/', async (req, res) => {
    const peliculas = await pool.query('SELECT * FROM PELICULA');
    res.render('peliculas/list', { peliculas }); 
});

module.exports = router;