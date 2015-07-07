var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var path = require('path');
var Twitter = require('twitter');
var io = require('socket.io')(server);
var sentiment = require('sentiment');
var port = 3000;
var mongoose = require("mongoose");
var inUse = { state: false, keyword : ''};
var score = {
			total:0,
			pos:0,
			neg:0,
			neu: 0,
			currentScore: 0,
			tweet: ""
		};


// Setup view engine
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'jade');

// More set up
app.use(express.static(path.join(__dirname, '/public')));

//Create server
server.listen(port, function(){
	console.log('Now listening on port: %s', port);
});

//Setup Twitter
var twit = new Twitter({
	consumer_key: "w6Zw0290V8K7tJUZixqMLWqhi",
	consumer_secret: "K3SuwDJpYonmf4tGlNKmZ3l0ls1kD6Y422i55IzcHhri1Mg8c9",
	access_token_key: "2275761036-KjRPsgvkXaQK9qs3ca6NyBHZSydsItEHsVm78GF",
	access_token_secret: "sZhAKjV9iiRsVcCqiCyz6hIU3XOz0Ej38xQ0JviE6uIOm"
});


//Setup database
mongoose.connect("mongodb://localhost/sentiment");

var tweetSchema = new mongoose.Schema( 
	{
		keyword: String,
		total: Number,
		pos: Number,
		neg: Number,
		neu: Number,
		date: { type: Date, default: Date.now },
		score: Number
	}, {
		capped: { size: 2048, max: 10, autoIndexId: true }
	}
);

var Tweets = mongoose.model("Tweets", tweetSchema);

//Turn on socket-io
io.on('connection', function(socket){
	console.log("socket connected");
	io.emit("state",inUse);
	socket.on("topic", function(topic) {
		inUse.state = true;
		inUse.keyword = topic;
		score = {
			total:0,
			pos:0,
			neg:0,
			neu: 0,
			currentScore: 0,
			tweet: ""
		}
		twit.stream('statuses/filter', {track: topic, language:'en'}, function(stream) {
			stream.on("data", function(tweet) {
				console.log(tweet);
				var senti = sentiment(tweet.text);
				score.total++;
				score.currentScore = senti.score;
				score.tweet = tweet.text;

				if (senti.score === 0) {
					score.neu++;
				} 
				else if (senti.score < 0) {
					score.neg++;
				}
				else {
					score.pos++;
				}
				io.emit("data",score);
				io.emit("state",inUse);
			})
			twit.currentStream = stream;
			twit.currentKey = topic;	
		});
	});

	Tweets.find({}, function(error, tweets) {
		io.emit("list", tweets);
	});

	socket.on("stopStreaming", function(data) {
		twit.currentStream.destroy();
		inUse.state = false;
		inUse.keyword = '';
		io.emit("state",inUse);
		var tweet = {
			keyword: twit.currentKey,
			total: score.total,
			pos: score.pos,
			neg: score.neg,
			neu: score.neu,
			score: (score.pos - score.neg) / (score.pos + score.neg)
		}
		var newTweet = new Tweets (tweet);
		newTweet.save(function (err, result) {
			if (err !==null) {
				console.log(err);
			}
			else {
				console.log(result);
				Tweets.find({}, function (error, tweets) {
					io.emit("list", tweets);
				});
			}
		});
	});
});

app.get('/', function(req,res){
	res.render('index');
});

module.exports = app;