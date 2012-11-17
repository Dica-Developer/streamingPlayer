var http = require('http');
var url = require('url');
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var fsFileExists = null;
if (process.version.indexOf('v0.8') != -1) {
  fsFileExists = fs;
} else {
  fsFileExists = path;
}
var StringDecoder = require('string_decoder').StringDecoder;
var SerialPort = require("serialport").SerialPort

var streamingUrls = {};
var currentPosition = 0;
var player = null;

function play(streamUrl) {
  player = spawn('/usr/bin/cvlc', [streamUrl]);
  player.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
  player.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });
}

function stop() {
  if (player) {
    player.kill('SIGTERM');
    player = null;
  }
}

function writeStreamingUrls() {
  if (!fsFileExists.existsSync(process.env.HOME + '/.config')) {
    fs.mkdirSync(process.env.HOME + '/.config');
  }
  if (!fsFileExists.existsSync(process.env.HOME + '/.config/streamingPlayer')) {
    fs.mkdirSync(process.env.HOME + '/.config/streamingPlayer');
  }
  fs.writeFileSync(process.env.HOME + '/.config/streamingPlayer/streaming_urls.txt', JSON.stringify(streamingUrls));
}

function loadConfig() {
  if (fsFileExists.existsSync(process.env.HOME +'/.config/streamingPlayer/streaming_urls.txt')) {
    fs.readFile(process.env.HOME +'/.config/streamingPlayer/streaming_urls.txt', function (err, streamUrls) {
      if (err) {
        console.error(err);
      } else {
        try {
          streamingUrls = JSON.parse(streamUrls);
        } catch (e) {
          streamingUrls = {};
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
  stop();
  play(streamingUrls[currentPosition]);
}

function prev() {
  currentPosition--;
  if (currentPosition < 0) {
    currentPosition = (streamingUrls.length - 1);
  }
  stop();
  play(streamingUrls[currentPosition]);
}

var serialPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 9600
});

function defaultScreen() {
  serialPort.write(String.fromCharCode(12));
  serialPort.write('|<<  Audica  >>|');
  serialPort.write('>||  Radio');
}

function displaySong() {
  serialPort.write(String.fromCharCode(12));
  serialPort.write((streamingUrls[currentPosition] || "Nothing"));
}

serialPort.on("open", function() {
  defaultScreen();
});

serialPort.on("data", function (data) {
  if ("A" == data) {
    prev();
    displaySong(); 
  } else if ("C" == data) {
    next();
    displaySong();
  } else if ("B" == data) {
    if (player) {
      stop();
      defaultScreen();
    } else {
      play(streamingUrls[currentPosition]);
      displaySong();
    }
  }
});

http.createServer(function (request, response) {
  if ('GET' === request.method) {
    var requestUrl = url.parse(request.url, true);
    if ('/add' === requestUrl.pathname) {
      var streamUrl = requestUrl.query.url;
      if (streamUrl) {
        var streamName = requestUrl.query.name;
        if (!streamName) {
          streamName = streamUrl;
        }
        streamingUrls.streamName = streamUrl;
        writeStreamingUrls();
        displaySong();
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end(streamUrl +' added');
      } else {
        response.writeHead(400, {'Content-Type': 'text/plain'});
        response.end('What should I add? You need to provide a valid url parameter to add something.');
      }
    } else if ('/next' === requestUrl.pathname) {
      next();
      displaySong();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: '+ (streamingUrls[currentPosition] || "Nothing"));
    } else if ('/prev' === requestUrl.pathname) {
      prev();
      displaySong();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: '+ (streamingUrls[currentPosition] || "Nothing"));
    } else if ('/play' === requestUrl.pathname) {
      stop();
      play(streamingUrls[currentPosition]);
      displaySong();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: '+ (streamingUrls[currentPosition] || "Nothing"));
    } else if ('/stop' === requestUrl.pathname) {
      defaultScreen();
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Stopping');
      stop();
    } else {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('I did not understand the request. Try one of the following commands "/add?url=[&name=]", "/next", "/prev", "/play" or "/stop".');
    }
  }
}).listen(3141);

loadConfig();
console.log('Audica radio server started.');
