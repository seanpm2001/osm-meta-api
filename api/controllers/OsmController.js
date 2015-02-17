/*global ResponseBuilder*/
/*global ApiRequest*/
/*global ElasticSearchQuery*/
/*global sails*/
/**
 * OsmController
 *
 * @description :: Server-side logic for managing osms
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var elasticsearch = require('elasticsearch');
var underscore = require('underscore');

var client = new elasticsearch.Client({
  host: sails.config.osm.esServer,

  // Note that this doesn't abort the query.
  requestTimeout: 10000  // milliseconds
});

module.exports = {
  get: function(req, res) {

    try {
      res = ResponseBuilder.setHeaders(res);

      var params = ApiRequest.checkParams(req.query);

      var query = ElasticSearchQuery.buildQuery(params);

      client.search({
        index: 'osm',
        type: 'meta',
        body: query
      }).then(function(body) {

        if (body.hits.hits.length === 0) {
          res.badRequest({error: 'Nothing Found'});
        }

        var responseJson = {};

        responseJson.meta = underscore.clone(sails.config.osm.meta);

        responseJson.meta.count = {
          'returned': body.hits.hits.length,
          'limit': params.limit,
          'total': body.hits.total,
          'totalChanges': body.aggregations.totalChanges.value,
          'usersContributed': body.aggregations.userTotal.buckets.length
        };

        responseJson.results = [];
        for (var i = 0; i < body.hits.hits.length; i++) {
          var es_results = body.hits.hits[i]._source;
          for (var j = 0; j < sails.config.osm.fields_to_remove.length; j++) {
            delete es_results[sails.config.osm.fields_to_remove[j]];
          }
          responseJson.results.push(es_results);
        }

        return res.json(responseJson);
      }, function(error) {
        res.badRequest({'SERVER_ERROR': 'Check your request and try again',
                        'message': error.message});
      });
    }
    catch (e) {
      res.badRequest(e);
    }

  }
};

