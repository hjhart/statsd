var util = require('util'),
    dgram = require('dgram');

function RepeaterBackend(startupTime, config, emitter){
  var self = this;
  this.config = config.repeater || [];

  // attach
  emitter.on('packet', function(packet, rinfo) { self.process(packet, rinfo); });
};

RepeaterBackend.prototype.process = function(packet, rinfo) {
  var self = this;
  hosts = self.config;
  for(var i=0; i<hosts.length; i++) {
    self.sock(hosts[i].protocol).send(packet,0,packet.length,hosts[i].port,hosts[i].host,
                   function(err,bytes) {
      if (err) {
        console.log(err);
      }
    });
  }
};

RepeaterBackend.prototype.sock = function(protocol) {
  return (protocol == "udp6") ? this.sock6() : this.sock4();
}

RepeaterBackend.prototype.sock4 = function() {
  if (!this.udp4Socket) this.udp4Socket = dgram.createSocket('udp4');
  return this.udp4Socket;
}

RepeaterBackend.prototype.sock6 = function() {
  if (!this.udp6Socket) this.udp6Socket = dgram.createSocket('udp6');
  return this.udp6Socket;
}

exports.init = function(startupTime, config, events) {
  var instance = new RepeaterBackend(startupTime, config, events);
  return true;
};
