/* eslint no-process-env: "off" */

const jsonrpcHelper = require('jsonrpc-lite');
const express = require('express');
const jsonrpcRouter = require('../../index');

const ENTITY_NOT_FOUND = -33001;
const entityNotFound = (data) =>
  new jsonrpcHelper.JsonRpcError('Entity not found',
                                 ENTITY_NOT_FOUND, data);

exports.entityNotFound = entityNotFound;

const app = express();
const routerRpc = new express.Router();

const isValue = (value) => typeof value !== 'undefined' && value !== null;

routerRpc.use((req, res, next) => {
  if (isValue(req.query.test_mw_error)) {
    return next(new Error('error from earlier middleware'));
  }
  return next();
});

jsonrpcRouter('/module', routerRpc, {
  methods: {
    myMethod: (req) => req.body.params,

    throwError: (ignored) => {
      throw new Error('error detected & thrown');
    },

    throwJsonRpcError: (ignored) => {
      throw jsonrpcHelper.JsonRpcError.invalidParams({
        'message': 'missing parameter',
        'parameter': 'idTask'
      });
    },

    throwCustomRpcError: (ignored) => {
      throw entityNotFound({
        'message': 'file not found',
        'filename': 'the_name_of_the_file'
      });
    },

    methodResolved: () => new Promise((resolve, ignored) => {
      resolve({promise: 'fulfilled'});
    }),

    methodRejected: () => new Promise((resolve, reject) => {
      reject(new Error('Do not trust in me'));
    })
  }
});

app.use('/rpc', routerRpc);

let server = null;

const start = () => {
  const port = 0;

  server = app.listen(port, () => {
    console.log(`Server listening on port ${server.address().port}`);
    app.emit('ready', null);
  });
  exports.server = server;
};

exports.close = () => {
  server.close();
};

exports.app = app;
exports.start = start;

if (process.env.NODE_ENV !== 'test') {
  start();
}
