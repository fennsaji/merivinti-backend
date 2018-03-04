const Member = require("../models/Member");
const Church = require("../models/Church");
const mongoose = require("mongoose");
const _ = require("lodash");

var PrayerSchema = new mongoose.Schema({
    username: {
        type: String,
        minlength: 6,
        required: true,
        trim: true
    },
    churchId: {
        type: String,
        minlength: 6,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    urgency: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        minlength: 3,
        required: true,
    }
});


PrayerSchema.methods.toJSON = function () {
    var pr = this;
    var prObject = pr.toObject();
  
    return _.pick(prObject, 
      ['_id', 'username', 'churchId', 'body', 'date', 'shareWith']);
};

PrayerSchema.statics.findbyFriends = function(username){
    var Pr = this;
    var username;
    return Member
        .findOne({username})
        .select('friends churchId following')
        .then(doc => {
            username = doc.friends.map(o => o.username);
            var churchIds = [doc.churchId];
            churchIds.push(...doc.following.map(o => o.churchId));
            console.log('Document11', doc);
            console.log('Doc', churchIds);
            return Church
                .find({
                    churchId : {
                        $in : churchIds
                    }})
                .select('members.username leaders.leadId');
        })
        .then(d => {
            console.log(d);
            for(let i in d) {
                console.log('obj', i);
                username.push(...d[i].leaders.map(o => o.leadId));
                username.push(...d[i].members.map(o => o.username));
            }
            username = Array.from(new Set(username));
            console.log('username', username);
            return username;
        })
        .then(username => {
            return Pr.find({
                username: {
                    $in: username
                }
            }).sort('-date');
        });;
};

var Prayer = mongoose.model('prayer', PrayerSchema, );

module.exports = Prayer;