/**
 * Created by jorge on 3/10/17.
 */

const bodyParser = require('body-parser');
// https://www.npmjs.com/package/jsonrpc-lite
const jsonrpc = require('jsonrpc-lite');

var endpoints = {};

function validateRequest(req, res, next) {
    console.log('validateRequest');
    let parsed = jsonrpc.parseObject(req.body);
    console.log(parsed.type);
    
    if(parsed.type!=='request' && parsed.type!=='notification') {
        res.json(jsonrpc.error(0, jsonrpc.JsonRpcError.invalidRequest({
	    message: 'body is not a valid JSON-RPC request or notification',
	    body: req.body
	})));
    } else {
	const endpoint = endpoints[req.path];
	if(endpoint == null) {
	    next(new Error('RPC endpoint not mounted: ' + req.path));
	} else {
	    const m = endpoint.methods[req.body.method];
	    if(m == null) {
		let err = new jsonrpc.JsonRpcError.methodNotFound({
		    method: req.body.method,
		    endpoint: req.path
		});
		next(err);
	    } else {
		req.jsonrpc = {method: m};
		next();
	    }
	}
    }
}

module.exports = function(path, router, options) {
    if(options == null || options.methods == null) {
	throw new Error('options.methods is undefined or null');
    }
    endpoints[path] = {};
    endpoints[path].methods = options.methods;
    endpoints[path].keys = Object.keys(options.methods);
    router.use(bodyParser.json());
    router.use(validateRequest);
    
    router.post(path, function(req, res) {
        console.log('POST: main entry point');
	// look for requested, if not found return method_not_found
	// if found, invoke requested method try/catch
	let result = req.jsonrpc.method(req);
        res.json(req.body.id==null? {} : jsonrpc.success(req.body.id, result));
    });
    
    router.use(function (err, req, res, next) {
        console.log("ERROR middleware");
        console.log(err.name);
	let rpcError;
	switch (err.name) {
	case "JsonRpcError":
	    rpcError = err;
	    break;
	case "SyntaxError":
	    //console.log(err);
	    rpcError = new jsonrpc.JsonRpcError.parseError(err);
	    break;
	default:
	    rpcError = jsonrpc.JsonRpcError.internalError({
		message: err.message,
		code: err.code,
		stack: err.stack
	    });
	    break;
	}
	res.status(200).json(jsonrpc.error(req.body.id||0, rpcError));
    });
};
