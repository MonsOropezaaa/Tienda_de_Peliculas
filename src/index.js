const express = require('express');
const morgan = require('morgan');
const exphbs = require('express-handlebars');
const path = require('path');
const flash = require ('connect-flash');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');

const {database} = require('./keys');

const pool = require('./database');

//initializations
const app = express();
require('./lib/passport');

//settings
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir:  path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    extname: '.hbs',
    helpers: require('./lib/handlebars')
}));

app.set('view engine', '.hbs');

//middlewaress
app.use(session({
    secret: 'monseSQL',
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore(database)
}));
app.use(flash());
app.use(morgan('dev'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

//variables globales

app.use((req, res, next) => {
    res.locals.agotado = req.flash('agotado');

    //para que passport lo use
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.message = req.flash('message');
    res.locals.user = req.user || null;  //si el usuario ya esta logueado lo pasa a todas las vistas
    next();
});

//para mostrar los géneros
app.use(async (req, res, next) => {
    try {
        const generos = await pool.query('SELECT NOMBRE FROM GENERO ORDER BY NOMBRE ASC');
        res.locals.generos_global = generos; 
        next();
    } catch (error) {
        console.error("Error al cargar géneros:", error);
        next();
    }
});

//rutas

app.use(require('./routes'));
app.use(require('./routes/authentication'));
app.use('/carrito', require('./routes/carrito'));
app.use('/generos', require('./routes/generos'));
app.use('/peliculas', require('./routes/peliculas'));
app.use('/checkout', require('./routes/pedidos'));
app.use('/admin', require('./routes/admin.js'));
app.use('/search', require('./routes/peliculas'));

// public
app.use(express.static(path.join(__dirname, 'public')));

// starting server 
app.listen(app.get('port'), () =>{
    console.log('Server on port ', app.get('port'));
})