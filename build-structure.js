var fs = require('fs')
var path = require('path')

var async = require('async')
var csv = require('csv')

var structurePath = path.join(__dirname, 'structure')

/**
 * Loads key-value-pairs saved in a CSV file into
 *  an object.
 *
 * @param {String} filename to read from
 * @param {Function} callback that takes the object
 */
function loadKeyValueCSV (filename, callback) {
  var out = {}

  csv()
  .from.path(filename, {
    delimiter: '\t'
  })
  .on('record', function (data, index) {
    if (data[0].match(/^[\w\d]/)) {
      out[data[0]] = data[1]
    }
  })
  .on('end', function (count) {
    callback(null, out)
  })
  .on('error', function (err) {
    callback(err)
  })
};

/**
 * Loads a CSV structure file into an object with
 *  specified field keys as object keys.
 *
 * @param {String} filename to read from
 * @param {Function} callback that takes the object
 */
function loadStructureCSV (filename, callback) {
  var out = {}

  csv()
  .from.path(filename, {
    delimiter: '\t'
  })
  .transform(function (data) {
    // hex values to decimal
    if (!data[0].match(/^[0-9A-Fa-f]/)) { return false } // comment

    var ret = {
      field: parseInt(data[3]),
      type: data[2].substr(0, 3)
    }

    if (ret.type === 'sel') {
      if (data[2].length === 3) {
        ret.selection = ret.field
      } else {
        ret.selection = parseInt(data[2].replace(/^sel:/, ''))
      }
    }

    if (data[1].length > 0) {
      ret.from = parseInt(data[0], 16)
      ret.to = parseInt(data[1], 16)
    } else {
      ret.where = parseInt(data[0], 16)
    }

    return ret
  })
  .on('record', function (data, index) {
    if (data) {
      var field = data.field
      delete data.field
      out[field] = data
    }
  })
  .on('end', function (count) {
    callback(null, out)
  })
  .on('error', function (err) {
    callback(err)
  })
}

var Structure = function (version) {
  this.version = version

  this.parameters = null
  this.structures = {}
  this.selections = {}
  this.types = {}
}

Structure.prototype.init = function (callback) {
  var self = this

  var versionPath = path.join(structurePath, this.version)

  fs.readdir(versionPath, function (err, files) {
    if (err) { return callback(err) }

    async.forEachSeries(files, function (item, callback) {
      if (/~$/.test(item)) {
        callback(null)
      } else if (/^types.csv$/.test(item)) {
        loadKeyValueCSV(versionPath + '/' + item, function (err, csv) {
          if (err) { return callback(err) }

          self.types = csv
          callback(null)
        })
      } else if (/structure\.csv/.test(item)) {
        loadKeyValueCSV(versionPath + '/' + item, function (err, csv) {
          if (err) { return callback(err) }

          self.parameters = csv
          callback(null)
        })
      } else if (/-selection\.csv/.test(item)) {
        loadKeyValueCSV(versionPath + '/' + item, function (err, csv) {
          if (err) { return callback(err) }

          self.selections[item.replace('-selection.csv', '')] = csv
          callback(null)
        })
      } else if (/\.csv/.test(item)) {
        loadStructureCSV(versionPath + '/' + item, function (err, structure) {
          if (err) { return callback(err) }

          self.structures[item.replace('.csv', '')] = structure
          callback(null)
        })
      } else {
        // ignore file
        callback(null)
      }
    }, function (err) {
      callback(err)
    })
  })
}

var data = {
  selections: {},
  versions: {}
}

fs.readdir(structurePath, function (err, dir) {
  if (err) {
    throw err
  }

  async.eachSeries(dir, function (version, cb) {
    var isVersionDir = /^[0-9]{3}$/.test(version)
    if (!isVersionDir) {
      return cb()
    }

    var Struct = new Structure(version)
    Struct.init(function (err) {
      if (err) {
        return cb(err)
      }

      var selectionKey
      for (var sel in Struct.selections) {
        if (!data.selections[sel]) {
          data.selections[sel] = Struct.selections[sel]
        } else {
          for (selectionKey in Struct.selects[sel]) {
            data.selections[sel][selectionKey] = Struct.selects[sel][selectionKey]
          }
        }
      }
      delete Struct.selections

      data.versions[version] = Struct

      cb()
    })
  }, function (err) {
    if (err) {
      throw err
    }

    console.log(JSON.stringify(data))
  })
})
