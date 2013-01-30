module.exports = parseSWT;
module.exports.fromDataView = fromDataView;
module.exports.fromFile = fromFile;
module.exports.fromBuffer = fromBuffer;

var fromDataView = require('./from-data-view').parse;

function parseSWT(swt, callback) {
  if (typeof swt === 'object') {
    if (require('buffer').Buffer.isBuffer(swt)) {
      fromBuffer(swt, callback);
    }
    else if (swt instanceof DataView) {
      fromDataView(swt, callback);
    }
  }
  else if (typeof swt === 'string') {
    fromFile(swt, callback);
  }
}

function fromFile(filename, callback) {
  require('fs').readFile(filename, function(err, buffer) {
    if (err) return callback(err);
    fromBuffer(buffer, callback);
  });
}

function fromBuffer(buffer, callback) {
  var view = new DataView(buffer);
  fromDataView(view, callback);
}