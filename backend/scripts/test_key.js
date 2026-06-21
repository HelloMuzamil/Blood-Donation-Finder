require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;
console.log('Using API Key:', apiKey ? (apiKey.substring(0, 10) + '...') : 'undefined');

async function test() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: "Hello" }]
      }]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
