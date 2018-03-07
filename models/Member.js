const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const _ = require("lodash");

const db = require("../config/database");
const Church = require("./Church");

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
  proPic: {
    data: Buffer,
    contentType: String
  },
  churchId: {
    type: String,
    minlength: 6,
    trim: true
  },
  friends: [
    {
      type: String,
      minlength: 2,
      required: true
    }
  ],
  requests: [
    {
      type: String,
      minlength: 2,
      required: true
    }
  ],
  following: [
    {
      type: String,
      minlength: 2,
      required: true
    }
  ],
  password: {
    type: String,
    minlength: 6,
    required: true
  },
  tokens: [
    {
      access: {
        type: String,
        required: true
      },
      token: {
        type: String,
        required: true
      }
    }
  ]
});

MemberSchema.methods.toJSON = function() {
  var memb = this;
  var membObject = memb.toObject();

  return _.pick(membObject, [
    "_id",
    "name",
    "username",
    "churchId",
    "following",
    "friends",
    "requests"
  ]);
};

MemberSchema.methods.generateAuthToken = function() {
  var memb = this;
  var access = "auth";
  var token = jwt
    .sign(
      {
        _id: memb._id.toHexString(),
        username: memb.username,
        access
      },
      process.env.SECRET || db.secret
    )
    .toString();

  memb.tokens.push({ access, token });
  return memb.save().then(() => {
    return token;
  });
};

MemberSchema.methods.removeToken = function(token) {
  var memb = this;

  return memb.update({
    $pull: {
      tokens: { token }
    }
  });
};

MemberSchema.statics.findByToken = function(token) {
  var Memb = this;
  var decoded;

  console.log("token", token);
  try {
    decoded = jwt.verify(token, process.env.SECRET || db.secret);
  } catch (e) {
    console.log("no member wt verifyj");
    return Promise.reject(e);
  }

  return Memb.findOne({
    username: decoded.username,
    "tokens.token": token,
    "tokens.access": "auth"
  });
};

MemberSchema.statics.findByCredentials = function(username, password) {
  var Memb = this;

  return Memb.findOne({ username }).then(memb => {
    if (!memb) {
      return Promise.reject({success: false, errNo: 7, mssg: "User not found" });
    }

    return new Promise((resolve, reject) => {
      // Use bcrypt.compare to compare password and memb.password
      bcrypt.compare(password, memb.password, (err, res) => {
        if (res) {
          resolve(memb);
        } else {
          reject({success: false, errNo: 6, mssg: "Incorrect Password" });
        }
      });
    });
  });
};

MemberSchema.query.getInfoFriends = function(username) {
  var Memb = this;
  return Memb.findOne({usename})
    .select('friends')
    .then(doc => {
      return Memb.find()
        .where('username')
        .in(doc.friends)
        .select('name username proPic');
    })
}

MemberSchema.query.getInfoFollowings = function(username) {
  var Memb = this;
  return Memb.findOne({usename})
    .select('following')
    .then(doc => {
      return Church.find()
        .where('username')
        .in(doc.following)
        .select('name username proPic');
    })
}

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

var Member = mongoose.model("member", MemberSchema);

module.exports = Member;
