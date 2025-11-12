// src/routes/pelicula.js
const express = require('express');
const router = express.Router();

const pool = require('../database'); //conecction to bd

// Esta ruta (GET /peliculas) es para MOSTRAR el catálogo
router.get('/', async (req, res) => {
    
    // Esta es consulta trae el actor y el director de la pelicula
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
        
        // Renderiza la vista 'list' y le pasa las películas
        res.render('peliculas/list', { peliculas: peliculas });

    } catch (error) {
        console.error(error);
        res.send("Error al cargar la página.");
    }
});


// ¡La ruta POST /add se eliminó de aquí porque no pertenece a este archivo!

module.exports = router;