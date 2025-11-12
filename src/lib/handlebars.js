const { format } = require('timeago.js');

const helpers = {};

helpers.timeago = (timestamp) =>{
   return format(timestamp);
};

helpers.gt = function (a, b) {
    return a > b;
};

helpers.eq = function(a,b){
    return a === b;
};

helpers.formatDate = (date) => {
    // formato 
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    // Crea una fecha y la formatea para español
    return new Date(date).toLocaleDateString('es-MX', options);
};

module.exports = helpers;