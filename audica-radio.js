"use strict";

/*jslint stupid: true */
/*global require, process, console, Buffer*/

var http = require('http');
var url = require('url');
var childProcess = require('child_process');
var spawn = childProcess.spawn;
var exec = childProcess.exec;
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
var EventEmitter = require("events").EventEmitter;
var eventEmitter = new EventEmitter();
var streamingUrlFile = process.env.HOME + '/.config/audica-radio/streaming_urls.txt';
var rootDir = '.';
var viewsDir = 'views';

fsFileExists.exists(viewsDir, function (exists) {
  if (!exists) {
    viewsDir = '/usr/local/lib/node_modules/audica-radio/views';
    rootDir = '/usr/local/lib/node_modules/audica-radio';
    fsFileExists.exists(viewsDir, function (exists) {
      if (!exists) {
        viewsDir = '/usr/lib/node_modules/audica-radio/views';
        rootDir = '/usr/lib/node_modules/audica-radio';
        fsFileExists.exists(viewsDir, function (exists) {
          if (!exists) {
            viewsDir = 'views';
            rootDir = '.';
          }
          eventEmitter.emit('rootDirInit');
        });
      } else {
        eventEmitter.emit('rootDirInit');
      }
    });
  } else {
    eventEmitter.emit('rootDirInit');
  }
});

var PLAYER_CMD = '/usr/bin/cvlc';
var RECORDER_CMD = '/usr/bin/streamripper';

var server = null;
var streamingUrls = [];
var currentPosition = 0;
var player = null;
var recorder = null;
var serialPort = null;
var keyTime = -1;
var currentSongInformation = '';
var playlistProcess;
var scrollOneLineDown = new Buffer(3, 'ascii');
scrollOneLineDown[0] = 0xFE;
scrollOneLineDown[1] = 0x4F;
scrollOneLineDown[2] = 0x00;
var positionCursorOneOne = new Buffer(4, 'ascii');
positionCursorOneOne[0] = 0xFE;
positionCursorOneOne[1] = 0x50;
positionCursorOneOne[2] = 0x01;
positionCursorOneOne[3] = 0x01;
var goToLineOne = new Buffer(3, 'ascii');
goToLineOne[0] = 0xFE;
goToLineOne[1] = 0x47;
goToLineOne[2] = 0x01;
var currentLcdLine = 1;

function play(streamUrl) {
  player = spawn(PLAYER_CMD, [streamUrl]);
  player.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
  player.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });
  playlistProcess.send({
    msg: 'streamChange',
    obj: streamingUrls[currentPosition]
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
  playlistProcess.send({
    msg: 'streamChange'
  });
}

function writeStreamingUrls() {
  if (!fsFileExists.existsSync(process.env.HOME + '/.config')) {
    fs.mkdirSync(process.env.HOME + '/.config');
  }
  if (!fsFileExists.existsSync(process.env.HOME + '/.config/audica-radio')) {
    fs.mkdirSync(process.env.HOME + '/.config/audica-radio');
  }
  fs.writeFileSync(streamingUrlFile, JSON.stringify(streamingUrls));
}

function loadConfig() {
  if (fsFileExists.existsSync(streamingUrlFile)) {
    fs.readFile(streamingUrlFile, function (err, streamUrls) {
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
    serialPort.write(positionCursorOneOne);
    serialPort.write(goToLineOne);
    serialPort.write(text);
  }
}

function defaultScreen() {
  if (serialPort) {
    serialPort.write(String.fromCharCode(12));
    serialPort.write('|<<  Audica  >>|>||  Radio     o');
  }
}

function getStreamName() {
  return streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing");
}

function displayStreamName() {
  var streamName = getStreamName();
  display(streamName);
}

setInterval(function () {
  var displayedText = getStreamName() + ' - ' + currentSongInformation;
  var maxLcdLines = Math.ceil(displayedText.length / 16);
  if (serialPort && (player || recorder) && displayedText.length > 2) {
    if (maxLcdLines > currentLcdLine) {
      serialPort.write(scrollOneLineDown);
      currentLcdLine++;
    } else {
      serialPort.write(positionCursorOneOne);
      serialPort.write(goToLineOne);
      currentLcdLine = 1;
    }
  }
}, 3000);

eventEmitter.once('rootDirInit', function () {
  playlistProcess = childProcess.fork(rootDir + '/audica-playlist-fetcher.js');
  playlistProcess.on('message', function (msg) {
    var i;
    currentSongInformation = '';
    if (msg) {
      for ((msg.length > 1 ? i = 1 : i = 0); i < msg.length; i++) {
        if (currentSongInformation !== '') {
          currentSongInformation = currentSongInformation + ' - ';
        }
        currentSongInformation = currentSongInformation + msg[i].trim();
      }
    }
    if (currentSongInformation.length > 0) {
      display(getStreamName() + ' - ' + currentSongInformation);
    }
  });
});

String.prototype.strip = function () {
  return this.replace(/(^\s+|\s+$)/g, '');
};

String.prototype.repeat = function (count) {
  var result = '',
    i;
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
      displayStreamName();
    } else if ("C" === key) {
      next();
      displayStreamName();
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
          displayStreamName();
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
          displayStreamName();
        }
      } else {
        displayIp();
      }
    }
  });
}

function deleteStream(oldData) {
  var i;
  for (i = 0; i < streamingUrls.length; i++) {
    if (streamingUrls[i].name === oldData.name && streamingUrls[i].url === oldData.url && streamingUrls[i].playlistUrl === oldData.playlistUrl && streamingUrls[i].playlistRegexp === oldData.playlistRegexp) {
      streamingUrls.splice(i, 1);
    }
  }
}

function findStream(oldData) {
  var i;
  for (i = 0; i < streamingUrls.length; i++) {
    if (streamingUrls[i].name === oldData.name && streamingUrls[i].url === oldData.url && streamingUrls[i].playlistUrl === oldData.playlistUrl && streamingUrls[i].playlistRegexp === oldData.playlistRegexp) {
      return streamingUrls[i];
    }
  }
}

function cleanup() {
  if (playlistProcess) {
    playlistProcess.kill();
  }
  if (recorder) {
    recorder.kill();
  }
  if (player) {
    player.kill();
  }
  console.log('Audica radio stopped.');
}

process.on('exit', function () {
  cleanup();
});
process.on('SIGINT', function () {
  process.exit(0);
});
process.on('SIGTERM', function () {
  process.exit(0);
});
process.on('SIGKILL', function () {
  process.exit(0);
});

server = http.createServer(function (request, response) {
  var requestUrl = url.parse(request.url, true);
  if ('POST' === request.method) {
    var streamUrl = requestUrl.query.url;
    var streamName = requestUrl.query.name;
    var oldData = requestUrl.query.old;
    if ('/delete' === requestUrl.pathname) {
      if (oldData) {
        var streamingO = JSON.parse(oldData);
        deleteStream(streamingO);
        writeStreamingUrls();
        response.writeHead(200, {
          'Content-Type': 'text/plain'
        });
        response.end(streamingO.url + ' deleted');
      } else {
        response.writeHead(400, {
          'Content-Type': 'text/plain'
        });
        response.end('What should I update? You need to provide a valid url and old parameter to update something.');
      }
    } else if ('/add' === requestUrl.pathname) {
      if (streamUrl) {
        if (!streamName) {
          streamName = streamUrl;
        }
        streamingUrls.push({
          "url": streamUrl,
          "name": streamName,
          "playlistUrl": requestUrl.query.playlistUrl,
          "playlistRegexp": requestUrl.query.playlistRegexp
        });
        writeStreamingUrls();
        response.writeHead(200, {
          'Content-Type': 'text/plain'
        });
        response.end(streamUrl + ' added');
      } else {
        response.writeHead(400, {
          'Content-Type': 'text/plain'
        });
        response.end('What should I add? You need to provide a valid url parameter to add something.');
      }
    } else if ('/update' === requestUrl.pathname) {
      if (streamUrl && oldData) {
        if (!streamName) {
          streamName = streamUrl;
        }
        var stream = findStream(JSON.parse(oldData));
        if (stream) {
          stream.url = streamUrl;
          stream.name = streamName;
          stream.playlistRegexp = requestUrl.query.playlistRegexp;
          stream.playlistUrl = requestUrl.query.playlistUrl;
          writeStreamingUrls();
          response.writeHead(200, {
            'Content-Type': 'text/plain'
          });
          response.end(streamUrl + ' updated');
        } else {
          response.writeHead(404, {
            'Content-Type': 'text/plain'
          });
          response.end('Could not find ' + streamUrl + ' to update.');
        }
      } else {
        response.writeHead(400, {
          'Content-Type': 'text/plain'
        });
        response.end('What should I update? You need to provide a valid url and old parameter to update something.');
      }
    }
  } else if ('GET' === request.method) {
    if ('/stations' === requestUrl.pathname) {
      response.writeHead(200, {
        'Content-Type': 'application/json'
      });
      response.end(JSON.stringify(streamingUrls));
    } else if ('/currentSong' === requestUrl.pathname) {
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      response.end(currentSongInformation);
    } else if ('/next' === requestUrl.pathname) {
      next();
      displayStreamName();
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      response.end('Playing: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
    } else if ('/prev' === requestUrl.pathname) {
      prev();
      displayStreamName();
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      response.end('Playing: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
    } else if ('/play' === requestUrl.pathname) {
      stop(player);
      player = null;
      if (streamingUrls[currentPosition]) {
        play(streamingUrls[currentPosition].url);
      }
      displayStreamName();
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      response.end('Playing: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
    } else if ('/stop' === requestUrl.pathname) {
      defaultScreen();
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      response.end('Stopping');
      stop(player);
      player = null;
    } else if ('/record' === requestUrl.pathname) {
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      if (!recorder) {
        response.end('Recording: ' + (streamingUrls[currentPosition] && (streamingUrls[currentPosition].name || streamingUrls[currentPosition].url || "Nothing")));
        record(streamingUrls[currentPosition].url);
      } else {
        response.end('Already recording. Stop recording before starting a new recording.');
      }
    } else if ('/recordStop' === requestUrl.pathname) {
      response.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      response.end('Stop recording');
      stop(recorder);
      recorder = null;
    } else {
      var file = viewsDir + (requestUrl.pathname.length > 1 ? requestUrl.pathname : '/index.html');
      fs.readFile(file, function (error, data) {
        if (error) {
          console.error(error);
          response.writeHead(404, {
            'Content-Type': 'text/plain'
          });
          response.end('I did not understand the request. Try one of the following commands "/add?url=[&name=][&playlistUrl=&playlistRegexp=]", "/next", "/prev", "/play", "/stop", "/record" or "/recordStop".');
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
          response.writeHead(200, {
            'Content-Type': type
          });
          response.end(data);
        }
      });
    }
  }
});
server.listen(process.env.PORT || 3141);

loadConfig();
console.log('Audica radio started.');