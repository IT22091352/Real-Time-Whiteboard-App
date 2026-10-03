import {
  WhiteboardAIRequestSchema,
  WhiteboardAIResponseSchema,
  AIGenerateWhiteboardResponseSchema,
} from './validators/aiSchemas.js';
import { aiService } from './services/aiService.js';

async function runAIFeatureTests() {
  console.log('==================================================');
  console.log(' RUNNING AI WHITEBOARD ASSISTANT & GENERATION TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Zod Request Schema Validation Test
  const validPayload = {
    roomCode: 'ai-whiteboard-101',
    action: 'analyze' as const,
    strokes: [
      {
        id: 'stroke-1',
        tool: 'brush' as const,
        color: '#ef4444',
        size: 5,
        points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      },
    ],
  };

  const reqResult = WhiteboardAIRequestSchema.safeParse(validPayload);
  assert(reqResult.success, 'AI Schema Test: Valid request payload passes Zod validation');

  // 2. AI Generation Action Request Test
  const genPayload = {
    roomCode: 'ai-gen-101',
    action: 'generate_whiteboard' as const,
    question: 'Create an e-commerce architecture diagram with User, API, and DB',
    strokes: [],
    objects: [],
  };

  const genReqResult = WhiteboardAIRequestSchema.safeParse(genPayload);
  assert(genReqResult.success, 'AI Generation Schema Test: generate_whiteboard action passes request validation');

  // 3. AI Generated Object Schema & Limit Validation Test
  const validGenResponse = {
    title: 'E-Commerce Architecture',
    description: 'Basic architecture layout',
    objects: [
      { id: 'obj-1', type: 'rectangle' as const, x: 0.1, y: 0.3, width: 0.15, height: 0.1, text: 'User' },
      { id: 'obj-2', type: 'rectangle' as const, x: 0.35, y: 0.3, width: 0.15, height: 0.1, text: 'API' },
      { id: 'obj-3', type: 'arrow' as const, fromId: 'obj-1', toId: 'obj-2' },
    ],
  };

  const genResResult = AIGenerateWhiteboardResponseSchema.safeParse(validGenResponse);
  assert(genResResult.success, 'AI Generation Schema Test: Valid generated whiteboard objects pass Zod response validation');

  // 4. Layout Engine Bounds Sanitizer Test
  const rawUnsafeData = {
    title: 'Unsafe Coordinates Layout',
    description: 'Test layout containing out of bound coords',
    objects: [
      { id: 'obj-out', type: 'rectangle' as const, x: -0.5, y: 1.8, width: 0.2, height: 0.1, text: 'A'.repeat(600) },
    ],
  };

  const sanitized = aiService.sanitizeAndAdjustLayout(rawUnsafeData);
  assert(
    Boolean(
      sanitized.objects[0] &&
        sanitized.objects[0].x! >= 0.02 &&
        sanitized.objects[0].y! <= 0.95 &&
        sanitized.objects[0].text!.length <= 500
    ),
    'Layout Sanitizer Test: Clamps out-of-bounds coordinates and truncates text length'
  );

  // 5. Whiteboard AI Response Zod Schema Validation Test
  const mockAIResponse = {
    context: {
      type: 'mathematics' as const,
      label: 'Algebraic Equation',
      confidence: 0.95,
    },
    observations: ['Written text "2x + 5 = 15"', 'Linear variable x'],
    inferences: ['Solving for single unknown variable x'],
    uncertainties: [],
    summary: 'A first-order linear algebraic equation to solve for variable x.',
    keyPoints: ['Subtract 5 from both sides', 'Divide by coefficient 2'],
    analysis: {
      explanation: 'Subtracting 5 yields 2x = 10. Dividing by 2 yields x = 5.',
      stepByStep: ['2x + 5 = 15', '2x = 10', 'x = 5'],
      suggestions: ['Check solution by substituting x = 5 back into original equation'],
    },
    questions: ['What value of x satisfies 3x - 4 = 11?'],
    customAnswer: 'The value of x is 5.',
  };

  const resResult = WhiteboardAIResponseSchema.safeParse(mockAIResponse);
  assert(resResult.success, 'AI Schema Test: Valid Whiteboard AI response passes Zod schema validation');

  // 6. API Controller Empty Board & Action Test (bypassed for generate_whiteboard)
  try {
    const genBoardRes = await fetch('http://localhost:4000/api/ai/whiteboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: 'test-gen-empty', action: 'generate_whiteboard', question: 'Create a simple flowchart' }),
    });

    const genBoardJson: any = await genBoardRes.json();
    assert(
      genBoardRes.status === 200 && genBoardJson.success && Boolean(genBoardJson.data?.generatedContent),
      'AI Generation Endpoint Test: Generates whiteboard objects on empty board',
      JSON.stringify(genBoardJson)
    );
  } catch (err: any) {
    assert(false, 'AI Generation Endpoint Test', err.message);
  }

  // 7. Backward Compatibility Endpoint Test (/api/ai/analyze-diagram)
  try {
    const legacyRes = await fetch('http://localhost:4000/api/ai/analyze-diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: 'legacy-room', strokes: validPayload.strokes }),
    });

    const legacyJson: any = await legacyRes.json();
    assert(
      legacyRes.status === 200 && legacyJson.success && Boolean(legacyJson.data?.diagramType),
      'Backward Compatibility Test: /api/ai/analyze-diagram returns valid legacy format',
      JSON.stringify(legacyJson)
    );
  } catch (err: any) {
    assert(false, 'Backward Compatibility Test', err.message);
  }

  console.log('\n==================================================');
  console.log(` AI FEATURE AUDIT FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');
}

runAIFeatureTests().catch(console.error);
