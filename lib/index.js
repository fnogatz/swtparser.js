var fs = require('fs');

var async = require('async');

var utils = require('./utils');
var Structure = require('./structure.json');


function parseFromSWTfile(filename, callback) {
  fs.readFile(filename, function(err, data) {
    if (err)
      return callback(err);

    parseSWT(data, callback);
  });
}


function parseSWT(buffer, callback) {
  utils.interpretBinary(Structure.structures.general, Structure, buffer.slice(0, Structure.parameters['start:fixtures_players']), function(err, generalInformation) {

    if (generalInformation['3'] === 0) {
      // No pairings set yet
      Structure.parameters['length:pairing'] = 0;
    }

    var parallelTodo = {
      players: function getPlayers(callback) {
        var startVal = parseInt(Structure.parameters['start:fixtures_players'])
                        + (generalInformation['4'] * generalInformation['1'] * parseInt(Structure.parameters['length:pairing']))
                        + (generalInformation['80'] * generalInformation['1'] * parseInt(Structure.parameters['length:pairing']));

        utils.loadCards({
          buffer: buffer,
          structure: 'player',
          start: startVal,
          elements: generalInformation['4'],
          length: parseInt(Structure.parameters['length:player']),
          add: {
            positionInSWT: function(i) {
              return i;
            }
          }
        }, Structure, callback);
      }
    };

    if (generalInformation['35']) {
      parallelTodo.teams = function getTeams(callback) {
        var startVal = parseInt(Structure.parameters['start:fixtures_players'])
                        + (generalInformation['4'] * generalInformation['1'] * parseInt(Structure.parameters['length:pairing']))
                        + (generalInformation['80'] * generalInformation['1'] * parseInt(Structure.parameters['length:pairing']))
                        + (generalInformation['4'] * parseInt(Structure.parameters['length:player']));

        utils.loadCards({
          buffer: buffer,
          structure: 'team',
          start: startVal,
          elements: generalInformation['80'],
          length: parseInt(Structure.parameters['length:team']),
          add: {
            positionInSWT: function(i) {
              return i;
            }
          }
        }, Structure, callback);
      };
    }

    async.parallel(parallelTodo, function(err, tnmt) {
      if (err)
        return callback(err);

      if (generalInformation['3'] === 0) {
        // no pairings set yet
        var parallelTodo = {};
      } else {
        var parallelTodo = {
          pairings_players: function getPlayerPairings(callback) {
            var orderedPlayers = utils.swt.getOrderedPlayers(tnmt);

            utils.loadCards({
              buffer: buffer,
              structure: 'individual-pairings',
              start: parseInt(Structure.parameters['start:fixtures_players']),
              elements: generalInformation['1'] * generalInformation['4'],
              length: parseInt(Structure.parameters['length:pairing']),
              add: {
                player: function(i) {
                  return orderedPlayers[Math.floor(i / generalInformation['1'])];
                },
                round: function(i) {
                  return i % generalInformation['1'] + 1;
                }
              }
            }, Structure, function(err, pairings_players) {
              if (err)
                return callback(err);

              // delete dummy pairings
              pairings_players = pairings_players.filter(function(pairing) {
                // board number too high?
                if (generalInformation[35] && pairing[4006] > generalInformation[34])
                  return false;

                // no color set?
                if (pairing[4000] == '4000-0')
                  return false;

                return true;
              });

              callback(null, pairings_players);
            });
          }
        };

        if (generalInformation['35']) {
          parallelTodo.pairings_teams = function getTeamPairings(callback) {
            var startVal = parseInt(Structure.parameters['start:fixtures_players'])
                            + (generalInformation['1'] * generalInformation['4'] * parseInt(Structure.parameters['length:pairing']));

            var orderedTeams = utils.swt.getOrderedTeams(tnmt);

            utils.loadCards({
              buffer: buffer,
              structure: 'team-pairings',
              start: startVal,
              elements: generalInformation['1'] * generalInformation['80'],
              length: parseInt(Structure.parameters['length:pairing']),
              add: {
                team: function(i) {
                  return orderedTeams[Math.floor(i / generalInformation['1'])];
                },
                round: function(i) {
                  return i % generalInformation['1'] + 1;
                }
              }
            }, Structure, function(err, pairings_teams) {
              if (err)
                return callback(err);

              // delete dummy pairings
              pairings_teams = pairings_teams.filter(function(pairing) {
                return pairing[3001] != '3001-0';
              });

              callback(null, pairings_teams);
            });           
          };
        }
      }

      async.parallel(parallelTodo, function(err, res) {
        if (err)
          return callback(err);

        for (var key in res) {
          tnmt[key] = res[key];
        }

        tnmt.general = generalInformation;

        if (generalInformation[35]) {
          // Team Tournament
          // correct table numbers for individual pairings if "0"
          for (var i = 0; i < tnmt.pairings_players.length; i++) {
            if (tnmt.pairings_players[i][4004] == 0) {
              // no table set
              var player = tnmt.players.filter(function(player) {
                return player[2020] === tnmt.pairings_players[i].player;
              })[0];

              var team = tnmt.teams.filter(function(team) {
                return team[1019] === player[2016];
              })[0];

              var teamPairing = tnmt.pairings_teams.filter(function(teamPairing) {
                var sameRound = teamPairing.round === tnmt.pairings_players[i].round;
                var inTeam = teamPairing.team === team[1018];

                return sameRound && inTeam;
              })[0];

              var tableNo = teamPairing[3005];
              tnmt.pairings_players[i][4004] = tableNo;
            }
          }
        }

        callback(null, tnmt);
      });
    });
  });
}


///--- Exported API

module.exports = {
  fromSWTfile: parseFromSWTfile,
  fromSWT: parseSWT,
  version: require('../package.json').version
};