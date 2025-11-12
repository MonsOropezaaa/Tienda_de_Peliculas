// src/routes/carrito.js
const express = require('express');
const router = express.Router();
const { promisify } = require('util'); // ¡Importante!

const pool = require('../database'); //conecction to bd
const { isLoggedIn } = require('../lib/auth');
// Borramos la línea 'const { Connection } ...' que no es necesaria

// --- RUTA PARA AÑADIR AL CARRITO (POST /carrito/add) ---
router.post('/add', isLoggedIn,  async (req, res) => {
    const { id_pelicula, tipo_transaccion } = req.body;
    const id_usuario_actual= req.user.ID_USUARIO;
    let connection;

    try {
        connection = await pool.getConnection();

        // Promisificamos las funciones de ESTA conexión
        const query = promisify(connection.query).bind(connection);
        const beginTransaction = promisify(connection.beginTransaction).bind(connection);
        const commit = promisify(connection.commit).bind(connection);
        const rollback = promisify(connection.rollback).bind(connection);

        await beginTransaction();

        // 1. Restar del Stock
        let sql_update_stock;
        if (tipo_transaccion === 'RENTA') {
            sql_update_stock = `
                UPDATE PELICULA 
                SET COPIAS_RENTA_DISPONIBLES = COPIAS_RENTA_DISPONIBLES - 1 
                WHERE ID_PELICULA = ? AND COPIAS_RENTA_DISPONIBLES > 0
            `;
        } else {
            sql_update_stock = `
                UPDATE PELICULA 
                SET COPIAS_VENTA_DISPONIBLES = COPIAS_VENTA_DISPONIBLES - 1 
                WHERE ID_PELICULA = ? AND COPIAS_VENTA_DISPONIBLES > 0
            `;
        }
        
        const updateResult = await query(sql_update_stock, [id_pelicula]);

        // 2. Chequear 'affectedRows'
        if (updateResult.affectedRows === 0) {
            throw new Error('Stock agotado. No se puede añadir al carrito.');
        }

        // 3. Añadir al Carrito
        const nuevoArticulo = {
            ID_PELICULA: id_pelicula,
            TIPO_DE_TRANSACCION: tipo_transaccion,
            ID_USUARIO: id_usuario_actual,
            CANTIDAD: 1
        };
        const sql_carrito = `
            INSERT INTO CARRITO SET ? 
            ON DUPLICATE KEY UPDATE CANTIDAD = CANTIDAD + 1
        `;
        await query(sql_carrito, [nuevoArticulo]); 

        // 4. Confirmar
        await commit(); // ¡CORREGIDO! Usamos 'commit'
        req.flash('success_msg', '¡Película añadida al carrito!');
        res.redirect('/carrito');

    } catch (error) { 
        if (connection) {
            const rollback = promisify(connection.rollback).bind(connection);
            await rollback();
        }
        console.error(error);
        req.flash('agotado', ' Stock Agotado ');

        req.session.save(() => {
        // 3. REDIRIGE *DESPUÉS* DE QUE SE HAYA GUARDADO
        res.redirect('/peliculas'); 
    });
      
        
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// --- RUTA PARA VER EL CARRITO (GET /carrito) ---
router.get('/', isLoggedIn,  async (req,res) =>{
    const id_usuario_actual = req.user.ID_USUARIO;
    const consulta = `
        SELECT * FROM CARRITO C
        JOIN PELICULA P ON C.ID_PELICULA = P.ID_PELICULA
        WHERE C.ID_USUARIO = ?
    `;
    
    try {
        // Usamos pool.query (que ya está promisificado en database.js)
        const productos_en_carrito = await pool.query(consulta, [id_usuario_actual]);
        
        // Calculamos el total
        let total_carrito = 0;
        productos_en_carrito.forEach(prod => {
            if (prod.TIPO_DE_TRANSACCION === 'RENTA') {
                total_carrito += parseFloat(prod.PRECIO_RENTA * prod.CANTIDAD);
                prod.precio_a_mostrar = prod.PRECIO_RENTA;
            } else {
                // CORREGIDO: PRECIO_COMPRA
                total_carrito += parseFloat(prod.PRECIO_COMPRA * prod.CANTIDAD); 
                prod.precio_a_mostrar = prod.PRECIO_COMPRA;
            }
        });

        // ¡CORREGIDO! Renderiza la vista 'list', no 'add'
        res.render('carrito/add', { 
            productos_en_carrito: productos_en_carrito,
            total_carrito: total_carrito.toFixed(2) 
        });

    } catch (error) {
        console.error(error);
        res.send('Error al cargar el carrito: ' + error.message);
    }
});


// --- RUTA PARA RESTAR 1 DEL CARRITO (POST /carrito/decrease) ---
router.post('/decrease', isLoggedIn, async (req, res)=>{
    const { id_carrito, id_pelicula, tipo_transaccion } = req.body;
    const id_usuario_actual = req.user.ID_USUARIO;
    let connection;

    try {
        connection = await pool.getConnection();

        // Se añade el promisify para la transacción
        const query = promisify(connection.query).bind(connection);
        const beginTransaction = promisify(connection.beginTransaction).bind(connection);
        const commit = promisify(connection.commit).bind(connection);
        const rollback = promisify(connection.rollback).bind(connection);
        await beginTransaction();

        // 1. Devolver 1 al Stock
        let sql_update_stock;
        if (tipo_transaccion === 'RENTA') {
            sql_update_stock = `
                UPDATE PELICULA SET COPIAS_RENTA_DISPONIBLES = COPIAS_RENTA_DISPONIBLES + 1 
                WHERE ID_PELICULA = ?
            `;
        } else {
            sql_update_stock = `
                UPDATE PELICULA SET COPIAS_VENTA_DISPONIBLES = COPIAS_VENTA_DISPONIBLES + 1 
                WHERE ID_PELICULA = ?
            `;
        }
        await query(sql_update_stock, [id_pelicula]); // Usamos 'query'

        // 2. Restar 1 Artículo del Carrito
        await query('UPDATE CARRITO SET CANTIDAD = CANTIDAD - 1 WHERE ID_CARRITO = ? AND ID_USUARIO=?', [id_carrito, id_usuario_actual]); // Usamos 'query'

        // 3. Confirmar
        await commit(); // Usamos 'commit'
        res.redirect('/carrito');

    } catch (error) { 
        if (connection) {
             const rollback = promisify(connection.rollback).bind(connection);
             await rollback();
        }
        console.error(error);
        res.send('Error al restar del carrito: ' + error.message);
    } finally {
        if (connection) connection.release();
    }
});


// --- RUTA PARA BORRAR DEL CARRITO (POST /carrito/delete) ---
router.post('/delete', isLoggedIn,  async (req, res) =>{
    const { id_carrito, id_pelicula, tipo_transaccion, cantidad } = req.body;
    const id_usuario_actual = req.user.ID_USUARIO;
    let connection;

    try{
        connection = await pool.getConnection();

        // Se añade el promisify para la transacción
        const query = promisify(connection.query).bind(connection);
        const beginTransaction = promisify(connection.beginTransaction).bind(connection);
        const commit = promisify(connection.commit).bind(connection);
        const rollback = promisify(connection.rollback).bind(connection);
        
        await beginTransaction();

        // 1. Devolver Stock
        let sql_update_stock;
        if(tipo_transaccion === 'RENTA'){
            sql_update_stock = `
                UPDATE PELICULA SET COPIAS_RENTA_DISPONIBLES = COPIAS_RENTA_DISPONIBLES + ?
                WHERE ID_PELICULA = ? 
            `;
        } else {
            sql_update_stock = `
                UPDATE PELICULA SET COPIAS_VENTA_DISPONIBLES = COPIAS_VENTA_DISPONIBLES + ?
                WHERE ID_PELICULA = ?
            `;
        }
        await query(sql_update_stock, [cantidad, id_pelicula]); // Usamos 'query'

        // 2. Borrar del Carrito
        await query('DELETE FROM CARRITO WHERE ID_CARRITO = ? AND ID_USUARIO = ?', [id_carrito, id_usuario_actual]); // Usamos 'query'
        
        // 3. Confirmar
        await commit(); // Usamos 'commit'
        res.redirect('/carrito');

    } catch (error) { 
        if(connection){
            const rollback = promisify(connection.rollback).bind(connection);
            await rollback();
        }
        console.error(error);
        res.send('Error al eliminar del carrito: ' + error.message);
    } finally{
        if(connection){
            connection.release();
        }
    }
});



module.exports = router;