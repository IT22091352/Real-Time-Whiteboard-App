import dotenv from 'dotenv';
dotenv.config();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLectureV2Tests() {
  console.log('🚀 Starting LIVE LECTURE INTELLIGENCE V2 Comprehensive Test Suite...');
  const baseUrl = 'http://localhost:4000/api/ai/lecture';

  let createdSessionId = '';

  // TEST 1: Session DB Persistence - getOrCreateSession
  console.log('\n--- TEST A: Session Creation & DB Persistence ---');
  try {
    const resA = await fetch(`${baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: 'smartreplaceroom',
        startedAt: Date.now() - 60000,
        createdBy: 'user-teacher-01',
        createdByName: 'Prof. Alan Turing',
      }),
    });
    const jsonA: any = await resA.json();
    console.log('Session Status:', resA.status);
    console.log('Success:', jsonA.success);
    if (jsonA.success && jsonA.data.id) {
      createdSessionId = jsonA.data.id;
      console.log('✅ Session Created ID:', createdSessionId);
      console.log('Attribution:', jsonA.data.createdByName);
    } else {
      console.error('❌ Session Create Failed:', jsonA.error);
    }
  } catch (err: any) {
    console.error('Exception Test A:', err.message);
  }

  // TEST 2: Multi-User Event Persistence & Attribution
  console.log('\n--- TEST B & E: Multi-User Event Persistence & Attribution ---');
  try {
    const resB1 = await fetch(`${baseUrl}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lectureSessionId: createdSessionId,
        type: 'text_created',
        timestamp: Date.now() - 50000,
        timeOffsetSeconds: 10,
        userId: 'user-teacher-01',
        userName: 'Prof. Alan Turing',
        summary: 'Prof. Alan Turing added text: "Photosynthesis: 6CO2 + 6H2O -> C6H12O6 + 6O2"',
        objectType: 'text',
        strokeId: 'txt-1',
      }),
    });
    const jsonB1: any = await resB1.json();
    console.log('Teacher Event Saved:', jsonB1.success, jsonB1.data?.userName);

    const resB2 = await fetch(`${baseUrl}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lectureSessionId: createdSessionId,
        type: 'text_edited',
        timestamp: Date.now() - 30000,
        timeOffsetSeconds: 30,
        userId: 'user-student-42',
        userName: 'Student Bob',
        summary: 'Student Bob added question sticky note: "Why is light required?"',
        objectType: 'sticky',
        strokeId: 'sticky-1',
      }),
    });
    const jsonB2: any = await resB2.json();
    console.log('Student Event Saved:', jsonB2.success, jsonB2.data?.userName);
  } catch (err: any) {
    console.error('Exception Test B:', err.message);
  }

  // TEST 3: Checkpoint Snapshot Persistence
  console.log('\n--- TEST C & F: Semantic Checkpoint Persistence ---');
  try {
    const resC = await fetch(`${baseUrl}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lectureSessionId: createdSessionId,
        timestamp: Date.now() - 20000,
        timeOffsetSeconds: 40,
        title: 'Checkpoint +0m 40s',
        objectCount: 2,
        textSummary: 'Photosynthesis equation and student question sticky note',
        boardState: [{ id: 'txt-1', text: 'Photosynthesis' }, { id: 'sticky-1', text: 'Why is light required?' }],
      }),
    });
    const jsonC: any = await resC.json();
    console.log('Snapshot Saved Status:', resC.status, jsonC.success);
  } catch (err: any) {
    console.error('Exception Test C:', err.message);
  }

  // TEST 4: Query Session by ID (with Security verification)
  console.log('\n--- TEST Q: Session Security & Query ---');
  try {
    const resQ = await fetch(`${baseUrl}/session/${createdSessionId}?roomCode=smartreplaceroom`);
    const jsonQ: any = await resQ.json();
    console.log('Query Status:', resQ.status);
    console.log('Events Count:', jsonQ.data?.events?.length);
    console.log('Snapshots Count:', jsonQ.data?.snapshots?.length);
    console.log('User Attribution verified:', jsonQ.data?.events?.[1]?.userName === 'Student Bob');
  } catch (err: any) {
    console.error('Exception Test Q:', err.message);
  }

  // TEST 5: Gemini Provider Verification & Metadata (Action: notes)
  console.log('\n--- TEST M & N: Provider Verification (Gemini / Fallback Metadata) ---');
  try {
    const resM = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notes',
        roomCode: 'smartreplaceroom',
        lectureId: createdSessionId,
        startedAt: Date.now() - 60000,
        endedAt: Date.now(),
        events: [
          {
            id: 'evt-1',
            type: 'text_created',
            timestamp: Date.now() - 50000,
            timeOffsetSeconds: 10,
            summary: 'Prof. Alan Turing added text: "Photosynthesis: 6CO2 + 6H2O -> C6H12O6 + 6O2"',
            userId: 'user-teacher-01',
            userName: 'Prof. Alan Turing',
          },
        ],
        snapshots: [
          {
            id: 'snap-1',
            timestamp: Date.now() - 20000,
            timeOffsetSeconds: 40,
            objectCount: 1,
            textSummary: 'Photosynthesis equation',
          },
        ],
        currentStrokes: [
          { id: 'txt-1', tool: 'text', text: 'Photosynthesis: 6CO2 + 6H2O -> C6H12O6 + 6O2', color: '#3b82f6' },
        ],
      }),
    });
    const jsonM: any = await resM.json();
    console.log('Main AI Status:', resM.status);
    console.log('Success:', jsonM.success);
    if (jsonM.success) {
      console.log('🤖 Provider Metadata:', jsonM.data.providerMetadata);
      console.log('Main Topic:', jsonM.data.mainTopic);
      console.log('Grounded Observations:', jsonM.data.grounding?.observations);
      console.log('Missing Concepts Evidence:', jsonM.data.possibleMissingConcepts?.[0]);
    }
  } catch (err: any) {
    console.error('Exception Test M:', err.message);
  }

  // TEST 6: Reject Oversized Payloads
  console.log('\n--- TEST K & L: Oversized Payload Rejection ---');
  try {
    const oversizedEvents = Array.from({ length: 600 }, (_, i) => ({
      id: `evt-${i}`,
      type: 'text_created',
      timestamp: Date.now(),
      timeOffsetSeconds: i,
      summary: `Event ${i}`,
    }));

    const resO = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notes',
        roomCode: 'smartreplaceroom',
        lectureId: 'oversized-session',
        startedAt: Date.now() - 1000,
        events: oversizedEvents,
      }),
    });
    const jsonO: any = await resO.json();
    console.log('Oversized Status:', resO.status);
    console.log('Expected Failure Rejection:', resO.status === 400);
    console.log('Rejection Error:', jsonO.error);
  } catch (err: any) {
    console.error('Exception Test O:', err.message);
  }

  console.log('\n🎉 ALL LECTURE V2 INTEGRATION TESTS COMPLETE!');
}

runLectureV2Tests();
