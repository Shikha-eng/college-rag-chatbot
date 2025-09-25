// Root-level trampoline to backend/server.js so platforms expecting ./server.js still work.
// All real logic now lives in ./backend/server.js
try {
  module.exports = require('./backend/server');
  if (require.main === module) {
    console.log('Delegating to backend/server.js ...');
  }
} catch (e) {
  console.error('Failed to load backend/server.js:', e.message);
  process.exit(1);
}