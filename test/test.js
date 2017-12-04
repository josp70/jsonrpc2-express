/* global describe, it, after, before */
/* eslint no-process-env: 'off' */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const service = require('./fixture/service');
const chakram = require('chakram');
const {expect} = chakram;

const jsonrpcHelper = require('jsonrpc-lite');
const uuidv1 = require('uuid/v1');

const HTTP200 = 200;
const HTTP404 = 404;

describe('JSON-RPC', () => {
  let port = -1;
  const url = `http://localhost:${port}/rpc`;

  before('create service', (done) => {
    service.start();
    service.app.on('ready', () => {
      ({port} = service.server.address());
      done();
    });
  });

  describe('invalid requests', () => {
    it('it return 404 on GET', () => {
      const response = chakram.get(url);

      expect(response).to.have.status(HTTP404);
      return chakram.wait();
    });
    it('it return 200 on earlier middleware errors', () => {
      const response = chakram.get(`${url}?test_mw_error=1`);

      expect(response).to.have.status(HTTP200);
      expect(response).to.comprise.of.json(
        jsonrpcHelper.error(0,
                            jsonrpcHelper.JsonRpcError.internalError({
                              message: 'error from earlier middleware'
                            }))
                          );
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });

    it('it return 404 on not found path', () => {
      const response = chakram.post(`${url}/notfound`);

      expect(response).to.have.status(HTTP404);
      return chakram.wait();
    });
    it('it return 200 & invalid request on empty body', () => {
      const response = chakram.post(`${url}/module`);

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json({
        'error': {
          'code': -32600,
          'data': {},
          'message': 'Invalid request'
        },
        'id': 0,
        'jsonrpc': '2.0'
      });
      return chakram.wait();
    });

    it('it return 200 & method not found', () => {
      const response = chakram.post(`${url}/module`);

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json({
        'error': {
          'code': -32600,
          'data': {},
          'message': 'Invalid request'
        },
        'id': 0,
        'jsonrpc': '2.0'
      });
      return chakram.wait();
    });

    it('it return 200 & Parse error', () => {
      const data = '{"name": "this JSON is invalid"';
      const response = chakram.post(`${url}/module`,
                                    data,
                                    {
                                      'headers': {'Content-Type': 'application/json'}
                                    });

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json({
        jsonrpc: '2.0',
        id: 0,
        error: {
          message: 'Parse error',
          code: -32700,
          data: {
            expose: true,
            statusCode: 400,
            status: 400,
            body: '{"name": "this JSON is invalid"',
            type: 'entity.parse.failed'
          }
        }
      });
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });
  });

  describe('valid requests', () => {
    it('it return 200 & json response', () => {
      const id = uuidv1();
      const data = jsonrpcHelper.request(id, 'myMethod', {hello: 'world'});
      const response = chakram.post(`${url}/module`,
                                    data,
                                    {
                                      'headers': {'Content-Type': 'application/json'}
                                    });

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json({
        jsonrpc: '2.0',
        id,
        result: {hello: 'world'}
      });
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });
    it('it return 200 & internal error', () => {
      const id = uuidv1();
      const data = jsonrpcHelper.request(id, 'throwError', {});
      const response = chakram.post(`${url}/module`,
                                    data,
                                    {
                                      'headers': {'Content-Type': 'application/json'}
                                    });

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json(
        jsonrpcHelper.error(id,
                            jsonrpcHelper.JsonRpcError.internalError({
                              message: 'error detected & thrown'
                            }))
                          );
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });

    it('it return 200 & invalid parameter error', () => {
      const id = uuidv1();
      const data = jsonrpcHelper.request(id, 'throwJsonRpcError', {});
      const response = chakram.post(`${url}/module`,
                                    data,
                                    {
                                      'headers': {'Content-Type': 'application/json'}
                                    });

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json(
        jsonrpcHelper.error(id,
                            jsonrpcHelper.JsonRpcError.invalidParams({
                              'message': 'missing parameter',
                              'parameter': 'idTask'
                            }))
                          );
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });

    it('it return 200 & custom RPC error', () => {
      const id = uuidv1();
      const data = jsonrpcHelper.request(id, 'throwCustomRpcError', {});
      const response = chakram.post(`${url}/module`,
                                    data,
                                    {
                                      'headers': {'Content-Type': 'application/json'}
                                    });

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json(
        jsonrpcHelper.error(id,
                            service.entityNotFound({
                              'message': 'file not found',
                              'filename': 'the_name_of_the_file'
                            }))
                          );
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });

    it('it return 200 & resolved value from Promise', () => {
      const id = uuidv1();
      const data = jsonrpcHelper.request(id, 'methodResolved', {});
      const response = chakram.post(`${url}/module`,
                                    data,
                                    {
                                      'headers': {'Content-Type': 'application/json'}
                                    });

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json(
        jsonrpcHelper.success(id, {
          promise: 'fulfilled'
        })
      );
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });
    it('it return 200 & resolved value from Promise', () => {
      const id = uuidv1();
      const data = jsonrpcHelper.request(id, 'methodRejected', {});
      const response = chakram.post(`${url}/module`,
                                    data,
                                    {
                                      'headers': {'Content-Type': 'application/json'}
                                    });

      expect(response).to.have.status(HTTP200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json(
        jsonrpcHelper.error(id,
                            jsonrpcHelper.JsonRpcError.internalError({
                              message: 'Do not trust in me'
                            }))
                          );
      // after(function() {console.log(response.valueOf().body)});
      return chakram.wait();
    });
  });

  after('shutdown service', () => {
    service.close();
  });
});
