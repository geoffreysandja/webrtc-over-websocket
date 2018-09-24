var name;
var connectedUser;
var yourConnection;
var stream;
var loginPage= document.querySelector('#login-page');
var usernameInput=document.querySelector('#username');
var loginButton=document.querySelector('#login');
var callPage=document.querySelector('#call-page');
var theirUsernameInput=document.querySelector('#their-username');
var callButton=document.querySelector('#call');
var hangUpButton=document.querySelector('#hang-up');

var yourVideo=document.querySelector('#yours');
var theirVideo=document.querySelector('#theirs');


callPage.style.display="none";

//Alias for sending messages in JSON format
function send(message){
    if(connectedUser){
        message.name=connectedUser;
    }
    connection.send(JSON.stringify(message));
};
function onLogin(success){
    if(success === false){
        alert("Login unsucessful, Please try a different name.");
    }else{
        loginPage.style.display="none";
        callPage.style.display="block";

        startConnection();
    }
}
function hasUserMedia(){
    navigator.getUserMedia= navigator.mediaDevices.getUserMedia || navigator.mediaDevices.webkitGetUserMedia || navigator.mediaDevices.mozGetUserMedia || navigator.mediaDevices.msGetUserMedia;
    return !! navigator.getUserMedia;
}
function hasRTCPeerConnection(){
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    return !!window.RTCPeerConnection;
}
function setupPeerConnection(stream){
    var configuration={
        "iceServers":[{"url":"stun:stun.l.google.com:19302"}]
    };
    console.log(stream);
    yourConnection=new RTCPeerConnection(configuration);
    // setup stream listening
    console.log(stream.getTracks());
    yourConnection.addTrack(stream.getTracks()[1],stream);
    yourConnection.ontrack=function(e){
        console.log(e);
        console.log(e.streams[0]);
        theirVideo.src=window.URL.createObjectURL(e.streams[0]);
    }
    // Setup ice handling
    yourConnection.onicecandidate=function(event){
        if(event.candidate){
            send({type:"candidate",candidate:event.candidate});
        }
    };

}

function startConnection(){
    if(hasUserMedia()){
        navigator.mediaDevices.getUserMedia({video:true,audio:true}).then(function(myStream){
            console.log(myStream);
            stream=myStream;
            yourVideo.src=window.URL.createObjectURL(stream);
            if(hasRTCPeerConnection()){
                setupPeerConnection(stream);
            }else{
                alert("Sorry, your browser does not support WebRTC");
            }
        }).catch(function(error){
            console.log(error);
        });
    }else{
        alert('Sorry, your browser does not support WebRTC');
    }
}

function startPeerConnection(user){
    connectedUser=user;
    // Begin the offer
    yourConnection.createOffer(function(offer){
        console.log("OFFER");
        console.log(offer);
        send({type:"offer",offer:offer});
        yourConnection.setLocalDescription(offer);
    },function(error){
        console.log("OFFER ERROR");
    });
    
};

function onOffer(offer,name){
    connectedUser=name;
    yourConnection.setRemoteDescription(new RTCSessionDescription(offer));
    yourConnection.createAnswer(function(answer){
        yourConnection.setLocalDescription(answer);
        send({type:"answer",answer:answer});
    },function(error){
        console.log("An error has occured");
    });
};

function onAnswer(answer){
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
};

function onCandidate(candidate){
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

loginButton.addEventListener("click",function(event){
    name=usernameInput.value;

    if(name.length>0){
        send({type:"login",name:name});
    }
});
callButton.addEventListener("click",function(event){
    var theirUsername= theirUsernameInput.value;
    if(theirUsername.length>0){
        startPeerConnection(theirUsername);
    }
});

console.log(window.location.host);
var ws_url="wss://"+window.location.host;


var connection=new WebSocket(ws_url);

connection.onopen=function(){
    console.log("Connected");
};

//handles all messages 
connection.onmessage=function(message){
    console.log("Got message",message.data);
    
    var data=JSON.parse(message.data);
    switch(data.type){
        case "login":
            onLogin(data.success);
            break;
        case "offer":
            onOffer(data.offer, data.name);
            break;
        case "answer":
            onAnswer(data.answer);
            break;
        case "candidate":
             onCandidate(data.candidate);
             break;
        case "leave":
             onLeave();
             break;
        default:
             break;
    }
};

connection.onerror=function(err){
    console.log("Got error",err);
};

