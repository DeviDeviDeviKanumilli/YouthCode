export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 40 }}>
      <h1>SproutGo API</h1>
      <p>Backend for the SproutGo plant-discovery app. Endpoints live under <code>/api/v1</code>.</p>
      <p>Health check: <code>GET /api/v1/health</code></p>
    </main>
  );
}
