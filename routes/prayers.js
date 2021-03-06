const express = require("express");

const { authLead, authMemb } = require("../config/auth");

const {sendNotifyToPerson, sendNotifyToTopic} = require("./notification");
const Prayer = require("../models/Prayers");
const Church = require("../models/Church");
const Member = require("../models/Member");
const router = express.Router();

router.post("/addNew", authMemb, (req, res) => {
  let newPrayer = new Prayer(req.body.newPr);
  console.log(req.body.newPr.body);
  newPrayer
    .save()
    .then(pr => {
      // console.log(pr.body);
      if(req.memb.churchId)
        sendNotifyToTopic({
          title: 'Prayer request from ' + req.body.newPr.username, 
          body: req.body.newPr.body
        }, {type : 'Prayer', username: req.memb.username}, 
        req.memb.churchId, 'Prayer');

      res.json({ success: true, newPr: pr });
    })
    .catch(err => {
      // console.log(err);
      res.status(400).json({ success: false, errNo: 0, errObj: err });
    });
});

router.get("/getAllPr", authMemb, (req, res) => {
  Prayer.find()
    .allPr([req.memb.username], Church, Member)
    .then(({prayers, basicInfo}) => {
      // console.log(prayers)
      res.json({ prayers, basicInfo });
    })
    .catch(err => {
      res.status(400).json({ err });
    });
});

router.post("/getByDate", authMemb, (req, res) => {
  // console.log(req.body.date, req.memb.username);
  Prayer.find()
    .byDate([req.memb.username], req.body.date, Church, Member)
    .then(({prayers, basicInfo}) => {
      res.json({ prayers, basicInfo });
    })
    .catch(err => {
      res.status(400).json({ err });
    });
});

router.post("/deletePr", authMemb, (req, res) => {
  Prayer.find()
    .verifyAndDeletePr(req.body.id, req.memb.username, req.memb.churchId)
    .then(doc => {
      res.json({ doc });
    })
    .catch(err => {
      res.status(401).json({ err });
    });
});

module.exports = router;
