var parser = require('../lib/index')

var opts = require('nomnom')
    .option('input', {
      abbr: 'i',
      flag: false,
      help: 'SWT file'
    })
    .option('version', {
      flag: true,
      help: 'print version and exit',
      callback: function () {
        return require('../package.json').version
      }
    })
    .option('indent', {
      default: 2,
      help: 'number of spaces to indent JSON sub-structures'
    })
    .parse()

if (opts.input) {
  // read from file
  parser.fromFile(opts.input, done)
} else {
  // read from stdin
  var buffers = []
  process.stdin.resume()
  process.stdin.on('data', function (buf) { buffers.push(buf) })
  process.stdin.on('end', function () {
    var buffer = Buffer.concat(buffers)
    parser.fromBuffer(buffer, done)
  })
}

function done (err, tnmt) {
  if (err) { throw err }

  console.log(JSON.stringify(tnmt, null, opts.indent))
};
