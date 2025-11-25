module.exports = {
    database: {
        host: process.env.DB_HOST || 'localhost', 
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'monseSQL',
        database: process.env.DB_NAME || 'tienda_peliculas',
        port: process.env.DB_PORT || 3306
    }
};