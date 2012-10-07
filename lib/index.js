var fs = require('fs');

var async = require('async');

var utils = require('./utils');
var Struct = require('./structure');


function parseFromSWTfile(filename, callback) {
  fs.readFile(filename, function(err, data) {
    if (err)
      return callback(err);

    parseSWT(data, callback);
  });
}


function parseSWT(buffer, callback) {
  var Structure = new Struct();

  Structure.init(function(err) {
    if (err)
      return callback(err);

    utils.interpretBinary(Structure.structures.general, Structure, buffer.slice(0, Structure.parameters['start:fixtures_players']), function(err, generalInformation) {
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
            }, Structure, callback);
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
            }, Structure, callback);           
          };
        }

        async.parallel(parallelTodo, function(err, res) {
          if (err)
            return callback(err);

          for (var key in res) {
            tnmt[key] = res[key];
          }

          tnmt.general = generalInformation;
          callback(null, tnmt);
        });
      });
    });
  });
}


///--- Exported API

module.exports = {
  fromSWTfile: parseFromSWTfile,
  fromSWT: parseSWT
};
