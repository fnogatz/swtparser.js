# swtparser

Parse SWT [Swiss-Chess](http://swiss-chess.de/) Tournament files with JavaScript, either by using [node.js](http://nodejs.org) or directly in your Browser.

## Usage with node.js

Simply install the package via

```bash
npm install swtparser
```

You can either use the provided `parse.fromBuffer` and `parse.fromDataView` functions or put what you want directly into the parser:

```js
var parse = require('swtparser');
var tournament = parse(buffer);
```

Internally the DataView method is used for the parsing process.

If you want to try other/newer [SWT structure files](https://github.com/fnogatz/SWT-structure-files) simply put them into the `/structures` folder and run the following npm command to build a new `/lib/structure.json` file:

```bash
npm run-script build-structure
```

## Usage within the Browser

The swtparser also works in the Browser. Simply use the swtparser.browser.js in your HTML files. The Browser version only allows to parse DataView objects. Here is an [example snippet](https://github.com/fnogatz/node-swtparser/tree/master/browser/example.html):

```html
<script src="swtparser.js"></script>
<script type="text/javascript">
  var reader = new FileReader();
  reader.onload = function(e) {
    var tournament = parseSWT(new DataView(this.result));
    // handle your tournament in `tournament`
  }
  reader.readAsArrayBuffer(file);
</script>
```

If you want to try other/newer [SWT structure files](https://github.com/fnogatz/SWT-structure-files) you have to put them into the `/structures` folder and run the following commands:

```bash
# rebuild the /lib/structure.json
npm run-script build-structure

# rebuild swtparser.browser.js
npm run-script build-browser
```

## Returned Object

The swtparser returns a hash with the first class objects `general`, `players` and `pairings_players`. In case of team tournaments `teams` and `pairings_teams` are provided too:

```js
{
  // the numeric keys are those of the structure files
  'general': {
    '1': 7,
    '2': 7,
    '3': 7,
    '4': 131,
    '5': 0,
    '6': 0,
    '7': 0,
    '8': false,
    '9': 14,
    '10': true,
    '11': 'Arial',
    '12': 'My Tournament name',
    ...
  },
  'players': [
    {
      '2000': 'Surname, Prename',
      '2001': 'MyCountry',
      '2002': '20',
      '2003': '2479',
      '2004': '2498',
      '2005': '1031',
      '2006': 'GER',
      '2007': '',
      '2008': '1973      ',
      ...
      // automatically added:
      'positionInSWT': 0
    },
    ...
  ],
  'pairings_players': [ // only if pairings already set
    {
      '4000': '4000-2',
      '4001': '4b',
      '4002': '4002-10',
      '4003': '3004-10',
      '4004': 0,
      '4005': '3006-0',
      '4006': 1,
      // automatically added:
      'player': '01',
      'round': 1
    }
    ...
  ],
  'teams': [  // only in team tournaments
    {
      '1000': 'My Team Name',
      '1001': '2007',
      '1002': '2048',
      '1003': '2048',
      '1004': '',
      '1005': '',
      ...
      // automatically added:
      'positionInSWT': 0
    }
    ...
  ],
  'pairings_teams': [ // only in team tournaments and if pairings already set
    {
      '3000': 'ffff',
      '3001': '3001-1',
      '3002': 'f0',
      '3003': '03',
      '3004': '3004-0',
      '3005': 1,
      '3006': '3006-0',
      '3007': '01',
      '3008': 0,
      // automatically added:
      'team': 'e7',
      'round': 1
    },
    ...
  ]
}
```

## Supported SWT versions

Because this module uses the SWT structure files of [fnogatz/SWT-structure-files](https://github.com/fnogatz/SWT-structure-files), it supports the file versions provided by those structure information. Currently only tournaments of SWT version 8.xx can be parsed.
