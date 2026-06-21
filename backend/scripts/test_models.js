require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;

const models = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-1.5-pro'
];

async function testModels() {
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: "Hello" }] }]
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log(`Model: ${model} | Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`✅ ${model} works!`);
      } else {
        console.log(`❌ Fail reason:`, data.error?.message || JSON.stringify(data));
      }
    } catch (err) {
      console.log(`❌ Error for ${model}:`, err.message);
    }
  }
}

testModels();
