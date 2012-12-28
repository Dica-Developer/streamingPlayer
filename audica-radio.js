"use strict";
/*jslint stupid: true */
var http = require('http');
var url = require('url');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var fsFileExists = null;
if (process.version.indexOf('v0.8') !== -1) {
  fsFileExists = fs;
} else {
  fsFileExists = path;
}
var SerialPort = null;
try {
  SerialPort = require('serialport').SerialPort;
} catch (e) {
  console.log(e);
}
var os = require('os');

var PLAYER_CMD = '/usr/bin/cvlc';
var RECORDER_CMD = '/usr/bin/streamripper';

var streamingUrls = [];
var currentPosition = 0;
var player = null;
var recorder = null;
var serialPort = null;
var keyTime = -1;

function play(streamUrl) {
  player = spawn(PLAYER_CMD, [streamUrl]);
  player.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
  player.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });
}

function record(streamUrl) {
  recorder = spawn(RECORDER_CMD, [streamUrl, '-l', '10800', '-d', os.tmpDir()]);
  recorder.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
  recorder.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });
}

function stop(process) {
  if (process) {
    process.kill('SIGTERM');
  }
}

function writeStreamingUrls() {
  if (!fsFileExists.existsSync(process.env.HOME + '/.config')) {
    fs.mkdirSync(process.env.HOME + '/.config');
  }
  if (!fsFileExists.existsSync(process.env.HOME + '/.config/audica-radio')) {
    fs.mkdirSync(process.env.HOME + '/.config/audica-radio');
  }
  fs.writeFileSync(process.env.HOME + '/.config/audica-radio/streaming_urls.txt', JSON.stringify(streamingUrls));
}

function loadConfig() {
  if (fsFileExists.existsSync(process.env.HOME + '/.config/audica-radio/streaming_urls.txt')) {
    fs.readFile(process.env.HOME + '/.config/audica-radio/streaming_urls.txt', function (err, streamUrls) {
      if (err) {
        console.error(err);
      } else {
        try {
          streamingUrls = JSON.parse(streamUrls);
        } catch (e) {
          console.error('Cannot read config file format "' + streamUrls + '". Start with empty config.', e);
        }
      }
    });
  }
}

function next() {
  currentPosition++;
  if (currentPosition >= streamingUrls.length) {
    currentPosition = 0;
  }
  stop(player);
  player = null;
  if (streamingUrls[currentPosition]) {
    play(streamingUrls[currentPosition].url);
  }
}

function prev() {
  currentPosition--;
  if (currentPosition < 0) {
    currentPosition = (streamingUrls.length - 1);
  }
  stop(player);
  player = null;
  if (streamingUrls[currentPosition]) {
    play(streamingUrls[currentPosition].url);
  }
}

function display(text) {
  if (serialPort) {
    serialPort.write(String.fromCharCode(12));
    serialPort.write(text);
  }
}

function defaultScreen() {
  if (serialPort) {
    serialPort.write(String.fromCharCode(12));
    serialPort.write('|<<  Audica  >>|>||  Radio     o');
  }
}

function displaySong() {
  if (serialPort) {
    serialPort.write(String.fromCharCode(12));
    serialPort.write((streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
  }
}

String.prototype.strip = function () {
  return this.replace(/(^\s+|\s+$)/g, '');
};

String.prototype.repeat = function (count) {
  var result = '', i;
  for (i = 0; i < count; i++) {
    result = result + this;
  }
  return result;
};

String.prototype.rjust = function (width) {
  var result = this;
  if (this.length < width) {
    result = ' '.repeat(width - this.length) + this;
  }
  return result;
};

function displayIp() {
  serialPort.write(String.fromCharCode(12));
  exec('ip addr show wlan0', function (error, stdout, stderr) {
    try {
      serialPort.write('w' + stdout.split('\n')[2].strip().split(' ')[1].split('/')[0].rjust(15));
    } catch (e) {
      serialPort.write('w' + 'unknown'.rjust(15));
    }
    exec('ip addr show eth0', function (error, stdout, stderr) {
      try {
        serialPort.write('e' + stdout.split('\n')[2].strip().split(' ')[1].split('/')[0].rjust(15));
      } catch (e) {
        serialPort.write('e' + 'unknown'.rjust(15));
      }
    });
  });
}

if (SerialPort) {
  serialPort = new SerialPort("/dev/ttyAMA0", {
    baudrate: 9600
  });
}

if (serialPort) {
  serialPort.on("open", function () {
    serialPort.write(String.fromCharCode(12));
    serialPort.write('writingshortafteropenwillfail');
    defaultScreen();
  });

  serialPort.on("data", function (data) {
    var key = data.toString();
    if ("A" === key) {
      prev();
      displaySong();
    } else if ("C" === key) {
      next();
      displaySong();
    } else if ("B" === key) {
      keyTime = new Date().getTime();
    } else if ("D" === key) {
      if (recorder) {
        stop(recorder);
        recorder = null;
        display('stop recording');
      } else {
        record(streamingUrls[currentPosition].url);
        display('start recording');
      }
      setTimeout(function () {
        if (player) {
          displaySong();
        } else {
          defaultScreen();
        }
      }, 1000);
    } else if ("b" === key) {
      var diff = new Date().getTime() - keyTime;
      if (diff < 2001) {
        if (player) {
          stop(player);
          player = null;
          defaultScreen();
        } else {
          if (streamingUrls[currentPosition]) {
            play(streamingUrls[currentPosition].url);
          }
          displaySong();
        }
      } else {
        displayIp();
      }
    }
  });
}

http.createServer(function (request, response) {
  var requestUrl = url.parse(request.url, true);
  if ('POST' === request.method) {
    if ('/add' === requestUrl.pathname) {
      var streamUrl = requestUrl.query.url;
      if (streamUrl) {
        var streamName = requestUrl.query.name;
        if (!streamName) {
          streamName = streamUrl;
        }
        streamingUrls.push({"url": streamUrl, "name": streamName});
        writeStreamingUrls();
        displaySong();
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end(streamUrl + ' added');
      } else {
        response.writeHead(400, {'Content-Type': 'text/plain'});
        response.end('What should I add? You need to provide a valid url parameter to add something.');
      }
    }
  } else if ('GET' === request.method) {
    if ('/next' === requestUrl.pathname) {
      next();
      displaySong();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
    } else if ('/prev' === requestUrl.pathname) {
      prev();
      displaySong();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
    } else if ('/play' === requestUrl.pathname) {
      stop(player);
      player = null;
      if (streamingUrls[currentPosition]) {
        play(streamingUrls[currentPosition].url);
      }
      displaySong();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
    } else if ('/stop' === requestUrl.pathname) {
      defaultScreen();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Stopping');
      stop(player);
      player = null;
    } else if ('/record' === requestUrl.pathname) {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      if (!recorder) {
        response.end('Recording: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
        record(streamingUrls[currentPosition].url);
      } else {
        response.end('Already recording. Stop recording before starting a new recording.');
      }
    } else if ('/recordStop' === requestUrl.pathname) {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Stop recording');
      stop(recorder);
      recorder = null;
    } else {
      var viewsDir = 'views';
      if (fsFileExists.existsSync('/usr/local/lib/node_modules/audica-radio/views')) {
        viewsDir = '/usr/local/lib/node_modules/audica-radio/views';
      }
      var file = viewsDir + (requestUrl.pathname.length > 1 ? requestUrl.pathname : '/index.html');
      fs.readFile(file, function (error, data) {
        if (error) {
          console.error(error);
          response.writeHead(404, {'Content-Type': 'text/plain'});
          response.end('I did not understand the request. Try one of the following commands "/add?url=[&name=]", "/next", "/prev", "/play", "/stop", "/record" or "/recordStop".');
        } else {
          var type = 'text/plain';
          if (file.indexOf('.html') > -1) {
            type = 'text/html';
          } else if (file.indexOf('.js') > -1) {
            type = 'text/javascript';
          } else if (file.indexOf('.ico') > -1) {
            type = 'image/vnd.microsoft.icon';
          } else if (file.indexOf('.svg') > -1) {
            type = 'image/svg+xml';
          } else if (file.indexOf('.css') > -1) {
            type = 'text/css';
          }
          response.writeHead(200, {'Content-Type': type});
          response.end(data);
        }
      });
    }
  }
}).listen(process.env.PORT || 3141);

loadConfig();
console.log('Audica radio started.');
