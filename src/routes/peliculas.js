const express = require('express');
const router = express.Router();
const { promisify } = require('util');
const pool = require('../database');
const { isLoggedIn, isAdmin } = require('../lib/auth');

// RUTA: MOSTRAR EL CATÁLOGO
router.get('/', async (req, res) => {
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
        res.render('peliculas/list', { peliculas: peliculas });
    } catch (error) {
        console.error(error);
        res.send("Error al cargar la página.");
    }
});

// se muestra el formulario
router.get('/add', isLoggedIn, isAdmin, (req, res) => {
    res.render('peliculas/add');
});

// RUTA: RECIBIR FORMULARIO "AGREGAR"
router.post('/add', isLoggedIn, isAdmin, async (req, res) => {
    
    const { 
        TITULO, DESCRIPCION, ANIO, PRECIO_RENTA, PRECIO_COMPRA, 
        COPIAS_RENTA_DISPONIBLES, COPIAS_VENTA_DISPONIBLES, IMAGEN,
        actores, directores 
    } = req.body;

    const nuevaPelicula = { 
        TITULO, DESCRIPCION, ANIO, PRECIO_RENTA, PRECIO_COMPRA, 
        COPIAS_RENTA_DISPONIBLES, COPIAS_VENTA_DISPONIBLES, IMAGEN 
    };

    let connection;
    try {
        connection = await pool.getConnection();
        const query = promisify(connection.query).bind(connection);
        const beginTransaction = promisify(connection.beginTransaction).bind(connection);
        const commit = promisify(connection.commit).bind(connection);
        const rollback = promisify(connection.rollback).bind(connection);

        await beginTransaction();

        const result = await query('INSERT INTO PELICULA SET ?', [nuevaPelicula]);
        const nuevaPeliculaId = result.insertId;

        if (actores) {
            const nombresActores = actores.split(',').map(nombre => nombre.trim());
            for (const nombre of nombresActores) {
                if (nombre === '') continue; 
                let [actor] = await query('SELECT ID_ACTOR FROM ACTOR WHERE NOMBRE = ?', [nombre]);
                let actorId;
                if (!actor) {
                    const resultActor = await query('INSERT INTO ACTOR (NOMBRE) VALUES (?)', [nombre]);
                    actorId = resultActor.insertId;
                } else {
                    actorId = actor.ID_ACTOR;
                }
                await query('INSERT INTO PELICULA_ACTOR (ID_PELICULA, ID_ACTOR) VALUES (?, ?)', [nuevaPeliculaId, actorId]);
            }
        }

        if (directores) {
            const nombresDirectores = directores.split(',').map(nombre => nombre.trim());
            for (const nombre of nombresDirectores) {
                if (nombre === '') continue;
                let [director] = await query('SELECT ID_DIRECTOR FROM DIRECTOR WHERE NOMBRE = ?', [nombre]);
                let directorId;
                if (!director) {
                    const resultDir = await query('INSERT INTO DIRECTOR (NOMBRE) VALUES (?)', [nombre]);
                    directorId = resultDir.insertId;
                } else {
                    directorId = director.ID_DIRECTOR;
                }
                await query('INSERT INTO PELICULA_DIRECTOR (ID_PELICULA, ID_DIRECTOR) VALUES (?, ?)', [nuevaPeliculaId, directorId]);
            }
        }

        await commit();
        req.flash('success', '¡Película y relaciones guardadas exitosamente!');
        res.redirect('/peliculas');

    } catch (error) {
        if (connection) {
            const rollback = promisify(connection.rollback).bind(connection);
            await rollback();
        }
        console.error(error);
        req.flash('error', 'Error al guardar la película.');
        res.redirect('/peliculas/add');
    } finally {
        if (connection) connection.release();
    }
});


// RUTA: MOSTRAR FORMULARIO "EDITAR"
router.get('/edit/:id', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                P.*,
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
            WHERE P.ID_PELICULA = ?;
        `;
        
        const [pelicula] = await pool.query(query, [id]);

        if (!pelicula) {
            req.flash('error', 'Película no encontrada.');
            return res.redirect('/peliculas');
        }
        
        res.render('peliculas/edit', { pelicula: pelicula });

    } catch (error) {
        console.error(error);
        req.flash('error', 'No se pudo cargar la película para editar.');
        res.redirect('/peliculas');
    }
});


// editar peliculas solo para superusuario
router.post('/edit/:id', isLoggedIn, isAdmin, async (req, res) => {
    const { id } = req.params;
 
    const { 
        TITULO, DESCRIPCION, ANIO, PRECIO_RENTA, PRECIO_COMPRA, 
        COPIAS_RENTA_DISPONIBLES, COPIAS_VENTA_DISPONIBLES, IMAGEN,
        actores, directores
    } = req.body;

    const datosPelicula = { 
        TITULO, DESCRIPCION, ANIO, PRECIO_RENTA, PRECIO_COMPRA, 
        COPIAS_RENTA_DISPONIBLES, COPIAS_VENTA_DISPONIBLES, IMAGEN 
    };

    let connection;
    try {
        connection = await pool.getConnection();
        const query = promisify(connection.query).bind(connection);
        const beginTransaction = promisify(connection.beginTransaction).bind(connection);
        const commit = promisify(connection.commit).bind(connection);
        const rollback = promisify(connection.rollback).bind(connection);

        await beginTransaction();

        await query('UPDATE PELICULA SET ? WHERE ID_PELICULA = ?', [datosPelicula, id]);

        await query('DELETE FROM PELICULA_ACTOR WHERE ID_PELICULA = ?', [id]);
        if (actores) {
            const nombresActores = actores.split(',').map(nombre => nombre.trim());
            for (const nombre of nombresActores) {
                if (nombre === '') continue;
                let [actor] = await query('SELECT ID_ACTOR FROM ACTOR WHERE NOMBRE = ?', [nombre]);
                let actorId;
                if (!actor) {
                    const resultActor = await query('INSERT INTO ACTOR (NOMBRE) VALUES (?)', [nombre]);
                    actorId = resultActor.insertId;
                } else {
                    actorId = actor.ID_ACTOR;
                }
                await query('INSERT INTO PELICULA_ACTOR (ID_PELICULA, ID_ACTOR) VALUES (?, ?)', [id, actorId]);
            }
        }

        await query('DELETE FROM PELICULA_DIRECTOR WHERE ID_PELICULA = ?', [id]);
        if (directores) {
            const nombresDirectores = directores.split(',').map(nombre => nombre.trim());
            for (const nombre of nombresDirectores) {
                if (nombre === '') continue;
                let [director] = await query('SELECT ID_DIRECTOR FROM DIRECTOR WHERE NOMBRE = ?', [nombre]);
                let directorId;
                if (!director) {
                    const resultDir = await query('INSERT INTO DIRECTOR (NOMBRE) VALUES (?)', [nombre]);
                    directorId = resultDir.insertId;
                } else {
                    directorId = director.ID_DIRECTOR;
                }
                await query('INSERT INTO PELICULA_DIRECTOR (ID_PELICULA, ID_DIRECTOR) VALUES (?, ?)', [id, directorId]);
            }
        }

        await commit();
        req.flash('success', 'Película actualizada correctamente.');
        res.redirect('/peliculas');

    } catch (error) {
        if (connection) {
            const rollback = promisify(connection.rollback).bind(connection);
            await rollback();
        }
        console.error(error);
        req.flash('error', 'Error al actualizar la película.');
        res.redirect('/peliculas/edit/' + id);
    } finally {
        if (connection) connection.release();
    }
});


// RUTA: ELIMINAR PELÍCULA
router.post('/delete/:id', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM PELICULA WHERE ID_PELICULA = ?', [id]);
        req.flash('success', 'Película eliminada correctamente.');
        res.redirect('/admin/dashboard'); 
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error al eliminar la película.');
        res.redirect('/admin/dashboard');
    }
});


//para implementar una barra de búsqueda
router.get('/search', async (req, res) => {
const { q } = req.query;

    const searchTerm = `%${q.toLowerCase()}%`;

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
        HAVING 
            LOWER(P.TITULO) LIKE ? OR
            LOWER(Actores) LIKE ? OR
            LOWER(Directores) LIKE ? OR
            P.ANIO LIKE ?
    `;

    try {
        const peliculas = await pool.query(query, [searchTerm, searchTerm, searchTerm, searchTerm]);
        
        res.render('peliculas/list', { 
            peliculas: peliculas,
            titulo_filtro: `Resultados para: "${q}"` // Título personalizado
        });

    } catch (error) {
        console.error(error);
        res.send("Error al realizar la búsqueda.");
    }
});

module.exports = router;