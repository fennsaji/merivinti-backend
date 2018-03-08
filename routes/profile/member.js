const { authLead, authMemb } = require("../config/auth");
const Church = require("../models/Church");
const Member = require("../models/Member");
const express = require("express");

const router = express.Router();

// Get Details
router.get('/myprofile', authMemb, (req, res) => {

});

router.post('/getDetail', authMemb, (req, res) => {

});

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
    .then(following => {
       res.json({success:true, following});
    })
    .catch(errObj => {
       res.json({success: false, errObj});
    });
});

// Friends
router.post('/sendfriendReq', authMemb, (req, res) => {
  var username = req.authMemb.username;
  var friendId = req.body.username;
  Member.find()
    .sendFriendReq(username, friendId)
    .then(d => {
      res.json({success: true});
    })
    .catch(errObj => {
      res.status(400).json({success: false, errObj});
    });
});

router.post('/handleFriendReq', authMemb, (req, res) => {
  var username = req.memb.username;
  var friendId = req.body.username;
  Member.find()
    .sendFriendReq(username, friendId)
    .then(d => {
      res.json({success: true});
    })
    .catch(errObj => {
      res.status(400).json({success: false, errObj});
    });
});

router.post('/cancelFriendReq', authMemb, (req, res) => {
  var username = req.memb.username;
  var friendId = req.body.username;
  Member.find()
    .cancelFriendReq(username, friendId)
    .then(d => {
      res.json({success: true});
    })
    .catch(errObj => {
      res.status(400).json({success: false, errObj});
    });
});

router.post('/unfriend', authMemb, (req, res) => {
  var username = req.memb.username;
  var friendId = req.body.username;
  Member.find()
    .unfriend(username, friendId)
    .then(d => {
      res.json({success: true});
    })
    .catch(errObj => {
      res.status(400).json({success: false, errObj});
    });
});

router.put('/updatePro', authMemb, (req, res) => {

});

router.post('/search', (req, res) => {

});


module.exports = router;