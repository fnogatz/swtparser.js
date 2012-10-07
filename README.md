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
	parse.fromSWTfile('/home/fnogatz/Desktop/DLM2012.SWT', function(err, tnmt) {
		// handle your tournament
	});

	// parse buffer
	parse.fromSWT(myBuffer, function(err, tnmt) {
		// handle your tournament
	});

## Supported SWT versions

Because this module uses the SWT structure files of [chessio/SWT-structure-files](https://github.com/chessio/SWT-structure-files), it supports the file versions provided by those structure information. Currently only team tournaments of SWT version 8.xx can be parsed.

## Todo

- Players can not be parsed in tournaments without any paired round
- Creation of SWT file from given JSON tournament

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
