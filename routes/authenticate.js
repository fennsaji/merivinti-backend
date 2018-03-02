const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const config = require("../config/database");
const Church = require("../models/Church");
const _ = require("lodash");
const Member = require("../models/Member");
const { authLead, authMemb } = require("../config/auth");

// Church leader
// Register
router.post("/regChurch", (req, res, next) => {
  Church.hashPassword(req.body.password)
  .then(hash => {
    let newChurch = new Church({
      churchName: req.body.cName,
      churchId: req.body.cId,
      leaders: [
        {
          leadId: req.body.leadId,
          leadName: req.body.leadName,
          password: hash,
          approved: true
        }
      ]
    });
    console.log("newchsa", newChurch);
    // Leader as a member
    var memb = new Member({
      username: req.body.leadId,
      name: req.body.leadName,
      password: hash,
      churchId: req.body.cId
    });
    memb
      .save()
      .then(() => {
        console.log("saved", memb);
        return newChurch.save();
      })
      .then(church => {
        console.log("church: ", church);
        console.log("leadIf", req.body.leadId);
        return church.generateAuthToken(req.body.leadId);
      })
      .then(token => {
        console.log("token ", token);
        res.header("x-auth", token).json({ success: true, church: newChurch });
      })
      .catch(err => {
        res.status(400).json({ errmsg: err });
      });

    // New church
  });
});


// Church Member
// register Member
router.post("/regMemb", (req, res) => {
  var body = _.pick(req.body, ["name", "username", "password"]);
  var memb = new Member(body);

  var member = _.pick(req.body, ["name", "username"]);
  member.approved = false;
  Church.findOneAndUpdate(
    { churchId: req.body.churchId },
    {
      $push: {
        members: member
      }
    })
    .then(church => {
      console.log("register", church);
    })
    .catch(err => {
      console.log("Could not request church");
    });

  console.log(memb);
  memb
    .save()
    .then(() => {
      console.log("saved", memb);
      return memb.generateAuthToken();
    })
    .then(token => {
      res.header("x-auth", token).send(memb);
    })
    .catch(e => {
      res.status(400).send(e);
    });
});



// Authenticate
router.post("/auth", (req, res, next) => {
  // const churchId = req.body.cId;
  const username = req.body.username;
  const password = req.body.password;
  console.log("authLaed :", req.body);

  Member.findOne({ username })
    .then(memb => {
      if(!memb)
        throw {errNo: 5, mssg: 'No User found'};
      var churchId = memb.churchId;
      if(!churchId) 
        return Promise.resolve({church: undefined, member: true});
      return Church.findByCredentials(churchId, username, password)
    })
    .then(({church, member}) => {
      console.log("fin CHurch", church);
      console.log(member);
      if(church) {
        church.generateAuthToken(username)
          .then(token => {
            res
              .header("x-auth", token)
              .json({ success: true, church: church , desig: 'Leader'});
          })
          .catch(err => {
            console.log('Error generating TOken1');
        });;
      } else 
      if(member) {
        console.log(member);
        Member.findByCredentials(username, password)
          .then(memb => {
            return memb.generateAuthToken()
              .then(token => {
              res.header("x-auth", token).send({success: true, memb, desig: 'Member'});
            }).catch(err => {
                console.log('Error generating TOken2');
            });
          }).catch(err => {
            res.status(404).json({ success: false, msgObj: err });
          });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(404).json({ success: false, msgObj: err });
    });
});



// Profile
router.get("/church", authLead, (req, res, next) => {
  res.json({ church: req.church });
});



// Send member
router.get("/member", authMemb, (req, res) => {
  if(req.memb.churchId) {
    Church.findOne({churchId: req.memb.churchId})
      .then(church => {
        res.send({memb : req.memb, church});
      })
      .catch(e => res.send(req.memb));
  } else {
    res.send(req.memb);
  }
});


// Logout
router.delete("/logoutLead", authLead, (req, res, next) => {
  req.church.removeToken(req.header("x-auth")).then(
    doc => {
      res.status(200).json({ success: true, doc });
    },
    () => {
      res.status(400).json({ success: false, msg: "Failed to logout" });
    }
  );
});

// Logout Member
router.delete("/logoutMemb", authMemb, (req, res) => {
  req.memb.removeToken(req.token).then(
    (doc) => {
      res.status(200).send({ success: true, doc});
    },
    () => {
      res.status(400).send({ success: false, msg: "Failed to logout" });
    }
  );
});

module.exports = router;
