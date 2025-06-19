const axios = require('axios');

console.log('🔍 Testing backend with axios...');

async function testBackend() {
  try {
    console.log('📡 Testing /api/test endpoint...');
    const response = await axios.get('http://localhost:9001/api/test', {
      timeout: 5000
    });
    
    console.log('✅ Backend is responding!');
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', response.data);
    
    // Test video info endpoint
    console.log('\n📹 Testing /api/video/info endpoint...');
    const videoResponse = await axios.post('http://localhost:9001/api/video/info', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    }, {
      timeout: 5000
    });
    
    console.log('✅ Video info endpoint working!');
    console.log('📊 Status:', videoResponse.status);
    console.log('📄 Title:', videoResponse.data.title);
    
    console.log('\n🎉 Backend is fully functional!');
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Connection refused - server may not be running');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏰ Connection timeout - server may be slow');
    } else {
      console.log('🔧 Error details:', error.code);
    }
  }
}

testBackend();
