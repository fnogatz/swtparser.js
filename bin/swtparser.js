#!/usr/bin/env node
var parser = require('../lib/index')

var { program } = require('commander')

program.version(require('../package.json').version)
program
  .option('-i, --input <file>', 'SWT file')
  .option('--indent <num>', 'number of spaces to indent JSON sub-structures', 2)

program.parse(process.argv)

if (program.input) {
  // read from file
  parser.fromFile(program.input, done)
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

  console.log(JSON.stringify(tnmt, null, parseInt(program.indent)))
};
