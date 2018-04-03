const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const Member = require("./Member");
const Prayer = require("./Prayers");

var ChurchSchema = new mongoose.Schema({
  churchName: {
    type: String,
    required: true
  },
  churchId: {
    type: String,
    required: true,
    trim: true,
    minlength: 6,
    unique: true,
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
  ],
  leaders: [
    {
      leadId: {
        type: String,
        minlength: 6,
        required: true
      },
      type: {
        type: String,
        required: true,
        default: "Secondary"
      }
    }
  ],
  members: [
    {
      type: String,
      minlength: 6,
      required: true
    }
  ],
  followers: [
    {
      type: String,
      minlength: 2,
      required: true
    }
  ],
  requests: [
    {
      username: {
        type: String,
        minlength: 6,
        required: true
      },
      desig: {
        type: String,
        default: "Member"
      }
    }
  ],
  newNotifications: {
    type: Number,
    default: 0
  },
  families: [
    {
      headName: {
        type: String,
        minlength: 2,
        required: true
      },
      fmemb: [
        {
          name: {
            type: String,
            minlength: 2,
            required: true
          },
          relation: {
            type: String,
            minlength: 2,
            required: true
          }
        }
      ],
      gender: {
        type: String,
        minlength: 1,
        required: true
      }
    }
  ]
});

ChurchSchema.methods.toJSON = function() {
  var user = this;
  var userObject = user.toObject();
  var newObject = _.pick(userObject, [
    "_id",
    "churchName",
    "churchId",
    "members",
    "families",
    "followers",
    "requests",
    "proPic",
    "leaders",
    "newNotifications"
  ]);

  return newObject;
};

// add Token
ChurchSchema.methods.pushToken = function(token) {
  var church = this;
  console.log("token saved1");
  church.tokens.push({ access: "auth", token });

  return church.save().then(() => {
    console.log("token saved");
    return token;
  });
};

// Remove Token
ChurchSchema.methods.removeToken = function(token) {
  var church = this;

  return church.update({
    $pull: {
      tokens: { token }
    }
  });
};

// Find Token
ChurchSchema.statics.findByToken = function(token) {
  var Church = this;
  var decoded;

  try {
    decoded = jwt.verify(token, process.env.SECRET || db.secret);
    console.log("finding token", decoded);
  } catch (e) {
    return Promise.reject();
  }

  return Church.findOne({
    "leaders.leadId": decoded.username,
    "leaders._id": decoded._id,
    "tokens.token": token,
    "tokens.access": "auth"
  });
};

// Find leader
ChurchSchema.statics.findByCredentials = function(churchId, username) {
  var Church = this;

  return Church.findOne({ churchId }).then(church => {
    if (!church) {
      console.log("Rejected");
      return Promise.reject({
        success: false,
        errNo: 0,
        mssg: "No such Church found"
      });
    }

    var churchInd = church.leaders.findIndex(lead => lead.leadId == username);
    var membInd = church.members.indexOf(username);

    if (churchInd == -1 && membInd == -1) {
      return Promise.reject({
        success: false,
        errNo: 1,
        mssg: "Neither leader nor member"
      });
    } else if (membInd > -1) {
      return Promise.resolve({ church, memb: church.members[membInd] });
    } else if (churchInd > -1) {
      return Promise.resolve({ church, memb: undefined });
    }
  });
};

// Queries
// Member
ChurchSchema.query.sendMemberReq = function(churchId, username) {
  var Church = this;
  // newNotification = {
  //   who: username,
  //   by: 'user',
  //   body: "send you member request",
  //   date: new Date()
  // }
  console.log(churchId, username);
  return Member.findOneAndUpdate(
    { username },
    {
      $set: {
        pendingMemb: churchId
      }
    }
  ).then(d => {
    console.log(d);
    return Church.findOneAndUpdate(
      { churchId },
      {
        $push: {
          requests: {username}
        },
        $inc : {
          newNotifications : 1
        }
      }
    );
  });
};

ChurchSchema.query.handleMembReq = function(churchId, username, approval) {
  if(!username || !churchId)
  return;
  var Church = this;
  newNotification = {
    who: churchId,
    by: 'church',
    body: "accepted you member request",
    date: new Date()
  }

  if (approval) {
    return Member.findOneAndUpdate(
      { username },
      {
        $unset: {
          pendingMemb: ""
        },
        $set: {
          churchId
        },
        $push: {
          notifications: newNotification
        },
        $inc: {
          newNotifications: 1
        }
      }
    ).then(d => {
      Prayer.updateMany(
        { username },
        {
          $set: {
            churchId
          }
        }
      )
        .then(() => {
          console.log("added churchId");
        })
        .catch(() => {
          console.log("could not add church");
        });

      return Church.findOneAndUpdate(
        { churchId },
        {
          $pull: {
            requests: { username }
          },
          $addToSet: {
            members: username
          }
        }
      );
    });
  } else {
    return Member.findOneAndUpdate(
      { username },
      {
        $unset: {
          pendingMemb: ""
        }
      }
    ).then(d => {
      return Church.findOneAndUpdate(
        { churchId },
        {
          $pull: {
            requests: { username }
          }
        }
      );
    });
  }
};

ChurchSchema.query.cancelMembReq = function(churchId, username) {
  var Church = this;
  return Member.findOneAndUpdate(
    { username },
    {
      $unset: {
        pendingMemb: ""
      }
    }
  ).then(d => {
    return Church.findOneAndUpdate(
      { churchId },
      {
        $pull: {
          requests: { username }
        }
      }
    );
  });
};

ChurchSchema.query.unmember = function(churchId, username) {
  var Church = this;
  return Member.findOneAndUpdate(
    { username },
    {
      $unset: {
        churchId: ""
      }
    }
  ).then(d => {
    Prayer.updateMany(
      { username },
      {
        $unset: {
          churchId: ""
        }
      }
    )
      .then(() => {
        console.log("added churchId");
      })
      .catch(() => {
        console.log("could not add church");
      });
    return Church.findOneAndUpdate(
      { churchId },
      {
        $pull: {
          members: username
        }
      }
    );
  });
};

// handles Leader Requests construction
ChurchSchema.query.addAsLeader = function(churchId, username) {
  var Church = this;
  newNotification = {
    who: churchId,
    by: 'church',
    body: "added you as Leader",
    date: new Date()
  }
  // Add array token to church
  return Member.findOneAndUpdate({username}, {
          $set: {isLeader: true},
          $push: {
            notifications: newNotification
          },
          $inc: {
            newNotifications: 1
          }
    })
    .select('tokens _id')
    .then(doc => {
      return Church.findOneAndUpdate(
        { churchId },
        {
          $addToSet: {
            leaders: { leadId: username, _id: doc._id },
            tokens: doc.tokens
          },
          $pull: {
            members : username
          }
        }
      )
    })
};

ChurchSchema.query.removeLeader = function(churchId, username) {
  var Church = this;
  console.log(churchId);
  return Church.findOne({churchId})
    .then(doc => {
      console.log(username);
      var index = doc.leaders.findIndex(ele => ele.leadId === username);
      if(index > -1) {
        if(doc.leaders[index].type === 'Main') {
          throw {errNo: 1, errMsg: 'Cannot remove main leader'};
        } else {
          return Church.findOneAndUpdate({churchId}, {
            $pull: {
              leaders: {leadId: username}
            }
          });
        }
      } else {
        throw {errNo: 2, errMsg: 'No such leader found'};
      }
    }).then(doc => {
      return Member.findOneAndUpdate({username}, {
        $set: {
          isLeader: false
        },
        $unset: {
          churchId: ""
        }
      })
    })
};


// add notification
ChurchSchema.query.promoteLeader = function(churchId, username) {
  var Church = this;

  console.log(churchId, username)
  newNotification = {
    who: churchId,
    by: 'church',
    body: "promoted you as main Leader",
    date: new Date()
  }

  return Church.findOneAndUpdate({churchId}, {
    $pull: {
      leaders: {
        leadId: username,
        type : 'Secondary'
      }
    }, 
    $push : {
      leaders: {
        leadId: username,
        type: 'main'
      }
    }
  }).then(doc => {
    console.log('saved church00');  
    return Member.findOneAndUpdate({username}, {
      $push: {
        notifications: newNotification
      },
      $inc: {
        newNotifications: 1
      }
    })
  })
};

// New Family
ChurchSchema.query.addNewFly = function(churchId, newFly) {
  var Church = this;
  return Church.findOneAndUpdate(
    { churchId },
    {
      $push: {
        families: newFly
      }
    }
  );
};

// Followers
ChurchSchema.query.sendfollowReq = function(username, churchId) {
  var Church = this;
  console.log("1");
  // newNotification = {
  //   who: username,
  //   by: 'user',
  //   body: "send you follow request",
  //   date: new Date()
  // }
  return Member.findOneAndUpdate(
    { username },
    {
      $push: {
        pendingReq: {
          id: churchId,
          type: "Church"
        }
      }
    }
  ).then(d => {
    console.log("1");
    return Church.findOneAndUpdate(
      { churchId },
      {
        $push: {
          requests: {
            username,
            desig: "Follower"
          }
        },
        $inc: {
          newNotifications : 1
        }
      }
    );
  });
};

// update his pr with churchId
ChurchSchema.query.handlefollowReq = function(username, churchId, approval) {
  var Church = this;
  if(!username || !churchId)
  return;

  newNotification = {
    who: churchId,
    by: 'church',
    body: "accepted your follow request",
    date: new Date()
  }
  console.log(username, churchId);
  if (approval) {
    return Member.findOneAndUpdate(
      { username },
      {
        $pull: {
          pendingReq: { id: churchId }
        },
        $addToSet: {
          following: churchId
        },
        $push: {
          notifications: newNotification
        },
        $inc : {
          newNotifications: 1
        }
      }
    ).then(d => {
      console.log(username, churchId);
      return Church.findOneAndUpdate(
        { churchId },
        {
          $pull: {
            requests: { username }
          },
          $addToSet: {
            followers: username
          }
        }
      );
    });
  } else {
    return Member.findOneAndUpdate(
      { username },
      {
        $pull: {
          pendingReq: { id: churchId }
        }
      }
    ).then(d => {
      return Church.findOneAndUpdate(
        { churchId },
        {
          $pull: {
            requests: { username }
          }
        }
      );
    });
  }
};

ChurchSchema.query.cancelfollowReq = function(username, churchId) {
  var Church = this;
  return Member.findOneAndUpdate(
    { username },
    {
      $pull: {
        pendingReq: { id: churchId }
      }
    }
  ).then(d => {
    return Church.findOneAndUpdate(
      { churchId },
      {
        $pull: {
          requests: { username }
        }
      }
    );
  });
};

ChurchSchema.query.unfollow = function(username, churchId) {
  var Church = this;
  console.log(username, churchId);
  return Member.findOneAndUpdate(
    { username },
    {
      $pull: {
        following: churchId
      }
    }
  ).then(d => {
    console.log('username', d);
    return Church.findOneAndUpdate(
      { churchId },
      {
        $pull: {
          followers: username
        }
      }
    );
  });
};

// Get Info
ChurchSchema.query.getInfoFollowers = function(churchId) {
  var Church = this;
  return Church.findOne({ churchId })
    .select("followers")
    .then(doc => {
      return Member.find({
        username: {
          $in: doc.followers
        }
      }).select("name username proPic");
    });
};

ChurchSchema.query.getInfoLeaders = function(churchId) {
  var Church = this;
  return Church.findOne({ churchId })
    .select("leaders")
    .then(doc => {
      var leaders = doc.leaders.map(o => o.leadId);
      return Member.find({
        username: {
          $in: leaders
        }
      }).select("name username proPic");
    });
};

ChurchSchema.query.getInfoMembers = function(churchId) {
  var Church = this;
  return Church.findOne({ churchId })
    .select("members")
    .then(doc => {
      return Member.find({
        username: {
          $in: doc.members
        }
      }).select("name username proPic");
    });
};

// under construction
ChurchSchema.query.getDetails = function(churchId, username) {
  var Church = this;
  var church;
  var prayerReq;
  var usersArr;
  var lead;
  console.log("2");
  return Church.findOne({ churchId })
    .select("churchName proPic churchId followers members leaders")
    .then(doc => {
      console.log("2", doc);
      if (!doc) {
        throw "Error";
      }
      church = _.pick(doc, ["churchName", "proPic", "churchId"]);
      console.log("2");
      usersArr = doc.members;
      church.noOfLeaders = doc.leaders.length;
      church.noOfFollowers = doc.followers.length;
      church.noOfMembers = doc.members.length;
      var leadInd = doc.leaders.findIndex(d => username === d.leadId);
      lead = doc.leaders.map(o => o.leadId);
      var membInd = doc.members.indexOf(username);
      var follInd = doc.followers.indexOf(username);
      console.log(leadInd, membInd, follInd);

      // if username is leader or member all
      // if follower type followers and global
      // else just global
      if (leadInd > -1 || membInd > -1) {
        return Prayer.find({ churchId })
          .where("type")
          .ne("friends");
      } else if (follInd > -1) {
        return Prayer.find({ churchId })
          .where("type")
          .equals("followers");
      } else {
        console.log("run", churchId);
        return Prayer.find({ churchId })
          .where("type")
          .equals("global");
      }
    })
    .then(prReq => {
      prayerReq = prReq;
      // return {church, prayerReq};
      return Member.find()
      .getBasicInfo([...usersArr, ...lead]);
      // return Member.find()
      //   .getBasicInfo(usersArr);
    })
    .then(basicInfo => {
      console.log("1234");
      console.log(prayerReq);
      console.log("1", church);
      console.log("1", basicInfo);

      return { church, prayerReq, basicInfo };
    });
};

ChurchSchema.query.getbasicdetails = function(churchId) {
  var Church = this;
  return Church.findOne({ churchId }).select(
    "churchName proPic leaders members followers requests families newNotifications"
  );
};

ChurchSchema.query.getNotifications = function(churchId) {
  var Church = this;
  var list;
  console.log('churchiD',churchId);
  return Church.findOne({ churchId }).select(
    "requests")
    .then(doc => {
      console.log('requests', doc.requests);
      req = doc.requests.map(o => o.username);
      list = doc;
      return Member.find().getBasicInfo(req)
    }).then(basicInfo => {
      console.log('notiyf', basicInfo, list);
      return {list, basicInfo};
    });
};

ChurchSchema.query.pushNotifications = function(churchId, newNotification) {
  var Church = this;
  var users = [];
  newNotification.who = churchId;
  return Church.findOne({churchId})
    .then(doc => {
      users.push(...doc.members,...doc.leaders.map(o => o.leadId));
      return Member.updateMany({username: {
        $in: users
      }}, {
        $push : {
          notifications: newNotification
        },
        $inc: {
          newNotifications : 1
        }
      }
    );
    });
}

ChurchSchema.query.addNewNotify = function(churchId) {
  var Member = this;

  return Church.findOneAndUpdate({churchId}, {
    $inc: {
      newNotifications : 1
    }
  });
}

ChurchSchema.query.clearNewNotify = function(churchId) {
  var Member = this;

  return Church.findOneAndUpdate({churchId}, {
    $set: {
      newNotifications : 0
    }
  });
}

ChurchSchema.query.search = function(query, churchId) {
  var Church = this;
  var results = [];
  console.log("church", query);
  return Church.find({
    $or: [
      {
        churchName: new RegExp("^" + query, "i")
      },
      {
        churchId: new RegExp("^" + query, "i")
      }
    ],
    churchId: { $ne: churchId }
  })
    .select("churchName churchId proPic")
    .limit(20)
    .then(res => {
      results = res;
      console.log("church", results);
      return Church.find({
        $or: [
          {
            churchId: new RegExp(".*" + query + ".*", "i")
          },
          {
            churchName: new RegExp(".*" + query + ".*", "i")
          }
        ],
        churchId: { $ne: churchId }
      })
        .select("churchName churchId proPic")
        .limit(20);
    })
    .then(res => {
      console.log("church", res);
      results.push(...res);
      console.log("church", results);
      results = results.filter(
        (doc, index, self) =>
          index === self.findIndex(d => d.churchId === doc.churchId)
      );
      return results;
    });
};

ChurchSchema.query.getMembs = function(churchIds) {
  var Church = this;
  return Church.find({
    churchId: {
      $in: churchIds
    }
  }).select("members leaders.leadId");
};

ChurchSchema.query.updateProfile = function(churchId, updatedPro) {
  var Church = this;

  console.log(updatedPro);
  return Church.findOneAndUpdate({churchId},{
    $set: {
      churchName: updatedPro.churchName,
      proPic: updatedPro.proPic
    }
  })
};

var Church = mongoose.model("church", ChurchSchema);

module.exports = Church;
