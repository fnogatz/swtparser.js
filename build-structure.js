const fs = require('fs').promises
const path = require('path')
const { parse } = require('csv-parse/sync')

const structurePath = path.join(__dirname, 'definitions')

;(async () => {
  const data = {
    selections: {},
    versions: {}
  }
  const dir = await fs.readdir(structurePath)
  for (const version of dir) {
    const isVersionDir = /^[0-9]{3}$/.test(version)
    if (!isVersionDir) {
      continue
    }

    const spec = {
      version: version,
      structures: {}
    }

    const versionPath = path.join(structurePath, version)
    const files = await fs.readdir(versionPath)
    for (const file of files) {
      if (/~$/.test(file)) {
        continue
      }
      if (/structure\.csv/.test(file)) {
        spec.parameters = await loadKeyValueCSV(path.join(versionPath, file))
        continue
      }
      if (/-selection\.csv/.test(file)) {
        const prop = file.replace('-selection.csv', '')
        data.selections[prop] = await loadKeyValueCSV(path.join(versionPath, file))
        continue
      }
      if (/\.csv/.test(file)) {
        const prop = file.replace('.csv', '')
        spec.structures[prop] = await loadStructureCSV(path.join(versionPath, file))
      }
    }

    data.versions[version] = spec
  }

  console.log(JSON.stringify(data))
})()

/**
 * Loads key-value-pairs saved in a CSV file into
 *  an object.
 *
 * @param {String} filename to read from
 */
async function loadKeyValueCSV (filename) {
  const data = {}
  const input = await fs.readFile(filename)
  const records = parse(input, {
    delimiter: '\t',
    comment: '#'
  })
  for (const row of records) {
    if (row[0].match(/^[\w\d]/)) {
      data[row[0]] = row[1]
    }
  }
  return data
}

/**
 * Loads a CSV structure file into an object with
 *  specified field keys as object keys.
 *
 * @param {String} filename to read from
 */
async function loadStructureCSV (filename) {
  const data = {}
  const input = await fs.readFile(filename)
  const records = parse(input, {
    delimiter: '\t',
    comment: '#'
  })
  for (const row of records) {
    const field = parseInt(row[3])
    const spec = {
      type: row[2].substr(0, 3)
    }
    if (spec.type === 'sel') {
      if (row[2].length === 3) {
        spec.selection = field
      } else {
        spec.selection = parseInt(row[2].replace(/^sel:/, ''))
      }
    }
    if (row[1].length > 0) {
      spec.from = parseInt(row[0], 16)
      spec.to = parseInt(row[1], 16)
    } else {
      spec.where = parseInt(row[0], 16)
    }
    data[field] = spec
  }
  return data
}
