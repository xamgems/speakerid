var speakers;
var recordingLength = 0;
var leftchannel = [];
var rightchannel = [];
var recordButt;
var stopButt;
var sendButt;
var getSpeakers;
var submitSpeaker;
var toSend = [];
var counter = 0;
var fileName = "sound";
var recorder;
var analyzer;
var analyzerAfter;
var canvas;
var canvasAfter;

var predictionInterval;
var speakerList;
var speakerPredictCount = new Object();
var speakerColors = ["#2196f3", "#f44336", "#e91e63"];
var currentColor = "#ffffff";
var BUFFER_SIZE = 16384;

var recording = false;
var silentCount = 0;
var recLength = 0;
var recBuffers = [];
var speechCont;
var speechBuffer = [];

var speakerBuffer = ["NOBODY", "NOBODY", "NOBODY", "NOBODY", "NOBODY"];

window.onload = function() {
  if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia;

  speakers = new Object();

  console.log("User Media created");
  recordButt = document.getElementById("record");
  recordButt.disabled = false;
  stopButt = document.getElementById("stop");
  stopButt.disabled = true;

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

  getAllSpeakers();
}

function userMediaSuccess(e){
  // creates the audio context
  var audioContext = window.AudioContext || window.webkitAudioContext;
  context = new audioContext();
  console.log(context.sampleRate);

  recordButt.onclick = startRecord;
  stopButt.onclick = stopRecord;


  // creates an audio node from the microphone incoming stream
  audioInput = context.createMediaStreamSource(e);
  analyzer = context.createAnalyser();
  analyzer.smoothingTimeConstant = 0.3;
  analyzer.fftSize = 2048;
 
  analyzerAfter = context.createAnalyser();
  analyzerAfter.smoothingTimeConstant = 0.3;
  analyzerAfter.fftSize = 2048;

  // connect the stream to the gain node
  audioInput.connect(analyzer);

  var audioNode = context.createScriptProcessor(BUFFER_SIZE, 1, 1);

  audioNode.onaudioprocess = audioProcess;

  // we connect the node
  analyzer.connect (audioNode);
  audioNode.connect (analyzerAfter);
  //analyzerAfter.connect (context.destination); 
  startFrameLoop();  
}

function audioProcess(e) {
    var inputBuffer = e.inputBuffer;
    var outputBuffer = e.outputBuffer;

    var inData = inputBuffer.getChannelData(0);
    var outData = outputBuffer.getChannelData(0);

    if (document.getElementById("learning").checked && recording) {
        recBuffers.push(inData);
        recLength += inData.length;
    } else if (recording) {
        var energyPrimThresh = 40;
        var freqPrimThresh = 185;
        var sfmPrimThresh = 5;

        var minEnergyAllFrames = Number.MAX_VALUE;
        var minDomFreq = Number.MAX_VALUE;
        var minSpecFlat = Number.MAX_VALUE;
        for (var j = 0; j < BUFFER_SIZE/512; j++) {
            var currFrame = [];
            var frameEnergy = 0;
            // To calculate the short term energy of this frame
            for (var i = 0; i < 512; i++) {
                currFrame.push(inData[i + j * 512]);
                var sq = inData[i + j * 512] * inData[i + j * 512];
                frameEnergy += sq;
            } 

            // apply fft
            var fft = new FFT(512, 44100);
            fft.forward(currFrame);
            var spectrum = fft.spectrum;

            // Calculate the SFM
            var geo_mean = geometricMean(spectrum);
            var arith_mean  = arithmeticMean(spectrum);
            var spec_flatness = geo_mean / arith_mean;
            var sfm = 10 * Math.log10(spec_flatness);
            minSpecFlat = Math.min(minSpecFlat, sfm);

            var maxAmpFreq = Number.MIN_VALUE;
            var freqBand = 0;

            // To get the dominant freq band
            for (var i = 0; i < currFrame; i++) {
                if (maxAmpFreq < currFrame[i]) {
                    maxAmpFreq = currFrame[i];
                    freqBand = i;
                }
            }
            minDomFreq = Math.min(minDomFreq, maxAmpFreq);

            // Decide on Thresholds
            var energyThresh = energyPrimThresh * Math.log10(minEnergyAllFrames);
            var freqThresh = freqPrimThresh;
            var sfmThresh = sfmPrimThresh;

            var counter = 0;
            if ((frameEnergy - minEnergyAllFrames) >= energyThresh) counter++;
            if (maxAmpFreq - freqThresh >= freqThresh) counter++;
            if (sfm - minSpecFlat >= sfmThresh) counter++;

            if (counter > 1) {
                speechBuffer.push(currFrame);
                speechCont++;
                if (speechCont >= 5) {
                    for (var i = 0; i < speechBuffer.length; i++) {
                        recBuffers.push(speechBuffer[i]);
                        recLength += speechBuffer[i].length;		
                    }
                    speechBuffer = [];
                    speechCont = 0;
                }
                for (var i = 0; i < 512; i++) { 
                    outData[i + j * 512] = inData[i + j * 512];
                } 
            } else {
                for (var i = 0; i < 512; i++) {
                    outData[i + j * 512] = 0;
                } 
                speechCont = 0;
                speechBuffer = [];
                // Only update min energy if this frame is silent
                minEnergyAllFrames = Math.min(minEnergyAllFrames, frameEnergy);
            }
            var energyThresh = energyPrimThresh * Math.log10(minEnergyAllFrames);
        }
    }
}

function geometricMean(spectrum) {
  // converting to power spectrum
  var temp_data = [];
  for (var i = 0; i < spectrum.length; i++) {
    temp_data.push(spectrum[i]);
  }
  temp_data = temp_data.map(function (a) {
                              return Math.log(a);
                            });

  temp_data = temp_data.reduce(function (a, b) {
                                    return a + b;
                                  });
  temp_data = temp_data / spectrum.length;
  return Math.exp(temp_data);
}

function arithmeticMean(spectrum) {
  // Converting to power spectrum
  var temp_data = [];
  for (var i = 0; i < spectrum.length; i++) {
    temp_data.push(spectrum[i]);
  }

  temp_data = temp_data.reduce(function (a, b) {
                                      return a + b;
                                  });
	return temp_data / spectrum.length;
}

function exportWAV(callback) {
	console.log("rec length: " + recLength)	
	if (recLength >= 3500){	
		var buffers = [];
		buffers.push(mergeBuffers(recBuffers, recLength));
		var finalAudio = buffers[0];
		var dataview = encodeWAV(finalAudio);
		var audioBlob = new Blob([dataview], {type: "audio/wav"});

		silentCount = 0;
		callback(audioBlob);
	} else {
		silentCount++;
        speakerBuffer.shift();
        speakerBuffer.push("NOBODY");
        displayPrediction();
    }
}

function encodeWAV(samples) {
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, 44100 * 4, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return view;
}


function writeString(view, offset, string) {
	for (var i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}

function floatTo16BitPCM(output, offset, input) {
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function mergeBuffers(recBuff, length) {
  var result = new Float32Array(length);
  var offset = 0;
  for (var i = 0; i < recBuff.length; i++) {
	  for (var j = 0; j < recBuff[i].length; j++) {
		  result[offset + j] = recBuff[i][j];
	  }
    offset += recBuff[i].length;
  }
  return result;
}

function startFrameLoop() {
  window.requestAnimationFrame(startFrameLoop);
  frameLooper();
  frameLooperAfter();
}

function frameLooper() {
  var fbc_arr = new Uint8Array(analyzer.frequencyBinCount);
  analyzer.getByteFrequencyData(fbc_arr);
  
  canvas = document.getElementById("wave_render");
  var draw_ctx = canvas.getContext("2d");
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

function frameLooperAfter() {
  var fbc_arr = new Uint8Array(analyzerAfter.frequencyBinCount);
  analyzerAfter.getByteFrequencyData(fbc_arr);
  
  canvasAfter = document.getElementById("after_render");
  var draw_ctx = canvasAfter.getContext("2d");
  draw_ctx.clearRect(0, 0, canvas.width, canvas.height);

  var gradient = draw_ctx.createLinearGradient(0,0,0,canvas.height);
  gradient.addColorStop(1, '#000000');
  gradient.addColorStop(0.75, '#000000');
  gradient.addColorStop(0.5, '#000088');
  gradient.addColorStop(0.25, '#0000ff');
  gradient.addColorStop(0, '#0000ff');
  
  for (var i = 0; i < analyzerAfter.frequencyBinCount; i++) {
    var value = fbc_arr[i];
    var percent = value / 512;
    var height = canvas.height * percent;
    var offset = canvas.height - height - 1;
    var barWidth = canvas.width/analyzerAfter.frequencyBinCount;
    var hue = i/analyzerAfter.frequencyBinCount * 360;
    //draw_ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    draw_ctx.fillStyle = gradient;
    //draw_ctx.fillRect((i * barWidth) + 1, offset, barWidth, height);
    draw_ctx.fillRect(i * 3, offset, barWidth, height);
    draw_ctx.fillStyle = 'black';
    draw_ctx.fillRect(i * 3, offset, 1, 1);
  }
}

function startRecord() {
  recordButt.disabled = true;
  stopButt.disabled = false;
  if (document.getElementById("learning").checked) {
	  startLearnRecord();
  } else {
	  startPredictRecord();
  }
}

function stopRecord() {
  recordButt.disabled = false;
  stopButt.disabled = true;
  if (document.getElementById("learning").checked) {
    stopLearnRecord();
  } else {
    stopPredictRecord();
  }
}

function startPredictRecord() {
  recording = true;
  displayPrediction("Starting..");
  console.log("recorder started");

  predictionInterval = window.setInterval(function () {
    exportWAV(exportPredictionData);      
	  recBuffers = [];
	  recLength = 0;
  }, 1000);
}

function stopPredictRecord() {
  displayPrediction("Stopped");
  if (typeof predictionInterval !== 'undefined') {
    window.clearInterval(predictionInterval);
    delete predictionInterval;
  }
  recording = false;
  console.log("recorder stopped");
  recBuffers = [];
  recLength = 0;
}

function startLearnRecord() {
  recording = true;
  var id = document.getElementById("userId").value;
  var speaker = resolveSpeakerEntry(id);
  displayPrediction("Learning.. (" + speaker["name"] + ")" );
  console.log("recorder started");
}

function stopLearnRecord() {
  recording = false;
  displayPrediction("Stopped");
  console.log("recorder stopped");
  exportWAV(exportLearnData);
  recBuffers = [];
  recLength = 0;
}


function exportPredictionData(s) {
  var params = new FormData();
  params.append("wav_sample", s);
  send("POST", "predict", params, predictReturn);
}

function exportLearnData(s) {
  var id = document.getElementById("userId").value;
  var params = new FormData();
  params.append("id", id);
  params.append("wav_sample", s);
  send("POST", "learn_speaker", params, learnReturn);
}

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
	var speakerProbs = JSON.parse(this.responseText);
    // remove first element.
    speakerBuffer.shift();
    speakerBuffer.push(speakerProbs);
    displayPrediction();
  } else {
    console.log("    Predict returns with error: " + this.status);
  }
}

function displayPrediction(optString) {
    optString = optString || "temp";
    var predictionBackground = document.getElementById("prediction");
    var predictionResponse = document.getElementById("currSpeak");
    var smallText = document.getElementById("currSpeakSmall");

    if (optString != "temp") {     
        sweep(predictionBackground, 'backgroundColor', currentColor, '#FFFFFF', {duration: 500, space: 'RGB'});
        currentColor = '#FFFFFF';
        predictionResponse.innerHTML = optString;
        smallText.innerHTML = "";
        return;
    } 
    var max = Number.MIN_VALUE;
    var maxSpeakerId = "NONE";
    initializeSpeakerCount();
    var noobCount = 0;
    for (var j = 0; j < speakerBuffer.length; j++) {
        speakerProbs = speakerBuffer[j];
        if (speakerProbs != "NOBODY") {
            for (var i = 0; i < speakerProbs.length; i++) {
                speakerPredictCount[speakerProbs[i]['id']] += speakerProbs[i]['count'];
                if (speakerPredictCount[speakerProbs[i]['id']] > max) {
                    max = speakerPredictCount[speakerProbs[i]['id']];
                    maxSpeakerId = speakerProbs[i]['id'];
                }
            }
        } else {
            noobCount++;
        }
    }
    if (noobCount >= 3) {
        sweep(predictionBackground, 'backgroundColor', currentColor, '#FFFFFF', {duration: 500, space: 'RGB'});
        currentColor = '#FFFFFF';
        predictionResponse.innerHTML = "Nobody";
        smallText.innerHTML = "is speaking..";
        return;
    }
    maxSpeaker = resolveSpeakerEntry(maxSpeakerId);
    predictionResponse.innerHTML = maxSpeaker['name'];
    sweep(predictionBackground, 'backgroundColor', currentColor, maxSpeaker['color'], {duration: 500, space: 'RGB'});
    currentColor = maxSpeaker['color'];
    smallText.innerHTML = "is speaking..";
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

function updateSpeakersList() {
  if (this.status == 200) {
    console.log("    Successfully gotten all the speakers");
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
        speakerList[i]['color'] = speakerColors[i];
        var row = document.createElement("tr");
        var id = document.createElement("td");
        var name = document.createElement("td");
        id.innerHTML = speakerList[i]['id'];
        name.innerHTML = speakerList[i]['name'];
        row.appendChild(name);
        row.appendChild(id);
        table.appendChild(row);
    }
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
  ajax.open(method, "http://localhost/" + endpoint, true);
  ajax.send(params);
}

function initializeSpeakerCount() {
    for (i = 0; i < speakerList.length; i++) {
        speakerList[i]['color'] = speakerColors[i];
        var id = speakerList[i]['id'];
        speakerPredictCount[id] = 0;
    }
}
