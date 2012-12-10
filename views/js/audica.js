$(function() {
  $(document).on('pageinit', function() {
    $('#stationUrl').bind('change', function() {
      var url = $(this).val().trim();
      if (url.length > 0) {
        $('#addStationButton').removeClass('ui-disabled');
      } else {
        $('#addStationButton').addClass('ui-disabled');
        $('#stationUrl').focus();
      }
    });
    $('#addStationButton').bind('vclick', function() {
      var url = $('#stationUrl').val().trim();
      var name = $('#stationName').val().trim();
      if (url && url.length > 0) {
        var params = '?url='+ url;
        if (name && name.length > 0) {
          params = params + '&name='+ name;
        }
        $.post('/add'+ params, function() {
          $('#addStationDialog').dialog('close');
        });
      }
    });
  });
  $('#prev').bind('click', function() {
    $.get('/prev', function(response) {
      $("#message").text(response);
    });
  });
  $('#next').bind('click', function() {
    $.get('/next', function(response) {
      $("#message").text(response);
    });
  });
  $('#play').bind('click', function() {
    $.get('/play', function(response) {
      $("#message").text(response);
    });
  });
  $('#stop').bind('click', function() {
    $.get('/stop', function(response) {
      $("#message").text('');
    });
  });
  $('#record').bind('click', function() {
    $.get('/record', function(response) {
      $("#message").text(response);
    });
  });
  $('#recordStop').bind('click', function() {
    $.get('/recordStop', function(response) {
      $("#message").text(response);
    });
  });
});
