const express = require("express");
const _ = require("lodash");

const { authLead, authMemb } = require("../config/auth");
const Church = require("../models/Church");
const Member = require("../models/Member");

const router = express.Router();

// Church leader
// Register 
router.post("/regChurch", (req, res, next) => {
  var newbody = req.body;
  let newChurch;
  let newMemb;
  console.log(newbody);
  Church.hashPassword(req.body.leaders.password)
    .then(hash => {
      newbody.leaders.password = hash;
      console.log(newbody);
      let newMember = {
        name: req.body.leaders.leadName,
        username: req.body.leaders.leadId,
        churchId: req.body.churchId,
        password: hash
      }
      newMemb = new Member(newMember);
      console.log("newchsa", newMemb);
      return newMemb.save();
    })
    .then((newMemb) => {
      newChurch = new Church(newbody);
      console.log("saved", newMemb);
      console.log("saved2", newChurch);
      return newChurch.save();
    })
    .then(church => {
      console.log("church: ", church);
      return church.generateAuthToken(req.body.leaders.leadId);
    })
    .then(token => {
      console.log("token ", token, newChurch, newMemb);
      res
        .header("x-auth", token)
        .json({
          success: true,
          church: newChurch,
          token,
          desig: "Leader",
          memb: newMemb
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
  var newMemb = new Member(body);

  var member = _.pick(req.body, ["name", "username"]);

  Church.findOneAndUpdate(
    { churchId: req.body.churchId },
    {
      $push: {
        requests: member
      }
    })
    .then(church => {
      console.log("register", church);
    })
    .catch(err => {
      console.log("Could not request church");
    });

  console.log(newMemb);
  newMemb
    .save()
    .then(() => {
      console.log("saved", newMemb);
      return newMemb.generateAuthToken();
    })
    .then(token => {
      res.header("x-auth", token).json({ success: true, memb: newMemb, token, desig: "Member" });
    })
    .catch(e => {
      res.status(400).json({success: false, errObj: e});
    });
});

// Authenticate
router.post("/login", (req, res, next) => {
  // const churchId = req.body.cId;
  const username = req.body.username;
  const password = req.body.password;
  console.log("authLaed :", req.body);

  Member.findOne({ username })
    .then(memb => {
      var churchId = memb.churchId;
      if (!memb) throw { errNo: 5, mssg: "No User found" };
      if (!churchId) return Promise.resolve({ church: undefined, memb });
      return Church.findByCredentials(churchId, username, password);
    })
    .then(({ church, memb }) => {
      console.log("fin CHurch", church);
      console.log(memb);
      if (church && !memb) {
        church
          .generateAuthToken(username)
          .then(token => {
            res
              .header("x-auth", token)
              .json({ success: true, church, desig: "Leader", token, memb });
          })
          .catch(err => {
            console.log("Error generating TOken1");
          });
      } else if (memb) {
        console.log(memb);
        Member.findByCredentials(username, password)
          .then(memb => {
            return memb
              .generateAuthToken()
              .then(token => {
                res
                  .header("x-auth", token)
                  .send({
                    success: true,
                    memb,
                    desig: "Member",
                    token,
                    church
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
router.get("/church", authLead, (req, res, next) => {
  res.json({ church: req.church });
});

// Send member
router.get("/member", authMemb, (req, res) => {
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

module.exports = router;
