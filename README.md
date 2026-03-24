## What’s Implemented

- Leader election using RAFT-like voting (3 replicas)
- Heartbeat mechanism for leader stability
- Gateway (WebSocket) forwarding client requests to leader
- Real-time broadcast of drawing events to all clients
- Majority-based commit (leader replicates to followers before broadcasting)
- Basic fault tolerance (leader failover and quorum behavior)

## How to Run

Open 5 terminals:

### 1. Start Replicas (3 terminals)

Terminal 1:
set PORT=5001 && set REPLICA_ID=1 && node src/index.js

Terminal 2:
set PORT=5002 && set REPLICA_ID=2 && node src/index.js

Terminal 3:
set PORT=5003 && set REPLICA_ID=3 && node src/index.js

Wait for:
Replica X became LEADER

---

### 2. Start Gateway (4th terminal)

cd gateway  
node src/index.js

Update `leaderUrl` in gateway to match the leader port.

---

### 3. Run Client (5th terminal)

cd gateway  
node test-client.js

---

You should see:
- Leader receives and commits stroke  
- Gateway broadcasts  
- Client receives message
