const express = require("express");
const _ = require("lodash");
const {saveImage} = require('../config/assests');

const { authLead, authMemb } = require("../config/auth");
const Church = require("../models/Church");
const Member = require("../models/Member");
const assests = require("../config/assests");

const router = express.Router();



// Church leader
// // Register
router.post("/regChurch", (req, res) => {
  var newChurchbody = _.pick(req.body, [
    "churchName",
    "churchId",
    "leaders.leadId"
  ]);
  newChurchbody.proPic = assests.defaultPic;
  newChurchbody.leaders.type = "main";
  newChurchbody.isLeader = true;
  var newChurch;
  var newMembBody = {
    proPic: assests.defaultPic,
    name: req.body.leaders.leadName,
    username: req.body.leaders.leadId,
    churchId: req.body.churchId,
    password: req.body.leaders.password
  };
  console.log("1", newMembBody);
  var newMemb = new Member(newMembBody);
  newChurchbody.leaders._id = newMemb._id;
  console.log("2", newMemb);
  newMemb
    .save()
    .then(doc1 => {
      newMemb = doc1;
      saveImage(newMemb.proPic, newMemb.username);
      console.log("3", newChurchbody);
      newChurch = new Church(newChurchbody);
      return newChurch.save();
    })
    .then(doc2 => {
      newChurch = doc2;
      saveImage(newChurch.proPic, newChurch.churchId);
      console.log("4", newChurch);
      return newMemb.generateAuthToken();
    })
    .then(token => {
      console.log("5", token);
      return newChurch.pushToken(token);
    })
    .then(token => {
      res.header("x-auth", token).json({
        success: true,
        churchId: newChurch.churchId,
        token,
        desig: "Leader",
        username: newMemb.username
      });
    })
    .catch(err => {
      res.status(400).json({ success: false, errObj: err });
    });
});

// Church Member
// register Member
router.post("/regMemb", (req, res) => {
  var body = _.pick(req.body, ["name", "username", "password"]);
  body.proPic = assests.defaultPic;
  var newMemb;
  var churchId = req.body.churchId;
  console.log(newMemb);
  var member = _.pick(req.body, ["username"]);

  Church.findOneAndUpdate({ churchId }, { $push: { requests: member } })
    .then(doc => {
      if (doc) {
        body.pendingMemb = doc.churchId;
      }
      newMemb = new Member(body);
      return newMemb.save();
    })
    .then(() => {
      console.log("saved", newMemb);
      saveImage(newMemb.proPic, newMemb.username);
      return newMemb.generateAuthToken();
    })
    .then(token => {
      res.header("x-auth", token).json({
        success: true,
        username: newMemb.username,
        token,
        desig: "Member"
      });
    })
    .catch(e => {
      res.status(400).json({ success: false, errObj: e });
    });
});

// Authenticate
router.post("/login", (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  var currMemb;
  console.log("authLaed :", req.body);

  Member.findByCredentials(username, password)
    .then(memb => {
      currMemb = memb;
      console.log('current memb', memb);
      var churchId = memb.churchId;
      if (!churchId) return Promise.resolve({ church: undefined, memb });
      return Church.findByCredentials(churchId, username);
    })
    .then(({ church, memb }) => {
      console.log("fin CHurch", church);
      console.log(memb);
      if (church && !memb) {
        currMemb
          .generateAuthToken()
          .then(token => {
            console.log(token, 'token');
            return church.pushToken(token);
          })
          .then(token => {
            console.log('church123', church,'memeber223', token);
            res.header("x-auth", token).json({
              success: true,
              churchId: church.churchId,
              desig: "Leader",
              token,
              username: currMemb.username
            });
          })
          .catch(err => {
            console.log("Error generating TOken1");
            res.status(400).json({ success: false, msgObj: err });
          });
      } else if (memb) {
        console.log(memb);
        Member.findByCredentials(username, password)
          .then(memb => {
            return memb
              .generateAuthToken()
              .then(token => {
                churchId = church ? church.churchId : null;
                console.log("genrate token", token);
                res.header("x-auth", token).send({
                  success: true,
                  username: memb.username,
                  desig: "Member",
                  token,
                  churchId
                });
              })
              .catch(err => {
                console.log("Error generating TOken2");
              });
          })
          .catch(err => {
            res.status(400).json({ success: false, msgObj: err });
          });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(400).json({ success: false, msgObj: err });
    });
});

// Profile
router.get("/churchPro", authLead, (req, res, next) => {
  res.json({ church: req.church });
});

// Send member
router.get("/memberPro", authMemb, (req, res) => {
  if (req.memb.churchId) {
    Church.findOne({ churchId: req.memb.churchId })
      .then(church => {
        res.send({ memb: req.memb, church });
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
    doc => {
      res.status(200).send({ success: true, doc });
    },
    () => {
      res.status(400).send({ success: false, msg: "Failed to logout" });
    }
  );
});

// check availability of churchId
router.post("/checkChurch", (req, res) => {
  Church.findOne({ churchId: req.body.churchId })
    .then(doc => {
      if (doc) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    })
    .catch(e => {
      res.json({ success: true });
    });
});

// check availability of username
router.post("/checkUname", (req, res) => {
  Member.findOne({ username: req.body.username })
    .then(doc => {
      if (doc) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    })
    .catch(e => {
      res.json({ success: true });
    });
});

// TO DOs
router.delete("/deleteMemb", authMemb, (req, res) => {
  // Dont' delete if leader at index of church
});

router.delete("/deleteChurch", authLead, (req, res) => {});

router.post("/newLeaderReq", (req, res) => {});

module.exports = router;
