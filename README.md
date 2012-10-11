node-swtparser
==============

Parse SWT Swiss-Chess Tournament files with node.js.

## Install

```bash
npm install swtparser
```

If you want to try other/newer [SWT structure files](https://github.com/chessio/SWT-structure-files) simply put them into the `/structures` folder.

## Usage

	// load from file and parse
	parse.fromSWTfile('/path/to/my.SWT', function(err, tnmt) {
		// handle your tournament
	});

	// parse buffer
	parse.fromSWT(myBuffer, function(err, tnmt) {
		// handle your tournament
	});

This will return a hash with the first class objects `general`, `players` and `pairings_players`. In case of team tournaments `teams` and `pairings_teams` are provided too:

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
		'pairings_players': [	// only if pairings already set
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
		'teams': [	// only in team tournaments
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
		'pairings_teams': [	// only in team tournaments and if pairings already set
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
		

## Supported SWT versions

Because this module uses the SWT structure files of [chessio/SWT-structure-files](https://github.com/chessio/SWT-structure-files), it supports the file versions provided by those structure information. Currently only team tournaments of SWT version 8.xx can be parsed.

## Licence

	Copyright (c) 2012 Falco Nogatz (fnogatz@gmail.com)

	 Permission is hereby granted, free of charge, to any person obtaining a copy
	 of this software and associated documentation files (the "Software"), to deal
	 in the Software without restriction, including without limitation the rights
	 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 copies of the Software, and to permit persons to whom the Software is
	 furnished to do so, subject to the following conditions:

	 The above copyright notice and this permission notice shall be included in
	 all copies or substantial portions of the Software.

	 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 THE SOFTWARE.

Please note that the used SWT structure files are licenced under GNU Lesser General Public Licence.
