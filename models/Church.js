const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const Member = require("./Member");

var ChurchSchema = new mongoose.Schema({
  churchName: {
    type: String,
    minlength: 2,
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
        return /^[a-zA-Z\-]+$/.test(v);
      },
      message: "{VALUE} is not a valid id!"
    }
  },
  proPic: String,
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
    "proPic"
  ]);

  newObject.leaders = [];
  for (let i = 0; i < userObject.leaders.length; i++) {
    newObject.leaders.push(_.pick(userObject.leaders[i], ["leadId", "type"]));
  }
  return newObject;
};

// add Token
ChurchSchema.methods.pushToken = function(token) {
  var church = this;

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

  return Member.findOneAndUpdate(
    { username },
    {
      $set: {
        pendingMemb: churchId
      }
    }
  ).then(d => {
    return Church.findOneAndUpdate(
      { churchId },
      {
        $push: {
          requests: username
        }
      }
    );
  });
};

ChurchSchema.query.handleMembReq = function(churchId, username, approval) {
  var Church = this;
  if (approval) {
    Member.findOneAndUpdate(
      { username },
      {
        $unset: {
          pendingMemb: ""
        },
        $push: {
          churchId
        }
      }
    ).then(d => {
      return Church.findOneAndUpdate(
        { churchId },
        {
          $pull: {
            requests: { username }
          },
          $push: {
            members: username
          }
        }
      );
    });
  } else {
    Member.findOneAndUpdate(
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
  Member.findOneAndUpdate(
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
  Member.findOneAndUpdate(
    { username },
    {
      $unset: {
        churchId: ""
      }
    }
  ).then(d => {
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
ChurchSchema.query.addAsLeader = function(churchId, username, approval) {
  var Church = this;
  // Add array token to church
  return Church.findOneAndUpdate(
    { churchId },
    {
      $push: {
        leaders: { leadId: username }
      }
    }
  );
};

ChurchSchema.query.removeLeader = function(username, churchId) {};

ChurchSchema.query.promoteLeader = function() {};

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
    return Church.findOneAndUpdate(
      { churchId },
      {
        $push: {
          requests: username
        }
      }
    );
  });
};

ChurchSchema.query.handlefollowReq = function(username, churchId, approval) {
  var Church = this;
  if (approval) {
    return Member.findOneAndUpdate(
      { username },
      {
        $pull: {
          pendingReq: { id: churchId }
        },
        $push: {
          following: churchId
        }
      }
    ).then(d => {
      return Church.findOneAndUpdate(
        { churchId },
        {
          $pull: {
            requests: username
          },
          $push: {
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
            requests: username
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
          requests: username
        }
      }
    );
  });
};

ChurchSchema.query.unfollow = function(username, churchId) {
  var Church = this;
  return Member.findOneAndUpdate(
    { username },
    {
      $pull: {
        following: churchId
      }
    }
  ).then(d => {
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
  Church.findOne({ churchId })
    .select("churchName proPic churchId followers members leaders")
    .then(doc => {
      church = _.pick(doc, ["churchName", "proPic", "churchId"]);
      church.noOfLeaders = doc.leaders.length;
      church.noOfFollowers = doc.followers.length;
      church.noOfMembers = doc.members.length;
      // if username is leader or member all
      // if follower type followers and global
      // else just global
      return Church.find({ churchId });
    });
};

var Church = mongoose.model("church", ChurchSchema);

module.exports = Church;
