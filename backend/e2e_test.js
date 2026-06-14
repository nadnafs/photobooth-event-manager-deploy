const { io } = require('socket.io-client');

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

async function fetchApi(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => null);
  
  if (!res.ok) {
    throw new Error(data?.message || `API Error: ${res.status}`);
  }
  return data;
}

async function runE2E() {
  console.log('--- STARTING E2E & EVENT ISOLATION TEST ---');

  // 1. Login
  const ownerRes = await fetchApi('/auth/login', 'POST', { username: 'owner', password: 'owner123' });
  const ownerToken = ownerRes.token;
  
  const kasirRes = await fetchApi('/auth/login', 'POST', { username: 'kasir', password: 'kasir123' });
  const kasirToken = kasirRes.token;
  
  const penerimaRes = await fetchApi('/auth/login', 'POST', { username: 'penerima', password: 'penerima123' });
  const penerimaToken = penerimaRes.token;

  // 2. Create Event A & Event B
  const evA = await fetchApi('/events', 'POST', {
    name: 'Event A Isolation Test', code: 'EV-A', is_active: false, receipt_prefix: 'EVA'
  }, ownerToken);
  const eventAId = evA.event.id;

  const evB = await fetchApi('/events', 'POST', {
    name: 'Event B Isolation Test', code: 'EV-B', is_active: false, receipt_prefix: 'EVB'
  }, ownerToken);
  const eventBId = evB.event.id;

  // Add Categories & Products
  const catA = await fetchApi(`/events/${eventAId}/participant-categories`, 'POST', { name: 'Cat A', code: 'CA' }, ownerToken);
  const pcatA = await fetchApi(`/events/${eventAId}/product-categories`, 'POST', { name: 'PCat A' }, ownerToken);
  const prodA = await fetchApi(`/events/${eventAId}/products`, 'POST', { category_id: pcatA.id, name: 'Prod A', price: 10000, unit: 'pcs' }, ownerToken);

  const catB = await fetchApi(`/events/${eventBId}/participant-categories`, 'POST', { name: 'Cat B', code: 'CB' }, ownerToken);
  const pcatB = await fetchApi(`/events/${eventBId}/product-categories`, 'POST', { name: 'PCat B' }, ownerToken);
  const prodB = await fetchApi(`/events/${eventBId}/products`, 'POST', { category_id: pcatB.id, name: 'Prod B', price: 20000, unit: 'pcs' }, ownerToken);

  // 3. Activate Event A
  await fetchApi(`/events/${eventAId}/status`, 'PUT', { status: 'AKTIF' }, ownerToken);
  console.log('✅ Event A Activated.');

  // 4. Register 3 transactions in Event A
  let txA1;
  for(let i=1; i<=3; i++) {
    const res = await fetchApi('/transactions', 'POST', {
      participant_name: `Peserta A${i}`,
      participant_category_id: catA.id,
      items: [{ product_id: prodA.id, quantity: 1 }]
    }, penerimaToken);
    if(i===1) txA1 = res.transaction;
  }
  console.log('✅ Event A Transactions created.');

  // 5. Connect Socket for TV
  const socket = io(SOCKET_URL);
  let tvEventCalled = false;
  socket.on('payment-queue:called', (data) => {
    console.log('📺 TV Received Queue Call:', data.participantName);
    tvEventCalled = true;
  });

  // 6. Kasir calls txA1
  await new Promise(r => setTimeout(r, 1000)); // wait for socket
  const callRes = await fetchApi('/queue/call-next', 'POST', {}, kasirToken);
  console.log('Kasir Called:', callRes.transaction.participant_name);

  await new Promise(r => setTimeout(r, 1000));
  if(tvEventCalled) console.log('✅ Socket.IO TV Realtime Queue works!');

  // 7. Verify Payment txA1
  const payRes = await fetchApi(`/transactions/${callRes.transaction.id}/verify-payment`, 'PATCH', {
    payment_method: 'TUNAI', amount_received: 10000
  }, kasirToken);
  console.log('✅ Transaction Paid, Receipt:', payRes.transaction.receipt_number);

  // 8. Activate Event B
  await fetchApi(`/events/${eventBId}/status`, 'PUT', { status: 'AKTIF' }, ownerToken);
  console.log('✅ Event B Activated.');

  // 9. Register 2 transactions in Event B
  for(let i=1; i<=2; i++) {
    await fetchApi('/transactions', 'POST', {
      participant_name: `Peserta B${i}`,
      participant_category_id: catB.id,
      items: [{ product_id: prodB.id, quantity: 1 }]
    }, penerimaToken);
  }
  console.log('✅ Event B Transactions created.');

  // 10. Check Isolation
  const qStatusB = await fetchApi('/queue/status', 'GET', null, kasirToken);
  console.log('Queue Status Waiting for Event B:', qStatusB.waiting.length, '(Expected: 2)');

  const txListB = await fetchApi('/transactions', 'GET', null, kasirToken);
  console.log('Transactions List for Event B:', txListB.transactions.length, '(Expected: 2)');

  // Cross check product update validation (BUG-010)
  try {
    await fetchApi(`/transactions/${txListB.transactions[0].id}`, 'PATCH', {
      items: [{ product_id: prodA.id, quantity: 1 }] // Try to use Event A product in Event B
    }, kasirToken);
    console.error('❌ BUG-010 Failed: Product from Event A allowed in Event B.');
  } catch (error) {
    console.log('✅ BUG-010 Verified: Cross-event product update blocked (', error.message, ')');
  }

  socket.disconnect();
  console.log('--- ALL TESTS COMPLETED ---');
}

runE2E().catch(err => {
  console.error(err.message);
  process.exit(1);
});
