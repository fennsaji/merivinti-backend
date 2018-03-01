var Church = require('./../models/Church');

var authLead = (req, res, next) => {
  var token = req.header('x-auth');

  Church.findByToken(token).then((church) => {
    if (!church) {
      return Promise.reject();
    }

    req.church = church;
    req.token = token;
    next();
  }).catch((e) => {
    res.status(401).send();
  });
};

var authMemb = (req, res, next) => {
  var token = req.header('x-auth-memb');

  Member.findByToken(token).then((memb) => {
    if (!memb) {
      return Promise.reject();
    }

    req.memb = memb;
    req.token = token;
    next();
  }).catch((e) => {
    res.status(401).send();
  });
};

module.exports = {authLead, authMemb};
