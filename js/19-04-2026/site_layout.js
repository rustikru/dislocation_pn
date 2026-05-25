$(document).ready(function() {
    var l_height = $('.wrapper').height() - $('header').height() - $('.options').height()-10;
    $('aside,section').height(l_height);
});