const passport = require('passport');
const { Pool } = require('pg');
const {user, host, database, password, port } = require('../secrets/db_config');
const pool = new Pool ({user, host, database, password, port});
var flag = 'false';

pool.connect(function(err, client) {
  if(err) {
    console.log(err);
  }
  client.on('notification', function(msg) {
    flag = msg.name;
    if (flag == 'notification'){
      console.log(flag);
    }
  });
  var query = client.query("LISTEN watchers");
});

module.exports = pool ;
