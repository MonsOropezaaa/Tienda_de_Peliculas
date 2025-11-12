const express = require('express');
const router = express.Router();
const passport= require('passport');
const pool = require('../database')
const {isNotLoggedIn, isLoggedIn} = require('../lib/auth');

router.get('/signup', isNotLoggedIn, (req, res)=>{
    res.render('auth/signup');
});

router.post('/signup', isNotLoggedIn, passport.authenticate('local.signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true

}));

router.get('/signin', isNotLoggedIn, (req,res) =>{
    res.render('auth/signin');
});

router.post('/signin', isNotLoggedIn, (req, res, next) =>{
    passport.authenticate('local.signin',(err, user, info) =>{
        if(err){ //si ocurre algún error, por ejemplo que la base se caiga
            return next(err);
        }

        if(!user){ //si la autenticación del usuario falla
            req.flash('error', info.message);
            return res.redirect('/signin');
        }

        req.logIn(user, (err) =>{  //si todo sale bien, se logea el usuario
            if(err){
                return next(err);
            }

            if(user.ROL === 'ADMIN'){
                return res.redirect('/admin/dashboard'); 
            }else{
                return res.redirect('/profile');
            }
        });

    })(req, res, next);
});

router.get('/profile', isLoggedIn, async(req, res) => {
    try{
        // Se obtine el ID del usuario que está en la sesión
        const ID_USUARIO = req.user.ID_USUARIO;

        // Se buscan sus pedidos en la BD
        const pedidos = await pool.query('SELECT * FROM PEDIDO WHERE ID_USUARIO = ? ORDER BY FECHA_PEDIDO DESC', [ID_USUARIO]);

        // Se muestran todos los pedidos en pantalla
        res.render('auth/profile', { pedidos: pedidos });
    }catch(error){
        console.error(error);
        res.send('Error al cargar el perfil.');
    }
    
});

router.get('/logout', (req, res, next) =>{
    //se limpia la sesión
    req.logOut(function(err){
        if(err){
            return next(err);
        }
        req.flash('success', 'Has cerrado tu sesión');
        res.redirect('/signin');
    });
});

module.exports = router;