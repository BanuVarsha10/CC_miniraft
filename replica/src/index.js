const express = require("express")
const axios = require("axios")

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 5000
const REPLICA_ID = parseInt(process.env.REPLICA_ID)

// ---- CONFIG ----
const allReplicas = [
  { id: 1, url: "http://localhost:5001" },
  { id: 2, url: "http://localhost:5002" },
  { id: 3, url: "http://localhost:5003" }
]

const peers = allReplicas.filter(r => r.id !== REPLICA_ID)

// Gateway URL for broadcasting
const GATEWAY_URL = "http://localhost:4000"

// ---- STATE ----
let state = {
  currentTerm: 0,
  votedFor: null,
  role: "follower",
  leaderId: null
}

let electionTimeout = null
let heartbeatInterval = null

// ---- ELECTION TIMER ----
function resetElectionTimeout() {
  if (state.role === "leader") return

  if (electionTimeout) clearTimeout(electionTimeout)

  electionTimeout = setTimeout(() => {
    startElection()
  }, Math.floor(Math.random() * 500) + 800)
}

// ---- START ELECTION ----
async function startElection() {
  state.role = "candidate"
  state.currentTerm++
  state.votedFor = REPLICA_ID

  console.log(`Replica ${REPLICA_ID} starting election (term ${state.currentTerm})`)

  let votes = 1

  await Promise.all(peers.map(async (peer) => {
    try {
      const res = await axios.post(`${peer.url}/request-vote`, {
        term: state.currentTerm,
        candidateId: REPLICA_ID
      })
      if (res.data.voteGranted) votes++
    } catch (err) {}
  }))

  if (votes >= 2) {
    becomeLeader()
  } else {
    console.log(`Replica ${REPLICA_ID} failed election (only ${votes} votes)`)
    resetElectionTimeout()
  }
}

// ---- BECOME LEADER ----
function becomeLeader() {
  state.role = "leader"
  state.leaderId = REPLICA_ID

  console.log(`Replica ${REPLICA_ID} became LEADER (term ${state.currentTerm})`)

  if (heartbeatInterval) clearInterval(heartbeatInterval)

  heartbeatInterval = setInterval(sendHeartbeat, 150)
}

// ---- HEARTBEAT ----
async function sendHeartbeat() {
  await Promise.all(peers.map(peer => {
    return axios.post(`${peer.url}/heartbeat`, {
      term: state.currentTerm,
      leaderId: REPLICA_ID
    }).catch(() => {})
  }))
}

// ---- RPC: REQUEST VOTE ----
app.post("/request-vote", (req, res) => {
  const { term, candidateId } = req.body

  if (term < state.currentTerm) {
    return res.json({ voteGranted: false, term: state.currentTerm })
  }

  if (term > state.currentTerm) {
    state.currentTerm = term
    state.votedFor = null
    state.role = "follower"
  }

  if (!state.votedFor || state.votedFor === candidateId) {
    state.votedFor = candidateId
    resetElectionTimeout()
    return res.json({ voteGranted: true, term: state.currentTerm })
  }

  res.json({ voteGranted: false, term: state.currentTerm })
})

// ---- RPC: HEARTBEAT ----
app.post("/heartbeat", (req, res) => {
  const { term, leaderId } = req.body

  if (term < state.currentTerm) {
    return res.sendStatus(200)
  }

  state.currentTerm = term
  state.role = "follower"
  state.leaderId = leaderId

  resetElectionTimeout()

  res.sendStatus(200)
})

// ---- DRAW ENDPOINT ----
app.post("/draw", async (req, res) => {
  if (state.role !== "leader") {
    return res.status(403).send("Not leader")
  }

  const stroke = req.body

  console.log(`Leader ${REPLICA_ID} got stroke:`, stroke)

  // send to gateway for broadcast
  try {
    await axios.post(`${GATEWAY_URL}/broadcast`, stroke)
  } catch (err) {
    console.log("Broadcast failed:", err.message)
  }

  res.sendStatus(200)
})

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Replica ${REPLICA_ID} running on port ${PORT}`)
  resetElectionTimeout()
})