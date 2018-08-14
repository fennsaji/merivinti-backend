const { authLead, authMemb } = require("../../config/auth");
const Church = require("../../models/Church");
const Member = require("../../models/Member");
const {sendNotifyToPerson, sendNotifyToTopic} = require("../notification")
const express = require("express");
const {saveImage} = require('../../config/assests');
const _ = require("lodash");

const router = express.Router();

// Get Details
router.post("/getDetails", authMemb, (req, res) => {
  // console.log('1');
  Member.find()
    .getDetails(req.body.username, req.memb.username)
    .then(({member, prayerReq}) => {
      member.noOfPost = prayerReq.length;
      // console.log('church', member, prayerReq);
      res.json({success: true, member, prayerReq})
    })
    .catch(err => {
      res.status(400).json({success: false, err})
    });
});

router.post("/getInfoFriends", authMemb, (req, res) => {
  var username = req.body.username;
  Member.find()
    .getInfoFriends(username)
    .then(friends => {
      res.json({ success: true, friends });
    })
    .catch(errObj => {
      res.json({ success: false, errObj });
    });
});

router.post("/getInfoFollowings", authMemb, (req, res) => {
  var username = req.body.username;
  Member.find()
    .getInfoFollowings(username,Church)
    .then(following => {
      res.json({ success: true, following });
    })
    .catch(errObj => {
      res.json({ success: false, errObj });
    });
});

router.get('/getbasicinfo', authMemb, (req, res) => {
  Member.find()
    .getbasicdetails(req.memb.username)
    .then(list => {
      res.json({success: true, list})
    })
    .catch(err => {
      res.status(400).json({success: false, errOnj: err});
    });
});

router.get("/getNotifications", authMemb, (req, res) => {
  Member.find()
    .getNotificatiions(req.memb.username, Church)
    .then(({list, basicInfo, churchInfo}) => {
      // console.log('1234567', list, basicInfo)
      res.json({success: true, list, basicInfo, churchInfo})
    })
    .catch(err => {
      res.status(400).json({success: false, errOnj: err});
    });
});

router.get("/getChurchId", authMemb, (req,res) => {
  res.send(req.memb.churchId);
})

router.delete('/newNotifications', authMemb, (req, res) => {
  Member.find()
   .clearNewNotify(req.memb.username)
   .then(doc => {
      res.json({success: true});
   })
   .catch(err => {
     res.status(400).json({success: false});
   });
});

// Friends
router.post("/sendfriendReq", authMemb, (req, res) => {
  var username = req.memb.username;
  var friendId = req.body.username;
  // console.log(username, friendId);
  Member.find()
    .sendFriendReq(username, friendId)
    .then(d => {
      sendNotifyToPerson({
        body: username + ' send you friend request', 
        title: 'Notification from Vinti'
      }, {
        type : 'Requests'
      }, friendId,
      null)
      // console.log('1234');
      res.json({ success: true });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.post("/handleFriendReq", authMemb, (req, res) => {
  var username = req.memb.username;
  var friendId = req.body.username;
  var approval = req.body.approval;
  Member.find()
    .handleFriendReq(username, friendId, approval, req.body.proPic)
    .then(d => {
      if(approval) {
        sendNotifyToPerson({
          body: 'You are now friends with ' + username, 
          title: 'Notification from Vinti'
        }, {
          type : 'Requests'
        }, friendId,
        null)
      }
      res.json({ success: true });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.post("/cancelFriendReq", authMemb, (req, res) => {
  var username = req.memb.username;
  var friendId = req.body.username;
  Member.find()
    .cancelFriendReq(username, friendId)
    .then(d => {
      res.json({ success: true });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.post("/unfriend", authMemb, (req, res) => {
  var username = req.memb.username;
  var friendId = req.body.username;
  Member.find()
    .unfriend(username, friendId)
    .then(d => {
      res.json({ success: true });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.put("/updatePro", authMemb, (req, res) => {
  // console.log(req.body);
  var updatedPro = _.pick(req.body.updatedPro, ['name', 'proPic'])
  Member.find()
    .updateProfile(req.memb.username, updatedPro)
    .then(d => {
      // saveImage(updatedPro.proPic, req.memb.username);
      res.json({ success: true });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.post("/search", authMemb, (req, res) => {
  Member.find()
    .search(req.body.search, req.memb.username)
    .then(users => {
      res.json({ success: true, users });
    })
    .catch(err => {
      res.status(400).json({ success: false, err });
    });
});

router.post("/getProfilePic", authMemb, (req, res) => {
  Member.findOne({username: req.body.username})
    .select('proPic')
    .then(d => {
       res.json({proPic: d.proPic});
    })
})


module.exports = router;
