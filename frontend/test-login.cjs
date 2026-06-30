const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'admin@webzio.com',
      password: 'Demo@123!' // Or whatever it is
    });
    console.log("SUCCESS:", Object.keys(res.data));
  } catch (err) {
    console.log("ERROR:", err.response?.status, err.response?.data);
  }
}
testLogin();
