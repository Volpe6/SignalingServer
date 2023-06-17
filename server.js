const fs = require('fs');
// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});
const fastifyCors = require('@fastify/cors');

const fastifySocketIO = require('fastify-socket.io');

fastify.register(fastifySocketIO, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});
fastify.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'PUT', 'POST', 'DELETE']
});

const users = new Map();

fastify.ready((err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const io = fastify .io;

  io.on('connection', (socket) => {
    console.log('Socket.IO conectado');
    // receive a message from the server
    socket.on("hello", (...args) => {
        // send a message to the server
        console.log('olá estranho!');
        socket.broadcast.emit("hello", 'olá estranho!');
    });
    
    socket.on('disconnect', function(){
      let username = '';
      for (const [key, value] of users.entries()) {
        if(value === socket.id) {
          username = key;
          break;
        }
      }
      console.log(`${username} desconectado`);
      users.delete(username);
      console.log(`${username} removido`);
    });
    
    socket.on('subscribe', (username) => {
      users.set(username, socket.id); 
      socket.emit('subscribed');
      console.log('user', users.get(username));
    });
    
    socket.on('polite', (content) => {
      console.log('polite')
      const user = users.get(content.target);
      if(user) {
          const polite = socket.id>user;
          socket.emit('polite', {...content, polite: !polite});
      }
    });
    
    socket.on('call', (content) => {
      console.log('call')
      console.log(content);
      const user = users.get(content.target);
      if(user) {
        socket.to(user).emit('call', content);
      } else {
        socket.emit('callerror', {...content, detail: 'usuario nao exite ou nao esta online'});
      }
    });
    
    socket.on('callaccepted', (content) => {
      console.log('callaccepted')
      const user = users.get(content.target);
      if(user) {
        socket.to(user).emit('callaccepted', content);
      }
    });
    
    socket.on('callrefused', (content) => {
      console.log('callrefused')
      const user = users.get(content.target);
      if(user) {
        socket.to(user).emit('callrefused', content);
      }
    });
    
    socket.on('callcanceled', (content) => {
      console.log('callcanceled')
      const user = users.get(content.target);
      if(user) {
        socket.to(user).emit('callcanceled', content);
      }
    });
    
    socket.on('ice-candidate', (content) => {
      console.log(`Recebido ice-candidate do room`);
      const user = users.get(content.target);
      if(user) {
          socket.to(user).emit('ice-candidate', content);  
      }
    });
    
    socket.on('hangup', (content) => {
      console.log(`user "${content.name}" desligando`);
      const user = users.get(content.target);
      if(user) {
          socket.to(user).emit('hangup', content);  
      }
    });
    
    socket.on('negotiation', (content) => {
      console.log(`Recebido negociacao`);
      const user = users.get(content.target);
      console.log('user-negotiaition', user);
      console.log('target-negotiaition', content.target);
      if(user) {
          socket.to(user).emit('negotiation', {...content, polite: socket.id>user});  
      }
    });
    
    socket.on('offer', (content) => {
      console.log(`Recebido oferta`);
      const user = users.get(content.target);
      console.log('target-offer', content.target);
      if(user) {
          socket.to(user).emit('offer', content);  
      }
    });
    

    socket.on('answer', (content) => {
      console.log(`Recebido resposta`);
      const user = users.get(content.target);
      console.log('target-answer', content.target);
      if(user) {
          socket.to(user).emit('answer', content);  
      }
    });
    
    
    socket.on('peerready', (content) => {
      console.log(`peer pronto`);
      const user = users.get(content.target);
      console.log('target-peerready', content.target);
      if(user) {
          socket.to(user).emit('peerready', content);  
      }
    });
  });
  
});

fastify.get('/', (request, reply) => {
  const host = request.headers.host;
  reply.type('text/html').send(`
    <html>
      <body>
        <h1>webrtc signaling server with websocket</h1>
        <ul>
           <li>
              <span>ws host:</span><span id="ws-host"> ws://${host}</span>
           </li>
        </ul>
        <script type="module">
          import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

          const socket = io('ws://${host}');
          // send a message to the server
          socket.emit("hello");

          // receive a message from the server
          socket.on("hello", (...args) => {
            console.log(args[0])
          });
        </script>
      </body>
    </html>
  `);
});

fastify.listen(
  { port: process.env.PORT || 3000, host: "0.0.0.0" }, 
  (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Servidor rodando em ${address}`);

  const ioUrl = `${address}`;
  console.log(`Socket.IO rodando em ${ioUrl}`);
});
