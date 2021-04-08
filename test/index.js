const path = require('path')
const childProcess = require('child_process')
const interpreted = require('interpreted')

interpreted({
  source: path.resolve(__dirname, 'SWT'),
  expected: path.resolve(__dirname, 'JSON'),
  update: false,

  // This method will be used to test the files.
  test: function (name, content, callback) {
    console.log(name)
    const cp = childProcess.spawn('node', [path.resolve(__dirname, '..', 'bin', 'swtparser.js'), '--input', path.resolve(__dirname, 'SWT', name + '.SWT')])

    cp.stdout.setEncoding('utf8')
    let json = ''
    cp.stdout.on('data', function (data) {
      json += data
    })
    cp.stdout.on('end', function () {
      callback(null, JSON.parse(json))
    })
    cp.stdin.end()
  }
})
