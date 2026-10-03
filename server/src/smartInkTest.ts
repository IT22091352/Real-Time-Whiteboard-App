import dotenv from 'dotenv';
import { SmartInkRequestSchema, SmartInkResponseSchema } from './validators/aiSmartInkSchemas.js';
import { aiService } from './services/aiService.js';

dotenv.config();

async function runSmartInkTests() {
  console.log('==================================================');
  console.log(' RUNNING SMART INK INTELLIGENCE TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Zod Smart Ink Request Payload Validation
  try {
    const validRequest = {
      roomCode: 'smartinktestroom',
      strokeGroup: {
        groupId: 'group-1',
        strokeIds: ['stroke-1', 'stroke-2'],
        strokes: [
          {
            id: 'stroke-1',
            tool: 'brush',
            color: '#3b82f6',
            size: 4,
            points: [
              { x: 0.1, y: 0.1 },
              { x: 0.12, y: 0.15 },
            ],
          },
        ],
        bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
      },
      boardContext: {
        nearbyText: ['Banana', 'Orange'],
        boardSummary: 'Fruit list whiteboard notes',
      },
    };

    const parsed = SmartInkRequestSchema.safeParse(validRequest);
    if (!parsed.success) {
      throw new Error(`Request schema validation failed: ${JSON.stringify(parsed.error.format())}`);
    }
    console.log('[PASS] Smart Ink Request Schema: Valid request payload passes Zod validation');
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Smart Ink Request Schema:', err.message);
    failed++;
  }

  // Test 2: Zod Smart Ink Response Validation
  try {
    const validResponse = {
      primary: 'Apple',
      candidates: ['Apply', 'Apples'],
      confidence: 0.96,
      category: 'text',
      grounding: {
        observation: 'Five connected letter strokes forming word Apple',
        interpretation: 'Matches nearby fruit list context',
        uncertainty: 'Minor ambiguity on letter p',
      },
    };

    const parsedRes = SmartInkResponseSchema.safeParse(validResponse);
    if (!parsedRes.success) {
      throw new Error(`Response schema validation failed: ${JSON.stringify(parsedRes.error.format())}`);
    }
    console.log('[PASS] Smart Ink Response Schema: Valid response payload passes Zod validation');
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Smart Ink Response Schema:', err.message);
    failed++;
  }

  // Test 3: Math Equation Schema Validation
  try {
    const mathResponse = {
      primary: 'x² + 5x + 6 = 0',
      candidates: ['x^2 + 5x + 6 = 0'],
      confidence: 0.94,
      category: 'math',
      latex: 'x^2 + 5x + 6 = 0',
      grounding: {
        observation: 'Quadratic equation formula',
        interpretation: 'Mathematical expression',
        uncertainty: 'None',
      },
    };

    const parsedRes = SmartInkResponseSchema.safeParse(mathResponse);
    if (!parsedRes.success || parsedRes.data.category !== 'math') {
      throw new Error('Math response schema validation failed');
    }
    console.log('[PASS] Smart Ink Math Schema: Valid quadratic equation payload passes Zod validation');
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Smart Ink Math Schema:', err.message);
    failed++;
  }

  // Test 4: Science Chemical Formula Schema Validation
  try {
    const scienceResponse = {
      primary: 'CO2 + H2O → Glucose + O2',
      candidates: ['CO2 + H2O'],
      confidence: 0.92,
      category: 'science',
      grounding: {
        observation: 'Photosynthesis chemical formula',
        interpretation: 'Scientific notation',
        uncertainty: 'None',
      },
    };

    const parsedRes = SmartInkResponseSchema.safeParse(scienceResponse);
    if (!parsedRes.success || parsedRes.data.category !== 'science') {
      throw new Error('Science response schema validation failed');
    }
    console.log('[PASS] Smart Ink Science Schema: Valid chemical formula payload passes Zod validation');
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Smart Ink Science Schema:', err.message);
    failed++;
  }

  // Test 5: Live API Provider Endpoint Test with AI_API_KEY
  if (aiService.isConfigured()) {
    try {
      const recognitionResult = await aiService.recognizeSmartInk({
        roomCode: 'live-smart-ink-test',
        strokeGroup: {
          groupId: 'g-1',
          strokeIds: ['s-1'],
          strokes: [
            {
              id: 's-1',
              tool: 'brush',
              color: '#3b82f6',
              size: 4,
              points: [
                { x: 0.1, y: 0.1 },
                { x: 0.15, y: 0.12 },
              ],
            },
          ],
          bounds: { x: 0.1, y: 0.1, width: 0.15, height: 0.05 },
        },
        boardContext: {
          nearbyText: ['Banana', 'Orange', 'Strawberry'],
          boardSummary: 'Fruit grocery list',
          existingObjects: [],
        },
      });

      if (!recognitionResult || typeof recognitionResult.primary !== 'string') {
        throw new Error('Live Smart Ink endpoint returned empty response');
      }

      console.log(`[PASS] Live Smart Ink Endpoint Test: Primary match "${recognitionResult.primary}" (${Math.round(recognitionResult.confidence * 100)}% confidence, category: ${recognitionResult.category})`);
      passed++;
    } catch (err: any) {
      console.error('[FAIL] Live Smart Ink Endpoint Test:', err.message);
      failed++;
    }
  } else {
    console.log('[SKIP] Live Smart Ink Endpoint Test: AI_API_KEY missing');
  }

  console.log('\n==================================================');
  console.log(` SMART INK TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmartInkTests();
