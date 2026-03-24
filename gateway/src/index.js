const WebSocket = require("ws")
const axios = require("axios")

const wss = new WebSocket.Server({ port: 3000 })

let clients = []

let leaderUrl = "http://localhost:5001"

wss.on("connection", (ws) => {
  console.log("Client connected")
  clients.push(ws)

  ws.on("message", async (message) => {
    console.log("Gateway received:", message.toString())
    const data = JSON.parse(message)

    try {
      await axios.post(`${leaderUrl}/draw`, data)
    } catch (err) {
      console.log("Error:", err.message)
    }
  })

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws)
  })
})

console.log("Gateway running on ws://localhost:3000")
// HTTP server for replicas to send committed strokes
const express = require("express")
const app = express()
app.use(express.json())

app.post("/broadcast", (req, res) => {
  const data = req.body

  console.log("📡 Broadcasting:", data)

  clients.forEach(client => {
    client.send(JSON.stringify(data))
  })

  res.sendStatus(200)
})

app.listen(4000, () => {
  console.log("Gateway HTTP running on http://localhost:4000")
})