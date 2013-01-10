var fs = require('fs');

var async = require('async');

var utils = require('./utils');

var structurePath = __dirname + '/../structure';

var Structure = function(version) {
  // ignore version yet
  this.path = structurePath;

  this.parameters = null;
  this.structures = {};
  this.selections = {};
  this.types = {};
}

Structure.prototype.init = function(callback) {
  var self = this;

  fs.readdir(this.path, function(err, files) {
    if (err)
      return callback(err);

    async.forEach(files, function(item, callback) {
      if (/~$/.test(item)) {
        callback(null);
      }
      else if (/^types.csv$/.test(item)) {
        utils.loadKeyValueCSV(self.path+'/'+item, function(err, csv) {
          if (err)
            return callback(err);

          self.types = csv;
          callback(null);
        });
      }
      else if (/structure\.csv/.test(item)) {
        utils.loadKeyValueCSV(self.path+'/'+item, function(err, csv) {
          if (err)
            return callback(err);
          
          self.parameters = csv;
          callback(null);
        });
      } else if (/\-selection\.csv/.test(item)) {
        utils.loadKeyValueCSV(self.path+'/'+item, function(err, csv) {
          if (err)
            return callback(err);

          self.selections[item.replace('-selection.csv', '')] = csv;
          callback(null);
        });
      } else if (/\.csv/.test(item)) {
        utils.loadStructureCSV(self.path+'/'+item, function(err, structure) {
          if (err)
            return callback(err);

          self.structures[item.replace('.csv', '')] = structure;
          callback(null);
        });
      } else {
        // ignore file
        callback(null);
      }
    }, function(err) {
      callback(err);
    });
  });
};

module.exports = Structure;
