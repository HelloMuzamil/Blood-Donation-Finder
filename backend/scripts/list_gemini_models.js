require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;

async function run() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      const names = data.models.map(m => m.name);
      console.log('Available model names:');
      console.log(names.filter(n => n.includes('gemini')));
    } else {
      console.log('Error listing models:', data);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
