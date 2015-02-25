var leftchannel = [];
var rightchannel = [];
var recordinglength = 0;

onmessage = function(event) {
  // Handles data sent from node.postMessage
  // event.data.instanceof Object
  // event.data.hasOwnProperty("name")
  console.log("worker got parameter");
}

onaudioprocess = function(event) {
    console.log("worker is working");
    var left = e.inputbuffer.getchanneldata (0);
    var right = e.inputbuffer.getchanneldata (1);
    // we clone the samples because deep copy else fuck things up
    leftchannel.push (new float32array (left));
    rightchannel.push (new float32array (right));
    recordinglength += buffersize;
    // SEND THIS TO FURTHER PROCESS?
    // OR SHOULD JUST DO IT HERE. TO REDUCE LATENCY
}


