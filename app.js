const express = require('express');
// const path = require('path');
const socketIO = require('socket.io');
const cors = require('cors');
const passport = require('passport');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const http = require('http');
const db = require('./config/database');

const port = process.env.PORT || 8080;


// create env variable in Heroku
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB || db.database, 
    (err)=>{
    if (err)
        console.log('MongoDB Down');
    else 
        console.log('Connected to Mongo');
}).catch(err => {
    console.log('Error Connecting to Mongo');
});

var app = express();

// Middleware for interprocess communication
app.use(cors());

// Body Parser Middleware
app.use(bodyParser.json());

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Creating Server
var server = http.createServer(app);

// For authentication
require('./config/passport')(passport);

// Listening port
server.listen(port, ()=> {
    console.log(`Connected to port ${port}`);
});