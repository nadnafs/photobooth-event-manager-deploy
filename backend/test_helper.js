const { getTransactionsData } = require('./src/utils/transactionQueryHelper');

(async () => {
  try {
    console.log("Testing getTransactionsData...");
    const res = await getTransactionsData({ event_id: 'b2dd-1a2faebd329e', date: '2026-06-14' }, false);
    console.log("Success! Transactions found:", res.transactions.length);
    process.exit(0);
  } catch (err) {
    console.error("Error occurred:");
    console.error(err);
    process.exit(1);
  }
})();
