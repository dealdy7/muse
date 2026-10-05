const http = require('http');

http.get('http://localhost:20128/api/providers', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed.connections)) {
         const anti = parsed.connections.filter(c => c.provider === 'antigravity');
         console.log(`Antigravity count: ${anti.length}`);
         anti.forEach(a => console.log(`- ${a.email || a.id} (Status: ${a.testStatus})`));
      }
    } catch (e) { console.error(e); }
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
