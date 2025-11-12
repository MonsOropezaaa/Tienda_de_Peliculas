module.exports = {

    // Esta función protege rutas que SÓLO pueden ver los NO logueados
    // (Como /signin y /signup)
    isNotLoggedIn(req, res, next) {
        if (!req.isAuthenticated()) {
            // Si NO está autenticado, que continúe
            return next();
        }
        // Si SÍ está autenticado, lo mandamos a su perfil
        return res.redirect('/profile');
    },

    // (Más adelante, cuando crees la vista de /profile, usarás esta otra)
    isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        return res.redirect('/signin');
    }

};