const axios = require('axios');
const fs = require('fs');

async function main() {
  try {
    const setupRes = await axios.post('http://localhost:5678/rest/owner/setup', {
      email: 'admin@automata.local',
      firstName: 'Admin',
      lastName: 'Automata',
      password: 'Automata_password1'
    });
    const cookies = setupRes.headers['set-cookie'];
    if (cookies) {
      fs.writeFileSync('cookies.txt', cookies.join('\n'));
      console.log('Owner setup successful, cookies saved.');
    } else {
      console.log('Owner setup returned no cookies. Trying login...');
      const loginRes = await axios.post('http://localhost:5678/rest/login', {
        email: 'admin@automata.local',
        password: 'Automata_password1'
      });
      const loginCookies = loginRes.headers['set-cookie'];
      if (loginCookies) {
        fs.writeFileSync('cookies.txt', loginCookies.join('\n'));
        console.log('Logged in successfully, cookies saved.');
      } else {
        console.log('Login returned no cookies.');
      }
    }
  } catch (e) {
    if (e.response?.status === 400 && e.response?.data?.message === 'User is already set up') {
      console.log('User already set up. Logging in...');
      const loginRes = await axios.post('http://localhost:5678/rest/login', {
        email: 'admin@automata.local',
        password: 'Automata_password1'
      });
      const loginCookies = loginRes.headers['set-cookie'];
      if (loginCookies) {
        fs.writeFileSync('cookies.txt', loginCookies.join('\n'));
        console.log('Logged in successfully, cookies saved.');
      }
    } else {
      console.error('Failed to setup/login:', e.response?.data || e.message);
      process.exit(1);
    }
  }
}
main();
