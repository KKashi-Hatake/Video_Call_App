import express from "express";
import {createServer} from "http";
import { Server } from "socket.io";
import { join, dirname } from "path";
import { fileURLToPath } from "url";


const app = express();
const server = createServer(app);
const io = new Server(server);
const allUsers = {}

// /your/system/path
const __dirname = dirname(fileURLToPath(import.meta.url));

// exposing public directory to outside world
app.use(express.static(join(__dirname + '/public')));

// handle GET request to the root path
app.get("/", (req, res) => {
    return res.sendFile(join(__dirname +'/app/index.html'));
});

//handle socket connection
io.on("connection", (socket) => {
    console.log("A user connected", socket.id);
    socket.on('join-user', (username) => {
        console.log("A user joined", username);
        allUsers[username] = {username, id: socket.id};

        // inform everyone that someone has joined
        io.emit('joined', allUsers);
    });


    socket.on("offer", ({from, to, offer})=>{
        io.to(allUsers[to].id).emit("offer", {from, to, offer})
    })

    socket.on("answer", ({from, to, answer})=>{
        io.to(allUsers[from].id).emit("answer", {from, to, answer})
    })

    socket.on("ice-candidate", candidate=>{
        socket.broadcast.emit("ice-candidate", candidate)
    })

    socket.on("end-call", ({from, to})=>{
        io.to(allUsers[to].id).emit("end-call", {from, to})
    })

    socket.on("call-ended", caller=>{
        io.to(allUsers[caller[0]].id).emit("call-ended")
        io.to(allUsers[caller[1]].id).emit("call-ended")
    })

    socket.on("disconnect", ()=>{
        const user = Object.keys(allUsers).find(key => allUsers[key].id === socket.id);
        if(user){
            delete allUsers[user];
            io.emit('joined', allUsers);
        }
    })
});

server.listen(9001, () => {
    console.log("Server is running on port 9001");
});

