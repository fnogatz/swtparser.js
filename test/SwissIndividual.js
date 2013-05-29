var path = require('path');
var childProcess = require('child_process');
var interpreted = require('interpreted');

var PROLOG = 'swipl';
var XSD2JSON = path.resolve(__dirname, '..', 'lib', 'cli.pl');

interpreted({
  source: path.resolve(__dirname, 'xsd'),
  expected: path.resolve(__dirname, 'json'),
  update: false,

  // This method will be used to test the files.
  test: function (name, content, callback) {
    var prolog = childProcess.spawn(PROLOG, ['--quiet', '--nodebug', '-g', 'main,halt', '-s', XSD2JSON, '--']);

    prolog.stdout.setEncoding('utf8');
    var json = '';
    prolog.stdout.on('data', function(data) {
      json += data;
    });
    prolog.stdout.on('end', function() {
      callback(null, JSON.parse(json));
    });

    prolog.stdin.write(content);
    prolog.stdin.end();
  },

  // optional. This method will execute before the file tests.
  start: function (callback) {
    callback(null);
  },

  // optional. This method will execute after the file tests.
  close: function (callback) {
    callback(null);
  }
});