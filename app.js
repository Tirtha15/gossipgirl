
/**
 * Module dependencies.
 */

var express = require('express');
//var bodyParser = require('body-parser')

var routes = require('./routes/index');
var characters = require('./routes/characters');

var mongo = require('mongodb');
var db = require('monk')('localhost/gossipgirl');

var app = module.exports = express.createServer();
var io = require('socket.io')(app);



// Configuration
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: true}));

app.use(function(req, res, next){
  req.io = io;
  next();
});

//error handler
app.use(function(req, res, next){
  res.notFound = function(err){
    return this.status(404).send(err);
  };
  res.badRequest = function(err){
    return this.status(400).send(err);
  };
  res.serverError = function(err){
    return this.status(500).send(err);
  };
  next();
});

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());  
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});



// Routes

app.get('/', routes.index);
app.get('/suggestions', routes.suggestions);
app.get('/characters', characters.find);
app.get('/characters/:id', characters.find);
app.post('/characters', characters.add);
app.put('/characters/:id', characters.update);
app.delete('/characters/:id', characters.delete);

app.listen(80, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});


io.on('connection', function (socket) {
  socket.emit('welcome', { message: 'Please subscribe to one or more characters to get real time feeds.' });
});