var request = require('request');
var querystring = require('querystring');
var http = require('http');
var underscore = require('underscore');

var SparqlClient = module.exports = function (endpoint, options) {
  var slice = Array.prototype.slice;
  var requestDefaults = {
    url: endpoint,
    method: 'POST',
    encoding: 'utf8',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  };
  underscore.extend(requestDefaults, options);
  var defaultParameters = {
    format: 'application/json',
    'content-type': 'application/json'
  };
  var doRequest = request.defaults(requestDefaults);

  var emptyFn = function emptyFn() {};

  var that = this;

  nextTick = function nextTick(callback, args, scope) {
    scope = scope || this;
    return function nextTickCallback() {
      process.nextTick(function nextTickWrapper() {
        if (callback) callback.apply(scope, args);
      });
      return scope;
    }
  };

  var responseHandler = function responseHandler(error, response, responseBody, callback) {
    var continuation = emptyFn;
    if (error || response.statusCode >= 300) {
      continuation = nextTick(callback, [new Error("SparQL query failed."), null], that);
    } else {
      try {
        responseBody = JSON.parse(responseBody);
      } catch (e) {
        continuation = nextTick(callback, [new Error("Could not parse responseBody."), null], that);
      }
      continuation = nextTick(callback, [null, responseBody]);
    }
    return continuation();
  };

  var sparqlRequest = function sparqlRequest(query, callback) {
    var requestBody = underscore.extend(defaultParameters, {
      query: query
    });
    var opts = {
      body: querystring.stringify(requestBody)
    };
    doRequest(opts, function requestCallback() {
      responseHandler.call(
        that,
        arguments[0],
        arguments[1],
        arguments[2],
        callback
      );
    });
  };

  this.defaultParameters = defaultParameters;
  this.requestDefaults = requestDefaults;
  this.request = request;
  this.sparqlRequest = sparqlRequest;
  this.currentQuery = null;
}

SparqlClient.prototype.query = function query(query, callback) {
  if (callback) {
    this.sparqlRequest(query, callback);
    return this;
  } else {
    this.currentQuery = query;
    return this;
  }
}

SparqlClient.prototype.bind = function (placeholder, value) {
  var query = this.currentQuery;
  var pattern = new RegExp('\\?' + placeholder + '[\\s\\n\\r\\t]+', 'g');
  query = query.replace(pattern, value + " ");
  this.currentQuery = query;
  return this;
}

SparqlClient.prototype.execute = function (callback) {
  this.sparqlRequest(this.currentQuery, callback);
  return this;
}
