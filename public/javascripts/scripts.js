/*jslint  browser: true, white: true, plusplus: true */
/*global $, countries */

$(function () {
    'use strict';
    var subscribedEvents = [];

    var socket = io.connect('http://ec2-54-172-9-212.compute-1.amazonaws.com/');
    socket.on('welcome', function (data) {
      $('#newsItems').append('<li style="color:#000000;"><i>#Welcome: </i>'+data.message+'</li>');
    });
    socket.on('NewInfo', function (data) {
      $('#newsItems').append('<li style="color:#000000;"><i>#New: </i>'+data.message+'</li>');
    });

    function addESocketListener(eventName){
        socket.on(eventName, function (data) {
          $('#newsItems').append('<li style="color:#000000;"><i>#'+data.event+': </i>'+data.message+'</li>');
        });
    };

    // Initialize ajax autocomplete:
    $('#autocomplete-ajax').autocomplete({
         serviceUrl: '/suggestions',
         dataType: 'json',
        onSelect: function(suggestion) {
            $('#selction-ajax').html('You selected: ' + suggestion.value + ', ' + suggestion.data);
            if(subscribedEvents.indexOf(suggestion.data)< 0){
                subscribedEvents.push(suggestion.data);
                $('#suscribeList').append('<li>#'+suggestion.value+'</li>');
                addESocketListener(suggestion.data);
            } else {
                alert("You are already subscribed to: " + suggestion.value);
            }            
        },
        onHint: function (hint) {
           $('#autocomplete-ajax-x').val(hint);
        },
        onInvalidateSelection: function() {
           $('#selction-ajax').html('You selected: none');
        }
    });
});