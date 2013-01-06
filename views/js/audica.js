"use strict";
/*global $, document*/
function refreshPlaylist() {
  $.get('/currentSong', function (data) {
    $('#playlist').html(data);
    setTimeout(refreshPlaylist, 30000);
  });
}

$(function () {
  $(document).bind('pageinit', function () {
    $('#searchStationDialog').bind('pagebeforeshow', function () {
      $.get('/stations', function (data) {
        var stationList = $('#stationList');
        var i;
        for (i = 0; i < data.length; i++) {
          $('<li><a href="editStation.html?data=' + encodeURIComponent(JSON.stringify(data[i])) + '" data-rel="dialog">' + data[i].name + ' | ' + data[i].url + '</a></li>').appendTo(stationList);
        }
        stationList.listview('refresh');
      });
    });
    $('#editStationDialog').bind('pagebeforeshow', function () {
      var dataStr = decodeURIComponent($('#editStationDialog').data('url').replace('/editStation.html?data=', ''));
      var data = JSON.parse(dataStr);
      $('#stationUrl').val(data.url);
      $('#stationName').val(data.name);
      $('#playlistUrl').val(data.playlistUrl);
      $('#playlistRegexp').val(data.playlistRegexp);
      $('#oldData').val(dataStr);
    });
    $('#stationUrl').bind('change', function () {
      var url = $(this).val().trim();
      if (url.length > 0) {
        $('#addStationButton').removeClass('ui-disabled');
      } else {
        $('#addStationButton').addClass('ui-disabled');
        $('#stationUrl').focus();
      }
    });
    $('#addStationButton').bind('vclick', function () {
      var url = $('#stationUrl').val().trim();
      var name = $('#stationName').val().trim();
      var playlistRegexp = $('#playlistRegexp').val().trim();
      var playlistUrl = $('#playlistUrl').val().trim();
      if (url && url.length > 0) {
        var params = '?url=' + url;
        if (name && name.length > 0) {
          params = params + '&name=' + name;
        }
        if (playlistUrl && playlistUrl.length > 0) {
          params = params + '&playlistUrl=' + playlistUrl;
        }
        if (playlistRegexp && playlistRegexp.length > 0) {
          params = params + '&playlistRegexp=' + playlistRegexp;
        }
        $.post('/update' + params, function () {
          $('#addStationDialog').dialog('close');
        });
      }
    });
    $('#updateStationButton').bind('vclick', function () {
      var url = $('#stationUrl').val().trim();
      var name = $('#stationName').val().trim();
      var playlistRegexp = $('#playlistRegexp').val().trim();
      var playlistUrl = $('#playlistUrl').val().trim();
      if (url && url.length > 0) {
        var oldData = $('#oldData').val().trim();
        var params = '?old=' + oldData + '&url=' + url;
        if (name && name.length > 0) {
          params = params + '&name=' + name;
        }
        if (playlistUrl && playlistUrl.length > 0) {
          params = params + '&playlistUrl=' + playlistUrl;
        }
        if (playlistRegexp && playlistRegexp.length > 0) {
          params = params + '&playlistRegexp=' + playlistRegexp;
        }
        $.post('/update' + params, function () {
          $('#editStationDialog').dialog('close');
        });
      }
    });
    $('#deleteStationButton').bind('vclick', function () {
      var oldData = $('#oldData').val().trim();
      if (oldData && oldData.length > 0) {
        var params = '?old=' + oldData;
        $.post('/delete' + params, function () {
          $('#editStationDialog').dialog('close');
        });
      }
    });
  });
  $('#prev').bind('click', function () {
    $.get('/prev', function (response) {
      $("#message").text(response);
    });
  });
  $('#next').bind('click', function () {
    $.get('/next', function (response) {
      $("#message").text(response);
    });
  });
  $('#play').bind('click', function () {
    $.get('/play', function (response) {
      $("#message").text(response);
    });
  });
  $('#stop').bind('click', function () {
    $.get('/stop', function (response) {
      $("#message").text('');
    });
  });
  $('#record').bind('click', function () {
    $.get('/record', function (response) {
      $("#message").text(response);
    });
  });
  $('#recordStop').bind('click', function () {
    $.get('/recordStop', function (response) {
      $("#message").text(response);
    });
  });
  refreshPlaylist();
});
