const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLectureTests() {
  console.log('🚀 Starting Live Lecture Intelligence API Tests...');
  const baseUrl = 'http://localhost:4000/api/ai/lecture';

  const basePayload = {
    roomCode: 'smartreplaceroom',
    lectureId: 'lecture-test-101',
    startedAt: Date.now() - 120000,
    endedAt: Date.now(),
    events: [
      {
        id: 'evt-1',
        timestamp: Date.now() - 110000,
        timeOffsetSeconds: 10,
        type: 'text_created',
        summary: 'Added Photosynthesis equation',
        objectType: 'text',
        text: 'Photosynthesis: 6CO2 + 6H2O -> C6H12O6 + 6O2',
        strokeId: 'txt-1',
      },
      {
        id: 'evt-2',
        timestamp: Date.now() - 80000,
        timeOffsetSeconds: 40,
        type: 'shape_added',
        summary: 'Added Chloroplast rectangle shape',
        objectType: 'rectangle',
        strokeId: 'shape-1',
      },
      {
        id: 'evt-3',
        timestamp: Date.now() - 40000,
        timeOffsetSeconds: 80,
        type: 'text_edited',
        summary: 'Added Light Reactions sticky note',
        objectType: 'sticky',
        text: 'Light Reactions occur in Thylakoid Membrane',
        strokeId: 'sticky-1',
      },
    ],
    snapshots: [
      {
        id: 'snap-1',
        timestamp: Date.now() - 100000,
        timeOffsetSeconds: 20,
        textSummary: 'Equation for photosynthesis written',
        objectCount: 1,
      },
      {
        id: 'snap-2',
        timestamp: Date.now() - 30000,
        timeOffsetSeconds: 90,
        textSummary: 'Chloroplast structure and light reactions sticky note added',
        objectCount: 3,
      },
    ],
    currentStrokes: [
      {
        id: 'txt-1',
        tool: 'text',
        color: '#3b82f6',
        text: 'Photosynthesis: 6CO2 + 6H2O -> C6H12O6 + 6O2',
        x: 0.1,
        y: 0.1,
      },
      {
        id: 'shape-1',
        tool: 'rectangle',
        color: '#10b981',
        x: 0.3,
        y: 0.2,
        width: 0.4,
        height: 0.3,
      },
      {
        id: 'sticky-1',
        tool: 'sticky',
        color: '#eab308',
        text: 'Light Reactions occur in Thylakoid Membrane',
        x: 0.35,
        y: 0.25,
      },
    ],
  };

  // Test 1: Generate Notes
  console.log('\n--- 1. Testing Action: "notes" ---');
  try {
    const res1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, action: 'notes' }),
    });
    const json1: any = await res1.json();
    console.log('Status:', res1.status);
    console.log('Success:', json1.success);
    if (json1.success) {
      console.log('Main Topic:', json1.data.mainTopic);
      console.log('Key Concepts count:', json1.data.keyConcepts?.length);
      console.log('Grounding Observations:', json1.data.grounding?.observations);
      console.log('Grounding Inferences:', json1.data.grounding?.inferences);
      console.log('Grounding Uncertainties:', json1.data.grounding?.uncertainties);
    } else {
      console.error('Error:', json1.error);
    }
  } catch (err: any) {
    console.error('Test 1 Exception:', err.message);
  }

  await sleep(4000);

  // Test 2: Generate Quiz
  console.log('\n--- 2. Testing Action: "quiz" ---');
  try {
    const res2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, action: 'quiz' }),
    });
    const json2: any = await res2.json();
    console.log('Status:', res2.status);
    console.log('Success:', json2.success);
    if (json2.success) {
      console.log('Quiz Topic:', json2.data.topic);
      console.log('Questions count:', json2.data.questions?.length);
      console.log('First Question:', json2.data.questions?.[0]?.question);
    } else {
      console.error('Error:', json2.error);
    }
  } catch (err: any) {
    console.error('Test 2 Exception:', err.message);
  }

  await sleep(4000);

  // Test 3: Generate Flashcards
  console.log('\n--- 3. Testing Action: "flashcards" ---');
  try {
    const res3 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, action: 'flashcards' }),
    });
    const json3: any = await res3.json();
    console.log('Status:', res3.status);
    console.log('Success:', json3.success);
    if (json3.success) {
      console.log('Flashcards count:', json3.data.flashcards?.length);
      console.log('Card 1 Front:', json3.data.flashcards?.[0]?.front);
      console.log('Card 1 Back:', json3.data.flashcards?.[0]?.back);
    } else {
      console.error('Error:', json3.error);
    }
  } catch (err: any) {
    console.error('Test 3 Exception:', err.message);
  }

  await sleep(4000);

  // Test 4: Ask Question
  console.log('\n--- 4. Testing Action: "ask_question" ---');
  try {
    const res4 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...basePayload,
        action: 'ask_question',
        userQuestion: 'Where do dark reactions (Calvin cycle) take place?',
      }),
    });
    const json4: any = await res4.json();
    console.log('Status:', res4.status);
    console.log('Success:', json4.success);
    if (json4.success) {
      console.log('Answer:', json4.data.answer);
      console.log('Grounding Observations:', json4.data.grounding?.observations);
    } else {
      console.error('Error:', json4.error);
    }
  } catch (err: any) {
    console.error('Test 4 Exception:', err.message);
  }

  console.log('\n🎉 All API Tests Complete!');
}

runLectureTests();
