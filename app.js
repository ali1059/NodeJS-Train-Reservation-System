//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
var mysql = require("mysql");
const {check, validationResult } = require("express-validator");
var bcrypt = require("bcrypt");

var session = require("express-session");
var MySQLStore = require("express-mysql-session")(session);
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

const saltRounds = 10;



const options = {
  connectionLimit : 10,
  host: "us-cdbr-iron-east-02.cleardb.net",
  user: "b5cc9a8011b24c",
  password: "8213edc3",
  database: "heroku_b43b181742c5259"
};

const con = mysql.createPool(options);

con.on('error', function(err) {
  console.log("I'm dead =>"+ err.toString());
  if(err.fatal){
    console.log("Its FATAL starting again");
    startConnect();
  }
});



var sessionStore = new MySQLStore(options, con);



var user;
const app = express();
app.set("view-engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
//app.use(expressValidator());
app.use(express.static("public"));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  store: sessionStore,
  saveUninitialized: false,
  //cookie: { secure: true }
}));
app.use(passport.initialize());
app.use(passport.session());




passport.use(new LocalStrategy(

  function(username, password, done) {

    user = username;
    console.log("HERE I AM CHECK LOGS");
    console.log(username);
    console.log(password);

    con.query("SELECT id, password from user WHERE username= ? ", [username], function(err, result) {
      if (err) {
        console.log("ERRORif="+err);
        done("ERROR="+err);
      }

      else if (result.length == 0) {
        console.log("ERRORelseif="+err);
        done(null, false);
      } else {
        const hash = result[0].password.toString();
        console.log("HASHED PASS = "+hash+"and password ="+password);
        bcrypt.compare(password, hash, function(err, res) {
          if (res === true) {
            return done(null, {
              user_id: result[0].id
            });
          } else {
            console.log("Failed ="+err);
            return done(null, false);

          }
        });
      }
    });
  }
));

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3306;
}

app.listen(port, function() {
  console.log("Server Started");
});

app.get("/login", function(req, res) {

  res.render("login.ejs");
});

app.get("/", function(req, res) {

  res.render("login.ejs");
});

app.get("/home", authenticationMiddleware(), function(req, res) {
  res.render("home.ejs",{username:user});
});

// app.post('/login',passport.authenticate(
//   'local',{
//     successRedirect:'/home',
//     failureRedirect:'/loginn'
//
//   }));
var fail;
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login'
  })

);

function test(words) {
    var n = words.split(" ");
    return n[n.length - 1];

}

var errors = {};
app.post("/signup",[
  check('username','Username cannot be Empty').not().isEmpty(),
  check('username', 'Username must be between 4-15 characters long.').isLength(4, 15),
  check('email', 'The email you entered is invalid, please try again.').isEmail(),
  check('email', 'Email address must be between 4-100 characters long, please try again.').isLength(4, 100),
  check('pass', 'Password must be between 8-100 characters long.').isLength(8, 100),
  check("pass", "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, "i"),
  check('cnic', 'CNIC must be between 10 to 13 characters long.').isLength(10, 13),
], (req, res) => {

  errors = validationResult(req);
  if (!errors.isEmpty()) {
    err = errors.mapped();
    console.log("=>ERRORS");
    console.log(errors.mapped());
    res.render("signup.ejs",{error1:errors.mapped()});
  }

  else {
  const username = req.body.username;
  const pass = req.body.pass;
  const email = req.body.email;
  const cnic = req.body.cnic;


  console.log(username + "    " + pass + "    " + email + "    " + cnic);
  bcrypt.hash(pass, saltRounds, function(err, hash) {

    var sql = "Insert into user (username,password,email,cnic ) VALUES ('" + username + "','" + hash + "','" + email + "','" + cnic + "')";
    //  var values = [username,pass,email,cnic];
      var duplicateError;
      con.query(sql, function(err, result) {
      if (err) {
      //duplicateError = test(err.message);
      console.log("="+err);
      res.render("signup1.ejs",{ error1:duplicateError });
}
else{
      sql = "Select LAST_INSERT_ID() as user_id";
      con.query(sql, function(err, result) {
        if (err) console.log(err);

        const user_id = result[0];
        console.log("UUUUUU"+user_id);
        req.login(user_id, function(err) {
          res.redirect("/login");
        });
      });
    }
    });
  });
}
});

passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
  done(null, user_id);
});

function authenticationMiddleware() {
  return (req, res, next) => {
    console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

    if (req.isAuthenticated()) return next();
    res.redirect('/login');
  };
}

app.get("/signup", function(req, res) {

  res.render("signup.ejs");
});

app.get("/aboutus",function(req,res){
  res.render("aboutUs.ejs");
});

app.get("/search",function(req,res){
res.render("search.ejs",{data:"get"});
});

app.post("/search",function(req,res){
  const from = req.body.from;
  const to = req.body.to;
  const date = req.body.date;

  let sql = "Select * from trainschedule where trainfrom ='"+from+"' AND trainto = '"+to+"' AND date = '"+date+"'  ";
  con.query(sql,function(err,result){
if(err) console.log(err);


else{
 res.render("search.ejs",{data:result});
}
  });


});

app.get("/schedule",function(req,res){
let sql = "Select * from trainschedule";
con.query(sql,function(error,result){

  if(error){
    console.log(error);
  }
  else{
res.render("schedule.ejs",{data:result});
}
});
});

app.get("/booking/:trainno-:from-:to",function(req,res){
  let trainno = req.params.trainno;
  let from = req.params.from;
  let to = req.params.to;
  res.render("book.ejs",{data:trainno,tfrom:from,tto:to});
  //res.send("<h1>"+req.params.trainno+"</h1>");
});

app.post("/booking",function(req,res){
let name = req.body.name;
let seats = req.body.seats;
let mobileno = req.body.mobileno;
let tNum = req.body.tNo;
let tFrom = req.body.tFrom;
let tTo = req.body.tTo;
let fromShort = cityShort(tFrom);
let toShort = cityShort(tTo);


let sql1 = " select id from user where username='"+ user +"' ";
con.query(sql1,function(error,result){
  if(err) console.log("Error in QUERY");

  let userID = result[0].id;
  inserting(userID);

});


//console.log(name+"','"+mobileno+"','"+seats+"','"+tNum+"','"+ID);
function inserting(ID){
 let sql=" Insert into booking VALUES (NULL,'"+name+"','"+mobileno+"','"+seats+"','"+tNum+"','"+ID+"')";
con.query(sql,function(error,result){
  if(err)console.log(err);
  console.log(err);
});
}

var ic=0;

function bookid(callback){
let quer ="select Booking.bookingid as id from booking INNER JOIN user ON Booking.id =user.id ";
con.query(quer,function(err,result){
  if (err) callback(err,null);
  console.log("--"+result[0].id);
  console.log("1"+ic);

    callback(null,result[0].id);
});
}

var a = bookid(function(err,result){
  if(err){
    console.log("ERROR");
  }
  else{
    ic=result;
    console.log("RESULT = "+result);
let bid = fromShort+"_"+ic+"_"+toShort;

let sql = "select traintype,DATE_FORMAT(date,\'%m-%d-%Y\') as date, atime, dtime from trainschedule where trainno = '"+tNum+"' ";
con.query(sql,function(err,result){
  if(err)console.log(err);
  let type = result[0].traintype;
  let date =result[0].date;
  let atime =result[0].atime;
  let dtime =result[0].dtime;

  res.render("ticket.ejs",{
  Name:name,
  Seats:seats,
  MobileNo:mobileno,
  TrainNo:tNum,
  From:tFrom,
  To:tTo,
  Type:type,
  Date:date,
  Atime:atime,
  Dtime:dtime,
  fromshort:fromShort,
  toshort:toShort,
  bookid:bid
  });
});
}
});
});

function cityShort(name){
if(name === 'Lahore')return "LHR";
else if(name === 'Karachi')return "KAR";
else if(name === 'Islamabad')return "ISL";
else if(name === 'Multan')return "MUL";
else if(name === 'Rawalpindi')return "RWP";
else if(name === 'Havelian')return "HAV";
else if(name === 'Peshawar')return "PSH";
else{
  console.log("Dinga");
}
}

app.get("/logout",function(req,res){
     req.logout();
     req.session.destroy();
     res.redirect("/login");
});
