const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const db = require("../config/database");

var MemberSchema = new mongoose.Schema({
    name: {
        type: String,
        minlength: 2,
        required: true
    },
    username: {
        type: String,
        minlength: 6,
        required: true,
        unique: true,
        trim: true
    },
    churchId: {
        type: String,
        minlength: 6,
        trim: true
    },
    friends: [{
        name: {
            type: String,
            minlength: 2,
            required: true
        },
        username: {
            type: String,
            minlength: 2,
            required: true
        }
    }],
    following: [{
        churchName : {
            type: String,
            minlength: 2,
            required: true
        },
        churchId: {
            type: String,
            minlength: 2,
            required: true
        }
    }],
    followers: [{
      churchName : {
          type: String,
          minlength: 2,
          required: true
      },
      churchId: {
          type: String,
          minlength: 2,
          required: true
      }
  }],
    password: {
        type: String,
        minlength: 6,
        required: true
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

MemberSchema.methods.toJSON = function () {
    var memb = this;
    var membObject = memb.toObject();
  
    return _.pick(membObject, 
      ['_id', 'name', 'username', 'churchId', 
      'following', 'friends', 'followers']);
};

MemberSchema.methods.generateAuthToken = function () {
    var memb = this;
    var access = 'auth';
    var token = jwt.sign(
      {_id: memb._id.toHexString(),
        username: memb.username,
        access}, 
      process.env.SECRET || db.secret)
      .toString();
  
    memb.tokens.push({access, token});
    return memb.save().then(() => {
      return token;
    });
  };
  
  MemberSchema.methods.removeToken = function (token) {
    var memb = this;
  
    return memb.update({
      $pull: {
        tokens: {token}
      }
    });
  };
  
  MemberSchema.statics.findByToken = function (token) {
    var Memb = this;
    var decoded;
  
    try {
      decoded = jwt.verify(token, 
          process.env.SECRET || db.secret);
    } catch (e) {
      console.log("no member wt verifyj");
      return Promise.reject(e);
    }
  
    return Memb.findOne({
      'username': decoded.username,
      'tokens.token': token,
      'tokens.access': 'auth'
    });
  };
  
  MemberSchema.statics.findByCredentials = function (username, password) {
    var Memb = this;
  
    return Memb.findOne({username}).then((memb) => {
      if (!memb) {
        return Promise.reject({errNo: 7, mssg: 'User not found'});
      }
  
      return new Promise((resolve, reject) => {
        // Use bcrypt.compare to compare password and memb.password
        bcrypt.compare(password, memb.password, (err, res) => {
          if (res) {
            resolve(memb);
          } else {
            reject({errNo: 6, mssg: 'Incorrect Password'});
          }
        });
      });
    });
  };
  



// Hashing Password before Saving
MemberSchema.pre("save", function(next) {
    var memb = this;
  
    if (memb.isModified("password")) {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(memb.password, salt, (err, hash) => {
            memb.password = hash;
          next();
        });
      });
    } else {
      next();
    }
  });
  
  var Member = mongoose.model('member', MemberSchema);
  
  module.exports = Member;
  