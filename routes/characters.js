var mongo = require('mongodb');
var db = require('monk')('localhost/gossipgirl');
var async = require('async');
var _ = require('underscore');

var messages = {
   newCharacter: 'A new character has been added:',
   deletedCharacter: 'A character has been removed:',
   modifiedValue: 'Value of the field has been changed:',
   modifiedAttributes: 'Attribute/s have been changed:',
   modifiedDoc: 'Document has been changed:'
};

module.exports = {
	find: function(req, res) {      
      var toFind = req.params.id ? {_id:req.params.id} : {};

      var characters = db.get('characters');

      characters.find(toFind, {}, function(err, allCharacters){
      	if(err){
      		console.log('err',err);
      		return res.serverError(err);
      	}

      	if(allCharacters.length < 1)
      		return res.notFound({code: 'NOT_FOUND', message: 'no character/s found'});

      	return res.json(allCharacters);	
      });
	},

	add: function(req, res) {
		var name = req.body.name;
		var actor = req.body.actor;
		var location = req.body.location;

		if(!name || !actor)
			return res.badRequest({code:'BAD_REQUEST', message: 'Required fields are missing'});
        
		async.auto({
			character: function(cb){
                var characterToAdd = {
                	name: name,
                	actor: actor,
                	location: location || 'home'
                };
                var characters = db.get('characters');

                characters.insert(characterToAdd, cb);
			},
			emitEvent:['character', function(results, cb){
				// if(!results.character)
				// 	return cb();

                var charDetails = stringifyAttributes(results.character);
                req.io.sockets.emit('NewInfo', { event:'All', message: messages.newCharacter+charDetails });
				return cb();
			}]
		}, function(err, results){
			if(err){
        		return res.json(err);
        		//handle errors
        		if(err.code === 'BAD_REQUEST')
        			return res.badRequest(err);
        		if(err.code === 'NOT_FOUND')
        			return res.notFound(err);
        		return res.serverError(err);
        	}
			return res.json(results.character);
		});
	},

	update: function(req, res) {
	   var charId = req.params.id;
       
       // name and id should not be updateable
	   if(req.body.name)
	   	  delete req.body.name;

	   if(req.body._id)
	   	  delete req.body.id;

	   var updateParams = req.body;

       var characters = db.get('characters');

	   async.auto({
	   	find: function(cb){
    		characters.find({ _id: charId }, {}, function(err, character){
		      	if(err)
		      		return cb(err);

		      	if(character.length < 1)
		      		return cb({code: 'BAD_REQUEST', message: 'Invalid character id'});

		      	return cb(null, character[0]);
		    });
        },
	   	update:['find', function(results, cb){
           var characters = db.get('characters');

           characters.update({_id: charId}, {$set:updateParams}, function(err, queryRes){
           	  if(err)
           	  	return cb(err);

           	  if(queryRes.n < 1)
           	  	return cb({code:'BAD_REQUEST', message: "wrong character id"});

           	  if(queryRes.writeErrors)
           	  	return cb({code: 'WRITE_ERRORS', details: queryRes.writeErrors});

           	  return cb();
           })
	   	}],
	   	emitEvent:['update', function(results, cb){
	   		var newDoc = {
	   			name: results.find.name,
	   		};
            _.extend(newDoc, updateParams)
            //emit events for each modified attributes
            async.each(_.keys(updateParams), function(updatedKey, eachCb){
            	var eventName = results.find.name + '_' + updatedKey;
            	var eventDisplayName = results.find.name + '.' + updatedKey;
            	var details = '';

            	if(_.keys(newDoc[updatedKey]).length > 0)
            	   details = stringifyAttributes(newDoc[updatedKey]);
            	else 
            	   details = updatedKey + ':' + newDoc[updatedKey];

            	req.io.sockets.emit(eventName, { event:eventDisplayName, message: messages.modifiedValue+details });
                eachCb();
            }, function(err){
                if(err)
                	return cb(err);
                // emit event for doc & all
                var changedAttributes = stringifyAttributes(newDoc);
                req.io.sockets.emit(results.find.name, { event:results.find.name, message: messages.modifiedAttributes+changedAttributes });
                req.io.sockets.emit('All', { event:'All', message: messages.modifiedDoc+changedAttributes });
                return cb(null, newDoc);
            });
		}]
	   }, function(err, results){
	   	  if(err){
    		if(err.code === 'BAD_REQUEST')
    			return res.badRequest(err);
    		if(err.code === 'NOT_FOUND')
    			return res.notFound(err);
    		return res.serverError(err);
          }
	   	  return res.json(results.emitEvent);
	   });
	},

	delete: function(req, res) {
        var charId = req.params.id;

        var characters = db.get('characters');

        async.auto({
        	find: function(cb){
	    		characters.find({ _id: charId }, {}, function(err, character){
			      	if(err)
			      		return cb(err);

			      	if(character.length < 1)
			      		return cb({code: 'BAD_REQUEST', message: 'Invalid character id'});

			      	return cb(null, character[0]);
			    });
        	},
        	delete:['find', function(results, cb){
        		characters.remove({ _id: charId }, function(err, queryRes){
        			if(err)
        				cb(err);
        			cb();
        		});
        	}],
        	emitEvent:['delete', function(results, cb){
                var charDetails = stringifyAttributes(results.find);
        	    req.io.sockets.emit('NewInfo', { event:'All', message: messages.deletedCharacter+charDetails });
        	    cb();
        	}],
        }, function(err, results){
        	if(err){
        		if(err.code === 'BAD_REQUEST')
        			return res.badRequest(err);
        		if(err.code === 'NOT_FOUND')
        			return res.notFound(err);
        		return res.serverError(err);
        	}
        	return res.json(results.find);
        });
	},
}

function stringifyAttributes(object){
	var toReturn = '';
	if(object._id)
		delete object._id;
	_.each(_.keys(object), function(key){
		if(_.keys(object[key]).length > 0){
			var str = stringifyAttributes(object[key]);
			toReturn = toReturn +" "+ key + ":" + str;
		} else{
			toReturn = toReturn +" "+ key + ":" + object[key];
		}
        
    });

    return toReturn;
}