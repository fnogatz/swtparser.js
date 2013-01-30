/**
 * Note:
 * This is just the generator file for browserify.
 * Please run
 *    npm run-script browserify
 * to create the javascript file you can use in the
 * Browser. You will find the generated file 
 * 'swtparser.browserify.js' in the main directory.
 */
var parseSWT = require('./index').fromDataView;
module.exports = parseSWT;