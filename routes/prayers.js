const express = require("express");

const { authLead, authMemb } = require("../config/auth");
const Prayer = require("../models/Prayers");

const router = express.Router();

router.post("/addNew", authMemb, (req, res) => {
  let newPrayer = new Prayer(req.body);
  console.log(req.body);
  newPrayer
    .save()
    .then(pr => {
      console.log(pr);
      res.json({ success: true, newPr: pr });
    })
    .catch(err => {
      console.log(err);
      res.status(400).json({ success: false, errNo: 0, errObj: err });
    });
});

router.get("/getAllPr", authMemb, (req, res) => {
  Prayer.find()
    .allPr([req.memb.username])
    .then(doc => {
      res.json({ doc });
    })
    .catch(err => {
      res.status(400).json({ err });
    });
});

router.post("/getByDate", authMemb, (req, res) => {
  console.log(req.body.date);
  Prayer.find()
    .byDate(req.memb.username, req.body.date)
    .then(doc => {
      res.json({ doc });
    })
    .catch(err => {
      res.status(400).json({ err });
    });
});

router.delete("/deletePr", authMemb, (req, res) => {
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
