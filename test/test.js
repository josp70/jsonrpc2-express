//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const chakram = require('chakram');
const expect = chakram.expect;

const express = require('express');
const jsonrpcRouter = require('../index.js');
const jsonrpcHelper = require('jsonrpc-lite');
const uuidv1 = require('uuid/v1');

entityNotFound = function(data) {
    return new jsonrpcHelper.JsonRpcError('Entity not found', -33001, data)
};

describe('JSON-RPC', () => {
    var app, server, port, url;

    before("create server", () => {
	app = express();
	let routerRpc = express.Router();
	routerRpc.use(function(req, res, next) {
	    if(req.query.test_mw_error == null) {
		next()
	    } else {
		next(new Error("error from earlier middleware"));
	    }
	});
	jsonrpcRouter('/module', routerRpc, {
	    methods: {
		myMethod: function(req) {
		    return req.body.params
		},
		throwError: function(req) {
		    throw new Error('error detected & thrown');
		},
		throwJsonRpcError: function(req) {
		    throw new jsonrpcHelper.JsonRpcError.invalidParams({
			"message": "missing parameter",
			"parameter": "idTask"
		    });
		},
		throwCustomRpcError:  function(req) {
		    throw entityNotFound({
			"message": "file not found",
			"filename": "the_name_of_the_file"
		    });
		}
	    }
	});
	app.use('/rpc', routerRpc);
	server = app.listen();
	port = server.address().port;
    });
    describe('invalid requests', () => {
	it('it return 404 on GET', () => {
	    const response = chakram.get('http://localhost:'+port+'/rpc');
	    expect(response).to.have.status(404);
	    return chakram.wait();
	});
	it('it return 200 on earlier middleware erros', () => {
	    const response = chakram.get('http://localhost:'+port+'/rpc?test_mw_error=1');
	    expect(response).to.have.status(200);
	    expect(response).to.comprise.of.json(
		jsonrpcHelper.error(0,
				    jsonrpcHelper.JsonRpcError.internalError({
					message: 'error from earlier middleware'
				    })));
	    //after(function() {console.log(response.valueOf().body)});
	    return chakram.wait();
	});
	it('it return 404 on not found path', () => {
	    const response = chakram.post('http://localhost:'+port+'/rpc/notfound');
	    expect(response).to.have.status(404);
	    return chakram.wait();
	});
	it('it return 200 & invalid request on empty body', () => {
	    const response = chakram.post('http://localhost:'+port+'/rpc/module');
	    expect(response).to.have.status(200);
            expect(response).to.have.header("content-type", "application/json; charset=utf-8");
	    expect(response).to.comprise.of.json({
		"error": {
		    "code": -32600, 
		    "data": {}, 
		    "message": "Invalid request"
		}, 
		"id": 0, 
		"jsonrpc": "2.0"
	    });
	    return chakram.wait();
	});
	it('it return 200 & method not found', () => {
	    const response = chakram.post('http://localhost:'+port+'/rpc/module');
	    expect(response).to.have.status(200);
            expect(response).to.have.header("content-type", "application/json; charset=utf-8");
	    expect(response).to.comprise.of.json({
		"error": {
		    "code": -32600, 
		    "data": {}, 
		    "message": "Invalid request"
		}, 
		"id": 0, 
		"jsonrpc": "2.0"
	    });
	    return chakram.wait();
	});
	it("it return 200 & Parse error", function () {
	    const data = "{'name': 'this JSON is invalid'";
            const response = chakram.post('http://localhost:'+port+'/rpc/module',
					  data,
					  param = {
					      "headers": {"Content-Type": "application/json"}
					  });
	    expect(response).to.have.status(200);
            expect(response).to.have.header("content-type", "application/json; charset=utf-8");
	    expect(response).to.comprise.of.json({
	    jsonrpc:"2.0",
		id:0,
		error:{
		    message:"Parse error",
		    code:-32700,
		    data: {
			expose: true,
			statusCode: 400,
			status: 400,
			body: '"{\'name\': \'this JSON is invalid\'"',
			type: 'entity.parse.failed'
		    }
		}
	    });
	    //after(function() {console.log(response.valueOf().body)});
	    return chakram.wait();
	});
    });
    describe('valid requests', () => {
	it("it return 200 & json response", function () {
	    const id = uuidv1();
	    const data = jsonrpcHelper.request(id, 'myMethod', {hello: 'world'});
            const response = chakram.post('http://localhost:'+port+'/rpc/module',
					  data,
					  param = {
					      "headers": {"Content-Type": "application/json"}
					  });
	    expect(response).to.have.status(200);
            expect(response).to.have.header("content-type", "application/json; charset=utf-8");
	    expect(response).to.comprise.of.json({
		jsonrpc: '2.0',
		id: id,
		result: { hello: 'world' }
	    });
	    //after(function() {console.log(response.valueOf().body)});
	    return chakram.wait();
	});
	it("it return 200 & internal error", function () {
	    const id = uuidv1();
	    const data = jsonrpcHelper.request(id, 'throwError', {});
            const response = chakram.post('http://localhost:'+port+'/rpc/module',
					  data,
					  param = {
					      "headers": {"Content-Type": "application/json"}
					  });
	    expect(response).to.have.status(200);
            expect(response).to.have.header("content-type", "application/json; charset=utf-8");
	    expect(response).to.comprise.of.json(
		jsonrpcHelper.error(id,
				    jsonrpcHelper.JsonRpcError.internalError({
					message: 'error detected & thrown'
				    })));
	    //after(function() {console.log(response.valueOf().body)});
	    return chakram.wait();
	});
	it("it return 200 & invalid parameter error", function () {
	    const id = uuidv1();
	    const data = jsonrpcHelper.request(id, 'throwJsonRpcError', {});
            const response = chakram.post('http://localhost:'+port+'/rpc/module',
					  data,
					  param = {
					      "headers": {"Content-Type": "application/json"}
					  });
	    expect(response).to.have.status(200);
            expect(response).to.have.header("content-type", "application/json; charset=utf-8");
	    expect(response).to.comprise.of.json(
		jsonrpcHelper.error(id,
				    jsonrpcHelper.JsonRpcError.invalidParams({
					"message": "missing parameter",
					"parameter": "idTask"
				    })));
	    //after(function() {console.log(response.valueOf().body)});
	    return chakram.wait();
	});
	it("it return 200 & custom RPC error", function () {
	    const id = uuidv1();
	    const data = jsonrpcHelper.request(id, 'throwCustomRpcError', {});
            const response = chakram.post('http://localhost:'+port+'/rpc/module',
					  data,
					  param = {
					      "headers": {"Content-Type": "application/json"}
					  });
	    expect(response).to.have.status(200);
            expect(response).to.have.header("content-type", "application/json; charset=utf-8");
	    expect(response).to.comprise.of.json(
		jsonrpcHelper.error(id,
				    entityNotFound({
					"message": "file not found",
					"filename": "the_name_of_the_file"
				    })));
	    //after(function() {console.log(response.valueOf().body)});
	    return chakram.wait();
	});
    });
    after('shutdown server', () => {
	server.close();
    });
});
