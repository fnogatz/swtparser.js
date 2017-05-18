var fromDataView = require('./from-data-view')

module.exports = parseSWT
module.exports.fromDataView = fromDataView
module.exports.fromFile = fromFile
module.exports.fromBuffer = fromBuffer

function parseSWT (swt, callback) {
  if (typeof swt === 'object') {
    if (require('buffer').Buffer.isBuffer(swt)) {
      fromBuffer(swt, callback)
    } else if (swt instanceof DataView) {
      fromDataView(swt, callback)
    }
  } else if (typeof swt === 'string') {
    fromFile(swt, callback)
  }
}

function fromFile (filename, callback) {
  require('fs').readFile(filename, function (err, buffer) {
    if (err) return callback(err)
    fromBuffer(buffer, callback)
  })
}

function fromBuffer (buffer, callback) {
  var arrayBuffer = bufferToArrayBuffer(buffer)
  var view = new DataView(arrayBuffer)

  fromDataView(view, callback)
}

function bufferToArrayBuffer (buffer) {
  // see http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
  var ab = new ArrayBuffer(buffer.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i]
  }
  return ab
}
