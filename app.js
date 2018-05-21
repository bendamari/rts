const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const pool = require('./db');

const app = express();

app.set ('views', path.join(__dirname, './views'));
app.engine('handlebars', exphbs({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');
app.set('port', (process.env.PORT || 3000));

app.get('/', function (request, response){
  response.render('login', {header: "ברוכים הבאים"});
});

app.get('/orders', function(request, response){

  pool.query('SELECT * FROM public.orde_list', (err, res) => {
      if (err) return console.log(err);

      response.render('orders', {data: res.rows, header: "דף הזמנות"});
  });
});

module.exports = app;
