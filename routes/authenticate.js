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
  Church.hashPassword(req.body.password).then(hash => {
    let newChurch = new Church({
      churchName: req.body.cName,
      churchId: req.body.cId,
      leaders: [
        {
          leadId: req.body.leadId,
          leadName: req.body.leadName,
          password: hash
        }
      ]
    });
    console.log('newchsa', newChurch);
    newChurch
      .save()
      .then(church => {
        console.log("church: ", church);
        console.log('leadIf', req.body.leadId);
        return church.generateAuthToken(req.body.leadId);
      })
      .then((token) => {
          console.log('token ', token);
          res.header("x-auth", token)
            .json({ success: true, church : newChurch});
      })
      .catch(err => {
        res.status(400).json({ errmsg: err });
      });
  });
});

// Authenticate
router.post("/authLead", (req, res, next) => {
  const churchId = req.body.cId;
  const leadId = req.body.username;
  const password = req.body.password;
  console.log("authLaed :", req.body);

  Church.findByCredentials(churchId, leadId, password)
    .then(church => {
      console.log("fin CHurch", church);
      church.generateAuthToken(leadId).then(token => {
        res
          .header("x-auth", token)
          //   .header("Access-Control-Expose-Headers", "Authorization")
          .json({ success: true, church: church });
      });
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

// Logout
router.delete("/logoutLead", authLead, (req, res, next) => {
  req.church.removeToken(req.header("x-auth")).then(
    doc => {
      res.status(200).json({ success: true, doc: doc });
    },
    () => {
      res.status(400).json({ success: false, msg: "Failed to logout" });
    }
  );
});

// Church Member
// register Member
router.post("/regMemb", (req, res) => {
  var body = _.pick(req.body, ["name", "username", "password", "churchId"]);
  var memb = new Member(body);

  console.log(memb);
  memb.save()
    .then(() => {
        console.log('saved', memb);
      return memb.generateAuthToken();
    })
    .then(token => {
      res.header("x-auth-memb", token).send(memb);
    })
    .catch(e => {
      res.status(400).send(e);
    });
});

// Send member
router.get("/member", authMemb, (req, res) => {
  res.send(req.memb);
});

// login
router.post("/authMemb", (req, res) => {
  var body = _.pick(req.body, ["username", "password"]);

  User.findByCredentials(body.username, body.password)
    .then(memb => {
      return memb.generateAuthToken().then(token => {
        res.header("x-auth-memb", token).send(memb);
      });
    })
    .catch(e => {
      res.status(400).send();
    });
});

// Logout Member
router.delete("/logoutMemb", authMemb, (req, res) => {
  req.memb.removeToken(req.token).then(
    () => {
      res.status(200).send();
    },
    () => {
      res.status(400).send();
    }
  );
});

module.exports = router;
