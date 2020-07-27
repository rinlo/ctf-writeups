var dnsd = require('dnsd');
var server = dnsd.createServer(handler);

server.zone('4kctf.example.com', '4kns.example.com', 'contact@example.com', 'now', '2h', '30m', '2w', '0s').listen(53, '0.0.0.0');
console.log('Server running at :53');

var last = ""; var timer = null;

function handler(req, res) {
  console.log('%s:%s/%s %j', req.connection.remoteAddress, req.connection.remotePort, req.connection.type, req);

  try {
    var question = res.question[0], hostname = question.name;
    if (question.type == 'A' && hostname == "4kctf.example.com") {
      var ip = "1.1.1.1";
      if (last) ip = "127.0.0.1";
      last = true;
      
      if (!timer) {
        timer = setTimeout(function(){
          timer = null; last = false;
          console.log("RESET");
        }, 600);
      }

      console.log(req.connection.remoteAddress + ": " + ip);
      res.answer.push({ name: hostname, type: 'A', data: ip, 'ttl': "0" });
    }
  } catch (e) {
    console.warn(e);
  } finally {
    res.end();
  }
}
