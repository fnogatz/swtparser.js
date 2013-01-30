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
        var ret = null;

        if (structure[field].type == 'asc') {
          ret = trimToNullByte(part.toString('binary'));
        } else if (structure[field].type == 'int' || structure[field].type == 'b2a') {
          ret = parseInt(part.toString('hex'), 16);
        } else if (structure[field].type == 'boo') {
          ret = (part.toString('hex') == 'ff');
        } else if (structure[field].type == 'bin') {
          ret = part.toString('hex');
        } else if (structure[field].type == 'inb') {
          ret = parseLittleEndian(part.toString('hex'));
        } else if (structure[field].type == 'sel') {
          select_value(structure[field].selection, Structure, part.toString('hex'), callback);
          return;
        } else {
          // unknown type!
          callback('Unknown type: ' + structure[field].type);
          return;
        }

        if (Structure.types[field]) {
          ret = transformToType(ret, Structure.types[field]);
        }

        callback(null, ret);
      };
    })(field, structure);
  }

  async.parallel(parallelTodo, cb);
}


function transformToType(value, type) {
  if (type == 'int') {
    if (value == '')
      return null;

    return parseInt(value);
  }

  return value;
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
  interpretBinary: interpretBinary,
  loadCards: loadCards,
  swt: {
    getOrderedTeams: getOrderedTeamsFromTnmt,
    getOrderedPlayers: getOrderedPlayersFromTnmt,
  }
};
