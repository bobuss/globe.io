var https = require('https')
  , config = require('config')
  , connect = require('connect')
  , base64 = require('base64');

//
// Creating HTTP Server
//
var server = connect()
  .use(connect.favicon())
  .use(connect.logger('dev'))
  .use(connect.static('public'))
  .listen(config.http_port);

var io = require('socket.io').listen(server);

io.configure('production', function(){
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  io.set('transports', [                     // enable all transports (optional if you want flashsocket)
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
});

io.configure('development', function(){
  io.set('transports', ['websocket']);
});

console.log('Socket.IO is listenning');

//
// Twitter Stream API part
//

var options = {
  host: 'stream.twitter.com',
  port: 443,
  path: '/1/statuses/filter.json?locations=-180,-90,180,90',
  method: 'GET',
  headers: {
    'Host' : 'stream.twitter.com',
    'Authorization' : 'Basic ' + base64.encode(config.twitter.login + ':' + config.twitter.password)
  }
};


var req = https.request(options, function(res) {

  if (res.statusCode == 200) {
    var data = '';

    res.on('data', function(chunk) {
      data += chunk;

      try {
        var obj = JSON.parse(String(data));

        if (null != obj.geo) {
          // Here we have a tweet with a geotag
          io.sockets.emit('geotag', {
            longitude: obj.geo.coordinates[1],
            latitude: obj.geo.coordinates[0]
          });
        }

        data = '';
      } catch (e) { /* Continue */ }
    });
  }

  if (res.statusCode == 401) {
    console.log('BLAM ! 401 ! Bad authentification !');
    console.log('Check you config/default.yaml settings.');
    process.exit(1);
  }

  res.on('end', function() { /* NOTHING */ });

});

req.end();

req.on('error', function(e) {
  console.error(e);
});