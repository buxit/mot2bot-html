var screenWidth;
var ongoingTouches = new Array();

var options = new Object;
var bot_status = {};
options.mousedown=false;

$.AjaxQueue = function() {
	this.reqs = [];
	this.requesting = false;
};
$.AjaxQueue.prototype = {
	add: function(req) {
		this.reqs.push(req);
		this.next();
	},
	next: function() {
		if (this.reqs.length == 0)
			return;

		if (this.requesting == true)
			return;

		var req = this.reqs.splice(0, 1)[0];
		var complete = req.complete;
		var self = this;
		if (req._run)
			if(!req._run(req, this)) {
				this.next();
				return;
			}
		req.complete = function() {
			if (complete)
				complete.apply(this, arguments);
			self.requesting = false;
			self.next();
		}

		this.requesting = true;
		$.ajax(req);
	}
}; 


function startup() {
  screenWidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;

  var el1 = document.getElementsByTagName("canvas")[0];
  var ctx1 = el1.getContext("2d");
  ctx1.fillStyle='rgba(0,0,0,1.0)';
  ctx1.fillRect(0, 0, el1.width, el1.height);
  screenWidth = $(el1).width();

$('#speak').on("keydown", function(e) {
	if(e.keyCode == 13) {
		sendCommand("cmd=speak&words="+encodeURIComponent($(e.target).val()));
	}
});

  var el = document.getElementsByTagName("canvas")[1];
  el.addEventListener("touchstart", handleStart, false);
  el.addEventListener("touchend", handleEnd, false);
  el.addEventListener("touchcancel", handleCancel, false);
  el.addEventListener("touchleave", handleEnd, false);
  el.addEventListener("touchmove", handleMove, false);

  $("canvas").last().on("mousedown", mouseDown);
  $("#layer2").attr("tabindex", "0");
  //el.addEventListener("mousedown", mouseDown, false);
  $("canvas").last().on("mousemove", mouseMove);
  el.addEventListener("mouseup", mouseUp, false);
  //el.addEventListener("mousemove", mouseMove, false);
  var ctx = el.getContext("2d");
  ctx.lineWidth=3;
  ctx.clearRect(0, 0, el.width, el.height);
  for(var i=0; i < 4; i++) {
    ctx.beginPath();
    var st=hslToRgb(0.6, 1.0, 0.5);
    var stst='rgba('+st[0]+','+st[1]+','+st[2]+','+(1.0-i/5.0)+')';
    ctx.strokeStyle=stst;
    log(stst);
    ctx.arc(300, 300, 297-(i*80), 0,2*Math.PI, false);  // a circle at the start
    ctx.stroke();
  }
  ctx.strokeStyle=stst;
  ctx.moveTo(0, 300);
  ctx.lineTo(600, 300);
  ctx.stroke();
  ctx.moveTo(300, 0);
  ctx.lineTo(300, 600);
  ctx.stroke();
  
  $('#mjpeg_dest').on("mousedown touchstart", camDown);
  //$('#mjpeg_dest').on("mousemove touchmove", camMove);
  //$('#mjpeg_dest').on("mouseup touchend", camUp);
  log("initialized.");
}

function normalizeEvent(e, obj) {
  //or $(this).offset(); if you really just want the current element's offset
  var parentOffset = $(obj).offset(); 

  if(e.type == 'mousedown') {
    e.relX = e.pageX - parentOffset.left;
    e.relY = e.pageY - parentOffset.top;
  } else {
    e.relX = e.originalEvent.touches[0].pageX - parentOffset.left;
    e.relY = e.originalEvent.touches[0].pageY - parentOffset.top;
  }
}

var cam=new Object;
cam.pan = 0;
cam.tilt = 0;

function camDown(e) {
  //options.mousedown=true;
  console.log(e);
  e.preventDefault();
  normalizeEvent(e, this);
  cam.pan = (e.relX/$(this).width()*2-1)*5;
  cam.tilt = (e.relY/$(this).height()*2-1)*-5;
  sendCommand("cmd=cam-turn&p="+cam.pan+"&t="+cam.tilt);
}

function toggleLED(){
	sendCommand("cmd=toggle-ledblink")
}
function centerCam() {
  cam.pan = 0;
  cam.tilt = 0;
  sendCommand("cmd=cam-center");
}

function toggleBeep(){
	sendCommand("cmd=toggle-beep")
}
function CamSnapshot() {
  sendCommand("cmd=cam-snapshot");
}

function faceLearn() {
  sendCommand("cmd=face-learn&name="+encodeURIComponent($('#speak').val()));
}

function showLR(l, r)
{
  var p = document.getElementById('show-l');
  p.innerHTML = Math.round(l*100);
  var p = document.getElementById('show-r');
  p.innerHTML = Math.round(r*100);
}

function log(msg) {
  //var p = document.getElementById('log');
  //p.innerHTML = msg + "\n" + p.innerHTML;
}

function mouseUp(evt) {
	evt.preventDefault();
	log("evt: "+evt.pageX + " y=" + evt.pageY);
	var el = document.getElementsByTagName("canvas")[0];
	var ctx = el.getContext("2d");
	if(options.mousedown){
		ctx.lineWidth = 6;
		ctx.strokeStyle = '#000';
		ctx.beginPath();
		ctx.moveTo(300, 300);
		ctx.lineTo(options.mouseX*2, options.mouseY*2);
		ctx.stroke();
		options.mousedown=false;
		sendCommand("cmd=stop");
	}
}

function driveFor(x, y) {
  log("driveFor: "+ x + " y=" + y);
  var w= Math.atan2(x, -y);
  var deg = w * 180/Math.PI;
  var len=Math.sqrt(x*x + y*y);
  //log("evt: x="+ x + " y=" + y + " w=" + (w/Math.PI) +" deg=" + deg + " l=" + l);
  var q = w/Math.PI;
  var l=0,r=0;
  log("w=" + (q) +" q=" + q + " deg=" + deg + " len=" + l + " evt: x="+ x + " y=" + y);
  if(q >= 0.0 && q < 0.5) {
    l=1;
    r=1-(q*4);
  } else if(q >= 0.5 && q <= 1.0) {
    l=-1;
    r=1-((q*4)-2);
  } else if(q >= -1.0 && q < -0.5) {
    r=-1;
    l=(q*4)+3;
  } else if(q >= -0.5 && q < 0.0) {
    r=1;
    l=(q*4)+1;
  }

  log("l=" + l + "  r=" + r);
  //log("evt: x="+ x + " y=" + y + " w=" + w + " deg=" + deg + " l=" + l + " x/y=" + (x/y) + " left=" + left + " right=" + right);
  /*
  if(deg > 90 || deg < -90)
	sendCommand("cmd=drive&l=-20&r=-20");
  else
 	sendCommand("cmd=drive&l=20&r=20");
  */

  l *= len;
  r *= len;
  showLR(l, r);
  sendCommand("cmd=drive&l="+l+"&r="+r);

}

function mousePos(obj, evt) {
  var parentOffset = $(obj).offset(); 
  //or $(this).offset(); if you really just want the current element's offset
  var relX = evt.pageX - parentOffset.left;
  var relY = evt.pageY - parentOffset.top;
  evt.preventDefault();
  var x=(relX/screenWidth*2)-1;
  var y=(relY/screenWidth*2)-1;
  console.log(x, y, relX, relY);
  driveFor(x, y);
  var el = document.getElementsByTagName("canvas")[0];
  var ctx = el.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(300, 300);
  ctx.lineTo(relX*2, relY*2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  options.mouseX = relX;
  options.mouseY = relY;
}

function mouseMove(evt) {
	evt.preventDefault();
	var el = document.getElementsByTagName("canvas")[0];
	var ctx = el.getContext("2d");
	if(options.mousedown){
		ctx.lineWidth = 6;
		ctx.strokeStyle = '#000';
		ctx.beginPath();
		ctx.moveTo(300, 300);
		ctx.lineTo(options.mouseX*2, options.mouseY*2);
		ctx.stroke();
		mousePos(this, evt);
	}
}

function mouseDown(evt) {
  mousePos(this, evt);
  options.mousedown = true;
}

function handleStart(evt) {
  evt.preventDefault();
  log("touchstart.");
  $(this).focus();
  var el = document.getElementsByTagName("canvas")[0];
  var ctx = el.getContext("2d");
  var touches = evt.changedTouches;
        
  for (var i=0; i < touches.length; i++) {
    log("touchstart:"+i+"...");
    ongoingTouches.push(copyTouch(touches[i]));
    ctx.beginPath();
    var parentOffset = $(this).parent().offset(); 
    var relX = touches[i].pageX - parentOffset.left;
    var relY = touches[i].pageY - parentOffset.top;
    ctx.arc(relX/screenWidth*600.0, relY/screenWidth*600.0, 60, 0,2*Math.PI, false);  // a circle at the start
    log("width="+el.width);
    ctx.fillStyle = '#a00';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.lineTo(relX/screenWidth*600.0, relY/screenWidth*600.0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    var x=relX/screenWidth*2-1;
    var y=relY/screenWidth*2-1;
    driveFor(x, y);
    log("touchstart: "+i+" done.");
  }
}

function handleMove(evt) {
  evt.preventDefault();
  var el = document.getElementsByTagName("canvas")[0];
  var ctx = el.getContext("2d");
  var touches = evt.changedTouches;
  var parentOffset = $(this).parent().offset(); 

  for (var i=0; i < touches.length; i++) {
    var color = colorForTouch(touches[i]);
    var idx = ongoingTouchIndexById(touches[i].identifier);

    if(idx >= 0) {
      //log("continuing touch "+idx);
      //ctx.beginPath();
      //log("ctx.moveTo("+ongoingTouches[idx].pageX/screenWidth*600.0+", "+ongoingTouches[idx].pageY/screenWidth*600.0+");");
      //ctx.moveTo(ongoingTouches[idx].pageX/screenWidth*600.0, ongoingTouches[idx].pageY/screenWidth*600.0);
      //log("ctx.lineTo("+touches[i].pageX/screenWidth*600.0+", "+touches[i].pageY/screenWidth*600.0+");");

    /*
    paint black to erase
   */
    var relX = ongoingTouches[i].pageX - parentOffset.left;
    var relY = ongoingTouches[i].pageY - parentOffset.top;
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(relX/screenWidth*600.0, relY/screenWidth*600.0, 62, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.lineTo(relX/screenWidth*600.0, relY/screenWidth*600.0);
    ctx.stroke();

    //ctx.globalCompositeOperation = "source-over";
    relX = touches[i].pageX - parentOffset.left;
    relY = touches[i].pageY - parentOffset.top;

    ctx.beginPath();
    ctx.arc(relX/screenWidth*600.0, relY/screenWidth*600.0, 60, 0,2*Math.PI, false);  // a circle at the start
    ctx.fillStyle = '#a00';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.lineTo(relX/screenWidth*600.0, relY/screenWidth*600.0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    var x=relX/screenWidth*2-1;
    var y=relY/screenWidth*2-1;
    driveFor(x, y);
      ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record
      //log(".");
    } else {
      log("can't figure out which touch to continue");
    }
  }
}

function handleEnd(evt) {
  evt.preventDefault();
  sendCommand("cmd=stop");
  log("touchend/touchleave.");
  var el = document.getElementsByTagName("canvas")[0];
  var ctx = el.getContext("2d");
  var touches = evt.changedTouches;

  for (var i=0; i < touches.length; i++) {
    var color = colorForTouch(touches[i]);
    var idx = ongoingTouchIndexById(touches[i].identifier);
    var parentOffset = $(this).parent().offset(); 

    if(idx >= 0) {
	    var relX = ongoingTouches[i].pageX - parentOffset.left;
	    var relY = ongoingTouches[i].pageY - parentOffset.top;
	    ctx.fillStyle = '#000';
	    ctx.strokeStyle = '#000';
	    ctx.lineWidth = 6;
	    ctx.beginPath();
	    ctx.arc(relX/screenWidth*600.0, relY/screenWidth*600.0, 62, 0, 2*Math.PI, false);
	    ctx.fill();
	    ctx.beginPath();
	    ctx.moveTo(300, 300);
	    ctx.lineTo(relX/screenWidth*600.0, relY/screenWidth*600.0);
	    ctx.stroke();

	    ongoingTouches.splice(idx, 1);  // remove it; we're done
    } else {
      log("can't figure out which touch to end");
    }
  }
}

function handleCancel(evt) {
  evt.preventDefault();
  log("touchcancel.");
  sendCommand("cmd=stop");
  var touches = evt.changedTouches;
  
  for (var i=0; i < touches.length; i++) {
    ongoingTouches.splice(i, 1);  // remove it; we're done
  }
}

function colorForTouch(touch) {
  var r = (touch.identifier % 16)+10;
  var g = (Math.floor(touch.identifier / 3) % 16)+10;
  var b = (Math.floor(touch.identifier / 7) % 16)+10;
  r = r.toString(16); // make it a hex digit
  g = g.toString(16); // make it a hex digit
  b = b.toString(16); // make it a hex digit
  var color = "#" + r + g + b;
  //log("color for touch with identifier " + touch.identifier + " = " + color);
  return color;
}

function onTouch(evt) {
  evt.preventDefault();
  if (evt.touches.length > 1 || (evt.type == "touchend" && evt.touches.length > 0))
    return;

  var newEvt = document.createEvent("MouseEvents");
  var type = null;
  var touch = null;
  switch (evt.type) {
    case "touchstart":    type = "mousedown";    touch = evt.changedTouches[0];break;
    case "touchmove":        type = "mousemove";    touch = evt.changedTouches[0];break;
    case "touchend":        type = "mouseup";    touch = evt.changedTouches[0];break;
  }
  newEvt.initMouseEvent(type, true, true, evt.originalTarget.ownerDocument.defaultView, 0,
    touch.screenX, touch.screenY, touch.pageX, touch.pageY,
    evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, 0, null);
  evt.originalTarget.dispatchEvent(newEvt);
}

function ongoingTouchIndexById(idToFind) {
  for (var i=0; i < ongoingTouches.length; i++) {
    var id = ongoingTouches[i].identifier;
    
    if (id == idToFind) {
      return i;
    }
  }
  return -1;    // not found
}

function copyTouch(touch) {
  return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
/*
    log(r + " " + g + " " + b);
    var decColor = Math.round(r * 255) + 256 * Math.round(g*255) + Math.round(b*255) * 65536;
    return decColor.toString(16);
*/
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function RGB2HTML(red, green, blue)
{
    var decColor = red + 256 * green + 65536 * blue;
    return decColor.toString(16);
}

var queue = new $.AjaxQueue();
function sendCommand(cmd)
{
	var url = "http://"+window.location.hostname+":8888/?" + cmd;

	if(cmd.match('drive') || cmd.match('stop')) {
		queue.add({
			url: url,
			complete: function() {
			},
			_run: function(req, q) {
				//special pre-processor to alter the request just before it is finally executed in the queue
				if(q.reqs.length > 1 && cmd.match('drive'))
					return false;
				return true;
			}
		}); 
	} else {
		$.ajax({ url: url });
	}
/*
	xmlHttp = new XMLHttpRequest(); 
	xmlHttp.onreadystatechange = ProcessRequest;
	xmlHttp.open( "GET", url, true );
	xmlHttp.send( null );
*/
}

function getStatus()
{
	var url = "http://"+window.location.hostname+":8888/?cmd=status";
	$.getJSON(url, function(data){
		bot_status = data;
		$('#bat-percent').html(bot_status.bat_perc+" %");
		$('#bat-voltage').html(bot_status.bat_volt+" V");
	}).always(function(){
		setTimeout(getStatus, 821);
	});
}

function ProcessRequest() 
{
    if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) 
    {
        if ( xmlHttp.responseText == "Not found" ) 
        {
        }
        else
        {
        }                    
    }
}

//window.addEventListener("load", function(){ toggleFullScreen() } );
//window.addEventListener("orientationchange", hideAddressBar ); 



function toggleFullScreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  }
  else {
    cancelFullScreen.call(doc);
  }
}

window.onload = function() {
	startup();
	init();
	getStatus();
	toggleFullScreen();
}

var mjpeg_img;
var halted = 0;

function reload_img () {
  if(!halted) mjpeg_img.src = "cam/cam_pic.php?time=" + new Date().getTime();
  else setTimeout("reload_img()", 500);
}

function error_img () {
  setTimeout("mjpeg_img.src = 'cam/cam_pic.php?time=' + new Date().getTime();", 100);
}

function init() {
  // mjpeg
  mjpeg_img = document.getElementById("mjpeg_dest");
  mjpeg_img.onload = function() { setTimeout(reload_img, 100) };
  mjpeg_img.onerror = error_img;
  reload_img();
  // status
  //reload_ajax("");
}

//Toggle music 'Roboter'
var stat = "stopped";

function toggleMusic(){
	if(stat=="stopped"){
		sendCommand("cmd=musicOn");
		stat = "run";
	} else {
		 sendCommand("cmd=musicOff");
                stat = "stopped";
	}
}


//Keystates
key_f=false
key_b=false
key_l=false
key_r=false
//Calculate Direction
function calc()
{
	var gear=0.9;
	var l=0.0;
	var r=0.0;
        if(key_f && key_l){
		l=0.4;
		r=1.0;
        }else if(key_f && key_r){
		l=1.0;
		r=0.4;
        }else if(key_f){
		l=1.0;
		r=1.0;
        }else if(key_b && key_r){
		l=-0.4;
		r=-0.8;
        }else if(key_b && key_l){
		l=-0.8;
		r=-0.4;
        }else if(key_b){
		l=-0.6;
		r=-0.6;
        }else if(key_l){
		l=-0.7;
		r=0.7;
        }else if(key_r){
		l=0.7;
		r=-0.7;
	}
	if(l != 0.0 || r != 0.0) {
		l*=gear;
		r*=gear;
		sendCommand("cmd=drive&l="+l+"&r="+r)
        }else{
		sendCommand("cmd=stop")
	}
		
	
}
//Check Keydown
$(document).on('keydown', function(e) {
	if(e.keyCode==38){
		key_f=true;
		calc();
	}
}).on('keyup', function(e) {
	if(e.keyCode==38){
		key_f=false;
		calc();
	}
});
$(document).on('keydown', function(e) {
	if(e.keyCode==39){
		key_r=true;
		calc();
	}
}).on('keyup', function(e) {
	if(e.keyCode==39){
		key_r=false;
		calc();
	}
});
$(document).on('keydown', function(e) {
	if(e.keyCode==40){
		key_b=true;
		calc();
	}
}).on('keyup', function(e) {
	if(e.keyCode==40){
		key_b=false;
		calc();
	}
});
$(document).on('keydown', function(e) {
	if(e.keyCode==37){
		key_l=true;
		calc();
	}
}).on('keyup', function(e) {
	if(e.keyCode==37){
		key_l=false;
		calc();
	}
});
