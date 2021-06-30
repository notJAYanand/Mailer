require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
var id = 12;
var temp=0;
var temp1=0;
var temp2 = 0;
var temp3=0;

var myfunc = setInterval(function() {

temp3 = (temp3 + 1)%2;
}, 20000);



var app = express();
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: "This is my secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://kaushik:Kaushik.16@cluster0.vdfxq.mongodb.net/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  date: {
    type: Date,
    default: Date.now
  }
});

const dataSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  subject: String,
  schedule: String,
  client: Object
});

const scheduleSchema = new mongoose.Schema({
  subject: String,
  schedule: String,
  cli: Object
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const UserClient = new mongoose.model("UserClient", dataSchema);
const Schedule = new mongoose.model("Schedule", scheduleSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/mailer",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', function(req, res) {
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ["profile"]
  }));

app.get('/auth/google/mailer',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/main');
  });


app.get('/about',function(req,res){
  res.render("about");
});

app.get('/contact',function(req,res){
  res.render("contact");
});

app.get('/login', function(req, res) {
  res.render("login");
});

app.get('/signup', function(req, res) {
  res.render("signup");
});

app.get('/home', function(req, res) {
  res.render("home");
});

app.get('/history', function(req, res) {
  var yearly = [];
  var weekly = [];
  var monthly = [];
  var recurrent = [];

  var date = new Date();
  if (req.isAuthenticated()) {
    UserClient.find({
      client: req.user._id
    }, function(err, docs) {
      if (err) {
        res.render("main");
      } else {

        docs.forEach(function(doc) {
          if (doc.schedule === "Recurring") {
            recurrent.push(doc);
          } else if (doc.schedule === "Weekly") {
            weekly.push(doc);
          } else if (doc.schedule === "Monthly") {
            monthly.push(doc);
          } else if (doc.schedule === "Yearly") {
            yearly.push(doc);
          }
        });

        // code goes here

        recurrent.forEach(function(rec){
          if(temp3 === 1){
            var inst = new Schedule({
              cli: req.user._id,
              subject: rec.subject,
              schedule: rec.schedule
            });
            inst.save();
            temp3=0;
          }
        });

        weekly.forEach(function(rec){
          if(date.getDay() === rec.date.getDay() && temp === 0){
          var inst = new Schedule({
            cli: req.user._id,
            subject: rec.subject,
            schedule: rec.schedule
          });
          inst.save();
          temp=1;
        }else {
          if(date.getDay() === rec.date.getDay() && date.getDate() !== rec.date.getDate()){
            temp=0;
          }
        }
        });

        monthly.forEach(function(rec){
          if(date.getDate() === rec.date.getDate() && temp1 === 0 ){
          var inst = new Schedule({
            cli: req.user._id,
            subject: rec.subject,
            schedule: rec.schedule
          });
          inst.save();
          temp1=1;
        }else{
          if(date.getMonth() !== rec.date.getMonth() && date.getDate() === rec.date.getDate()){
            temp1=0;
          }
        }
        });

        yearly.forEach(function(rec){
          if(date.getDate() === rec.date.getDate() && date.getMonth() === rec.date.getMonth() && temp2 === 0){
            var inst = new Schedule({
              cli: req.user._id,
              subject: rec.subject,
              schedule: rec.schedule
            });
            inst.save();
            temp2=1;
          }else{
            if(date.getDate() === rec.date.getDate() && date.getMonth() === rec.date.getMonth() && date.getYear() !== rec.date.getYear()){
              temp2=0;
            }
          }
        });

      Schedule.find({cli: req.user._id},function(err,docs){

        res.render("history", {
          docs:docs
        });
      });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get('/main', function(req, res) {

  if (req.isAuthenticated()) {
    UserClient.find({
      client: req.user._id
    }, function(err, docs) {
      if (err) {
        res.render("main");
      } else {
        res.render("main", {
          docs: docs
        });
      }
    });

  } else {
    res.redirect("/login");
  }
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


app.get('/create', function(req, res) {
  if (req.isAuthenticated()) {
    res.render("create");
  } else {
    res.redirect("/login");
  }
});

app.post('/create', function(req, res) {
  // console.log(req.params.id);

  const date = new Date();
  const subject = req.body.subject;
  const schedule = req.body.schedule;
  const data = new UserClient({
    subject: subject,
    schedule: schedule,
    date: date,
    client: req.user._id
  });
  console.log(id);
  console.log(data.client);
  data.save();
  res.redirect('/main');
});

app.post('/login', function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect('/main');
      });
    }
  });

});

app.post('/signup', function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      id = user._id;
      passport.authenticate("local")(req, res, function() {
        res.redirect('/main');
      });
    }
  });
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Started");
});
