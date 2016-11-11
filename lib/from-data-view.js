module.exports = parseDataView;

var Structure = require('./structure.json');

function parseDataView(view, callback) {
  var tnmt = {
    players: [],
    pairings_players: []
  };

  // read general information
  tnmt.general = parseCard(view, 0, Structure.structures.general, Structure);
  
  // read players
  var playerOffset = parseInt(Structure.parameters['start:fixtures_players']);
  if (tnmt.general[3] > 0) {
    playerOffset += (tnmt.general[4] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing']))
                    + (tnmt.general[80] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing']));
  }
  var player;
  for (var i = 0; i < tnmt.general[4]; i++, playerOffset += parseInt(Structure.parameters['length:player'])) {
    player = parseCard(view, playerOffset, Structure.structures.player, Structure);
    player.positionInSWT = i;
    tnmt.players.push(player);
  }

  if (tnmt.general[3] > 0) {
    // read players' pairings
    var playerPairingOffset = parseInt(Structure.parameters['start:fixtures_players']);
    var playerPairing;
    var orderedPlayers = getOrderedPlayers(tnmt);
    for (var i = 0; i < tnmt.general[1] * tnmt.general[4]; i++, playerPairingOffset += parseInt(Structure.parameters['length:pairing'])) {
      playerPairing = parseCard(view, playerPairingOffset, Structure.structures['individual-pairings'], Structure);
      playerPairing.player = orderedPlayers[Math.floor(i / tnmt.general[1])];
      playerPairing.round = i % tnmt.general[1] + 1;
      tnmt.pairings_players.push(playerPairing);
    }
    // delete dummy pairings
    tnmt.pairings_players = tnmt.pairings_players.filter(playerPairingFilter(tnmt));
  }

  if (tnmt.general[35] === true) {
    // team tournament
    tnmt.teams = [];
    tnmt.pairings_teams = [];
    
    // read teams
    var teamOffset = parseInt(Structure.parameters['start:fixtures_players'])
                        + (tnmt.general[4] * parseInt(Structure.parameters['length:player']));
    if (tnmt.general[3] > 0) {
      teamOffset += (tnmt.general[4] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing']))
                    + (tnmt.general[80] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing']));
    }
    var team;
    for (var i = 0; i < tnmt.general[80]; i++, teamOffset += parseInt(Structure.parameters['length:team'])) {
      team = parseCard(view, teamOffset, Structure.structures.team, Structure);
      team.positionInSWT = i;
      tnmt.teams.push(team);
    }

    if (tnmt.general[3] > 0) {
      // read teams' pairings
      var teamPairingOffset = parseInt(Structure.parameters['start:fixtures_players'])
                              + (tnmt.general[1] * tnmt.general[4] * parseInt(Structure.parameters['length:pairing']));
      var teamPairing;
      var orderedTeams = getOrderedTeams(tnmt);
      for (var i = 0; i < tnmt.general[1] * tnmt.general[80]; i++, teamPairingOffset += parseInt(Structure.parameters['length:pairing'])) {
        teamPairing = parseCard(view, teamPairingOffset, Structure.structures['team-pairings'], Structure);
        teamPairing.team = orderedTeams[Math.floor(i / tnmt.general[1])];
        teamPairing.round = i % tnmt.general['1'] + 1;
        tnmt.pairings_teams.push(teamPairing);
      }
      // delete dummy pairings
      tnmt.pairings_teams = tnmt.pairings_teams.filter(teamPairingFilter(tnmt));
    }
  }


  callback(null, tnmt);
}


function parseCard(view, offset, structure, Structure) {
  var object = {};
  for (var field in structure) {
    if (structure[field].type === 'int' || structure[field].type === 'inb') {
      // content is integer value, little endian

      // int: little endian; inb: big endian
      var littleEndian = !(structure[field].type === 'int');
      if (structure[field].hasOwnProperty('where')) {
        object[field] = view.getUint8(offset + structure[field].where);
      }
      else if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        var diff = structure[field].to - structure[field].from;
        if (diff === 0)
          object[field] = view.getInt8(offset + structure[field].from);
        else if (diff === 1)
          object[field] = view.getInt16(offset + structure[field].from, littleEndian);
        else if (diff === 2)
          object[field] = view.getInt32(offset + structure[field].from, littleEndian);
      }
    }
    else if (structure[field].type === 'boo') {
      // content is boolean
      if (structure[field].hasOwnProperty('where')) {
        object[field] = view.getUint8(offset + structure[field].where) === 255;
      }
    }
    else if (structure[field].type === 'asc') {
      // content is in ASCII format
      if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        object[field] = getString(view, offset+structure[field].from, offset+structure[field].to);
      }
      else if (structure[field].hasOwnProperty('where')) {
        var pos = offset+structure[field].where;
        object[field] = getString(view, pos, pos);
      }
    }
    else if (structure[field].type === 'dat') {
      var days = 0;
      if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        if (structure[field].to === structure[field].from + 1) {
          days = view.getUint16(structure[field].from, true);
        }
      }
      if (days > 0) {
        var date = new Date('12/30/1899');
        date.setTime(date.getTime() + 1000*60*60*24*days);
        object[field] = date.toDateString();
      }
    }
    else if (structure[field].type === 'tim') {
      if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        if (structure[field].to === structure[field].from + 1) {
          var d = new Date();
          d.setHours(view.getUint8(structure[field].from));
          d.setMinutes(view.getUint8(structure[field].to));
          if (d.toTimeString().slice(0,5) !== '00:00')
            object[field] = d.toTimeString().slice(0,5);
        }
      }
    }
    else if (structure[field].type === 'bin') {
      // content is binary value
      if (structure[field].hasOwnProperty('where')) {
        var bin = view.getUint8(offset + structure[field].where).toString(16);
        if (bin.length == 1)
          bin = '0'+bin;
        object[field] = bin;
      }
      else if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        object[field] = '';
        for (var pos = structure[field].from; pos <= structure[field].to; pos++) {
          var bin = view.getUint8(offset + structure[field].where).toString(16);
          if (bin.length == 1)
            bin = '0'+bin;
          object[field] += bin;
        }
      }
    }
    else if (structure[field].type === 'bib') {
      // Content is binary value, big endian

      var bin = view.getInt16(offset + structure[field].from, true).toString(16);
      object[field] = bin;
    }
    else if (structure[field].type === 'sel' && structure[field].selection && Structure.selections.hasOwnProperty(structure[field].selection)) {
      if (structure[field].hasOwnProperty('where')) {
        var sel = view.getInt8(offset + structure[field].where).toString(16);
        if (sel.length == 1)
          sel = '0'+sel;
        sel = sel.toUpperCase();

        if (Structure.selections[structure[field].selection].hasOwnProperty(sel)) {
          object[field] = structure[field].selection+'-'+Structure.selections[structure[field].selection][sel];
        }
      }
    }
  }

  return object;
}


function getString(view, from, to) {
  value = '';
  for (var i = 0; i <= to-from; i++) {
    var char = view.getUint8(from + i);
    if (char === 0)
      break;
    value += String.fromCharCode(char);
  }
  return value;
}


/**
* Takes a tournament and returns the players in order of
* their occurences within the SWT.
*
* @param {Object} tournament object after parsing process
* @return {Array} of players
*/
function getOrderedPlayers(tnmt) {
  var res = [];
  for (var i = 0; i < tnmt.players.length; i++) {
    res[tnmt.players[i].positionInSWT] = tnmt.players[i]['2020'];
  }
  return res;
}


/**
* Takes a tournament and returns the teams in order of
* their occurences within the SWT.
*
* @param {Object} tournament object after parsing process
* @return {Array} of teams
*/
function getOrderedTeams(tnmt) {
  var res = [];
  for (var i = 0; i < tnmt.teams.length; i++) {
    res[tnmt.teams[i].positionInSWT] = tnmt.teams[i]['1018'];
  }
  return res;
}


/**
 * Filter function to remove dummy player pairings.
 * @param  {Object} pairing
 * @return {Boolean}         true -> valid pairing
 */
function playerPairingFilter(tnmt) {
  return function(pairing) {
    // board number too high?
    if (tnmt.general[35] && pairing[4006] > tnmt.general[34])
      return false;

    // no color set?
    if (pairing[4000] == '4000-0')
      return false;

    return true;
  }
}


/**
 * Filter function to remove dummy team pairings.
 * @param  {Object} pairing
 * @return {Boolean}         true -> valid pairing
 */
function teamPairingFilter(tnmt) {
  return function(pairing) {
    return pairing[3001] != '3001-0';
  }
}