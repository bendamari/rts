const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');

//database connection requirements
const pool = require('./db');

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
    pool.query('INSERT INTO customers(c_name) VALUES ($1)', [req.body.customer_name], (err, res) => {
     if (err) return console.log(err);
     });
    res.redirect('/orders');
});

//check if user is exist if so move to order page else redirect
app.post('/', passport.authenticate('local', {
    successRedirect : '/orders',
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
      response.render('orders', {data: res.rows,userProfile:request.user.profile, header: "דף הזמנות"});
   });
});

app.get('/workers', authenticationMiddleware(), function(request, response){
   pool.query('SELECT * FROM public.workers_list', (err, res) => {
      if (err) return console.log(err);
      response.render('workers', {workers_list: res.rows,userProfile:request.user.profile, header: "רשימת עובדים"});
   });
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
module.exports = app;
