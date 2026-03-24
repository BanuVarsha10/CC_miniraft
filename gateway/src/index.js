const WebSocket = require("ws")
const axios = require("axios")
const express = require("express")
const path = require("path")

// ---- CONFIG ----
let leaderUrl = "http://localhost:5001"

// ---- WEBSOCKET SERVER ----
const wss = new WebSocket.Server({ port: 3000 })

let clients = []

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

console.log("WebSocket Gateway running on ws://localhost:3000")

// ---- HTTP SERVER ----
const app = express()
app.use(express.json())

// 🔥 SERVE FRONTEND (THIS WAS MISSING)
app.use(express.static(path.join(__dirname, "../../frontend")))

// ---- BROADCAST ENDPOINT ----
app.post("/broadcast", (req, res) => {
  const data = req.body

  console.log("Broadcasting:", data)

  // remove dead clients
  clients = clients.filter(client => client.readyState === WebSocket.OPEN)

  clients.forEach(client => {
    client.send(JSON.stringify(data))
  })

  res.sendStatus(200)
})

// ---- START SERVER ----
app.listen(4000, () => {
  console.log("HTTP Gateway running on http://localhost:4000")
})