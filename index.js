/**
 * Created by jorge on 3/10/17.
 */

const bodyParser = require('body-parser');
// https://www.npmjs.com/package/jsonrpc-lite
const jsonrpc = require('jsonrpc-lite');

const endpoints = {};

const HTTP200 = 200;
const HTTP404 = 404;

const isValue = (value) => typeof value !== 'undefined' && value !== null;

function validateRequest(req, res, next) {
  if (req.method === 'POST') {
    // console.log('validateRequest:' + req.path);
    const endpoint = endpoints[req.path];

    if (!isValue(endpoint)) {
      return res.status(HTTP404).json({
        message: `RPC path ${req.path} not found`,
        validPaths: Object.keys(endpoints)
      });
    }

    const parsed = jsonrpc.parseObject(req.body);

    // console.log(parsed.type);
    if (parsed.type !== 'request' && parsed.type !== 'notification') {
      return res.json(jsonrpc.error(0, jsonrpc.JsonRpcError.invalidRequest({
        message: 'body is not a valid JSON-RPC request or notification',
        body: req.body
      })));
    }

    const met = endpoint.methods[req.body.method];

    if (!isValue(met)) {
      const err = jsonrpc.JsonRpcError.methodNotFound({
        method: req.body.method,
        endpoint: req.path
      });

      return next(err);
    }

    req.jsonrpc = {method: met};
  }
  return next();
}

module.exports = (path, router, options) => {
  if (!isValue(options) || !isValue(options.methods)) {
    throw new Error('options.methods is undefined or null');
  }
  endpoints[path] = {};
  endpoints[path].methods = options.methods;
  endpoints[path].keys = Object.keys(options.methods);
  router.use(bodyParser.json());
  router.use(validateRequest);

  router.route(path).post((req, res, next) => {
    // console.log('POST: main entry point');

    const result = Promise.resolve(req.jsonrpc.method(req));

    result.then((value) => {
      if (isValue(req.body.id)) {
        return res.json(jsonrpc.success(req.body.id, value));
      }
      return res.json({});
    }).catch(next);
  });

  router.use((err, req, res, ignored) => {

    /*
    console.log("ERROR middleware");
    console.log(err.name);
    */

    let rpcError = {};

    switch (err.name) {
      case 'JsonRpcError':
      rpcError = err;
      break;
    case 'SyntaxError':
      // console.log(err);
      rpcError = jsonrpc.JsonRpcError.parseError(err);
      break;
    default:
      rpcError = jsonrpc.JsonRpcError.internalError({
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      break;
    }
    res.status(HTTP200)
    .json(jsonrpc.error((req.body && req.body.id) || 0, rpcError));
  });
};
