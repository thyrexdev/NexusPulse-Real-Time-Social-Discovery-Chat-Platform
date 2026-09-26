import { io } from 'socket.io-client';

async function run() {
  console.log('--- 1. Creating Stranger 1 (Egypt) ---');
  const res1 = await fetch('http://localhost:4000/auth/stranger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data1 = await res1.json();
  console.log('Stranger 1 created:', data1.user.username, 'Country:', data1.geo?.country, data1.geo?.flag);

  console.log('--- 2. Creating Stranger 2 (US Mock) ---');
  const res2 = await fetch('http://localhost:4000/auth/stranger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mock-country': 'US',
    },
  });
  const data2 = await res2.json();
  console.log('Stranger 2 created:', data2.user.username, 'Country:', data2.geo?.country, data2.geo?.flag);

  console.log('--- 3. Connecting Sockets ---');
  const s1 = io('http://localhost:4000', {
    auth: { token: data1.accessToken },
    transports: ['websocket'],
  });

  const s2 = io('http://localhost:4000', {
    auth: { token: data2.accessToken },
    transports: ['websocket'],
    extraHeaders: { 'x-mock-country': 'US' },
  });

  await new Promise<void>((resolve) => {
    let readyCount = 0;
    const check = () => {
      readyCount++;
      if (readyCount === 2) resolve();
    };
    s1.on('ready', (d) => {
      console.log('Socket 1 ready:', d.username, 'Geo:', d.geo?.country, d.geo?.flag);
      check();
    });
    s2.on('ready', (d) => {
      console.log('Socket 2 ready:', d.username, 'Geo:', d.geo?.country, d.geo?.flag);
      check();
    });
  });
  console.log('Both sockets authenticated & ready on http://localhost:4000!');

  // Matchmaking
  console.log('--- 4. Queueing and Pairing ---');
  const matchPromise = new Promise<{ p1Match: any; p2Match: any }>((resolve) => {
    let p1Match: any = null;
    let p2Match: any = null;

    s1.on('match:found', (data) => {
      console.log('User 1 received match:found! Partner is:', data.peer.username, 'from', data.peer.country, data.peer.flag);
      p1Match = data;
      if (p1Match && p2Match) resolve({ p1Match, p2Match });
    });

    s2.on('match:found', (data) => {
      console.log('User 2 received match:found! Partner is:', data.peer.username, 'from', data.peer.country, data.peer.flag);
      p2Match = data;
      if (p1Match && p2Match) resolve({ p1Match, p2Match });
    });
  });

  s1.emit('match:join_queue', { topic: 'e2e-unique-test' });
  s2.emit('match:join_queue', { topic: 'e2e-unique-test' });

  const { p1Match } = await matchPromise;

  // Test Fast Skip
  console.log('--- 5. Testing Fast Skip (Umingle) ---');
  const skipPromise = new Promise<void>((resolve) => {
    s2.on('peer:skipped', (msg) => {
      console.log('User 2 received peer:skipped notification:', msg.message);
      resolve();
    });
  });

  s1.emit('match:skip', { sessionId: p1Match.sessionId, autoRequeue: true, topic: 'e2e-unique-test' });
  await skipPromise;

  console.log('--- 6. Test Finished Successfully! ---');
  s1.disconnect();
  s2.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
