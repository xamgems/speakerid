var speakers;
var recordingLength = 0;
var leftchannel = [];
var rightchannel = [];
var recordButt;
var stopButt;
var sendButt;
var getSpeakers;
var submitSpeaker;
var mediaRecorder;
var toSend = [];
var counter = 0;
var fileName = "sound";
var recorder;
var analyzer;
var canvas;
var draw_ctx;

var predictionInterval;
var speakerList;
var speakerColors = ["#2196f3", "#f44336", "#e91e63"];
var currentColor = "#ffffff";

window.onload = function() {
  if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia;

  speakers = new Object();

  console.log("User Media created");
  recordButt = document.getElementById("record");
  stopButt = document.getElementById("stop");

 // sendButt = document.getElementById("send");
 // sendButt.onclick = sendWav;

  getSpeakers = document.getElementById("speaker");
  getSpeakers.onclick = printAllSpeakers;

  submitSpeaker = document.getElementById("new");  
  submitSpeaker.onclick = newSpeaker;

  if (navigator.getUserMedia) {
    navigator.getUserMedia({video: false, audio: true},
        userMediaSuccess,
        function(e) {
        console.log("Error capturing audio");
        });

  } else {
    console.log("Audio recording not supported in this browser.");
  }

  getAllSpeakers();
}

function userMediaSuccess(e){
  // Create a audio output tag for debugging purpose.
  //var audio = document.querySelector('audio');
  //audio.src = window.URL.createObjectURL(e);

  // creates the audio context
  var audioContext = window.AudioContext || window.webkitAudioContext;
  context = new audioContext();

  //mediaRecorder = new MediaRecorder(e);
  recordButt.onclick = startRecord;
  stopButt.onclick = stopRecord;
  //mediaRecorder.ondataavailable = mediaDataReady;

  volume = context.createGain();

  // creates an audio node from the microphone incoming stream
  audioInput = context.createMediaStreamSource(e);
  recorder = new Recorder(audioInput);
  analyzer = context.createAnalyser();
  analyzer.smoothingTimeConstant = 0.3;
  analyzer.fftSize = 512;
 
  canvas = document.getElementById("wave_render");
  draw_ctx = canvas.getContext("2d");

  // connect the stream to the gain node
  audioInput.connect(volume);
  volume.connect(analyzer);

  /* This value controls how frequently the audioprocess event is 
     dispatched and how many sample-frames need to be processed each call. 
     Lower values for buffer size will result in a lower (better) latency. 
     Higher values will be necessary to avoid audio breakup and glitches */
  var bufferSize = 2048;
  var audioNode = context.createScriptProcessor(bufferSize, 2, 1);


  audioNode.onaudioprocess = function(e) {
    // FOR WHEN AUDIONODE RETURNS
    console.log("worker is working");
    //var left = e.inputBuffer.getChannelData (0);
    //var right = e.inputBuffer.getChannelData (1);
    // we clone the samples because deep copy else fuck things up
    //leftchannel.push (new Float32Array (left));
    //rightchannel.push (new Float32Array (right));
    //recordingLength += bufferSize;
    // SEND THIS TO FURTHER PROCESS?
    // OR SHOULD JUST DO IT HERE. TO REDUCE LATENCY
    //console.log(recordingLength);
  }

  // we connect the node
  analyzer.connect (audioNode);
  audioNode.connect (context.destination); 
  frameLooper();
}

function frameLooper() {
  window.requestAnimationFrame(frameLooper);
  console.log("drawing..");
  fbc_arr = new Uint8Array(analyzer.frequencyBinCount);
  analyzer.getByteFrequencyData(fbc_arr);
  draw_ctx.clearRect(0, 0, canvas.width, canvas.height);

  var gradient = draw_ctx.createLinearGradient(0,0,0,canvas.height);
  gradient.addColorStop(1, '#000000');
  gradient.addColorStop(0.75, '#000000');
  gradient.addColorStop(0.5, '#000088');
  gradient.addColorStop(0.25, '#0000ff');
  gradient.addColorStop(0, '#0000ff');
  
  for (var i = 0; i < analyzer.frequencyBinCount; i++) {
    var value = fbc_arr[i];
    var percent = value / 512;
    var height = canvas.height * percent;
    var offset = canvas.height - height - 1;
    var barWidth = canvas.width/analyzer.frequencyBinCount;
    var hue = i/analyzer.frequencyBinCount * 360;
    //draw_ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    draw_ctx.fillStyle = gradient;
    //draw_ctx.fillRect((i * barWidth) + 1, offset, barWidth, height);
    draw_ctx.fillRect(i * 3, offset, barWidth, height);
    draw_ctx.fillStyle = 'black';
    draw_ctx.fillRect(i * 3, offset, 1, 1);
  }
}

function startRecord() {
  if (document.getElementById("learning").checked) {
	  startLearnRecord();
  } else {
	  startPredictRecord();
  }
}

function stopRecord() {
  if (document.getElementById("learning").checked) {
    stopLearnRecord();
  } else {
    stopPredictRecord();
  }
}

function startPredictRecord() {
  recorder.record();
  console.log("recorder started");

  predictionInterval = window.setInterval(function () {
	   recorder.stop();
       recorder.exportWAV(exportPredictionData);
       recorder.clear();
	   recorder.record();
	}, 500);
}

function stopPredictRecord() {
  if (typeof predictionInterval !== 'undefined') {
    window.clearInterval(predictionInterval);
	delete predictionInterval;
  }
  recorder.stop();
  console.log("recorder stopped");
  recorder.exportWAV(exportPredictionData);
  recorder.clear();
}

function startLearnRecord() {
  recorder.record();
  console.log("recorder started");
}

function stopLearnRecord() {
  recorder.stop();
  console.log("recorder stopped");
  recorder.exportWAV(exportLearnData);
  recorder.clear();
}

function exportPredictionData(s) {
  var file = fileName + counter + ".wav";
  counter++;
  var params = new FormData();
  params.append("wav_sample", s);
  send("POST", "predict", params, predictReturn);
}

function exportLearnData(s) {
  var id = document.getElementById("userId").value;
  var file = fileName + counter + ".wav";
  counter++;
  console.log(file);
  var params = new FormData();
  params.append("id", id);
  params.append("wav_sample", s);
  send("POST", "learn_speaker", params, learnReturn);
}
/*
function sendWav() {
  // This method invokes the ondataavaible. which
  // is mediaDataReady
  mediaRecorder.requestData();
}
*/
/*
function mediaDataReady(e) {
  console.log("data available..");
  toSend.push(e.data);
  var blob = new Blob(toSend, { 'type' : 'audio/wav; codecs=opus'});
  var audio = document.querySelector('audio');
  var url = window.URL.createObjectURL(blob);
  audio.src = url;
  
  var file = fileName + counter + ".wav";
  console.log(file);  
  counter++;
  var link = document.createElement("a");
  link.download = file;
  console.log(url);
  link.href = url;

  var event = document.createEvent('Event');
  event.initEvent('click', true, true);
  link.dispatchEvent(event);
  (window.URL || window.webkitURL).revokeObjectURL(link.href);

  var params = new FormData();
  params.append("request", "predict");
  params.append("size", blob.size);
  params.append("wav", file);
  send(params, predictReturn);
}
*/
function learnReturn() {
  if (this.status == 200) {
    console.log("    Successfully learned from voice data");
    var p = document.createElement("p");
    p.innerHTML = this.responseText;
    document.body.appendChild(p);
  } else {
    console.log("    Learn returns with error: " + this.status);
  }
}

function predictReturn() {
  if (this.status == 200) {
    console.log("    Successfully gotten the prediction result");
	displayPrediction(JSON.parse(this.responseText))
  } else {
    console.log("    Predict returns with error: " + this.status);
  }
}

function displayPrediction(speakerProbs) {
	//var predictionResponse = document.getElementById("prediction");
  var predictionResponse = document.getElementById("currSpeak");
	var max = Number.MIN_VALUE;
	var maxSpeakerId = "NONE";
	for (i = 0; i < speakerProbs.length; i++) {
    if (speakerProbs[i]['count'] > max) {
      max = speakerProbs[i]['count'];
      maxSpeakerId = speakerProbs[i]['id'];
    }
	}

	maxSpeaker = resolveSpeakerEntry(maxSpeakerId)
    predictionResponse.innerHTML = maxSpeaker['name'];
	//var body = document.querySelector('body');
	sweep(predictionResponse, 'backgroundColor', currentColor, maxSpeaker['color'], {duration: 500, space: 'RGB'});
	currentColor = maxSpeaker['color'];
}

function resolveSpeakerEntry(id) {
	for (i = 0; i < speakerList.length; i++) {
		if (id == speakerList[i]['id']) {
			return speakerList[i];
		}
	}
	return 'NONE'
}

function getAllSpeakers() {
  console.log("Getting all speakers..");
  var params = new FormData();
  send("GET", "get_speakers", params, updateSpeakersList);
}

function printAllSpeakers() {
  console.log("Getting all speakers..");
  var params = new FormData();
  send("GET", "get_speakers", params, printSpeakersList);
}

function updateSpeakersList() {
  if (this.status == 200) {
    console.log("    Successfully gotten all the speakers");
    // Handle this.responseText
    //var p = document.createElement("p");
    /*p.innerHTML = this.responseText;
    document.getElementById("list").appendChild(p);*/
	  speakerList = JSON.parse(this.responseText);

    // clear table before repopulation
    var table = document.getElementById("speaker_table");
    table.innerHTML = "";
    var title1 = document.createElement("th");
    title1.innerHTML = "Name";
    var title2 = document.createElement("th");
    title2.innerHTML = "ID";
    var header = document.createElement("tr");
    header.appendChild(title1);
    header.appendChild(title2);
    table.appendChild(header);
	  for (i = 0; i < speakerList.length; i++) {
		  speakerList[i]['color'] = speakerColors[i]
	    var row = document.createElement("tr");
      var id = document.createElement("td");
      var name = document.createElement("td");
      id.innerHTML = speakerList.id;
      name.innerHTML = speakerList.name;
      row.appendChild(name);
      row.appendChild(id);
      table.appendChild(row);
    }
  } else {
    console.log("    Failed to get all speakers from server. Error: " + this.status);
  }
}

function printSpeakersList() {
  if (this.status == 200) {
    console.log("    Successfully gotten all the speakers");
    // Handle this.responseText
    var p = document.createElement("p");
    p.innerHTML = this.responseText;
    document.getElementById("list").appendChild(p);
  } else {
    console.log("    Failed to get all speakers from server. Error: " + this.status);
  }
}

function newSpeaker() {
  var name = document.getElementById("newUser").value;
  if (name == "") {
    console.log("Empty name not allowed..");
    return;
  }
  console.log("Submitting a new speaker \"" + name + "\"..");
  var params = new FormData();
  document.getElementById("newUser").disabled = true;
  params.append("name", name);
  send("POST", "new_speaker", params, newSpeakerReturn);
}

function newSpeakerReturn() {
  if (this.status == 200) {
    var id = this.responseText;
    console.log(this.responseText);
    speakers.id = document.getElementById("newUser").value;
    document.getElementById("newUser").disabled = false;
    console.log("    Successfully submitted a new speaker.");
  } else {
    console.log("    Failed to submit a new speaker. Error: " + this.status);
  }
}

function send(method, endpoint, params, callback) {
  var ajax = new XMLHttpRequest();
  ajax.onload = callback;
  ajax.open(method, "https://localhost/" + endpoint, true);
  ajax.send(params);
}
