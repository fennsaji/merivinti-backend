const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const _ = require("lodash");

const db = require("../config/database");
const Church = require("./Church");
const Prayer = require("./Prayers");

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
    trim: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\-]+$/.test(v);
      },
      message: "{VALUE} is not a valid id!"
    }
  },
  proPic: String,
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
  pendingMemb: String,
  pendingReq: [
    {
      id: String,
      type: {
        type: String,
        default: "Church"
      }
    }
  ],
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
    "name",
    "username",
    "churchId",
    "following",
    "friends",
    "requests",
    "proPic",
    "pendingReq",
    "pendingMemb"
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
    _id: decoded._id,
    username: decoded.username,
    "tokens.token": token,
    "tokens.access": "auth"
  });
};

MemberSchema.statics.findByCredentials = function(username, password) {
  var Memb = this;

  return Memb.findOne({ username }).then(memb => {
    if (!memb) {
      return Promise.reject({
        success: false,
        errNo: 7,
        mssg: "User not found"
      });
    }

    return new Promise((resolve, reject) => {
      // Use bcrypt.compare to compare password and memb.password
      bcrypt.compare(password, memb.password, (err, res) => {
        if (res) {
          resolve(memb);
        } else {
          reject({ success: false, errNo: 6, mssg: "Incorrect Password" });
        }
      });
    });
  });
};

MemberSchema.query.getDetails = function(username, myusername, mychurch) {
  var Memb = this;
  var member;
  return Memb.findOne({username})
    .select('proPic username name churchId following friends')
    .then(doc => {
      if(!doc) {
        throw "Error";
      }
      console.log('1', doc);
      member = _.pick(doc , ["proPic", "username", "name", "churchId"]);
      member.noOfFriends = doc.friends.length;
      member.noOfFollowing = doc.following.length;
      console.log('2');
      var friendInd = doc.friends.indexOf(myusername);
      var followInd = doc.following.indexOf(mychurch);
      console.log('1', friendInd, followInd);
      if(friendInd > -1 || (mychurch === doc.churchId) || username === myusername) {
        console.log('1');
        return Prayer.find({username});
      } else if(followInd > -1){
        console.log('2');
        return Prayer.find({username})
          .where('type').equals('followers');
      } else {
        console.log('3');
        return Prayer.find({username})
         .where('type').equals('global');
      }
    }).then(prayerReq => {
      return {member, prayerReq}
    });
}

MemberSchema.query.getInfoFriends = function(username) {
  var Memb = this;
  return Memb.findOne({ usename })
    .select("friends")
    .then(doc => {
      return Memb.find()
        .where("username")
        .in(doc.friends)
        .select("name username proPic");
    });
};

MemberSchema.query.getInfoFollowings = function(username) {
  var Memb = this;
  return Memb.findOne({ username })
    .select("following")
    .then(doc => {
      return Church.find()
        .where("username")
        .in(doc.following)
        .select("name username proPic");
    });
};

MemberSchema.query.sendFriendReq = function(username, friendId) {
  var Memb = this;
  console.log(username, friendId);
  return Memb.findOneAndUpdate(
    { username: username },
    {
      $push: {
        pendingReq: { id: friendId, type: "Friend" }
      }
    }
  )
  .then(d => {
    console.log('123');
    return Member.findOneAndUpdate(
      { username: friendId },
      {
        $push: {
          requests: username
        }
      }
    );
  });
};

MemberSchema.query.handleFriendReq = function(username, friendId, approval) {
  var Memb = this;
  console.log(username, friendId, approval);
  if (approval) {
    console.log('123');
    return Memb.findOneAndUpdate(
      { username:  friendId},
      {
        $pull: {
          pendingReq: { id: username }
        },
        $push: {
          friends: username
        }
      }
    ).then(d => {
      console.log('123');
      return Member.findOneAndUpdate(
        { username },
        {
          $pull: {
            requests: friendId
          },
          $push: {
            friends: friendId
          }
        }
      );
    });
  } else {
    console.log('123');
    return Memb.findOneAndUpdate(
      { username: friendId },
      {
        $pull: {
          pendingReq: { id: username }
        }
      }
    ).then(d => {
      console.log('123');
      return Member.findOneAndUpdate(
        { username },
        {
          $pull: {
            requests: friendId
          }
        }
      );
    });
  }
};

MemberSchema.query.cancelFriendReq = function(username, friendId) {
  var Memb = this;
  return Memb.findOneAndUpdate(
    { username },
    {
      $pull: {
        pendingReq: { id: friendId }
      }
    }
  ).then(d => {
    return Member.findOneAndUpdate(
      { username: friendId },
      {
        $pull: {
          requests: username
        }
      }
    );
  });
};

MemberSchema.query.unfriend = function(username, friendId) {
  var Memb = this;
  return Memb.findOneAndUpdate(
    { username: friendId },
    {
      $pull: {
        friends: username
      }
    }
  ).then(d => {
    return Member.findOneAndUpdate(
      { username },
      {
        $pull: {
          friends: friendId
        }
      }
    );
  });
};

MemberSchema.query.search = function(query, username) {
  var Memb = this;
  var results = [];
  return Memb.find({
    $or: [
      {
        username: new RegExp("^" + query ,"i")
      },
      {
        name: new RegExp("^" + query ,"i")
      }
    ],
    username: {$ne: username}
  }).select('name username proPic')
  .limit(20)
  .then(res => {
    results = res;
    return Memb.find({
      $or: [
        {
          username: new RegExp(".*" + query + ".*", "i")
  
        },
        {
          name: new RegExp(".*" + query + ".*", "i")
        }
      ],
      username: {$ne: username}
    }).select('name username proPic')
    .limit(20);
  }).then(res => {
    results.push(...res);
    console.log(results);
    results = results.filter((doc, index, self) => 
      index === self.findIndex((d) => (d.username === doc.username))
    )
    console.log(results);
    return results.slice();
  });
}

MemberSchema.query.getBasicInfo = function(membArr) {
  var Memb = this;
  return Memb.find({
    username: {
      $in: membArr
    }
  }).select('proPic username name');
}

MemberSchema.query.getfriends = function(username) {
  var Memb = this;
  return Memb.findOne({username})
    .select('friends pendingReq pendingMemb requests following');
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
