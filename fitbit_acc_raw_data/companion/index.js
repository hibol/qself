// Import the Companion module
import { me } from "companion"

import * as messaging from "messaging";

var messages = { "sendDataToPhone":1, "askStatusFromPhone":2 ,"sendDataToServer":3, "askStatusFromServer":4 }

var dataContainer = {};
var url = "http://192.168.1.103:5000";
//var url = "http://192.168.100.4:5000";

function showContainer() {
  console.log("container");
  for (let k in dataContainer) {
    console.log("key " + k);
    let d = dataContainer[k];
    console.log("ts, value");
    for (let ts in d) {
      console.log(ts + " " + d[ts]);
    }
  }
}

if (me.launchReasons.peerAppLaunched) {
  // The Device application caused the Companion to start
  console.log("Device application was launched!")
}

// ---- Code for receiving messages ---------
// Listen for the onmessage event
messaging.peerSocket.onmessage = function(evt) {
 
  let message = evt.data[0];
  console.log("Receiving query... " + message);
  
  switch (message) {
      
    case messages["sendDataToPhone"]:
      let ts = evt.data[1];
      let data = evt.data[2];

      let dataInContainer = {};
      if (ts in dataContainer) {
        dataInContainer = dataContainer[ts];  
      }
      console.log("Already in container " + dataInContainer);

      console.log("Data in message");
      for (let i=0; i < data.length; i++) {
        let d = data[i];
        dataInContainer[d[0]] = new Array(d[1], d[2], d[3]);
      }

      dataContainer[ts] = dataInContainer;
      showContainer();

      sendPhoneStatus();
      break;
      
    case messages["askStatusFromPhone"]:
      sendPhoneStatus();
      break;
    
    case messages["sendDataToServer"]:
      
      if (Object.keys(dataContainer).length > 0) {
        let filteredDataContainer = {};
        
        for (let i=0; i < evt.data.length; i++) {       // iterate over the data container and keep only the data that were asked to be sent
          let ts = evt.data[i];
          filteredDataContainer[ts] = dataContainer[ts];
        }
        
        var dataJSON = JSON.stringify(filteredDataContainer);
        console.log(dataJSON);

        let http = new XMLHttpRequest();

        http.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            sendServerStatus(this.responseText);
          }
          else {
            console.log("Other state,status !");
            console.log("state=" + this.readyState + " status=" + this.status);
          }
        };

        http.open("POST", url, true);

        //Send the proper header information along with the request
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.send(dataJSON);
      }
      break;
      
    case messages["askStatusFromServer"]:
      let http = new XMLHttpRequest();

      http.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          sendServerStatus(this.responseText);
        }
        else {
          console.log("Other state,status !");
          console.log("state=" + this.readyState + " status=" + this.status);
        }
      };

      http.open("GET", url, true);

      //Send the proper header information along with the request
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      http.send();
      break;
  }
}

// ------ Code for sending messages -------------
messaging.peerSocket.onopen = function() {
  console.log("Companion - device socket open");
}

messaging.peerSocket.onerror = function(err) {
  console.log("Companion - Connection error: " + err.code + " - " + err.message);
}

function sendPhoneStatus() {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    if (Object.keys(dataContainer).length > 0) {
      let toSend = [messages["askStatusFromPhone"]];
      for (let timeOfCapture in dataContainer) {
        let l = Object.keys(dataContainer[timeOfCapture]).length;
        toSend.push([timeOfCapture, l]);
      }
      console.log("Sending answer... " + toSend.length + " items");
      messaging.peerSocket.send(toSend);
    }
  }
}

function sendServerStatus(serverStatus) {
  console.log(serverStatus);
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    let toSend = [messages["askStatusFromServer"]];
    toSend.push(serverStatus);
    console.log("Sending answer... " + toSend.length + " items");
    messaging.peerSocket.send(toSend);
  }
}
