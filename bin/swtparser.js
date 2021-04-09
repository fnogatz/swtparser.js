#!/usr/bin/env node
const fs = require('fs')

const parser = require('../lib/index')

const { program } = require('commander')

program.version(require('../package.json').version)
program
  .option('-i, --input <file>', 'SWT file')
  .option('--indent <num>', 'number of spaces to indent JSON sub-structures', 2)

program.parse(process.argv)
const options = program.opts()

if (options.input) {
  // read from file
  fs.readFile(options.input, (err, buffer) => {
    if (err) { throw err }
    done(parser.fromBuffer(buffer))
  })
} else {
  // read from stdin
  const buffers = []
  process.stdin.resume()
  process.stdin.on('data', function (buf) { buffers.push(buf) })
  process.stdin.on('end', function () {
    const buffer = Buffer.concat(buffers)
    done(parser.fromBuffer(buffer))
  })
}

function done (tnmt) {
  console.log(JSON.stringify(tnmt, null, parseInt(options.indent)))
};
