const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
//database connection requirements
const pool = require('./db');
//authenticate requirements
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
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
app.use(flash());
//app session use integrate with database
app.use(session({
  secret: 'keyboard cat',
  store: new pgSession({
  pool : pool,
  tableName : 'session'
  }),
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}));
app.use(passport.initialize());
app.use(passport.session());



//local Strategy to connect application
passport.use(new LocalStrategy(
  function(username, password, done) {
    // console.log(username);
    // console.log(password);
    var text ='SELECT * FROM test where username=$1 AND password=$2'
    var value = [username,password]
    pool.query(text,value, (err5, res5) => {
      // console.log(res5.rows.length);
       if (err5){done(err5)}
       if(res5.rows.length == 0 ){
         return done(null,false,{message: 'Oops! Mauvais password.'} );
       }
       return done(null,{ username});
    });
  }
));


//login page with status on the console
app.get('/',function (req, res,next){
  // console.log(request.user);
  // console.log(request.isAuthenticated());
  res.render('login',{message: req.flash('error')});
  req.session.messages = null;
});



// app.post('/',function (req, res,next){
//   req.check('username','שם משתמש לא תקין ').notEmpty();
//   var errors = req.validationErrors();
//   if (errors){
//     req.session.errors = errors;
//     req.session.success = false;
//   }
//   else{
//     req.session.success = true;
//   }
//   res.redirect('/');
// });


app.post('/', passport.authenticate('local', {
    successRedirect : '/orders',
    failureRedirect : '/',
    failureFlash : true
}));







// //check if user is exist if so move to order page else redirect
// app.post('/',passport.authenticate(
//     'local',{
//       successRedirect:'/orders',
//       failureRedirect: '/'
//     }
//   )
// )
//loguot from the system and delete session from cookie browser and database
app.get('/logout',function (req, res){
  req.logout();
  req.session.destroy();
  res.redirect('/');
});
//connect to orders only if authenticate and have session parameter
app.get('/orders',authenticationMiddleware(), function(request, response){

  // pool.query('SELECT * FROM public.orde_list', (err, res) => {
  //     if (err) return console.log(err);
  //
  //     response.render('orders', {data: res.rows, header: "דף הזמנות"});
  // });
    response.render('orders');
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
