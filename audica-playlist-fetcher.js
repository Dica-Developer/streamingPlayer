"use strict";
var http = require('http');

var playlistUrl;
var playlistRegexp;

function fetchPlaylist() {
  if (playlistUrl) {
    var playlistContent = '';
    http.get(playlistUrl, function (res) {
      res.on('data', function (data) {
        playlistContent = playlistContent + data.toString();
      });
      res.on('end', function () {
        var result = new RegExp(playlistRegexp).exec(playlistContent);
        process.send(result);
      });
    }).on('error', function (e) {
      console.error("Got error: " + e.message);
    });
  } else {
    process.send(null);
  }
}

setInterval(fetchPlaylist, 30000);

process.on('message', function (msg) {
  if ('streamChange' === msg.msg) {
    if (msg.obj) {
      playlistUrl = msg.obj.playlistUrl;
      playlistRegexp = msg.obj.playlistRegexp;
    } else {
      playlistUrl = null;
      playlistRegexp = null;
    }
  }
});
