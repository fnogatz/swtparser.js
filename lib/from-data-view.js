module.exports = parseDataView

const Structure = require('./structure.json')

function parseDataView (view) {
  let i

  let version = parseCard(false, view, 0, {
    version: {
      type: 'inb',
      from: 609,
      to: 610
    }
  }, Structure)
  version = version.version

  const structure = getNearestStructure(version, Structure)

  const tnmt = {
    players: [],
    pairings_players: []
  }

  // read general information
  tnmt.general = parseCard(version, view, 0, 'structures.general', Structure)

  // read players
  let playerOffset = parseInt(structure.parameters['start:fixtures_players'])
  if (tnmt.general[3] > 0) {
    if (tnmt.general[35]) {
      playerOffset += (tnmt.general[4] * tnmt.general[1] * parseInt(structure.parameters['length:pairing'])) +
                      (tnmt.general[80] * tnmt.general[1] * parseInt(structure.parameters['length:pairing']))
    } else {
      playerOffset += (tnmt.general[4] * tnmt.general[1] * parseInt(structure.parameters['length:pairing']))
    }
  }
  let player

  for (i = 0; i < tnmt.general[4]; i++, playerOffset += parseInt(structure.parameters['length:player'])) {
    player = parseCard(version, view, playerOffset, 'structures.player', Structure)
    player.positionInSWT = i
    tnmt.players.push(player)
  }

  if (tnmt.general[3] > 0) {
    // read players' pairings
    let playerPairingOffset = parseInt(structure.parameters['start:fixtures_players'])
    let playerPairing
    const orderedPlayers = getOrderedPlayers(tnmt)
    for (i = 0; i < tnmt.general[1] * tnmt.general[4]; i++, playerPairingOffset += parseInt(structure.parameters['length:pairing'])) {
      playerPairing = parseCard(version, view, playerPairingOffset, 'structures.individual-pairings', Structure)
      playerPairing.player = orderedPlayers[Math.floor(i / tnmt.general[1])]
      playerPairing.round = i % tnmt.general[1] + 1
      tnmt.pairings_players.push(playerPairing)
    }
    // delete dummy pairings
    tnmt.pairings_players = tnmt.pairings_players.filter(playerPairingFilter(tnmt))
  }

  if (tnmt.general[35] === true) {
    // team tournament
    tnmt.teams = []
    tnmt.pairings_teams = []

    // read teams
    let teamOffset = parseInt(structure.parameters['start:fixtures_players']) +
                        (tnmt.general[4] * parseInt(structure.parameters['length:player']))
    if (tnmt.general[3] > 0) {
      teamOffset += (tnmt.general[4] * tnmt.general[1] * parseInt(structure.parameters['length:pairing'])) +
                    (tnmt.general[80] * tnmt.general[1] * parseInt(structure.parameters['length:pairing']))
    }
    let team
    for (i = 0; i < tnmt.general[80]; i++, teamOffset += parseInt(structure.parameters['length:team'])) {
      team = parseCard(version, view, teamOffset, 'structures.team', Structure)
      team.positionInSWT = i
      tnmt.teams.push(team)
    }

    if (tnmt.general[3] > 0) {
      // read teams' pairings
      let teamPairingOffset = parseInt(structure.parameters['start:fixtures_players']) +
                              (tnmt.general[1] * tnmt.general[4] * parseInt(structure.parameters['length:pairing']))
      let teamPairing
      const orderedTeams = getOrderedTeams(tnmt)
      for (i = 0; i < tnmt.general[1] * tnmt.general[80]; i++, teamPairingOffset += parseInt(structure.parameters['length:pairing'])) {
        teamPairing = parseCard(version, view, teamPairingOffset, 'structures.team-pairings', Structure)
        teamPairing.team = orderedTeams[Math.floor(i / tnmt.general[1])]
        teamPairing.round = i % tnmt.general['1'] + 1
        tnmt.pairings_teams.push(teamPairing)
      }
      // delete dummy pairings
      tnmt.pairings_teams = tnmt.pairings_teams.filter(teamPairingFilter(tnmt))
    }
  }

  return tnmt
}

function selectStructure (version, which, Structure) {
  let currStructure

  loopVersion: for (const currVersion in Structure.versions) { // eslint-disable-line no-labels
    if (parseInt(currVersion) > parseInt(version)) {
      break
    }

    let el = Structure.versions[currVersion]
    const parts = which.split('.')
    let part

    for (let i = 0; i < parts.length; i++) {
      part = parts[i]
      if (!el[part]) {
        continue loopVersion // eslint-disable-line no-labels
      }
      el = el[part]
    }
    currStructure = el
  }

  return currStructure
}

function getSelections (version, Structure) {
  return Structure.selections
}

function getNearestStructure (version, Structure) {
  let currStructure

  for (const currVersion in Structure.versions) {
    if (parseInt(currVersion) > parseInt(version)) {
      break
    }
    currStructure = Structure.versions[currVersion]
  }

  return currStructure
}

function parseCard (version, view, offset, structure, Structure) {
  if (typeof structure === 'string') {
    // select structure by version first
    const newStructure = selectStructure(version, structure, Structure)
    if (!newStructure) {
      throw new Error('Missing structure for "' + structure + '" in version ' + version)
    }

    return parseCard(version, view, offset, newStructure, Structure)
  }

  const object = {}
  const selections = getSelections(version, Structure)
  for (const field in structure) {
    const type = structure[field].type
    let bigEndian = true
    let days = 0
    switch (type) {
      case 'int': // content is integer value, little endian
        bigEndian = false
        // falls through
      case 'inb': // content is integer value, big endian
      case 'in9': // content is integer value, big endian, minus 998
        if ('where' in structure[field]) {
          object[field] = view.getUint8(offset + structure[field].where)
        } else if ('from' in structure[field] && 'to' in structure[field]) {
          const diff = structure[field].to - structure[field].from
          if (diff === 0) {
            object[field] = view.getInt8(offset + structure[field].from)
          } else if (diff === 1) {
            object[field] = view.getInt16(offset + structure[field].from, bigEndian)
          } else if (diff === 2) {
            object[field] = view.getInt32(offset + structure[field].from, bigEndian)
          }
        }
        if (structure[field].type === 'in9') {
          object[field] = object[field] - 998
        }
        break
      case 'boo': // content is boolean
        if ('where' in structure[field]) {
          object[field] = view.getUint8(offset + structure[field].where) === 255
        }
        break
      case 'asc': // content is in ASCII format
        if ('from' in structure[field] && 'to' in structure[field]) {
          object[field] = getString(view, offset + structure[field].from, offset + structure[field].to)
        } else if ('where' in structure[field]) {
          const pos = offset + structure[field].where
          object[field] = getString(view, pos, pos)
        }
        break
      case 'dat':
        if ('from' in structure[field] && 'to' in structure[field]) {
          if (structure[field].to === structure[field].from + 1) {
            days = view.getUint16(structure[field].from, true)
          }
        }
        if (days > 0) {
          const date = new Date('12/30/1899')
          date.setTime(date.getTime() + 1000 * 60 * 60 * 24 * days)
          object[field] = date.toDateString()
        }
        break
      case 'tim':
        if ('from' in structure[field] && 'to' in structure[field]) {
          if (structure[field].to === structure[field].from + 1) {
            const d = new Date()
            d.setHours(view.getUint8(structure[field].from))
            d.setMinutes(view.getUint8(structure[field].to))
            if (d.toTimeString().slice(0, 5) !== '00:00') { object[field] = d.toTimeString().slice(0, 5) }
          }
        }
        break
      case 'bin': // content is binary value
        if ('where' in structure[field]) {
          let bin = view.getUint8(offset + structure[field].where).toString(16)
          if (bin.length === 1) { bin = '0' + bin }
          object[field] = bin
        } else if ('from' in structure[field] && 'to' in structure[field]) {
          object[field] = ''
          for (let pos = structure[field].from; pos <= structure[field].to; pos++) {
            let bin = view.getUint8(offset + pos).toString(16)
            if (bin.length === 1) { bin = '0' + bin }
            object[field] += bin
          }
        }
        break
      case 'bib': // content is binary value, big endian
        object[field] = view.getInt16(offset + structure[field].from, true).toString(16)
        break
      case 'sel':
        if ('where' in structure[field]) {
          let sel = view.getInt8(offset + structure[field].where).toString(16)
          if (sel.length === 1) { sel = '0' + sel }
          sel = sel.toUpperCase()

          if (sel in selections[structure[field].selection]) {
            object[field] = structure[field].selection + '-' + selections[structure[field].selection][sel]
          }
        }
        break
      default:
        throw new Error(`Unknown type '${structure[field].type}'`)
    }
  }

  return object
}

function getString (view, from, to) {
  let value = ''
  for (let i = 0; i <= to - from; i++) {
    const char = view.getUint8(from + i)
    if (char === 0) { break }
    value += String.fromCharCode(char)
  }
  return value
}

/**
* Takes a tournament and returns the players in order of
* their occurences within the SWT.
*
* @param {Object} tournament object after parsing process
* @return {Array} of players
*/
function getOrderedPlayers (tnmt) {
  const res = []
  for (let i = 0; i < tnmt.players.length; i++) {
    res[tnmt.players[i].positionInSWT] = tnmt.players[i]['2020']
  }
  return res
}

/**
* Takes a tournament and returns the teams in order of
* their occurences within the SWT.
*
* @param {Object} tournament object after parsing process
* @return {Array} of teams
*/
function getOrderedTeams (tnmt) {
  const res = []
  for (let i = 0; i < tnmt.teams.length; i++) {
    res[tnmt.teams[i].positionInSWT] = tnmt.teams[i]['1018']
  }
  return res
}

/**
 * Filter function to remove dummy player pairings.
 * @param  {Object} pairing
 * @return {Boolean}         true -> valid pairing
 */
function playerPairingFilter (tnmt) {
  return function (pairing) {
    // board number too high?
    if (tnmt.general[35] && pairing[4006] > tnmt.general[34]) { return false }

    // no color set?
    if (pairing[4000] === '4000-0') { return false }

    return true
  }
}

/**
 * Filter function to remove dummy team pairings.
 * @param  {Object} pairing
 * @return {Boolean}         true -> valid pairing
 */
function teamPairingFilter (tnmt) {
  return function (pairing) {
    return pairing[3001] !== '3001-0'
  }
}
