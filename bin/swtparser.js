var parser = require('../lib/index');

var opts = require('nomnom')
   .option('input', {
      abbr: 'i',
      flag: false,
      help: 'SWT file',
      required: true
   })
   .option('version', {
      flag: true,
      help: 'print version and exit',
      callback: function() {
         return require('../package.json').version;
      }
   })
   .parse();

parser.fromFile(opts.input, function(err, tnmt) {
  if (err)
    throw err;

  console.log(JSON.stringify(tnmt, null, 2));
});