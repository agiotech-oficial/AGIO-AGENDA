import { db } from './src/db/index.js';
async function test() {
  try {
    const res = await db.execute('SELECT * FROM users');
    console.log("Success:", res);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
test();
