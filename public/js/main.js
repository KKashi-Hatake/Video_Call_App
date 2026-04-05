const createUserButton = document.getElementById('create-user');
const username = document.getElementById('username');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const micBtn = document.getElementById("toggle-mic");
const remoteBtn = document.getElementById("toggle-remote-audio");
const endCallBtn = document.getElementById("end-call-btn")


let localStream = null;
let caller = []
const socket = io();



const PeerConnection = (function(){
    let peerConnection = null;


    
    function createPeerConnection(){
        peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });


        // add local stream to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });


        // listen for remote stream and add to peer connection
        const remoteStream = new MediaStream();
        remoteVideo.srcObject = remoteStream;
        peerConnection.ontrack = (event) => {
            remoteStream.addTrack(event.track);
        };


        // listen for ice candidate
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };


        return peerConnection;
    }

    return {
        getInstance:()=>{
            if(!peerConnection){
                peerConnection = createPeerConnection();
            }
            return peerConnection;
        },
        reset:()=>{
            if(peerConnection){
                peerConnection.close();
                peerConnection = null;
            }
        }
    }
})()


// handle browser events
createUserButton.addEventListener('click', () => {
    const usernameValue = username.value;
    if (usernameValue.trim() !== '') {
        
        socket.emit('join-user', usernameValue);
        const usernameContainer = document.querySelector('.username-input');
        usernameContainer.style.display = 'none';
    }
});


endCallBtn.addEventListener("click",(e)=>{
    socket.emit("call-ended", caller)
})


micBtn.addEventListener("click", () => {

    const audioTrack = localStream.getAudioTracks()[0];

    if (audioTrack.enabled) {
        audioTrack.enabled = false;
        micBtn.textContent = "Unmute Mic";
    } else {
        audioTrack.enabled = true;
        micBtn.textContent = "Mute Mic";
    }

});



remoteBtn.addEventListener("click", () => {

    remoteVideo.muted = !remoteVideo.muted;

    if (remoteVideo.muted) {
        remoteBtn.textContent = "Unmute Remote";
    } else {
        remoteBtn.textContent = "Mute Remote";
    }

});







// handle socket events
socket.on('joined', (users) => {
    const allusers = document.getElementById('allusers');
    allusers.innerHTML = '';
    Object.values(users).forEach(user => {
        const li = document.createElement('li');
        li.textContent =`${user.username} ${user.username===username.value? "(You)":"" } `;

        if(user.username !== username.value){
            const callButton = document.createElement('button');
            callButton.classList.add('call-btn');
            callButton.addEventListener('click', () => {
                startCall(user.username);
            });
            const img = document.createElement('img');
            img.setAttribute("src", "/images/phone.png");
            img.setAttribute("width", "20");
            callButton.appendChild(img);
            li.appendChild(callButton);
        }

        allusers.appendChild(li);
    });
});



socket.on("offer", async ({from, to, offer})=>{
    const pc = PeerConnection.getInstance();
    // set remote description
    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', {from, to, answer:pc.localDescription})
    caller = [from, to]
})


socket.on("answer", async ({from, to, answer})=>{
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(answer);

    endCallBtn.style.display = 'block'
    socket.emit("end-call", {from, to});
    caller = [from, to]
})


socket.on("ice-candidate", async (candidate)=>{
    const pc = PeerConnection.getInstance();
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
})


socket.on("end-call",({form, to})=>{
    endCallBtn.style.display='block'
})


socket.on("call-ended",()=>{
    endCall();
    endCallBtn.style.display='none'

})




// start call function
async function startCall(user) {
    if(username.value===""){
        alert(`Please create your user first to call "${user}"`)
    }
    const pc = PeerConnection.getInstance();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", {from:username.value, to:user, offer:pc.localDescription})
}


// initialize local stream
async function startMyVideo(){
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream = stream;
        localVideo.srcObject = stream;
    } catch (error) {
        
    }
}
startMyVideo()

function endCall() {
    PeerConnection.reset();
    remoteVideo.srcObject = null;
}



