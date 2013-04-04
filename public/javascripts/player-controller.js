var socket = io.connect();
var touchEnabled = "ontouchend" in document;

$(document).ready(function(){
    var viewportWidth = $(window).width();
    var viewportHeight = $(window).height();
    var fresh = true;
    var player = {
        x: 0,
        y: 0,
        z: 20,
        maxSpeedX: 50,
        maxSpeedY: 70,
        maxFriction: 80,
        speedX: 0,
        speedY: 0,
        joined: false,
        score: 0
    };
    var playerId = Math.floor((Math.random() * 100000) + 100000);
    var gameCode = parseInt(sessionStorage.getItem('game-code'), 10);
    if (isNaN(gameCode) || gameCode < 100000 || gameCode > 999999) {
        sessionStorage.setItem('game-code', '');
        document.location = '/';
    }
    
    socket.on('game-joined', function(data){
        player.joined = true;
        playerUpdate();
        $('#score').html('Waiting for other players');
    });

    socket.on('game-full', function(data){
        $('#score').html('Unable to join');
    });
    
    socket.on('game-start', function(data){
        console.log('game-start');
        $('#score').html(0);
    });
    
    socket.on('game-end', function(data){
        console.log('game-end');
        
        $('#score').html(player.score);

        setTimeout(function(){
            player.joined = false;
            window.location.reload();
        }, 10000);
    });
    
    socket.on('update-score', function(data){
        console.log('update-score');

        // TODO: audio effect
        //$(window).trigger('destroy');
        
        player.score += data.points;
        $('#score').html(player.score);
    });
    
    var playerWaitingtoJoin = function() {
        $('#score').html('Click to join game');
        $('body').on('click touchstart', function(){
            var wait = function(){
                if (player.joined) { return false; }
                console.log('emit new-player');
                socket.emit('new-player', {playerId: playerId, gameRoom: gameCode});
                setTimeout(wait, 1500);
            };
            wait();
        });
    }
    
    var playerUpdate = function() {
        if (!player.joined) {
            playerWaitingtoJoin();
            return false;
        }
        if (fresh) {

            // X/Y en Z besturing
            //player.z += 20;
            player.speedX = (((player.maxSpeedX / 100) * player.x) / 100) * player.z;
            player.speedY = (((player.maxSpeedY / 100) * player.y) / 100) * player.z;
            
            // X is gelijk aan Z besturing
            //player.x = player.z;
            //player.speedX = ((player.maxSpeedX / 100) * player.x) - (player.maxSpeedX / 2);
            //player.speedY = ((player.maxSpeedY / 100) * player.y);
            
            //console.log({x: player.speedX, y: player.speedY, z: player.z});
            
        } else {
            var maxFriction = (player.maxFriction / 100) * player.z;
            player.speedX -= maxFriction / player.z;
        }
        
        socket.emit('player-update', {x: player.speedX, y: player.speedY, z: player.z});
        
        setTimeout(playerUpdate, 25);
    };

    $('#leftControls').on('touchmove mousemove', function(event) {
        event.preventDefault();
        
		var controls = $(this);
		var radius = controls.width()/2;
        
        if (touchEnabled) {
            player.x = Math.floor(((event.originalEvent.targetTouches[0].clientX - $(this).offset().left) / $(this).width()) * 200) - 100;
            player.y = Math.floor(((event.originalEvent.targetTouches[0].clientY - $(this).offset().top) / $(this).height()) * 200) - 100;
            
            var Jx = (event.originalEvent.targetTouches[0].clientX - $(this).offset().left);
            var Jy = (event.originalEvent.targetTouches[0].clientY - $(this).offset().top);
        } else {
            player.x = Math.floor((event.offsetX / $(this).width()) * 200) - 100;
            player.y = Math.floor((event.offsetY / $(this).height()) * 200) - 100;
            
            var Jx = event.pageX - controls.offset().left;
            var Jy = event.pageY - controls.offset().top;
        }
        
		var degrees = toDegrees(Jx, Jy, radius);
		$('#joystick').width(degrees.length).css('-webkit-transform', 'rotate('+degrees.deg+'deg)');
        
        fresh = true;
    });
    $('#leftControls').on('touchend mouseup', function(event) {
		var controls = $(this);
		
		$('#joystick').animate({'width': 5}, 400);
        fresh = false;
    });
    $('#rightControls').on('touchmove mousedown', function(event) {
        event.preventDefault();

        var controls = $(this);
        
        if (touchEnabled) {
            player.z = 100 - Math.floor(((event.originalEvent.targetTouches[0].clientY - $(this).offset().top) / $(this).height()) * 100);
            var Jy = (event.originalEvent.targetTouches[0].clientY - $(this).offset().top);
        } else {
            player.z = 100 - Math.floor((event.offsetY / $(this).height()) * 100);
            var Jy = event.pageY - controls.offset().top;
        }
        player.z += 20;
    
		if(Jy < 22) { Jy = 22 }
		if(Jy > 128) { Jy = 128 }
		$('#slider').css('top', Jy+'px');
        fresh = true;
    });

    playerWaitingtoJoin();
});



function toDegrees(x, y, radius){
	
	var degrees = 0;
	var overstaand = y - radius;
	var aanliggend = x -radius;
	var schuin = Math.sqrt(Math.pow(overstaand,2) + Math.pow(aanliggend,2));
	var sinJ = overstaand/schuin;
	var cosJ = aanliggend/schuin;

	degrees = Math.asin(sinJ)*180/Math.PI;
	if(aanliggend < 0) {
		degrees = 180 - degrees;
	}

	if(schuin > radius) {
		schuin = radius;
		overstaand = cosJ * radius;
		aanliggend = sinJ * radius;
	}

	return {'deg': degrees, 'length': schuin};
}
