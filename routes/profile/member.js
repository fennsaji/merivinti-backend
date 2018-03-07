const { authLead, authMemb } = require("../config/auth");
const Church = require("../models/Church");
const Member = require("../models/Member");
const express = require("express");

const router = express.Router();

router.post('/getInfoFriends', authMemb, (req, res) => {
  var username = req.body.username;
  Member.find()
    .getInfoFriends(username)
    .then(friends => {
       res.json({success:true, friends});
    })
    .catch(errObj => {
       res.json({success: false, errObj});
    });
});

router.post('/getInfoFollowings', authMemb, (req, res) => {
  var username = req.body.username;
  Member.find()
    .getInfoFollowings(username)
    .then(friends => {
       res.json({success:true, friends});
    })
    .catch(errObj => {
       res.json({success: false, errObj});
    });
});


router.post('/getDetail', authMemb, (req, res) => {

});


router.post('/sendfriendReq', authMemb, (req, res) => {

});

router.post('/handleFriendReq', authMemb, (req, res) => {

});


router.put('/updatePro', authMemb, (req, res) => {

});

router.post('/search', (req, res) => {

});


module.exports = router;