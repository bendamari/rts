const http = require('http');
const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');

//database connection requirements
const pool = require('./db');

//run bash command from node.js
var sh = require('shelljs');

//auto reload node app and webpage
const reload = require('reload');

//authenticate requirements
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('express-flash-messages');
const pgSession = require('connect-pg-simple')(session);
const expressValidator = require('express-validator');

//express app
const app = express();

//app setting
app.set ('views', path.join(__dirname, './views'));
app.engine('handlebars', exphbs({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');
app.set('port', (process.env.PORT || 3000));

//app using
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(expressValidator());

//app session use integrate with database
app.use(session({
  secret: 'keyboard cat',
  store: new pgSession({
  pool : pool,
  tableName : 'session'
  }),
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
//this function pass if user is authenticate and based of that desplay botton
app.use(function(req,res,next){
  res.locals.isAuthenticated=req.isAuthenticated();
  next();
});

//local Strategy to connect application
passport.use(new LocalStrategy(
  function(username, password, done) {
    // console.log(username);
    // console.log(password);
    var text ='SELECT * FROM users where username=$1 AND password=$2'
    var value = [username,password]
    pool.query(text,value, (err5, res5) => {
      // console.log(res5.rows.length);
       if (err5){done(err5)}
       if(res5.rows.length == 0 ){
         return done(null, false,{message:'שם משתמש או סיסמה לא תקינים'});
       }
       var profile = res5.rows[0].profile;
       return done(null,{username,profile});
    });
  }
));

//login page with status on the console
app.get('/',function (req, res, next){
  const flashMessages = res.locals.getMessages();
  console.log(res.locals.getMessages());
  //console.log(res);
    if(flashMessages.error){
      console.log(flashMessages.error);
      res.render('login',{
        showErrors:true,
        errors: flashMessages.error
      });
    }
    else{
      res.render('login');
    }
});

// add new order
app.post('/add', function(req, res){
    pool.query('INSERT INTO customers(c_name) VALUES ($1,$2,$3,$4)', [req.body.worker_name,req.body.worker_last_name,req.body.worker_tel,req.body.worker_tel], (err, res) => {
     if (err) return console.log(err);
     });
    res.redirect('/orders');
});

// add new rfid tag
app.post('/add_rfid', function(req, res){
    pool.query('INSERT INTO rfid_live(tag_epc, tag_name, tag_time) VALUES ($1,$2,$3)', [req.body.tag_epc, req.body.tag_name,'time'], (err, res) => {
     if (err) return console.log(err);
     });
    res.redirect('/rfid_live');
});

// delete all rown in rfid table
app.post('/delete_rfid_table', function(req, res){
    pool.query('TRUNCATE rfid; DELETE FROM rfid;', (err, res) => {
     if (err) return console.log(err);
     });
    res.redirect('/rfid_list');
});

// delete all rown in rfid_live table
app.post('/delete_rfid_live', function(req, res){
    pool.query('TRUNCATE rfid_live; DELETE FROM rfid_live;', (err, res) => {
     if (err) return console.log(err);
     });
    res.redirect('/rfid_live');
});

// run rfid reader
app.post('/run_rfid', function(req, res){
    var output = sh.exec("sudo sh ~/cdm/db_test_remote.sh",{silent:true,async:false}).output;
    console.log(output);
    res.redirect('/rfid_live');
});

//check if user is exist if so move to order page else redirect
app.post('/', passport.authenticate('local', {
    successRedirect : '/rfid_list',
    failureRedirect : '/',
    badRequestMessage: 'אין ערכים בשדות',
    failureFlash : true
}));

//loguot from the system and delete session from cookie browser and database
app.get('/logout',function (req, res){
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

app.get('/orders', authenticationMiddleware(), function(request, response){
   pool.query('SELECT * FROM public.customers_oreders', (err, res) => {
      if (err) return console.log(err);
      response.render('orders', {data: res.rows, userProfile:request.user.profile, header: "דף הזמנות"});
   });
});

app.get('/workers', authenticationMiddleware(), function(request, response){
   pool.query('SELECT * FROM public.workers_list', (err, res) => {
      if (err) return console.log(err);
      response.render('workers', {workers_list: res.rows, userProfile:request.user.profile, header: "רשימת עובדים"});
   });
});

app.get('/rfid_list', authenticationMiddleware(), function(request, response){
   pool.query('SELECT * FROM public.rfid', (err, res) => {
      if (err) return console.log(err);
      response.render('rfid_list', {rfid_list: res.rows, userProfile:request.user.profile, header: "רשימת תגים"});
   });
});

app.get('/rfid_live', authenticationMiddleware(), function(request, response){
  var epc_id = 0;
  pool.query('SELECT * FROM public.rfid', (err, res) => {
     if (err) return console.log(err);
     //console.log(res.rows.length);
     if (res.rows.length > 0){
       epc_id = res.rows[0].epc_id;
     }
  });
   pool.query('SELECT * FROM public.rfid_live', (err, res) => {
      if (err) return console.log(err);
      response.render('rfid_live', {rfid_live: res.rows, epc_id: epc_id, userProfile:request.user.profile, header: "פריטים בנקודת ענין"});
   });

});

app.post('/add_worker', function(req, res){
    var insert_worker ='INSERT INTO workers(w_name,w_last_name,w_phone,w_email) VALUES ($1,$2,$3,$4)'
    var worker_values = [req.body.worker_name,req.body.worker_last_name,req.body.worker_tel,req.body.worker_mail]
    pool.query(insert_worker,worker_values, (err, res) => {
     if (err) return console.log(err);
     });
    res.redirect('/workers');
});

//passport function must be on the end of the page
passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
    done(null, user_id);
});

function authenticationMiddleware () {
	return (req, res, next) => {
		console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);
      //if true move to the next function
	    if (req.isAuthenticated()) return next();
	    res.redirect('/')
	}
};

reload(app);
module.exports = app;
