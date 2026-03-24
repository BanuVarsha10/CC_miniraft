const WebSocket = require("ws")

const ws = new WebSocket("ws://localhost:3000")

ws.on("open", () => {
  console.log("✅ Connected to gateway")

  ws.send(JSON.stringify({ x: 200, y: 150 }))
})

ws.on("message", (msg) => {
  console.log("📩 Received:", msg.toString())
})