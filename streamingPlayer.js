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

var streamingUrls = new Array();
var currentPosition = 0;
var player = null;

function assertEncoding(encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

function appendFileSync(path, data, encoding) {
  assertEncoding(encoding);

  var fd = fs.openSync(path, 'a');
  if (!Buffer.isBuffer(data)) {
    data = new Buffer('' + data, encoding || 'utf8');
  }
  var written = 0;
  var position = null;
  var length = data.length;

  try {
    while (written < length) {
      written += fs.writeSync(fd, data, written, length - written, position);
      position += written; // XXX not safe with multiple concurrent writers?
    }
  } finally {
    fs.closeSync(fd);
  }
};

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
  }
}

function appendStreamUrl(streamUrl) {
  if (!fsFileExists.existsSync(process.env.HOME + '/.config')) {
    fs.mkdirSync(process.env.HOME + '/.config');
  }
  if (!fsFileExists.existsSync(process.env.HOME + '/.config/streamingPlayer')) {
    fs.mkdirSync(process.env.HOME + '/.config/streamingPlayer');
  }
  appendFileSync(process.env.HOME + '/.config/streamingPlayer/streaming_urls.txt', streamUrl + '\n');
}

function loadConfig() {
  if (fsFileExists.existsSync(process.env.HOME +'/.config/streamingPlayer/streaming_urls.txt')) {
    fs.readFile(process.env.HOME +'/.config/streamingPlayer/streaming_urls.txt', function (err, streamUrls) {
      if (err) {
        console.error(err);
      } else {
        var decoder = new StringDecoder('utf8');
        streamUrlsArray = decoder.write(streamUrls).split('\n');
        streamUrlsArray.splice((streamUrlsArray.length - 1), 1);
        streamingUrls = streamUrlsArray;
      }
    });
  }
}

http.createServer(function (request, response) {
  if ('GET' === request.method) {
    var requestUrl = url.parse(request.url, true);
    if ('/add' === requestUrl.pathname) {
      var streamUrl = requestUrl.query.url;
      if (streamUrl) {
        appendStreamUrl(streamUrl);
        streamingUrls[streamingUrls.length] = streamUrl;
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end(streamUrl +' added');
      } else {
        response.writeHead(400, {'Content-Type': 'text/plain'});
        response.end('What should I add? You need to provide a valid url parameter to add something.');
      }
    } else if ('/next' === requestUrl.pathname) {
      currentPosition++;
      if (currentPosition >= streamingUrls.length) {
        currentPosition = 0;
      }
      stop();
      play(streamingUrls[currentPosition]);
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: '+ (streamingUrls[currentPosition] || "Nothing"));
    } else if ('/prev' === requestUrl.pathname) {
      currentPosition--;
      if (currentPosition < 0) {
        currentPosition = (streamingUrls.length - 1);
      }
      stop();
      play(streamingUrls[currentPosition]);
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: '+ (streamingUrls[currentPosition] || "Nothing"));
    } else if ('/play' === requestUrl.pathname) {
      stop();
      play(streamingUrls[currentPosition]);
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Playing: '+ (streamingUrls[currentPosition] || "Nothing"));
    } else if ('/stop' === requestUrl.pathname) {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('Stopping');
      stop();
    } else {
      response.writeHead(400, {'Content-Type': 'text/plain'});
      response.end('I did not understand the request. Try one of the following commands "/add?url=", "/next", "/prev", "/play" or "/stop".');
    }
  }
}).listen(3141);

loadConfig();
console.log('Server running started.');