const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn, isAdmin } = require('../lib/auth');

router.get('/add', isLoggedIn, isAdmin, (req, res) => {
    res.render('generos/add'); 
});

// ---  agregar un nuevo genero
router.post('/add', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { NOMBRE } = req.body; 
        const nuevoGenero = { NOMBRE };
        
        await pool.query('INSERT INTO GENERO SET ?', [nuevoGenero]);
        
        req.flash('success', 'Género agregado correctamente.');
        res.redirect('/admin/dashboard'); 
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error al guardar el género.');
        res.redirect('/generos/add');
    }
});

//se exploran géneros aquí
router.get('/', async (req, res) => {
    try {
        const generos = await pool.query('SELECT * FROM GENERO ORDER BY NOMBRE ASC');
        // Renderiza una vista que muestra todos los géneros (la que sugeriste)
        res.render('generos/list', { generos: generos }); 
    } catch (error) {
        console.error(error);
        res.send('Error al cargar la página de géneros');
    }
});

/* * 
 * Capturará /generos/Acción, /generos/Drama, /generos/Comedia, etc.
 */
router.get('/:nombre', async (req, res) => {
    
    // 1. Obtenemos el nombre del género desde la URL
    const { nombre } = req.params; // Si la URL es /generos/Acción, 'nombre' será "Acción"

    try {
        // 2. Hacemos una consulta SQL que usa ese nombre para filtrar
        // Necesitamos 'JOIN' para conectar las 3 tablas
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
                PELICULA P
            WHERE P.ID_PELICULA IN (
                SELECT PG.ID_PELICULA 
                FROM PELICULA_GENERO PG
                JOIN GENERO G ON PG.ID_GENERO = G.ID_GENERO
                WHERE G.NOMBRE = ?
            )
        `;
        
        const peliculasFiltradas = await pool.query(query, [nombre]);

        // 3. Reutilizamos la vista del catálogo (peliculas/list.hbs)
        //    pero le pasamos solo las películas filtradas.
        res.render('peliculas/list', { 
            peliculas: peliculasFiltradas,
            // (Opcional) Enviamos el nombre para mostrar un título como "Mostrando: Acción"
            titulo_filtro: nombre 
        });

    } catch (error) {
        console.error(error);
        res.send("Error al cargar las películas de este género.");
    }
});

module.exports = router;