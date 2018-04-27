import document from "document";
import * as messaging from "messaging";

import { Accelerometer } from "accelerometer";

var messages = { "sendDataToPhone":1, "askStatusFromPhone":2 ,"sendDataToServer":3, "askStatusFromServer":4 }

var titleLabel = document.getElementById("titleLoggerLabel");
titleLabel.text = "QSelf - Logger";
var sizeLabel = document.getElementById("sizeLabel");
sizeLabel.text = "0 samples";
var statusLabel = document.getElementById("statusLabel");
statusLabel.text = "Waiting for connection";

var titleRecordingsInWatchLabel = document.getElementById("titleRecordingsInWatchLabel");
titleRecordingsInWatchLabel.text = "Recordings in watch";
var titleRecordingsInPhoneLabel = document.getElementById("titleRecordingsInPhoneLabel");
titleRecordingsInPhoneLabel.text = "Recordings in phone";
var titleRecordingsInServerLabel = document.getElementById("titleRecordingsInServerLabel");
titleRecordingsInServerLabel.text = "Recordings in server";

var recordingsInWatchText = document.getElementById("recordingsInWatchText");
recordingsInWatchText.text = "";

var recordingsInPhoneText = document.getElementById("recordingsInPhoneText");
recordingsInPhoneText.text = "";

var recordingsInServerText = document.getElementById("recordingsInServerText");
recordingsInServerText.text = "";

var loggingOffButton = document.getElementById("loggingOffButton");
var loggingOnButton = document.getElementById("loggingOnButton");

var multiPanel = document.getElementById("all-panels").getElementById("container");

var lastValueTimestamp = Date.now();
var counter = 0;
//var acc = [];

var accelerometer = new Accelerometer({ frequency: 5 });

var logging = false;

var dataContainer = {};
var timeStart = null;
var data = new Array();

var statsInPhone = {};
var statsInServer = {};

setInterval(function(){
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    statusLabel.text = "Connection to the phone OK";
  } else {
    statusLabel.text = "Connection error";
  }
}, 5000);

accelerometer.onreading = function() {
  // Peek the current sensor values
  let x = accelerometer.x ? accelerometer.x.toFixed(2) : 0;
  let y = accelerometer.y ? accelerometer.y.toFixed(2) : 0;
  let z = accelerometer.z ? accelerometer.z.toFixed(2) : 0;
  counter += 1;
  //console.log("Current acceleration: " + x + " " + y + " " + z);
  sizeLabel.text = counter + " samples";
  lastValueTimestamp = Date.now();
  
  data.push(new Array(lastValueTimestamp, x, y, z));
}

document.onkeypress = function(e) {
  console.log("Key pressed: " + e.key);
  if ((e.key == "up") || (e.key == "down")) {
    
    switch(multiPanel.value) {
    
      case 1:   // if the user is in the watch panel
        console.log("Exporting to phone");
        sendDataToPhone();
        break;
        
      case 2:   // if the user is in the phone panel
        console.log("Exporting to server");
        sendDataToServer();
        break;
        
    }
  }
}

loggingOffButton.onclick = function(evt) {
  console.log("Off clicked!");
  if (logging) {
    logging = false;
    console.log("Logging stopped!");
    // End monitoring the sensor
    //hrm.stop();
    accelerometer.stop();
    console.log("Sensor stopped");
    
    dataContainer[formatDate(timeStart)] = data;
    data = new Array();
    timeStart = null;
    
    updateRecordingsInWatch(dataContainer);
  }
}

loggingOnButton.onclick = function(evt) {
  console.log("On clicked!");
  //console.log("Max message size=" + messaging.peerSocket.MAX_MESSAGE_SIZE); // 1027 bytes
  if (!logging) {
    logging = true;
    timeStart = new Date();
    counter = 0;
    sizeLabel.text = counter + " samples";
    console.log("Logging started!");
    // Start monitoring the sensor
    //hrm.start();
    accelerometer.start();
    console.log("Sensor started");
  }
}

function updateRecordingsInWatch(container) {
  recordingsInWatchText.text = "";
  for (var recordingTime in container) {
    recordingsInWatchText.text += recordingTime + " -> " + container[recordingTime].length + " samples\n";
  }
}

function pad(n) {
    return n<10 ? "0"+n : n;
}

function formatDate(d) {
  let year = d.getFullYear();
  let month = d.getMonth()+1;
  let day = d.getDate();
  let hours = d.getHours();
  let minutes = d.getMinutes();
  let seconds = d.getSeconds();

  return pad(day) + "." + pad(month) + "." + year + " " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
}


// ------ Code for receiving messages ------------
messaging.peerSocket.onmessage = function(evt) {
  let answer = evt.data;
  console.log("Answer received = " + answer);
  
  let message = answer[0];    // The first element is the type of message
  
  switch(message) {
      
    case messages["sendDataToPhone"]:
      break;
      
    case messages["askStatusFromPhone"]:
      recordingsInPhoneText.text = "";

      for (let i=1; i < answer.length; i++) {
        let recordingData = answer[i];
        let ts = recordingData[0];
        let le = recordingData[1];
        statsInPhone[ts] = le;
        recordingsInPhoneText.text += ts + " -> " + le + " samples\n";
      }
      break;
      
    case messages["sendDataToServer"]:
      break;
      
    case messages["askStatusFromServer"]:
      statsInServer = JSON.parse(answer[1]);
      
      recordingsInServerText.text = "";
      for (let key in statsInServer) {
        recordingsInServerText.text += key + " -> " + statsInServer[key] + " samples\n";
      }
      break;      
  }
}

// ------ Code for sending messages --------------
messaging.peerSocket.onopen = function() {
  console.log("App - device socket open");
  messaging.peerSocket.send([messages["askStatusFromPhone"]]);
  messaging.peerSocket.send([messages["askStatusFromServer"]]);
}

messaging.peerSocket.onerror = function(err) {
  console.log("App - Connection error: " + err.code + " - " + err.message);
}

function sendDataToPhone() {
  console.log("sendDataToPhone called");
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {        // check the state of the connection
    if (Object.keys(dataContainer).length > 0) {                              // check if there are data to send
      for (let timeOfCapture in dataContainer) {                              // iterate over the recordings
        let d = dataContainer[timeOfCapture];

        let alreadyInPhone = (timeOfCapture in statsInPhone);
        if (alreadyInPhone) {
          alreadyInPhone = alreadyInPhone && (statsInPhone[timeOfCapture] == d.length);
        }
        
        if (!alreadyInPhone) {                                                // check if this recording already exists in the phone
          console.log("Sending data... " + timeOfCapture);

          for (let chunk_start_index=0; chunk_start_index < d.length; chunk_start_index+=30) {
            let chunk_end_index = Math.min(chunk_start_index+30, d.length);   // send chunks of data. The size of each chunk is 30 ~= 1024 / (8 + 8 + 8 + 8)
            let chunk = d.slice(chunk_start_index, chunk_end_index);
            let toSend = [messages["sendDataToPhone"], timeOfCapture, chunk];
            messaging.peerSocket.send(toSend);
          }
        }
        else {
          console.log("Skipping data... " + timeOfCapture);
        }
      }
    }
  }
  else {
    statusLabel.text = "Connection error";
  }
}

function sendDataToServer() {
  console.log("sendDataToServer called");
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {        // check the state of the connection
    if (Object.keys(dataContainer).length > 0) {                              // check if there are data to send
      let toSend = [messages["sendDataToServer"]];

      for (let timeOfCapture in dataContainer) {                              // iterate over the recordings
        let d = dataContainer[timeOfCapture];
    
        let alreadyInServer = (timeOfCapture in statsInServer);
        if (alreadyInServer) {
          alreadyInServer = alreadyInServer && (statsInServer[timeOfCapture] == d.length);
        }
        
        if (!alreadyInServer) {                                               // check if this recording already exists in the server
            toSend.push(timeOfCapture);
        }
      }
      console.log("Asking phone to send to server:", toSend);
      messaging.peerSocket.send(toSend);
    }
  }
  else {
    statusLabel.text = "Connection error";
  }
}
