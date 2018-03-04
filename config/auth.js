var Church = require("./../models/Church");
var Member = require("./../models/Member");

var authLead = (req, res, next) => {
  var token = req.header("x-auth");

  Church.findByToken(token)
    .then(church => {
      if (!church) {
        return Promise.reject();
      }

      req.church = church;
      req.token = token;
      next();
    })
    .catch(e => {
      res.status(401).send("Error");
    });
};

var authMemb = (req, res, next) => {
  var token = req.header("x-auth");

  console.log(req.header);
  console.log('token2', token);
  Member.findByToken(token)
    .then(memb => {
      if (!memb) {
        console.log("no member");
        return Promise.reject();
      }

      req.memb = memb;
      req.token = token;
      next();
    })
    .catch(e => {
      res.status(401).send("Error");
    });
};

module.exports = { authLead, authMemb };
