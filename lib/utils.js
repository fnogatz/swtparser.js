var csv = require('csv');
var async = require('async');


/**
 * Transforms little endian hex value into Integer.
 *
 * @param {String} hex value
 * @return {Integer}
 */
function parseLittleEndian(hex) {
  var result = 0;
  var pow = 0;
  while (hex.length > 0) {
    result += parseInt(hex.substring(0, 2), 16) * Math.pow(2, pow);
    hex = hex.substring(2, hex.length);
    pow += 8;
  }
  return result;
}


function parseBigEndian(hex) {
  return parseInt(hex, 16);
}


/**
 * Returns boolean value if integer or not.
 *
 * @param {String} to check
 * @return {Boolean}
 */
function isInteger(val) {
  if (isNaN(val))
    return false;
  if (val != parseInt(val))
    return false;
  return true;
};


/**
 * Rtrims the ascii string of binary data beginning
 *  with the null byte.
 *
 * @param {String} to trim
 * @return {String}
 */
function trimToNullByte(str) {
  if (str.search(String.fromCharCode(0)) != -1)
    return str.substring(0, str.search(String.fromCharCode(0)));
  return str;
}


/**
 * Loads key-value-pairs saved in a CSV file into
 *  an object.
 *
 * @param {String} filename to read from
 * @param {Function} callback that takes the object
 */
function loadKeyValueCSV(filename, callback) {
  var out = {};

  csv()
  .fromPath(filename, {
    delimiter: '\t'
  })
  .on('data', function(data, index) {
    if (data[0].match(/^[\w\d]/)) {
      out[data[0]] = data[1];
    }
  })
  .on('end', function(count) {
    callback(null, out);
  })
  .on('error', function(err) {
    callback(err);
  });
};


/**
 * Loads a CSV structure file into an object with
 *  specified field keys as object keys.
 *
 * @param {String} filename to read from
 * @param {Function} callback that takes the object
 */
function loadStructureCSV(filename, callback) {
  var out = {};

  csv()
  .fromPath(filename, {
    delimiter: '\t'
  })
  .transform(function(data) {
    // hex values to decimal
    if (!data[0].match(/^[0-9A-Fa-f]/))
      return false; // comment

    var ret = {
      field: parseInt(data[3]),
      type: data[2].substr(0, 3)
    };

    if (ret.type == 'sel') {
      if (data[2].length == 3) {
        ret.selection = ret.field;
      } else {
        ret.selection = parseInt(data[2].replace(/^sel\:/, ''));
      }
    }

    if (data[1].length > 0) {
      ret.from = parseInt(data[0], 16);
      ret.to = parseInt(data[1], 16);
    } else {
      ret.where = parseInt(data[0], 16);
    }

    return ret;
  })
  .on('data', function(data, index) {
    if (data) {
      var field = data.field;
      delete data.field;
      out[field] = data;
    }
  })
  .on('end', function(count) {
    callback(null, out);
  })
  .on('error', function(err) {
    callback(err);
  });  
}


/**
 * Takes a selection number and searches for the right value.
 *
 * @param {Integer} selection number
 * @param {String} hex key
 * @param {Function} callback that takes the result String
 */
function select_value(selection, Structure, key, callback) {
  var replacement = Structure.selections[selection][key.toUpperCase()];
  if (!replacement || typeof replacement == 'undefined') {
    callback(null, ''+selection+'-[[not_found:'+key+']]');
  } else {
    callback(null, ''+selection+'-'+replacement);
  }
}


/**
 * Takes a Buffer and parses it against a structure.
 *
 * @param {Object} structure, result of loadStructureCSV()
 * @param {Buffer}
 * @param {Integer} start of buffer
 * @param {Integer} end of buffer
 * @param {Function} callback that takes the object
 */
function interpretBinary(structure, Structure, buffer, cb) {
  var out = {};

  var parallelTodo = {};
  for (var field in structure) {
    parallelTodo[field] = (function(field, structure) {
      var part = buffer.slice((structure[field].from || structure[field].where || 0), (structure[field].to || structure[field].where)+1);

      return function(callback) {
        if (structure[field].type == 'asc') {
          callback(null, trimToNullByte(part.toString('binary')));
        } else if (structure[field].type == 'int' || structure[field].type == 'b2a') {
          callback(null, parseInt(part.toString('hex'), 16));
        } else if (structure[field].type == 'boo') {
          callback(null, (part.toString('hex') == 'ff'));
        } else if (structure[field].type == 'bin') {
          callback(null, part.toString('hex'));
        } else if (structure[field].type == 'sel') {
          select_value(structure[field].selection, Structure, part.toString('hex'), callback);
        } else if (structure[field].type == 'inb') {
          callback(null, parseLittleEndian(part.toString('hex')));
        } else {
          // unknown type!
          callback('Unknown type: ' + structure[field].type);
        }
      };
    })(field, structure);
  }

  async.parallel(parallelTodo, cb);
}


/**
 * Loads single piece of repeating information.
 *
 * @param {Object} options
 * @param {Structure}
 * @param {Function} callback
 */
function loadCards(options, Structure, callback) {
  options = options || {};
  if (!options.structure || !options.start || !options.elements || !options.length || !options.buffer)
    throw new Error("Options missing.");

  var tasks = [];
  for (var i = 0; i < options.elements; i++) {
    tasks.push((function(i) {
      return function(callback) {
        var start = parseInt(options.start)+parseInt(options.length)*i;
        var end = parseInt(options.start)+parseInt(options.length)*(i+1);

        interpretBinary(Structure.structures[options.structure], Structure, options.buffer.slice(start, end), function(err, res) {
          if (err)
            return callback(err);

          if (options.add) {
            for (var key in options.add) {
              if (typeof options.add[key] == 'function') {
                res[key] = options.add[key](i);
              }
            }
          }

          callback(null, res);
        });
      };
    })(i));
  }

  async.parallel(tasks, callback);
}


/**
 * Takes a tournament and returns the teams in order of
 *  their occurences within the SWT.
 *
 * @param {Object} tournament object after parsing process
 * @return {Array} of teams
 */
function getOrderedTeamsFromTnmt(tnmt) {
  var res = [];
  for (var i = 0; i < tnmt.teams.length; i++) {
    res[tnmt.teams[i].positionInSWT] = tnmt.teams[i]['1018'];
  }
  return res;
}


/**
 * Takes a tournament and returns the players in order of
 *  their occurences within the SWT.
 *
 * @param {Object} tournament object after parsing process
 * @return {Array} of players
 */
function getOrderedPlayersFromTnmt(tnmt) {
  var res = [];
  for (var i = 0; i < tnmt.players.length; i++) {
    res[tnmt.players[i].positionInSWT] = tnmt.players[i]['2020'];
  }
  return res;
}


///--- Exported API

module.exports = {
  isInteger: isInteger,
  trimToNullByte: trimToNullByte,
  parseEndian: {
    little: parseLittleEndian,
    big: parseBigEndian
  },
  loadKeyValueCSV: loadKeyValueCSV,
  loadStructureCSV: loadStructureCSV,
  interpretBinary: interpretBinary,
  loadCards: loadCards,
  swt: {
    getOrderedTeams: getOrderedTeamsFromTnmt,
    getOrderedPlayers: getOrderedPlayersFromTnmt,
  }
};
