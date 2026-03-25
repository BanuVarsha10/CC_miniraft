const WebSocket = require("ws")
const axios = require("axios")
const express = require("express")
const path = require("path")

// ---- CONFIG ----
const replicas = [
  "http://localhost:5001",
  "http://localhost:5002",
  "http://localhost:5003"
]

let leaderUrl = null

// ---- FIND LEADER ----
async function findLeader() {
  for (let url of replicas) {
    try {
      const res = await axios.get(`${url}/status`)
      if (res.data.role === "leader") {
        if (leaderUrl !== url) {
          console.log("Leader updated:", url)
        }
        leaderUrl = url
        return
      }
    } catch (err) {}
  }
}

// check every 2 seconds
setInterval(findLeader, 2000)

// ---- WEBSOCKET SERVER ----
const wss = new WebSocket.Server({ port: 3000 })

let clients = []

wss.on("connection", (ws) => {
  console.log("Client connected")
  clients.push(ws)

  ws.on("message", async (message) => {
    const data = JSON.parse(message)

    if (!leaderUrl) {
      console.log("No leader available")
      return
    }

    try {
      await axios.post(`${leaderUrl}/draw`, data)
    } catch (err) {
      console.log("Leader unreachable, retrying...")
      leaderUrl = null
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

// serve frontend
app.use(express.static(path.join(__dirname, "../../frontend")))

// ---- BROADCAST ----
app.post("/broadcast", (req, res) => {
  const data = req.body

  clients = clients.filter(c => c.readyState === WebSocket.OPEN)

  clients.forEach(client => {
    client.send(JSON.stringify(data))
  })

  res.sendStatus(200)
})

// ---- START SERVER ----
app.listen(4000, () => {
  console.log("HTTP Gateway running on http://localhost:4000")
})