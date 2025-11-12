const passport = require('passport');
const localStrategy = require('passport-local').Strategy;

const pool = require('../database');
const helpers = require('../lib/helpers');

passport.use('local.signin', new localStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, email, password, done) =>{
    console.log("intentando iniciar sesión con:", email);
    const rows = await pool.query('SELECT * FROM USUARIO WHERE EMAIL= ?', [email]);

    if(rows.length >0){
        //si el usuario existe, preparamos el inico de sesión
        const user = rows[0];

        //usamos matchPassword para validar la contraseña
        const validPassword = await helpers.matchPassword(password, user.PASSWORD);
        if(validPassword){
            return done(null, user);
        }else{
            return done(null, false, {message: 'Contraseña Incorecta'});
        }

    }else{
        return done(null, false, {message: 'El email no esta registrado'});
    }
}));


passport.use('local.signup', new localStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, username, password, done) =>{
    const {email} = req.body;
    const newUser = {
       EMAIL: email,
       PASSWORD: password,
       NOMBRE: username

    };
    newUser.PASSWORD= await helpers.encryptPassword(password);  //con esto se cifra la contraseña
    const result = await pool.query('INSERT INTO USUARIO SET ?', [newUser]);
    newUser.ID_USUARIO = result.insertId;
    return done(null, newUser);
}));


passport.serializeUser((user, done) =>{
    done(null, user.ID_USUARIO);
});

passport.deserializeUser(async (id, done) =>{
    const rows = await pool.query('SELECT * FROM USUARIO WHERE ID_USUARIO = ?', [id]);
    done(null, rows[0]);
});