const fs = require('fs');
const path = require('path');
const publicPath = path.join(__dirname, './../public/profile/');

var defaultPic = 'data:image/jpeg;base64,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'

function saveImage(dataString, id) {
  console.log('called');
  var image = decodeBase64Image(dataString);
  console.log(dataString, publicPath);
  fs.writeFile(publicPath + id + '.jpg', image.data,(err) => {
    if(err)
      console.log('errror saving image');
    else
      console.log('Done image', id, image);
  })
}

function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
}

module.exports = { saveImage,  defaultPic}