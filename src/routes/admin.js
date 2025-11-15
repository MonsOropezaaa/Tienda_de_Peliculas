const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn, isAdmin } = require('../lib/auth');

// Esta ruta se activa con /admin/dashboard (gracias a index.js)
router.get('/dashboard', isLoggedIn, isAdmin, async (req, res) => {
    
    // 1. Usamos LA MISMA consulta avanzada que en peliculas.js
    const query = `
        SELECT 
            P.*,
            (SELECT GROUP_CONCAT(G.NOMBRE SEPARATOR ', ') 
             FROM GENERO G 
             JOIN PELICULA_GENERO PG ON G.ID_GENERO = PG.ID_GENERO 
             WHERE PG.ID_PELICULA = P.ID_PELICULA) AS Generos,
            (SELECT GROUP_CONCAT(A.NOMBRE SEPARATOR ', ') 
             FROM ACTOR A 
             JOIN PELICULA_ACTOR PA ON A.ID_ACTOR = PA.ID_ACTOR 
             WHERE PA.ID_PELICULA = P.ID_PELICULA) AS Actores,
            (SELECT GROUP_CONCAT(D.NOMBRE SEPARATOR ', ') 
             FROM DIRECTOR D 
             JOIN PELICULA_DIRECTOR PD ON D.ID_DIRECTOR = PD.ID_DIRECTOR 
             WHERE PD.ID_PELICULA = P.ID_PELICULA) AS Directores
        FROM 
            PELICULA P;
    `;

    try {
        const peliculas = await pool.query(query);
        
        // 2. Renderizamos una NUEVA vista (admin/list.hbs)
        res.render('admin/list', { peliculas: peliculas });

    } catch (error) {
        console.error(error);
        res.send("Error al cargar el panel de admin.");
    }
});

module.exports = router;