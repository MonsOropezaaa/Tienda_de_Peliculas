const express = require('express');
const router = express.Router();

router.get('/', (req,res) =>{
    res.send("Heloo World");
});

module.exports = router;