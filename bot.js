var util = require('util');
var xmpp = require('node-xmpp');
var ep_api = require('etherpad-lite-client');

// Config
var jid = 'bot@localhost'
var password = 'secret'
var room_jid = 'room@localhost'
var room_nick = 'bot'
var ep_key = 'undefined'
var ep_host = 'localhost'
var ep_port = 443
var pad_id = 'xmpplog'

ep = ep_api.connect({
  apikey: ep_key,
  host: ep_host,
  port: ep_port,
});

var cl = new xmpp.Client({
  jid: jid + '/' + room_nick,
  password: password
});

// Once connected, set available presence and join room
cl.on('online', function() {
  util.log("We're online!");

  util.log(new xmpp.Element('presence'));
  // set ourselves as online
  cl.send(new xmpp.Element('presence', { type: 'available' }).
    c('show').t('chat')
  );

  // join room (and request no chat history)
  cl.send(new xmpp.Element('presence', { to: room_jid+'/'+room_nick }).
    c('x', { xmlns: 'http://jabber.org/protocol/muc' })
  );

  // send keepalive data or server will disconnect us after 150s of inactivity
  setInterval(function() {
    cl.send(' ');
  }, 30000);
});

cl.on('stanza', function(stanza) {
  // always log error stanzas
  if (stanza.attrs.type == 'error') {
    util.log('[error] ' + stanza);
    return;
  }

  // ignore everything that isn't a room message
  if (!stanza.is('message') || !stanza.attrs.type == 'groupchat') {
    return;
  }

  // ignore messages we sent
  if (stanza.attrs.from == room_jid+'/'+room_nick) {
    return;
  }

  var body = stanza.getChild('body');
  // message without body is probably a topic change
  if (!body) {
    return;
  }
  var message = body.getText();
  var msg = new Date() + ' ' + stanza.attrs.from + ': ' + message;

  ep.getText({padID: pad_id}, function(err, data) {
    if (err) util.log(err.message);
    else ep.setText(
      { padID: pad_id,
	text: data.text + msg}, function(err2, data2) {
          if (err2) util.log(err.message);
      });
  });
});
