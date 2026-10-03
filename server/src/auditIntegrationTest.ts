import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:4000';

function createSocket(): Socket {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    autoConnect: false,
  });
}

async function runAuditTests() {
  console.log('==================================================');
  console.log(' STARTING PRODUCTION INTEGRATION AUDIT TESTS');
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

  // ----------------------------------------------------
  // TEST 1 & 2: Multi-Client Sync & Late Join
  // ----------------------------------------------------
  const roomCode = `audit-${Date.now()}`;
  const clientA = createSocket();
  const clientB = createSocket();

  await new Promise<void>((resolve) => {
    clientA.on('connect', () => {
      clientA.emit('room:join', { roomCode, userName: 'Client A' });
    });

    clientA.on('room:joined', () => {
      // Client A draws stroke 1
      clientA.emit('drawing:start', {
        strokeId: 'stroke-1',
        tool: 'brush',
        color: '#ef4444',
        size: 5,
        point: { x: 0.1, y: 0.1 },
      });
      clientA.emit('drawing:update', {
        strokeId: 'stroke-1',
        points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }],
      });
      clientA.emit('drawing:end', { strokeId: 'stroke-1' });

      // Connect Client B 200ms after stroke 1
      setTimeout(() => {
        clientB.connect();
      }, 200);
    });

    clientB.on('connect', () => {
      clientB.emit('room:join', { roomCode, userName: 'Client B' });
    });

    clientB.on('room:joined', (payload) => {
      assert(payload.strokes.length >= 1, 'Late Join Test: Client B receives existing strokes', `Count: ${payload.strokes.length}`);
      if (payload.strokes.length >= 1) {
        assert(payload.strokes[0].id === 'stroke-1', 'Late Join Test: Preserves correct stroke ID');
      }
      assert(payload.users.length === 2, 'Presence Test: Correct online user count (2 users)');
      
      clientA.disconnect();
      clientB.disconnect();
      resolve();
    });

    clientA.connect();
  });

  // ----------------------------------------------------
  // TEST 3: Room Isolation
  // ----------------------------------------------------
  const roomIsoA = `iso-a-${Date.now()}`;
  const roomIsoB = `iso-b-${Date.now()}`;
  const isoClientA = createSocket();
  const isoClientB = createSocket();

  await new Promise<void>((resolve) => {
    let leakedEvent = false;

    isoClientA.on('connect', () => {
      isoClientA.emit('room:join', { roomCode: roomIsoA, userName: 'Iso A' });
    });

    isoClientB.on('connect', () => {
      isoClientB.emit('room:join', { roomCode: roomIsoB, userName: 'Iso B' });
    });

    isoClientB.on('drawing:start', () => {
      leakedEvent = true;
    });

    isoClientA.on('room:joined', () => {
      isoClientB.connect();
    });

    isoClientB.on('room:joined', () => {
      // Client A draws in Room A
      isoClientA.emit('drawing:start', {
        strokeId: 'iso-stroke-1',
        tool: 'brush',
        color: '#000000',
        size: 4,
        point: { x: 0.5, y: 0.5 },
      });

      setTimeout(() => {
        assert(!leakedEvent, 'Room Isolation Test: Room B does not receive Room A events');
        isoClientA.disconnect();
        isoClientB.disconnect();
        resolve();
      }, 300);
    });

    isoClientA.connect();
  });

  // ----------------------------------------------------
  // TEST 4: Malformed Event Injection & Server Crash Resistance
  // ----------------------------------------------------
  const badClient = createSocket();
  await new Promise<void>((resolve) => {
    badClient.on('connect', () => {
      // Inject malformed join payload
      badClient.emit('room:join', { roomCode: 12345 as any });
      // Inject malformed drawing start payload
      badClient.emit('drawing:start', { strokeId: null, color: 'invalid-color' } as any);
      // Inject malformed points
      badClient.emit('drawing:update', { strokeId: 'test', points: 'not-an-array' } as any);
      
      setTimeout(() => {
        assert(badClient.connected, 'Payload Validation Test: Server handles malformed events without crashing');
        badClient.disconnect();
        resolve();
      }, 300);
    });
    badClient.connect();
  });

  console.log('\n==================================================');
  console.log(` AUDIT SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');
}

runAuditTests().catch(console.error);
