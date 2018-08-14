var admin = require("firebase-admin");
const express = require("express");
const { authLead, authMemb } = require("../config/auth");
const Member = require("../models/Member");
const Church = require("../models/Church");
const router = express.Router();

var serviceAccount = require("../config/vinti-7ce6a-firebase-adminsdk-imvae-88437fe082.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vinti-7ce6a.firebaseio.com"
});

function sendNotifyToTopic(notification, data, topic, type) {
  // console.log(notification, topic);
  var message = {
    notification: notification,
    android: {
      ttl: 3600 * 1000 * 24,
      notification: {
        sound: "default",
        tag: type
      }
    },
    data: data,
    topic: topic
  };

  if (type == "Prayer") {
    sendItToFollowers(topic, message);
  }
  admin
    .messaging()
    .send(message)
    .then(response => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);
    })
    .catch(error => {
      console.log("Error sending message:", error);
    });
}

function sendItToFollowers(topic, message) {
  Church.findOne({ churchId: topic })
    .select("followers")
    .then(data => {
      return Member.find()
        .where("username")
        .in(data.followers)
        .select("regToken");
    })
    .then(data => {
      console.log(data);
      message.topic = null;
      var regTokens = data.map(o => {
        if (o.regToken != undefined) return o.regToken;
      });
      console.log(regTokens);
      if (regTokens.length != 0)
        admin.messaging().sendToDevice(regTokens, {
          data: message.data,
          notification: message.notification
        });
    });
}

function sendNotifyToPerson(notification, data, user, type) {
  var regToken;

  findtoken(user)
    .then(token => {
      if (token) regToken = token;
    })
    .catch(err => {
      console.log("error");
    });

  var message = {
    notification: notification,
    android: {
      ttl: 3600 * 1000 * 24,
      notification: {
        sound: "default",
        tag: type
      }
    },
    data: data,
    token: regToken
  };

  admin
    .messaging()
    .send(message)
    .then(response => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);
    })
    .catch(error => {
      console.log("Error sending message:", error);
    });
}

function findtoken(username) {
  return Member.findOne({ username })
    .select("regToken")
    .then(data => {
      return data.regToken;
    })
    .catch(err => {
      console.log("Error");
      return;
    });
}

router.post("/regtoken", authMemb, (req, res) => {
  username = req.memb.username;
  regToken = req.body.regToken;

  Member.findOneAndUpdate(
    { username },
    {
      $set: {
        regToken
      }
    }
  )
    .then(data => {
      res.status(200).json({ data });
    })
    .catch(err => {
      res.status(400).json({ err });
    });
});

module.exports = { notify: router, sendNotifyToTopic, sendNotifyToPerson };

// sendNotifyToTopic({title : 'HI ass 2345678901234567890 ky haal hae tere kyu vella beth hae word limit bata chal', body: 'HI ass 2345678901234567890 ky haal hae tere kyu vella beth hae word limit bata chal 2345678901234567890 ky haal hae tere kyu vella beth hae word limit '}, {datas: '1'}, 'mfbchurch');

// var formidable = require('formidable');
// var FCM = require('fcm-node');

// var serverkey = 'AIzaSyAHXra-cmSOamxU0MTyZTYya7MOr6qg3_8';
// var fcm = new FCM(serverKey);

// function sendnotification(title, message, token) {
//   var message="Hey! you got this notification.";
//   var title="DigitSTORY Notification";
//   var token="<Your Device Token for Android>";
//   topic: 'mfbchurch';
//   data = {
//     success: true
//   }
//   var message = {
//       to: token,
//       notification: {
//           title: title, //title of notification
//           body: message, //content of the notification
//           sound: "default",
//           icon: "ic_launcher" //default notification icon
//       },
//       data: data //payload you want to send with your notification
//   };
//   fcm.send(message, function(err, response){
//       if (err) {
//           console.log("Notification not sent");
//           res.json({success:false})
//       } else {
//           console.log("Successfully sent with response: ", response);
//           res.json({success:true})
//       }
//   });
// }
