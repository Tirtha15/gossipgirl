
/*
 * GET home page.
 */

var mongo = require('mongodb');
var db = require('monk')('localhost/gossipgirl');
var async = require('async');
var _ = require('underscore');

var unchangeableFields = ['_id', 'name'];

module.exports = {
	index: function (req, res){
		var socketUrl = ''
		if(process.env.NODE_ENV === 'production')
			socketUrl = 'http://ec2-54-172-9-212.compute-1.amazonaws.com/';
		else
			socketUrl = 'http://localhost:3000';

		return res.render('index', { title: 'Gossip Girl News Feed', socketUrl:  socketUrl});
	},

	suggestions: function(req, res) {

       var query = req.query.query|| 'c';
       async.auto({
       	 characters: function(cb){
       	 	var pattern = new RegExp('^' +query+ '.*');
       	 	var characters = db.get('characters');

            characters.find({name: {$regex: pattern, $options: 'i'}}, {}, function(err, matchedDocs){
            	if(err)
            		return cb(err);
                cb(null, matchedDocs)
            });
       	 },
       	 suggestions:['characters', function (results, cb){
            var allSuggestions = [];
            _.each(results.characters, function(eachCharacter){

            	var allKeys = _.difference(_.keys(eachCharacter), unchangeableFields);
                 
            	_.each(allKeys, function(eachKey){
                   
                   allSuggestions.push({
                   	  value: eachCharacter.name+ '.' + eachKey,
                   	  data: eachCharacter.name+ '_' + eachKey
                   });

            	});
                allSuggestions.push({
                	value: eachCharacter.name,
                	data:  eachCharacter.name
                });
                allSuggestions.push({
                	value: 'All',
                	data: 'All'
                });

            });
            return cb(null, { suggestions: allSuggestions});
       	 }]
       }, function(err, results){
       	if(err){
    		if(err.code === 'BAD_REQUEST')
    			return res.badRequest(err);
    		if(err.code === 'NOT_FOUND')
    			return res.notFound(err);
    		return res.serverError(err);
    	}
       	return res.json(results.suggestions);
       });
	},
}