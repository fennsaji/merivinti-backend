const express = require('express');
// const socketIO = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const http = require('http');
const db = require('./config/database');
const fs = require('fs');

const port = process.env.PORT || 8080;


// create env variable in Heroku
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB || db.database, (err) => {
    if(!err) {
        console.log("Connected to Mongo");

    }
  })
  .catch(err => {
    console.log("Error Connecting to Mongo");
  });

var app = express();

// Middleware for interprocess communication
app.use(cors());

app.use(express.static(__dirname + '/public'));

// Body Parser Middleware
app.use(bodyParser.json());

// Creating Server
var server = http.createServer(app);

// Routes for authentication
const authenticate = require('./routes/authenticate');
app.use('/auth', authenticate);

// Routes for prayer Requests
const prayers = require("./routes/prayers");
app.use('/prayer', prayers);

// Routes for church profile
const church = require("./routes/profile/church");
app.use('/church', church);

// Routes for member profile
const member = require("./routes/profile/member");
app.use('/member', member);

// Routes for owner
const owner = require("./routes/profile/owner");
app.use('/owner', owner);

// Listening port
server.listen(port, ()=> {
    console.log(`Connected to port ${port}`);
    fs.writeFile('test.txt', 'This ia as', (err) => {
        if(err)
        console.log('error');
        console.log('DOne');
    })
});