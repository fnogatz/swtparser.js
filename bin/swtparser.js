#!/usr/bin/env node
var fs = require('fs')

var parser = require('../lib/index')

var { program } = require('commander')

program.version(require('../package.json').version)
program
  .option('-i, --input <file>', 'SWT file')
  .option('--indent <num>', 'number of spaces to indent JSON sub-structures', 2)

program.parse(process.argv)

if (program.input) {
  // read from file
  fs.readFile(program.input, (err, buffer) => {
    if (err) { throw err }
    done(parser.fromBuffer(buffer))
  })
} else {
  // read from stdin
  var buffers = []
  process.stdin.resume()
  process.stdin.on('data', function (buf) { buffers.push(buf) })
  process.stdin.on('end', function () {
    var buffer = Buffer.concat(buffers)
    done(parser.fromBuffer(buffer))
  })
}

function done (tnmt) {
  console.log(JSON.stringify(tnmt, null, parseInt(program.indent)))
};
