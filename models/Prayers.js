const Member = require("./Member");
const Church = require("./Church");
const mongoose = require("mongoose");
const _ = require("lodash");

var PrayerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  churchId: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  urgency: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    required: true,
    default: "followers"
  },
  body: {
    type: String,
    minlength: 3,
    required: true
  },
  reports: {
    type: Number,
    default: 0
  }
});

PrayerSchema.methods.toJSON = function() {
  var pr = this;
  var prObject = pr.toObject();

  return _.pick(prObject, [
    "_id",
    "username",
    "churchId",
    "body",
    "date",
    "shareWith",
    "reports"
  ]);
};

PrayerSchema.query.getPr = function(usernames, followers) {
  var Pr = this;
  return Pr.find({
    $or: [
      {
        username: {
          $in: usernames
        }
      },
      {
        $and: [
          {
            username: {
              $in: followers
            }
          },
          {
            type: "followers"
          }
        ]
      },
      {
        type: "global"
      }
    ]
  });
};

// add Names to array
PrayerSchema.query.allPr = function(username, Church, Member) {
  var Pr = this;
  var followers = [];
  var basicInfo = [];
  return Member.findOne({ username })
    .select("friends churchId following")
    .then(doc => {
      // username = doc.friends.map(o => o.username);
      username.push(...doc.friends);
      var churchIds = [doc.churchId];
      churchIds.push(...doc.following);
      console.log("Document11", doc);
      console.log("Doc", churchIds);
      return Church.find().getMembs(churchIds);
    })
    .then(d => {
      console.log("123", d);
      for (let i in d) {
        console.log("obj", i, d[i], followers);
        followers.push(...d[i].leaders.map(o => o.leadId));
        followers.push(...d[i].members);
        console.log("username", followers);
      }
      followers = Array.from(new Set(followers));
      console.log("followers", followers);
      return Member.find()
        .getBasicInfo([...username,...followers]);
    //   return followers;
    })
    .then(bU => {
      basicInfo = bU;
      console.log('bu', basicInfo)
      console.log(username);
      return Pr.find()
        .getPr(username, followers)
        .sort("-date")
        .limit(40);
    })
    .then(prayers => {
        // prayers.map(pr => {
        //     console.log('pr', pr, basicUsers[0]);
        //     var ind = basicUsers.findIndex(bu => {
        //         return pr.username === bu.username;
        //     });
        //     console.log(ind);
        //     pr = { ...basicUsers[ind],...pr._doc}
        //     console.log('pr1', pr._doc);
        //     return pr;
        // });
        // pr = {...basicUsers[0],...prayers[0]}
        // prayers[0].name= 'Fenn'
        // console.log('pr1', prayers[0]);
        return {prayers, basicInfo};
    });
};

PrayerSchema.query.byDate = function(username, date, Church, Member) {
  var Pr = this;
  var date = new Date(date);
  var basicInfo;
  var followers =[];
  console.log(date, username);
  return Member.findOne({ username })
    .select("friends churchId following")
    .then(doc => {
      // username = doc.friends.map(o => o.username);
      console.log("doc");
      username.push(...doc.friends);
      console.log("doc");
      var churchIds = [doc.churchId];
      console.log("doc");
      churchIds.push(...doc.following);
      console.log("Document11", doc);
      console.log("Doc", churchIds);
      return Church.find({
        churchId: {
          $in: churchIds
        }
      }).select("members leaders.leadId");
    })
    .then(d => {
      console.log("123", d);
      for (let i in d) {
        console.log("obj", i);
        followers.push(...d[i].leaders.map(o => o.leadId));
        followers.push(...d[i].members);
      }
      followers = Array.from(new Set(followers));
      console.log("username", followers);
      // return followers;
    return Member.find()
        .getBasicInfo([...username,...followers]);
    })
    .then(bI => {
        basicInfo = bI;
      console.log("date", date);
      return Pr.find()
        .getPr(username, followers)
        .where("date")
        .lt(date)
        .sort("-date")
        .limit(15);
    })
    .then(prayers => {
        console.log('yae');
        return {prayers, basicInfo};
    });
};

PrayerSchema.query.verifyAndDeletePr = function(id, username, churchId) {
  var Pr = this;
  console.log(id, username, churchId);
  return Pr.findOne({_id: id}).then(pr => {
    if (pr.username == username) {
      console.log(pr);
      return Pr.findOneAndRemove({_id: id});
    } else if (churchId) {
      return Church.find({ churchId })
        .select("leaders.leadId")
        .then(d => {
          var leaders = [];
          for (let i in d) {
            leaders.push(...d[i].leaders.map(o => o.leadId));
          }
          console.log(leaders);
          if (leaders.indexOf(username) > -1) {
            console.log("true", id);
            return Pr.findByIdAndRemove(id);
          }
          return;
        })
        .catch(e => {
          return e;
        });
    } else throw { errNo: 1, errMsg: "Permission denied" };
  });
};

var Prayer = mongoose.model("prayer", PrayerSchema);

module.exports = Prayer;
