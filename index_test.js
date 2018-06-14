var app = require('express')();
var server = require('http').createServer(app);
var io = require ('socket.io').listen(server);
connections = [];

server.listen(process.env.PORT || 3000);
console.log('listining to port 3000');

app.get ('/', function(req,res){
  res.sendFile(__dirname + '/index.html');
});

io.sockets.on ('connection', function(socket){
  connections.push(socket);
  console.log('connected: %s sockets connected', connections.length);

  //disconnect
  socket.on('disconnect', function(data){
    connections.splice(connections.indexOf(socket),1);
    console.log('Disconnected: %s sockets connected', connections.length);
  });
});
