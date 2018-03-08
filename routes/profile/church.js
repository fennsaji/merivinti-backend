const { authLead, authMemb } = require("../config/auth");
const Church = require("../models/Church");
const Member = require("../models/Member");
const express = require("express");

const router = express.Router();

// Get Details 
router.get('mychurch', authMemb, (req, res) => {

});
router.post("/getDetails", authMemb, (req, res) => {
  // If member or follower sen
  Church.find()
    .getDetails(req.body.churchId, req.memb.username)
    .then()
    .catch();
});

router.post("/getInfoMembers", authMemb, (req, res) => {
  var churchId = req.body.churchId;
  Church.find()
    .getInfoMembers(username)
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
    .getInfoFollowers(username)
    .then(followers => {
      res.json({ success: true, followers });
    })
    .catch(errObj => {
      res.json({ success: false, errObj });
    });
});

router.post('/getInfoLeaders', authMemb, (req, res) => {
  var churchId = req.body.churchId;
  Church.find()
    .getInfoLeaders(username)
    .then(leaders => {
      res.json({ success: true, leaders });
    })
    .catch(errObj => {
      res.json({ success: false, errObj });
    });
});

// Followers
router.post("/followReq", authMemb, (req, res) => {
  // update followers of church and following of member
  Church.find()
    .sendfollowReq(req.memb.username, req.body.churchId)
    .then(doc => {
      res.json({success: true});
    })
    .catch(e => {
      res.status(400).json({success: false});
    });
});

router.post("/handlefollowReq", authLead, (req, res) => {
  Church.find()
  .handlefollowReq(req.memb.username, req.body.churchId, req.body.approval)
  .then(doc => {
    res.json({success: true});
  })
  .catch(e => {
    res.status(400).json({success: false});
  });
});

router.post("/cancelfollowReq", authMemb, (req, res) => {
  Church.find()
  .cancelfollowReq(req.memb.username, req.body.churchId)
  .then(doc => {
    res.json({success: true});
  })
  .catch(e => {
    res.status(400).json({success: false});
  });
});

router.delete("/unfollow", authMemb, (req, res) => {
  Church.find()
  .unfollow(req.memb.username, req.body.churchId)
  .then(doc => {
    res.json({success: true});
  })
  .catch(e => {
    res.status(400).json({success: false});
  });
});

router.delete("removefollower", authLead, (req, res) => {
  Church.find()
  .unfollow(req.body.username, req.church.churchId)
  .then(doc => {
    res.json({success: true});
  })
  .catch(e => {
    res.status(400).json({success: false});
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
  
  Church.addAsMember(req.body.churchId, req.memb.username)
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

router.delete("/cancelMembReq", authMemb, (req, res) => {
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
    .unmember(req.body.churchId, username)
    .then(doc => {
      console.log(doc);
      res.json({ success: true, doc });
    })
    .catch(errObj => {
      res.status(400).json({ success: false, errObj });
    });
});

router.delete("/removeMember", authLead, (req, res) => {
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
    .addAsLeader(req.church.churchId, username, req.body.approval)
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
});

router.post('/promoteLeader', (req, res) => {

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

router.put("/updatePro", authLead, (req, res) => {});

router.post("/search", (req, res) => {});

module.exports = router;
