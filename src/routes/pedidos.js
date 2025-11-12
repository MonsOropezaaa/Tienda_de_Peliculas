const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');
const { promisify } = require('util');

router.post('/', isLoggedIn, async (req, res) => {
    
    // Obtenemos el total y el ID del usuario
    const { monto_total } = req.body;
    const { ID_USUARIO } = req.user;

    let connection;
    try {
        connection = await pool.getConnection();
        const query = promisify(connection.query).bind(connection);
        const beginTransaction = promisify(connection.beginTransaction).bind(connection);
        const commit = promisify(connection.commit).bind(connection);
        const rollback = promisify(connection.rollback).bind(connection);
        
       // se inicia la transacción
        await beginTransaction();

        // 1. OBTENER LOS ARTÍCULOS del carrito
        // (Los necesitamos para moverlos a DETALLE_PEDIDO)
        const itemsDelCarrito = await query('SELECT * FROM CARRITO WHERE ID_USUARIO = ?', [ID_USUARIO]);

        // 2. CREAR EL PEDIDO PRINCIPAL
        // (Usamos el monto_total del formulario y el ID_USUARIO)
        const nuevoPedido = { ID_USUARIO, MONTO_TOTAL: monto_total, FECHA_PEDIDO: new Date() };
        const pedidoResult = await query('INSERT INTO PEDIDO SET ?', [nuevoPedido]);
        
        // ¡Guardamos el ID del nuevo pedido! Lo necesitamos para el paso 3.
        const ID_PEDIDO_NUEVO = pedidoResult.insertId;

        // 3. MOVER LOS ARTÍCULOS A DETALLE_PEDIDO
        // (Aquí es donde se usa la tabla DETALLE_PEDIDO)
        // Necesitas un bucle (ej. for...of) para insertar cada artículo...
        for (const item of itemsDelCarrito) {
            // busca el precio de la película...
            const [pelicula] = await query('SELECT PRECIO_RENTA, PRECIO_COMPRA FROM PELICULA WHERE ID_PELICULA = ?', [item.ID_PELICULA]);
             // ...calculas el precio de ESE item...
            const precio_a_guardar = (item.TIPO_DE_TRANSACCION === 'RENTA') ? pelicula.PRECIO_RENTA : pelicula.PRECIO_COMPRA;

            // ...y lo insertas en DETALLE_PEDIDO
            const detalle = {
                PEDIDO_ID: ID_PEDIDO_NUEVO,
                ID_PELICULA: item.ID_PELICULA,
                CANTIDAD: item.CANTIDAD,
                PRECIO: precio_a_guardar, // Guardas el precio de ese momento
                TIPO_DE_TRANSACCION: item.TIPO_DE_TRANSACCION
            };
            await query('INSERT INTO DETALLE_PEDIDO SET ?', [detalle]);
        }
        
        // 4. VACIAR EL CARRITO
        await query('DELETE FROM CARRITO WHERE ID_USUARIO = ?', [ID_USUARIO]);

        // 5. CONFIRMAR LA TRANSACCIÓN
        await commit();

        // 6. REDIRIGIR A UNA PÁGINA DE ÉXITO
        req.flash('success', '¡Compra realizada con éxito!');
        res.redirect('/checkout/exito/' + ID_PEDIDO_NUEVO); // Redirigir al perfil es una buena opción

    } catch (error) {
         if (connection) {
            const rollback = promisify(connection.rollback).bind(connection);
            await rollback();
        }
        console.error(error);
        req.flash('agotado', ' Error al Pagar ');
        req.session.save(() => {
        res.redirect('/carrito'); 
    });
    } finally {
       if (connection) {
            connection.release();
        }
    }
});

router.get('/exito/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params; // Obtenemos el ID del pedido desde la URL

        // 1. Buscamos el pedido en la BD
        const [pedido] = await pool.query('SELECT * FROM PEDIDO WHERE PEDIDO_ID = ?', [id]);

        // 2. ¡AQUÍ CALCULAMOS LA FECHA DE ENTREGA!
        const fechaHoy = new Date();
        const fechaEntrega = new Date(fechaHoy);
        fechaEntrega.setDate(fechaHoy.getDate() + 3); // Le sumamos 3 días

        // 3. Renderizamos una NUEVA vista y le pasamos los datos
        res.render('pedidos/exito', {
            pedido: pedido,
            // Formateamos la fecha para que se vea bonita (ej. "15 de noviembre")
            fecha_entrega_formateada: fechaEntrega.toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });
        
    } catch (error) {
        console.error(error);
        res.send('Error al mostrar la confirmación del pedido.');
    }
});

router.get('/detalle/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params; // ID del Pedido
        const { ID_USUARIO } = req.user;

        // Consulta que une los detalles del pedido con los datos de la película
        const query = `
            SELECT * FROM DETALLE_PEDIDO D
            JOIN PELICULA P ON D.ID_PELICULA = P.ID_PELICULA
            WHERE D.PEDIDO_ID = ? 
            AND D.PEDIDO_ID IN (SELECT PEDIDO_ID FROM PEDIDO WHERE ID_USUARIO = ?)
        `;
        
        // El segundo [ID_USUARIO] es una medida de seguridad,
        // para asegurar que un usuario no pueda espiar pedidos ajenos.
        const detalles = await pool.query(query, [id, ID_USUARIO]);

        // Si no encontramos detalles (o no es tu pedido), te redirigimos
        if (detalles.length === 0) {
            req.flash('error', 'Pedido no encontrado o no te pertenece.');
            return res.redirect('/profile');
        }

        // Renderizamos una nueva vista de "detalle"
        res.render('pedidos/detail', {
            detalles: detalles,
            pedido_id: id
        });

    } catch (error) {
        console.error(error);
        res.send('Error al mostrar el detalle del pedido.');
    }
});


module.exports = router;