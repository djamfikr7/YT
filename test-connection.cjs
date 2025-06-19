const http = require('http');
const net = require('net');

console.log('🔍 Testing backend connection...');

// First test if port is open
console.log('🔌 Testing if port 9001 is open...');
const socket = new net.Socket();

socket.setTimeout(3000);

socket.on('connect', () => {
  console.log('✅ Port 9001 is open');
  socket.destroy();

  // Now test HTTP
  console.log('🌐 Testing HTTP connection...');

  const options = {
    hostname: 'localhost',
    port: 9001,
    path: '/api/test',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Server responded with status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('📊 Response:', response);
        console.log('🎉 Backend connection successful!');
      } catch (error) {
        console.log('📄 Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ HTTP request failed:', error.message);
    console.error('🔧 Error code:', error.code);
  });

  req.on('timeout', () => {
    console.error('⏰ HTTP request timeout');
    req.destroy();
  });

  req.end();
});

socket.on('timeout', () => {
  console.error('❌ Port 9001 is not responding (timeout)');
  socket.destroy();
});

socket.on('error', (error) => {
  console.error('❌ Port 9001 is not open:', error.message);
  console.error('🔧 Error code:', error.code);
  console.log('💡 This usually means:');
  console.log('   - Server is not running');
  console.log('   - Server crashed during startup');
  console.log('   - Port is blocked by firewall');
  console.log('   - Another process is using the port');
});

socket.connect(9001, 'localhost');
