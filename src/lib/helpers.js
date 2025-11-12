const helpers = {};
const bcrypt = require('bcryptjs');

//registro
helpers.encryptPassword= async (password)=>{
    const salt = await bcrypt.genSalt(10);  //se genera un patron
    const hash = await bcrypt.hash(password, salt);  //cifra la contraseña
    return hash;
};

//login

helpers.matchPassword = async(password, savedPassword) =>{
    try{
      return await bcrypt.compare(password, savedPassword);

    }catch(e){
        console.log(e);
        return false;
    }
};

module.exports= helpers;