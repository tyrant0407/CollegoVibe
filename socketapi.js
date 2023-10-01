const io = require( "socket.io" )();
const socketapi = {
    io: io
};
const userModel = require('./routes/users.js')
const messageModel = require('./routes/message.js')



// Add your socket.io logic here!
io.on( "connection", function( socket ) {
    console.log( "A user connected" );
    socket.on('joinUser',async username=>{
        await userModel.findOneAndUpdate({username},{socketId:socket.id})
    })

    socket.on('messageByUser',async messageObject=>{
        const receiver = await userModel.findOne({username:messageObject.receiver})
        const newMessage = await messageModel.create({
            ...messageObject
        })
        socket.to(receiver.socketId).emit('messageByServer',newMessage)
    })

});

// end of socket.io logic

module.exports = socketapi;