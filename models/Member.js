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
  proPic: {
    type: String,
    required: true
  },
  email: String,
  emailVerified: {
    type: Boolean,
    default: false
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
  isLeader: {
    type: Boolean,
    default: false
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
  newNotifications: {
    type: Number,
    default: 0
  },
  notifications: [{
    who: String,
    by: String,
    body: String,
    date: Date
  }],
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
    "isLeader",
    "username",
    "churchId",
    "following",
    "friends",
    "requests",
    "proPic",
    "pendingReq",
    "pendingMemb",
    "newNotifications",
    "notifications"
  ]);
};

MemberSchema.methods.generateAuthToken = function() {
  var memb = this;
  var access = "auth";
  console.log('123');
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
    console.log('123');
  memb.tokens.push({ access, token });
  return memb.save().then(() => {
    console.log('123');
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
  var prayerReq;
  var doc;
  console.log(username, mychurch, myusername);
  return Memb.findOne({username})
    .select('proPic username name isLeader churchId following friends')
    .then(d => {
      doc = d;
      console.log('1', doc);
      if(!doc) {
        throw "Error";
      }
      console.log('1', doc);
      member = _.pick(doc , ["proPic", "isLeader", "username", "name", "churchId"]);
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
    }).then(pR => {
      prayerReq = pR;
      return {member, prayerReq}
    });
}

MemberSchema.query.updateProfile = function(username, updatedPro) {
  var Memb = this;

  console.log(username, updatedPro);
  return Memb.findOneAndUpdate({username},{
    $set: {
      name: updatedPro.name,
      proPic: updatedPro.proPic
    }
  })
};

MemberSchema.query.getInfoFriends = function(username) {
  var Memb = this;
  return Memb.findOne({ username })
    .select("friends")
    .then(doc => {
      return Memb.find()
        .where("username")
        .in(doc.friends)
        .select("name username proPic");
    });
};

MemberSchema.query.getInfoFollowings = function(username, Church) {
  var Memb = this;
  return Memb.findOne({ username })
    .select("following")
    .then(doc => {
      return Church.find()
        .where("churchId")
        .in(doc.following)
        .select("churchName churchId proPic");
    });
};

MemberSchema.query.sendFriendReq = function(username, friendId) {
  var Memb = this;
  console.log(username, friendId);
  // newNotification = {
  //   who: username,
  //   by: 'user',
  //   body: "send you friend request",
  //   date: new Date()
  // }
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
        },
        $inc : {
          newNotifications: 1
        }
      }
    );
  });
};

MemberSchema.query.handleFriendReq = function(username, friendId, approval) {
  var Memb = this;
  console.log(username, friendId, approval);
  if (approval) {
    newNotification = {
      who: username,
      by: 'user',
      body: "accepted your friend request",
      date: new Date()
    }
    console.log('123');
    return Memb.findOneAndUpdate(
      { username:  friendId},
      {
        $pull: {
          pendingReq: { id: username }
        },
        $push: {
          friends: username,
          notifications: newNotification
        },
        $inc : {
          newNotifications: 1
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

MemberSchema.query.getbasicdetails = function(username) {
  var Memb = this;
  return Memb.findOne({username})
    .select('name proPic isLeader churchId friends pendingReq pendingMemb requests following newNotifications');
}

MemberSchema.query.getNotificatiions = function(username, Church) {
  var Memb = this;
  var list;
  var basicInfo;
  var churches = [];
  return Memb.findOne({username})
    .select('notifications requests')
    .then(doc => {
      list = doc;
      // console.log(doc.notifications);
      if(doc.notifications.length >= 20) {
        var diff = doc.notifications.length - 20;
        doc.notifications = doc.notifications.splice(diff, doc.notifications.length);
        Member.findOneAndUpdate({username}, {
          $unset: {
            notifications: []
          },
          $set: {
            notifications: doc.notifications
          }
        })
      }
      var usersNotify = doc.notifications.filter(o => {
        // console.log('o', o)
        if(o.by == 'user') {
          return true;
        }
      })
      var users = usersNotify.map(o => o.who);
      // console.log('users', users);
      var churchesNotify = doc.notifications.filter(o => {
        if(o.by == 'church') {
          return true;
        }
      })
      churches = churchesNotify.map(o => o.who)
      console.log('churches', churches);
      return Member.find().getBasicInfo([...doc.requests, ...users])
    }).then(bI => {
      basicInfo = bI;
      console.log('info', basicInfo);
      return Church.find({
        churchId: {
          $in: churches
        }
      }).select('churchName churchId proPic')
    }).then( churchInfo => {
      console.log('lisss', list, basicInfo, churchInfo);
      return {list, basicInfo, churchInfo};
    });
}

// MemberSchema.query.pushNotifications = function(username, newNotification) {
//   var Member = this;

//   return Member.findOneAndUpdate({username}, {
//     $push : {
//       notifications: newNotification
//     },
//     $inc: {
//       newNotifications : 1
//     }
//   });
// }

MemberSchema.query.addNewNotify = function(username) {
  var Member = this;

  return Member.findOneAndUpdate({username}, {
    $inc: {
      newNotifications : 1
    }
  });
}

MemberSchema.query.clearNewNotify = function(username) {
  var Member = this;

  return Member.findOneAndUpdate({username}, {
    $set: {
      newNotifications : 0
    }
  });
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
