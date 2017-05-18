var path = require('path')
var childProcess = require('child_process')
var interpreted = require('interpreted')

interpreted({
  source: path.resolve(__dirname, 'SWT'),
  expected: path.resolve(__dirname, 'JSON'),
  update: false,

  // This method will be used to test the files.
  test: function (name, content, callback) {
    console.log(name)
    var cp = childProcess.spawn('node', [path.resolve(__dirname, '..', 'bin', 'swtparser.js'), '--input', path.resolve(__dirname, 'SWT', name + '.SWT')])

    cp.stdout.setEncoding('utf8')
    var json = ''
    cp.stdout.on('data', function (data) {
      json += data
    })
    cp.stdout.on('end', function () {
      callback(null, JSON.parse(json))
    })
    cp.stdin.end()
  },

  // optional. This method will execute before the file tests.
  start: function (callback) {
    callback(null)
  },

  // optional. This method will execute after the file tests.
  close: function (callback) {
    callback(null)
  }
})
