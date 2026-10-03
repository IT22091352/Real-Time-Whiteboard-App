import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.AI_API_KEY;
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const json: any = await res.json();
  console.log('Status:', res.status);
  if (json.models) {
    console.log('Available Models:');
    json.models.forEach((m: any) => console.log(' -', m.name));
  } else {
    console.log('Response:', JSON.stringify(json, null, 2));
  }
}

listModels();
