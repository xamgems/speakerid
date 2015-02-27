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

window.onload = function() {
  if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia;

  speakers = new Object();

  console.log("User Media created");
  recordButt = document.getElementById("record");
  stopButt = document.getElementById("stop");

  sendButt = document.getElementById("send");
  sendButt.onclick = sendWav;

  getSpeakers = document.getElementById("speaker");
  getSpeakers.onclick = getAllSpeakers;


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
}



function userMediaSuccess(e){
  // Create a audio output tag for debugging purpose.
  //var audio = document.querySelector('audio');
  //audio.src = window.URL.createObjectURL(e);

  // creates the audio context
  var audioContext = window.AudioContext || window.webkitAudioContext;
  context = new audioContext();


  mediaRecorder = new MediaRecorder(e);
  recordButt.onclick = startRecord;
  stopButt.onclick = stopRecord;
  mediaRecorder.ondataavailable = mediaDataReady;

  volume = context.createGain();

  // creates an audio node from the microphone incoming stream
  audioInput = context.createMediaStreamSource(e);

  // connect the stream to the gain node
  audioInput.connect(volume);

  /* This value controls how frequently the audioprocess event is 
     dispatched and how many sample-frames need to be processed each call. 
     Lower values for buffer size will result in a lower (better) latency. 
     Higher values will be necessary to avoid audio breakup and glitches */
  var bufferSize = 2048;
  var audioNode = context.createScriptProcessor(bufferSize, 2, 1);


  audioNode.onaudioprocess = function(e) {
    // FOR WHEN AUDIONODE RETURNS
    console.log("worker is working");
    var left = e.inputBuffer.getChannelData (0);
    var right = e.inputBuffer.getChannelData (1);
    // we clone the samples because deep copy else fuck things up
    leftchannel.push (new Float32Array (left));
    rightchannel.push (new Float32Array (right));
    recordingLength += bufferSize;
    // SEND THIS TO FURTHER PROCESS?
    // OR SHOULD JUST DO IT HERE. TO REDUCE LATENCY
    console.log(recordingLength);
  }

  // we connect the node
  //volume.connect (audioNode);
  //audioNode.connect (context.destination); 
}

function startRecord() {
  mediaRecorder.start();
  console.log("recorder started");
}

function stopRecord() {
  mediaRecorder.stop();
  console.log("recorder stopped");
}

function sendWav() {
  // This method invokes the ondataavaible. which
  // is mediaDataReady
  mediaRecorder.requestData();
}

function mediaDataReady(e) {
  console.log("data available..");
  toSend.push(e.data);
  var blob = new Blob(toSend, { 'type' : 'audio/wav; codecs=opus'});
  var audio = document.querySelector('audio');
  var url = window.URL.createObjectURL(blob);
  audio.src = url;
  
  var file = fileName + counter;
  console.log(file);  
  counter++;
  var link = document.createElement("a");
  link.download = file;
  link.href = url;
  link.click();

  var params = new FormData();
  params.append("request", "predict");
  params.append("size", blob.size);
  params.append("wav", file);
  post(params, predictReturn);
}

function predictReturn() {
  if (this.status == 200) {
    console.log("    Successfully getten the prediction result");
    // Handle this.responseText.
  } else {
    console.log("    Predict returns with error: " + this.status);
  }
}

function getAllSpeakers() {
  console.log("Getting all speakers..");
  var params = new FormData();
  params.append("request", "get");
  post(params, getSpeakersReturn);
}

function getSpeakersReturn() {
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
  params.append("request", "new");
  document.getElementById("newUser").disabled = true;
  params.append("name", name);
  post(params, newSpeakerReturn);
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

function post(params, callback) {
  var ajax = new XMLHttpRequest();
  ajax.onload = callback;
  ajax.open("POST", "proxy.php", true);
  ajax.send(params);
}
