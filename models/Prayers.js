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
        default: 'followers'
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

PrayerSchema.query.allPr = function(username){
    var Pr = this;
    return Member
        .findOne({username})
        .select('friends churchId following')
        .then(doc => {
            // username = doc.friends.map(o => o.username);
            username.push(...doc.friends);
            var churchIds = [doc.churchId];
            churchIds.push(...doc.following);
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
                console.log('obj', i, d[i], username);
                username.push(...d[i].leaders.map(o => o.leadId));
                username.push(...d[i].members);
                console.log('username', username);
            }
            username = Array.from(new Set(username));
            console.log('username', username);
            return username;
        })
        .then(username => {
            return Pr.find({
                $or: [{
                    username: {
                        $in: username
                    }
                },{ 
                    $and: [{
                        username: {
                            $in: followers
                        }
                    },{
                        type: 'followers'
                    }]
                },{
                    type: 'global'
                }]
            }).sort('-date')
                .limit(30);
            });;
};

PrayerSchema.query.byDate = function(username, date) {
    var Pr = this;
    var date = new Date(date);
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
            console.log('date', date);
            return Pr.find({
                username: {
                    $in: username
                }
            })
            .where('date').gt(date)
            .sort('-date')
            .limit(15);
        });;
};

PrayerSchema.query.verifyAndDeletePr = function(id, username, churchId) {
    var Pr = this;
    console.log(id, username, churchId)
    return Pr.findById(id)
        .then(pr => {
            if(pr.username == username) {
                console.log(pr);
                return Pr.findByIdAndRemove(id);
            } else if(churchId) {
                return Church
                .find({churchId})
                .select('leaders.leadId')
                .then(d => {
                    var leaders = [];
                    for(let i in d) {
                        leaders.push(...d[i].leaders.map(o => o.leadId));
                    }
                    console.log(leaders);
                    if(leaders.indexOf(username)> -1) {
                        console.log('true', id);
                        return Pr.findByIdAndRemove(id);
                    }
                    return;
                })
                .catch(e => {
                    return e;
                });
            } else throw {errNo: 1, errMsg: "Permission denied"};
        })
};

var Prayer = mongoose.model('prayer', PrayerSchema, );

module.exports = Prayer;