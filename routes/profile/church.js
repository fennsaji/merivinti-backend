const { authLead, authMemb } = require("../../config/auth");
const Church = require("../../models/Church");
const Member = require("../../models/Member");
const express = require("express");
const { saveImage } = require('../../config/assests');
const router = express.Router();
const _ = require("lodash");

// Get Details
router.get("mychurch", authMemb, (req, res) => {});

router.post("/getDetails", authMemb, (req, res) => {
  // If member or follower sen
  Church.find()
    .getDetails(req.body.churchId, req.memb.username)
    .then(({church, prayerReq }) => {
      console.log('123457777', church, prayerReq);
      church.noOfPost = prayerReq.length;
      console.log('chdaokdasjidj');
      res.json({success: true, church, prayerReq})
    })
    .catch(err => {
      console.log('asfa');
      res.status(400).json({success: false, err})
    });
});

router.post("/getInfoMembers", authMemb, (req, res) => {
  var churchId = req.body.churchId;
  Church.find()
    .getInfoMembers(churchId)
    .then(members => {
      res.json({ success: true, members });
    })
    .catch(errObj => {
      res.json({ success: false, errObj });
    });
});

router.post("/getInfoFollowers", authMemb, (req, res) => {
  var churchId = req.body.churchId;
  Church.find()
    .getInfoFollowers(churchId)
    .then(followers => {
      res.json({ success: true, followers });
    })
    .catch(errObj => {
      res.json({ success: false, errObj });
    });
});

router.post("/getInfoLeaders", authMemb, (req, res) => {
  var churchId = req.body.churchId;
  Church.find()
    .getInfoLeaders(churchId)
    .then(leaders => {
      res.json({ success: true, leaders });
    })
    .catch(errObj => {
      res.json({ success: false, errObj });
    });
});

router.get('/getbasicinfo', authLead, (req, res) => {
  Church.find()
    .getbasicdetails(req.church.churchId)
    .then(list => {
      res.json({success: true, list})
    })
    .catch(err => {
      res.status(400).json({success: false, errObj: err});
    });
});

router.get('/getNotifications', authLead, (req, res) => {
  Church.find()
    .getNotifications(req.church.churchId)
    .then(list => {
      res.json({success: true, list})
    })
    .catch(err => {
      res.status(400).json({success: false, errObj: err});
    });
});

router.post('/pushNotifications', authLead, (req, res) => {
  Church.find()
    .pushNotifications(req.church.churchId, req.body.newNotify)
    .then(list => {
      res.json({success: true, list})
    })
    .catch(err => {
      res.status(400).json({success: false, errObj: err});
    });
});

router.delete('/newNotifications', authLead, (req, res) => {
 Church.find()
  .clearNewNotify(req.church.churchId)
  .then(doc => {
     res.json({success: true});
  })
  .catch(err => {
    res.status(400).json({success: false});
  });
});

// Followers
router.post("/followReq", authMemb, (req, res) => {
  // update followers of church and following of member
  Church.find()
    .sendfollowReq(req.memb.username, req.body.churchId)
    .then(doc => {
      console.log('1');
      res.json({ success: true });
    })
    .catch(e => {
      res.status(400).json({ success: false });
    });
});

router.post("/handlefollowReq", authLead, (req, res) => {
  Church.find()
    .handlefollowReq(req.body.username, req.church.churchId, req.body.approval)
    .then(doc => {
      res.json({ success: true });
    })
    .catch(e => {
      res.status(400).json({ success: false });
    });
});

router.post("/cancelfollowReq", authMemb, (req, res) => {
  Church.find()
    .cancelfollowReq(req.memb.username, req.body.churchId)
    .then(doc => {
      res.json({ success: true });
    })
    .catch(e => {
      res.status(400).json({ success: false });
    });
});

router.delete("/unfollow", authMemb, (req, res) => {
  Church.find()
    .unfollow(req.memb.username, req.body.churchId)
    .then(doc => {
      res.json({ success: true });
    })
    .catch(e => {
      res.status(400).json({ success: false });
    });
});

router.post("/removefollower", authLead, (req, res) => {
  Church.find()
    .unfollow(req.body.username, req.church.churchId)
    .then(doc => {
      res.json({ success: true });
    })
    .catch(e => {
      res.status(400).json({ success: false });
    });
});

// Members
router.post("/sendMembReq", authMemb, (req, res) => {
  if (req.memb.churchId) {
    res.status(400).json({
      errCode: 1,
      success: false,
      errMsg: "Already a member of a church"
    });
  }

  Church.find()
    .sendMemberReq(req.body.churchId, req.memb.username)
    .then(church => {
      console.log("register", church);
      res.json({ success: true });
    })
    .catch(err => {
      console.log("Could not request");
      res.status(400).json({
        errCode: 2,
        success: false,
        errMsg: "Could not Request",
        errObj: err
      });
    });
});

router.post("/handleMembReq", authLead, (req, res) => {
  var username = req.body.username;
  Church.find()
    .handleMembReq(req.church.churchId, username, req.body.approval)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.post("/cancelMembReq", authMemb, (req, res) => {
  var username = req.memb.username;
  Church.find()
    .cancelMembReq(req.body.churchId, username)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.delete("/unmember", authMemb, (req, res) => {
  var username = req.memb.username;
  Church.find()
    .unmember(req.memb.churchId, username)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.post("/removeMember", authLead, (req, res) => {
  var username = req.body.username;
  Church.find()
    .unmember(req.church.churchId, username)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

// Under Construction Leader
router.post("/addAsLeader", authLead, (req, res) => {
  var username = req.body.username;
  Church.find()
    .addAsLeader(req.church.churchId, username)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(e => {
      res.status(400).json({ success: false, e });
    });
});

router.delete("/removeLeader", authLead, (req, res) => {
  // Don't remove leader of type Head
  var username = req.body.username;
  Church.find()
    .removeLeader(req.church.churchId, username)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(e => {
      res.status(400).json({ success: false, e });
    });
});

router.post("/promoteLeader", (req, res) => {
  var username = req.body.username;
  Church.find()
    .promoteLeader(req.church.churchId, username)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(e => {
      res.status(400).json({ success: false, e });
    });
});

router.post("/addFamiliy", authLead, (req, res) => {
  var newfly = req.body;
  Church.find()
    .addNewFly(req.church.churchId, newfly)
    .then(d => {
      console.log(d);
      res.json({ success: true, updateMemb: d.families });
    })
    .catch(e => {
      console.log("error");
      res.status(400).json({ success: false, errNo: 0, errObj: e });
    });
});

router.put("/updatePro", authLead, (req, res) => {
  var updated = _.pick(req.body.updatedPro, ['churchName', 'proPic']);
  // console.log('updated', updated);
  Church.find()
    .updateProfile(req.church.churchId, updated)
    .then(doc => {
      // console.log(doc);
      console.log('done savig');
      saveImage(updated.proPic, req.church.churchId);
      res.json({ success: true, doc });
    })
    .catch(e => {
      res.status(400).json({ success: false, e });
    });
});

router.post("/search", authMemb, (req, res) => {
    Church.find()
      .search(req.body.search, req.memb.churchId)
      .then(churches => {
        console.log('123',churches);
        res.json({ success: true, churches });
      })
      .catch(err => {
        res.status(400).json({ success: false, err });
      });
});

module.exports = router;
