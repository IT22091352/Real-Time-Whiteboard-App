import dotenv from 'dotenv';
dotenv.config();
import { aiService } from './src/services/aiService.js';

async function testDirect() {
  try {
    const result = await aiService.analyzeDiagram({
      roomCode: 'live-test',
      strokes: [
        { id: 's1', tool: 'brush', color: '#000000', size: 4, points: [{ x: 10, y: 10 }, { x: 100, y: 100 }] },
      ]
    });
    console.log('SUCCESS RESULT:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('DIRECT ERROR:', err.stack || err.message || err);
  }
}

testDirect();
