var util = require('util'),
  dgram = require('dgram');

function RepeaterBackend(startupTime, config, emitter){
  var self = this;
  this.config = config.repeater || [];
  this.sock = (config.repeaterProtocol == 'udp6') ?
        dgram.createSocket('udp6') :
        dgram.createSocket('udp4');

  // attach
  emitter.on('packet', function(packet, rinfo) { self.process(packet, rinfo); });
  emitter.on('flush', function(time_stamp, metrics) { self.flush(time_stamp, metrics); });
};

/*
  Hosts configured with "on": "flush" will only have packets sent to them
  on the configured flush interval. This can save network bandwidth.
*/
RepeaterBackend.prototype.flush = function(time_stamp, metrics) {
  var self = this;
  var type, packet, stat;
  hosts = self.config;

  this.ignore = [ "statsd.packets_received", "statsd.bad_lines_seen" ];

  // Currently only counters and gauges are repeated via flush.
  var statistics = {
    counters : { data: metrics.counters, suffix: "c" },
    gauges   : { data: metrics.gauges,   suffix: "g" }
  };

  for(var i=0; i<hosts.length; i++) {
    if(hosts[i].on != "flush") continue;

    for(type in statistics) {
      stat = statistics[type];
      for(metric in stat.data) {
        if(self.ignore.indexOf(metric) >= 0) continue;

        packet = new Buffer("'" + metric + "':" + stat.data[metric] + "|" + stat.suffix);
        self.repeat(packet, hosts[i]);
      }
    }
  }
};

/*
  By default, repeaters will have every packet immediately forwarded.
*/
RepeaterBackend.prototype.process = function(packet, rinfo) {
  var self = this;
  hosts = self.config;
  for(var i=0; i<hosts.length; i++) {
    if(hosts[i].on != "flush")
      self.repeat(packet, hosts[i]);
  }
};

RepeaterBackend.prototype.repeat = function(packet, host) {
  var self = this;
  self.sock.send(packet,0,packet.length,host.port,host.host,
                 function(err,bytes) {
    if (err) {
      console.log(err);
    }
  });
};

exports.init = function(startupTime, config, events) {
  var instance = new RepeaterBackend(startupTime, config, events);
  return true;
};

