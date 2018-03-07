const { authLead, authMemb } = require("../config/auth");
const Church = require("../models/Church");
const Member = require("../models/Member");
const express = require("express");

const router = express.Router();

router.post('/follow', authMemb, (req, res) => {
  // update followers of church and following of member
  });
  
  
  router.delete('/unfollow', authMemb, (req, res) => {
  
  });
  

router.post('/sendMembReq', authMemb, (req, res) => {
  Church.addAsMember(req.body.churchId, req.memb.username)
    .then(church => {
      console.log("register", church);
    })
    .catch(err => {
      console.log("Could not request church");
    });
});

router.post('/handleMembReq', authLead, (req, res) => {
  var username = req.body.username;
  Church.find().membReq(req.church.churchId, username, req.body.approval)
    .then(doc => {
      console.log(doc);
      res.json({success: true, doc});
    })
    .catch(e => {
      res.status(400).json({success: false, e});
    });
});

router.delete('/removeMember', authLead, (req, res) => {

});

router.delete('/cancelMembReq', authMemb, (req, res) => {

});

router.delete('/unmember', authMemb, (req, res) => {

});

router.post('/getDetailChurch', authMemb, (req, res) => {

});


router.post('/getInfoMembers', authMemb, (req, res) => {
  var churchId = req.body.churchId;

});


// Under Construction
router.post('/handleLeadReq', authLead, (req, res) => {
  var username = req.body.username;
  Church.find().LeadReq(req.church.churchId, username, req.body.approval)
    .then(doc => {
      console.log(doc);
      res.json({success: true, doc});
    })
    .catch(e => {
      res.status(400).json({success: false, e});
    });

});

router.post('/getInfoLeader', authMemb, (req, res) => {
  var churchId = req.body.churchId;

});

router.delete('/removeLeader', authLead, (req, res) => {
  // Don't remove leader at index 0
  });
  


router.post('/getInfoFollowers', authMemb, (req, res) => {
  var churchId = req.body.churchId;
  Church.find()
  .getInfoFollowers(username)
  .then(friends => {
     res.json({success:true, friends});
  })
  .catch(errObj => {
     res.json({success: false, errObj});
  });
});



router.put('/updatePro', authLead, (req, res) => {

});


router.post('/addFamiliy', authLead, (req, res) => {
  var newfly = req.body;
  Church.find()
    .addNewFly(req.church.churchId, newfly)
    .then(d => {
      console.log(d);
      res.json({success: true, updateMemb: d.families});
    })
    .catch(e => {
      console.log('error');
      res.status(400).json({success: false, errNo: 0, errObj: e});
    });
});


router.post('/search', (req, res) => {

});

module.exports = router;