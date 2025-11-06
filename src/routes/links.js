const express = require('express');
const router = express.Router();

const pool = require('../database'); //conecction to bd

router.get('/add', (req,res) =>{
    res.render('carrito/add');
});

router.post('/add', (req,res) => {
    res.send('received');
});

module.exports = router;