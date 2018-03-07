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
    unique: true
    // Under Construction.....
    // validate: [
    //     validator: ^[a-z0-9_-]{3,15}$,
    //     message: '{value} is not valid id'
    // ]
  },
  proPic: {
    data: Buffer,
    contentType: String
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
      password: {
        type: String,
        required: true,
        minlength: 6
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
        default: "member"
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
  // Coming soon....
  // image: {
  //     type:
  // }
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
    "followers"
  ]);

  for (let i = 0; i < userObject.leaders.length; i++) {
    if (newObject.leaders) {
      newObject.leaders.push(
        _.pick(userObject.leaders[i], ["leadId", "leadName", "_id"])
      );
    } else {
      newObject.leaders = [
        _.pick(userObject.leaders[i], ["leadId", "leadName", "_id"])
      ];
    }
  }

  return newObject;
};

// TOken Generation
ChurchSchema.methods.generateAuthToken = function(leadId) {
  var church = this;
  var access = "auth";
  console.log("gen auth", church.leaders);
  index = church.leaders.findIndex(lead => lead.leadId == leadId);

  console.log(index, "index");
  var token = jwt
    .sign(
      {
        _cId: church.churchId,
        _id: church.leaders[index]._id,
        username: church.leaders[index].leadId,
        access
      },
      process.env.SECRET || db.secret
    )
    .toString();

  console.log("token", token, church);
  church.tokens.push({ access, token });

  console.log(church);
  Member.findOne({ username: leadId })
    .then(memb => {
      memb.tokens.push({ access, token });
      memb
        .save()
        .then(doc => {
          console.log("Saved token to member", doc);
        })
        .catch(e => {
          console.log("Unable to svae token to member");
        });
    })
    .catch(e => {
      console.log("Unable to find memb 2 token to member");
    });

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
    churchId: decoded._cId,
    "leaders._id": decoded._id,
    "tokens.token": token,
    "tokens.access": "auth"
  });
};

// Find leader
ChurchSchema.statics.findByCredentials = function(
  churchId,
  username,
  password
 ) {
  var Church = this;

  return Church.findOne({ churchId }).then(church => {
    if (!church) {
      console.log("Rejected");
      return Promise.reject({success: false, errNo: 0, mssg: "No such Church found" });
    }

    var index = church.leaders.findIndex(lead => lead.leadId == username);
    var ind = church.members.findIndex(memb => memb.username == username);

    if (index == -1 && ind == -1) {
      return Promise.reject({ success: false, errNo: 1, mssg: "Neither leader nor member" });
    } else if (ind != -1) {
      return Promise.resolve({ church: church, memb: church.members[ind] });
    }

    console.log("index", index, ind, password);

    return new Promise((resolve, reject) => {
      console.log("Leaders ", church.leaders[index].password);

      // Use bcrypt.compare to compare password and user.password
      bcrypt.compare(password, church.leaders[index].password, (err, res) => {
        if (res) {
          resolve({ church, memb: undefined });
        } else {
          console.log("Rejected2");
          reject({ success: false, errNo: 4, mssg: "Incorrect Password" });
        }
      });
    });
  });
};

ChurchSchema.statics.hashPassword = function(password) {
  return new Promise((resolve, reject) => {
    return bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, (err, hash) => {
        resolve(hash);
      });
    });
  });
};

ChurchSchema.statics.addAsMember = function(churchId, member) {
  var Church = this;

  return Church.findOneAndUpdate(
    { churchId },
    {
      $push: {
        requests: member
      }
    });
}

ChurchSchema.query.membReq = function(churchId, username, approval) {
  var Church = this;

  if(approval) {
    return Church.findOneAndUpdate({churchId}, {
      $pull: {
        requests : { username }
      },
      $push : {
        members : username
      }
    })
  } else {
    return Church.findOneAndUpdate({churchId}, {
      $pull: {
        requests : { username }
      }
    })
  }
}

ChurchSchema.query.LeadReq = function(churchId, username, approval) {
  var Church = this;

  if(approval) {
    return Church.findOneAndUpdate({churchId}, {
      $pull: {
        requests : { username }
      },
      $push : {
        leaders : {username}
      }
    })
  } else {
    return Church.findOneAndUpdate({churchId}, {
      $pull: {
        requests : { username }
      }
    })
  }
}

ChurchSchema.query.addNewFly = function(churchId, newFly) {
  var Church = this;
  return Church.findOneAndUpdate({churchId}, {
    $push : {
      families: newFly
    }
  })
}

var Church = mongoose.model("church", ChurchSchema);

module.exports = Church;



// Hashing Password before Saving
// ChurchSchema.pre("save", function(next) {
//   var church = this;

//   if (church.isModified("password")) {
//     bcrypt.genSalt(10, (err, salt) => {
//       bcrypt.hash(church.password, salt, (err, hash) => {
//         church.password = hash;
//         next();
//       });
//     });
//   } else {
//     next();
//   }
// });