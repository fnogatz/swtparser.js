const fromDataView = require('./from-data-view')

module.exports = parseSWT
module.exports.fromDataView = fromDataView
module.exports.fromBuffer = fromBuffer

function parseSWT (swt) {
  if (typeof swt === 'object') {
    if (require('buffer').Buffer.isBuffer(swt)) {
      return fromBuffer(swt)
    } else if (swt instanceof DataView) {
      return fromDataView(swt)
    }
  }
  throw new Error('Unsupported data input format')
}

function fromBuffer (buffer) {
  const arrayBuffer = bufferToArrayBuffer(buffer)
  const view = new DataView(arrayBuffer)

  return fromDataView(view)
}

function bufferToArrayBuffer (buffer) {
  // see http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
  const ab = new ArrayBuffer(buffer.length)
  const view = new Uint8Array(ab)
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i]
  }
  return ab
}
