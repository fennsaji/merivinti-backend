const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const Member = require('../models/Member');
const config = require('./database');

//Authentication Verifier
module.exports = function(passport) {
  let opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
  opts.secretOrKey = process.env.SECRET || config.secret;
  passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
    Member.getUserById(jwt_payload._id, (err, memb) => {
      if(err) {
        return done(err, false);
      }

      if(memb) {
        return done(null, memb);
      } else {
        return done(null, false);
      }
    });
  }));
}
