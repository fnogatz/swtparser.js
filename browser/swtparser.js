(function(){var global = this;function debug(){return debug};function require(p, parent){ var path = require.resolve(p) , mod = require.modules[path]; if (!mod) throw new Error('failed to require "' + p + '" from ' + parent); if (!mod.exports) { mod.exports = {}; mod.call(mod.exports, mod, mod.exports, require.relative(path), global); } return mod.exports;}require.modules = {};require.resolve = function(path){ var orig = path , reg = path + '.js' , index = path + '/index.js'; return require.modules[reg] && reg || require.modules[index] && index || orig;};require.register = function(path, fn){ require.modules[path] = fn;};require.relative = function(parent) { return function(p){ if ('debug' == p) return debug; if ('.' != p.charAt(0)) return require(p); var path = parent.split('/') , segs = p.split('/'); path.pop(); for (var i = 0; i < segs.length; i++) { var seg = segs[i]; if ('..' == seg) path.pop(); else if ('.' != seg) path.push(seg); } return require(path.join('/'), parent); };};require.register("from-data-view.js", function(module, exports, require, global){
module.exports = parseDataView

var Structure = require('./structure.json')

function parseDataView (view, callback) {
  var i

  var tnmt = {
    players: [],
    pairings_players: []
  }

  // read general information
  tnmt.general = parseCard(view, 0, Structure.structures.general, Structure)

  // read players
  var playerOffset = parseInt(Structure.parameters['start:fixtures_players'])
  if (tnmt.general[3] > 0) {
    playerOffset += (tnmt.general[4] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing'])) +
                    (tnmt.general[80] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing']))
  }
  var player
  for (i = 0; i < tnmt.general[4]; i++, playerOffset += parseInt(Structure.parameters['length:player'])) {
    player = parseCard(view, playerOffset, Structure.structures.player, Structure)
    player.positionInSWT = i
    tnmt.players.push(player)
  }

  if (tnmt.general[3] > 0) {
    // read players' pairings
    var playerPairingOffset = parseInt(Structure.parameters['start:fixtures_players'])
    var playerPairing
    var orderedPlayers = getOrderedPlayers(tnmt)
    for (i = 0; i < tnmt.general[1] * tnmt.general[4]; i++, playerPairingOffset += parseInt(Structure.parameters['length:pairing'])) {
      playerPairing = parseCard(view, playerPairingOffset, Structure.structures['individual-pairings'], Structure)
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
    var teamOffset = parseInt(Structure.parameters['start:fixtures_players']) +
                        (tnmt.general[4] * parseInt(Structure.parameters['length:player']))
    if (tnmt.general[3] > 0) {
      teamOffset += (tnmt.general[4] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing'])) +
                    (tnmt.general[80] * tnmt.general[1] * parseInt(Structure.parameters['length:pairing']))
    }
    var team
    for (i = 0; i < tnmt.general[80]; i++, teamOffset += parseInt(Structure.parameters['length:team'])) {
      team = parseCard(view, teamOffset, Structure.structures.team, Structure)
      team.positionInSWT = i
      tnmt.teams.push(team)
    }

    if (tnmt.general[3] > 0) {
      // read teams' pairings
      var teamPairingOffset = parseInt(Structure.parameters['start:fixtures_players']) +
                              (tnmt.general[1] * tnmt.general[4] * parseInt(Structure.parameters['length:pairing']))
      var teamPairing
      var orderedTeams = getOrderedTeams(tnmt)
      for (i = 0; i < tnmt.general[1] * tnmt.general[80]; i++, teamPairingOffset += parseInt(Structure.parameters['length:pairing'])) {
        teamPairing = parseCard(view, teamPairingOffset, Structure.structures['team-pairings'], Structure)
        teamPairing.team = orderedTeams[Math.floor(i / tnmt.general[1])]
        teamPairing.round = i % tnmt.general['1'] + 1
        tnmt.pairings_teams.push(teamPairing)
      }
      // delete dummy pairings
      tnmt.pairings_teams = tnmt.pairings_teams.filter(teamPairingFilter(tnmt))
    }
  }

  callback(null, tnmt)
}

function parseCard (view, offset, structure, Structure) {
  var pos
  var bin

  var object = {}
  for (var field in structure) {
    if (structure[field].type === 'int' || structure[field].type === 'inb') {
      // content is integer value, little endian

      // int: little endian; inb: big endian
      var littleEndian = !(structure[field].type === 'int')
      if (structure[field].hasOwnProperty('where')) {
        object[field] = view.getUint8(offset + structure[field].where)
      } else if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        var diff = structure[field].to - structure[field].from
        if (diff === 0) { object[field] = view.getInt8(offset + structure[field].from) } else if (diff === 1) { object[field] = view.getInt16(offset + structure[field].from, littleEndian) } else if (diff === 2) { object[field] = view.getInt32(offset + structure[field].from, littleEndian) }
      }
    } else if (structure[field].type === 'boo') {
      // content is boolean
      if (structure[field].hasOwnProperty('where')) {
        object[field] = view.getUint8(offset + structure[field].where) === 255
      }
    } else if (structure[field].type === 'asc') {
      // content is in ASCII format
      if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        object[field] = getString(view, offset + structure[field].from, offset + structure[field].to)
      } else if (structure[field].hasOwnProperty('where')) {
        pos = offset + structure[field].where
        object[field] = getString(view, pos, pos)
      }
    } else if (structure[field].type === 'dat') {
      var days = 0
      if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        if (structure[field].to === structure[field].from + 1) {
          days = view.getUint16(structure[field].from, true)
        }
      }
      if (days > 0) {
        var date = new Date('12/30/1899')
        date.setTime(date.getTime() + 1000 * 60 * 60 * 24 * days)
        object[field] = date.toDateString()
      }
    } else if (structure[field].type === 'tim') {
      if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        if (structure[field].to === structure[field].from + 1) {
          var d = new Date()
          d.setHours(view.getUint8(structure[field].from))
          d.setMinutes(view.getUint8(structure[field].to))
          if (d.toTimeString().slice(0, 5) !== '00:00') { object[field] = d.toTimeString().slice(0, 5) }
        }
      }
    } else if (structure[field].type === 'bin') {
      // content is binary value
      if (structure[field].hasOwnProperty('where')) {
        bin = view.getUint8(offset + structure[field].where).toString(16)
        if (bin.length === 1) { bin = '0' + bin }
        object[field] = bin
      } else if (structure[field].hasOwnProperty('from') && structure[field].hasOwnProperty('to')) {
        object[field] = ''
        for (pos = structure[field].from; pos <= structure[field].to; pos++) {
          bin = view.getUint8(offset + structure[field].where).toString(16)
          if (bin.length === 1) { bin = '0' + bin }
          object[field] += bin
        }
      }
    } else if (structure[field].type === 'bib') {
      // Content is binary value, big endian

      bin = view.getInt16(offset + structure[field].from, true).toString(16)
      object[field] = bin
    } else if (structure[field].type === 'sel' &&
      structure[field].selection &&
      Structure.selections.hasOwnProperty(structure[field].selection)) {
      if (structure[field].hasOwnProperty('where')) {
        var sel = view.getInt8(offset + structure[field].where).toString(16)
        if (sel.length === 1) { sel = '0' + sel }
        sel = sel.toUpperCase()

        if (Structure.selections[structure[field].selection].hasOwnProperty(sel)) {
          object[field] = structure[field].selection + '-' + Structure.selections[structure[field].selection][sel]
        }
      }
    }
  }

  return object
}

function getString (view, from, to) {
  var value = ''
  for (var i = 0; i <= to - from; i++) {
    var char = view.getUint8(from + i)
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
  var res = []
  for (var i = 0; i < tnmt.players.length; i++) {
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
  var res = []
  for (var i = 0; i < tnmt.teams.length; i++) {
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

});require.register("structure.json", function(module, exports, require, global){
module.exports = {"parameters":{"length:pairing":"19","start:fixtures_players":"13384","length:player":"655","length:team":"655"},"structures":{"general":{"1":{"type":"int","where":1},"2":{"type":"int","where":3},"3":{"type":"int","where":5},"4":{"type":"inb","from":7,"to":8},"5":{"type":"int","where":9},"6":{"type":"int","where":11},"7":{"type":"int","where":175},"8":{"type":"boo","where":176},"9":{"type":"int","where":178},"10":{"type":"boo","where":180},"11":{"type":"asc","from":184,"to":202},"12":{"type":"asc","from":245,"to":304},"13":{"type":"int","where":305},"14":{"type":"boo","where":307},"15":{"type":"int","where":309},"16":{"type":"boo","where":311},"17":{"type":"asc","from":315,"to":329},"18":{"type":"asc","from":376,"to":436},"19":{"type":"int","where":568},"20":{"type":"int","where":570},"21":{"type":"sel","selection":84,"where":572},"22":{"type":"boo","where":574},"23":{"type":"boo","where":579},"24":{"type":"sel","selection":24,"where":582},"25":{"type":"int","where":585},"26":{"type":"int","where":586},"27":{"type":"boo","where":588},"28":{"type":"boo","where":589},"29":{"type":"boo","where":590},"30":{"type":"boo","where":593},"31":{"type":"sel","selection":31,"where":596},"32":{"type":"int","where":597},"33":{"type":"int","where":600},"34":{"type":"int","where":604},"35":{"type":"boo","where":606},"36":{"type":"sel","selection":84,"where":611},"37":{"type":"sel","selection":84,"where":613},"38":{"type":"sel","selection":84,"where":615},"39":{"type":"sel","selection":84,"where":617},"40":{"type":"sel","selection":84,"where":618},"41":{"type":"sel","selection":84,"where":619},"42":{"type":"sel","selection":84,"where":620},"43":{"type":"sel","selection":84,"where":621},"44":{"type":"boo","where":623},"45":{"type":"inb","from":626,"to":627},"46":{"type":"boo","where":632},"47":{"type":"int","where":636},"48":{"type":"bin","where":651},"49":{"type":"boo","where":652},"50":{"type":"sel","selection":84,"where":656},"51":{"type":"boo","where":657},"52":{"type":"sel","selection":52,"where":669},"53":{"type":"boo","where":686},"54":{"type":"boo","where":722},"55":{"type":"int","where":723},"56":{"type":"bin","where":777},"57":{"type":"bin","where":778},"58":{"type":"bin","where":779},"59":{"type":"bin","where":780},"60":{"type":"bin","where":784},"61":{"type":"sel","selection":61,"where":785},"62":{"type":"boo","where":786},"63":{"type":"boo","where":787},"64":{"type":"int","where":789},"65":{"type":"asc","from":790,"to":829},"66":{"type":"asc","from":831,"to":870},"67":{"type":"asc","from":872,"to":931},"68":{"type":"asc","from":933,"to":992},"69":{"type":"asc","from":994,"to":1053},"70":{"type":"asc","from":1055,"to":1074},"71":{"type":"asc","from":1076,"to":1095},"72":{"type":"asc","from":1097,"to":1116},"73":{"type":"asc","from":1118,"to":1137},"74":{"type":"asc","from":1139,"to":1159},"75":{"type":"int","where":1324},"76":{"type":"int","where":1326},"77":{"type":"int","where":1327},"78":{"type":"sel","selection":78,"where":1328},"79":{"type":"sel","selection":78,"where":1329},"80":{"type":"int","where":1332},"81":{"type":"sel","selection":81,"where":1336},"82":{"type":"sel","selection":82,"where":1338},"83":{"type":"boo","where":11444},"85":{"type":"asc","from":11847,"to":11906},"86":{"type":"asc","from":11908,"to":11967},"87":{"type":"asc","from":11969,"to":12028},"88":{"type":"asc","from":11786,"to":11845},"89":{"type":"dat","from":11457,"to":11458},"90":{"type":"tim","from":11459,"to":11460},"91":{"type":"dat","from":11461,"to":11462},"92":{"type":"tim","from":11463,"to":11464},"93":{"type":"dat","from":11465,"to":11466},"94":{"type":"tim","from":11467,"to":11468},"95":{"type":"dat","from":11469,"to":11470},"96":{"type":"tim","from":11471,"to":11472},"97":{"type":"dat","from":11473,"to":11474},"98":{"type":"tim","from":11475,"to":11476},"99":{"type":"dat","from":11477,"to":11478},"100":{"type":"tim","from":11479,"to":11480},"101":{"type":"dat","from":11481,"to":11482},"102":{"type":"tim","from":11483,"to":11484},"103":{"type":"dat","from":11485,"to":11486},"104":{"type":"tim","from":11487,"to":11488},"105":{"type":"dat","from":11489,"to":11490},"106":{"type":"tim","from":11491,"to":11492},"107":{"type":"dat","from":11493,"to":11494},"108":{"type":"tim","from":11495,"to":11496},"109":{"type":"dat","from":11497,"to":11498},"110":{"type":"tim","from":11499,"to":11500},"111":{"type":"dat","from":11501,"to":11502},"112":{"type":"tim","from":11503,"to":11504},"113":{"type":"dat","from":11505,"to":11506},"114":{"type":"tim","from":11507,"to":11508},"115":{"type":"dat","from":11509,"to":11510},"116":{"type":"tim","from":11511,"to":11512},"117":{"type":"dat","from":11513,"to":11514},"118":{"type":"tim","from":11515,"to":11516},"119":{"type":"dat","from":11517,"to":11518},"120":{"type":"tim","from":11519,"to":11520},"121":{"type":"dat","from":11521,"to":11522},"122":{"type":"tim","from":11523,"to":11524},"123":{"type":"dat","from":11525,"to":11526},"124":{"type":"tim","from":11527,"to":11528},"125":{"type":"dat","from":11529,"to":11530},"126":{"type":"tim","from":11531,"to":11532},"127":{"type":"dat","from":11533,"to":11534},"128":{"type":"tim","from":11535,"to":11536},"129":{"type":"dat","from":11537,"to":11538},"130":{"type":"tim","from":11539,"to":11540},"131":{"type":"dat","from":11541,"to":11542},"132":{"type":"tim","from":11543,"to":11544},"133":{"type":"dat","from":11545,"to":11546},"134":{"type":"tim","from":11547,"to":11548},"135":{"type":"dat","from":11549,"to":11550},"136":{"type":"tim","from":11551,"to":11552},"137":{"type":"dat","from":11553,"to":11554},"138":{"type":"tim","from":11555,"to":11556},"139":{"type":"dat","from":11557,"to":11558},"140":{"type":"tim","from":11559,"to":11560},"141":{"type":"dat","from":11561,"to":11562},"142":{"type":"tim","from":11563,"to":11564},"143":{"type":"dat","from":11565,"to":11566},"144":{"type":"tim","from":11567,"to":11568},"145":{"type":"dat","from":11569,"to":11570},"146":{"type":"tim","from":11571,"to":11572},"147":{"type":"dat","from":11573,"to":11574},"148":{"type":"tim","from":11575,"to":11576},"149":{"type":"dat","from":11577,"to":11578},"150":{"type":"tim","from":11579,"to":11580},"151":{"type":"dat","from":11581,"to":11582},"152":{"type":"tim","from":11583,"to":11584},"153":{"type":"dat","from":11585,"to":11586},"154":{"type":"tim","from":11587,"to":11588},"155":{"type":"dat","from":11589,"to":11590},"156":{"type":"tim","from":11591,"to":11592},"157":{"type":"dat","from":11593,"to":11594},"158":{"type":"tim","from":11595,"to":11596},"159":{"type":"dat","from":11597,"to":11598},"160":{"type":"tim","from":11599,"to":11600},"161":{"type":"dat","from":11601,"to":11602},"162":{"type":"tim","from":11603,"to":11604},"163":{"type":"dat","from":11605,"to":11606},"164":{"type":"tim","from":11607,"to":11608},"165":{"type":"dat","from":11609,"to":11610},"166":{"type":"tim","from":11611,"to":11612},"167":{"type":"dat","from":11613,"to":11614},"168":{"type":"tim","from":11615,"to":11616},"169":{"type":"int","where":5494},"170":{"type":"int","where":5496},"171":{"type":"int","where":5498},"172":{"type":"int","where":5500},"173":{"type":"int","where":5502},"174":{"type":"int","where":5506},"175":{"type":"int","where":5514},"176":{"type":"int","where":5518},"177":{"type":"int","where":5522},"178":{"type":"int","where":5526},"179":{"type":"boo","where":658},"180":{"type":"sel","selection":84,"where":622},"181":{"type":"sel","selection":84,"where":573},"182":{"type":"sel","selection":84,"where":614},"183":{"type":"sel","selection":84,"where":616},"184":{"type":"sel","selection":184,"where":608},"9999":{"type":"inb","from":609,"to":610}},"individual-pairings":{"4000":{"type":"sel","selection":4000,"where":8},"4001":{"type":"bib","from":9,"to":10},"4002":{"type":"sel","selection":4002,"where":11},"4003":{"type":"sel","selection":3004,"where":11},"4004":{"type":"int","where":13},"4005":{"type":"sel","selection":3006,"where":15},"4006":{"type":"int","where":18}},"player":{"2000":{"type":"asc","from":0,"to":31},"2001":{"type":"asc","from":33,"to":64},"2002":{"type":"asc","from":66,"to":68},"2003":{"type":"asc","from":70,"to":73},"2004":{"type":"asc","from":75,"to":78},"2005":{"type":"asc","from":90,"to":94},"2006":{"type":"asc","from":105,"to":107},"2007":{"type":"asc","from":109,"to":111},"2008":{"type":"asc","from":128,"to":137},"2009":{"type":"asc","where":151},"2010":{"type":"asc","from":153,"to":157},"2011":{"type":"asc","from":159,"to":162},"2012":{"type":"int","where":173},"2013":{"type":"asc","where":184},"2014":{"type":"asc","where":188},"2015":{"type":"asc","from":192,"to":194},"2016":{"type":"int","where":201},"2017":{"type":"int","where":203},"2018":{"type":"int","where":205},"2019":{"type":"inb","from":209,"to":210},"2020":{"type":"bib","from":217,"to":218},"2021":{"type":"inb","from":219,"to":220},"2022":{"type":"inb","from":221,"to":222},"2023":{"type":"inb","from":223,"to":224},"2024":{"type":"int","where":225},"2025":{"type":"int","where":227},"2026":{"type":"int","where":229},"2027":{"type":"int","where":231},"2028":{"type":"bin","where":272},"2029":{"type":"int","where":273},"2030":{"type":"int","where":292},"2031":{"type":"int","where":296},"2032":{"type":"int","where":300},"2033":{"type":"asc","from":324,"to":335},"2034":{"type":"asc","from":337,"to":348},"2035":{"type":"asc","from":350,"to":389},"2036":{"type":"asc","from":391,"to":430},"2037":{"type":"asc","from":432,"to":471},"2038":{"type":"asc","from":473,"to":512}},"team-pairings":{"3000":{"type":"bin","from":0,"to":1},"3001":{"type":"sel","selection":3001,"where":8},"3002":{"type":"bin","where":9},"3003":{"type":"bin","where":10},"3004":{"type":"sel","selection":3004,"where":11},"3005":{"type":"int","where":13},"3006":{"type":"sel","selection":3006,"where":15},"3007":{"type":"bin","where":17},"3008":{"type":"int","where":18}},"team":{"1000":{"type":"asc","from":0,"to":31},"1001":{"type":"asc","from":70,"to":73},"1002":{"type":"asc","from":75,"to":78},"1003":{"type":"asc","from":80,"to":83},"1004":{"type":"asc","from":90,"to":94},"1005":{"type":"asc","from":105,"to":107},"1006":{"type":"asc","from":109,"to":111},"1007":{"type":"asc","from":128,"to":137},"1008":{"type":"asc","from":153,"to":157},"1009":{"type":"asc","where":184},"1010":{"type":"asc","where":188},"1011":{"type":"asc","from":192,"to":194},"1012":{"type":"int","where":201},"1013":{"type":"int","where":203},"1014":{"type":"int","where":205},"1015":{"type":"inb","from":207,"to":208},"1016":{"type":"int","where":213},"1017":{"type":"int","where":215},"1018":{"type":"bin","where":217},"1019":{"type":"int","where":219},"1020":{"type":"int","where":221},"1021":{"type":"int","where":223},"1022":{"type":"int","where":225},"1023":{"type":"int","where":227},"1024":{"type":"int","where":229},"1025":{"type":"int","where":231},"1026":{"type":"int","where":233},"1027":{"type":"int","where":235},"1028":{"type":"inb","from":237,"to":238},"1029":{"type":"int","where":241},"1030":{"type":"int","where":243},"1031":{"type":"bin","from":251,"to":252},"1032":{"type":"int","where":254},"1033":{"type":"bin","from":256,"to":257},"1034":{"type":"int","where":258},"1035":{"type":"bin","from":262,"to":263},"1036":{"type":"bin","where":272},"1037":{"type":"boo","where":273},"1038":{"type":"int","where":292},"1039":{"type":"int","where":296},"1040":{"type":"inb","from":300,"to":301},"1041":{"type":"int","where":308},"1042":{"type":"int","where":312},"1043":{"type":"asc","from":350,"to":389},"1044":{"type":"asc","from":391,"to":430},"1045":{"type":"asc","from":432,"to":471},"1046":{"type":"asc","from":473,"to":512}}},"selections":{"24":{"00":"0","01":"1","02":"2"},"31":{"00":"0","01":"1","02":"2","03":"3"},"52":{"00":"0","01":"1","02":"2","03":"3"},"61":{"00":"0","01":"1","02":"2","03":"3","04":"4"},"78":{"11":"1","21":"2","22":"3","01":"0"},"81":{"00":"0","01":"1","02":"2","03":"3"},"82":{"00":"0","01":"1","02":"2"},"84":{"10":"13","13":"14","00":"0","01":"1","02":"2","03":"3","04":"4","05":"5","06":"6","07":"7","08":"8","09":"9","0A":"10","0C":"11","0D":"12","0E":"15"},"184":{"10":"12","02":"0","03":"1","04":"2","05":"3","06":"4","08":"5","09":"6","0A":"7","0B":"8","0C":"9","0F":"10","0E":"11"},"3001":{"00":"0","01":"1","02":"3","03":"2","04":"4"},"3004":{"00":"0","01":"1","02":"2","03":"3","04":"4","05":"5","06":"6","07":"7","08":"8","09":"9","0A":"10","0B":"11","0C":"12","0D":"13","0E":"14","0F":"15"},"3006":{"11":"6","22":"4","33":"3","00":"0","01":"5","02":"1","03":"2"},"4000":{"00":"0","01":"1","02":"3","03":"2","04":"4"},"4002":{"00":"0","01":"1","02":"2","03":"3","04":"4","05":"5","06":"6","07":"7","08":"8","09":"9","0A":"10","0B":"11","0C":"12","0D":"13","0E":"14","0F":"15"}},"types":{}}

});var exp = require('from-data-view');if ("undefined" != typeof module) module.exports = exp;else parseSWT = exp;
})();
