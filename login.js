const axios = require('axios');
const fs = require('fs');

async function main() {
  const loginRes = await axios.post('http://localhost:5678/rest/login', {
    email: 'admin@automata.local',
    password: 'automata_password'
  });
  
  const cookies = loginRes.headers['set-cookie'];
  if (cookies) {
    fs.writeFileSync('cookies.txt', cookies.join('\n'));
    console.log('Logged in successfully, cookies saved.');
  }
}

main().catch(console.error);
