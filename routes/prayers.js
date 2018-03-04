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
            res.json({success: true, newPr: pr});
        })
        .catch(err => {
            console.log(err);
            res.status(400).json({success: false, errNo: 0, errObj: err});
        });
});

router.get("/getFriends", authMemb, (req, res) => {
    Prayer.findbyFriends(req.memb.username)
        .then(doc => {
            res.json({doc});
        })
        .catch(err => {
            res.status(400).json({err});
        });
});

module.exports = router;

