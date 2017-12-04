jsonrpc2-express: JSON-RPC end-point for express
=========
![build status](https://gitlab.com/jorge.suit/jsonrpc2-express/badges/master/build.svg)

Module to configure an express router in order to expose a JSON-RPC
end-point.

## Installation

  `npm install jsonrpc2-express`

## Usage

```javascript
const express = require('express');
const jsonrpc = require('jsonrpc2-express')

const app = express();

let routerRpc = express.Router();

jsonrpc('/rpc/module1', routerRpc, {
    methods: require('./module1.js')
});

app.use('/api', routerRpc);

app.listen(3000, function() {
    console.log('Server listening on port 3000');
});
```

The file `module1.js` with the implementation of the method is:

```javascript
exports.f1 = function(req) {
	console.log(req.body.params)
    return {
	field1: 'answer from f1',
	user: req.user
    };
};

exports.f2 = function(req) {
	console.log(req.body.params)
    return {
	field1: 'answer from f2',
	user: req.user
    };
};

exports.ferror = function(req) {
    throw new Error("sorry");
};
```

The parameters for each method can be read from `req.body.params`

## Tests

  `npm test`

## Contributing

In lieu of a formal style guide, take care to maintain the existing
coding style. Add unit tests for any new or changed
functionality. Lint and test your code.
