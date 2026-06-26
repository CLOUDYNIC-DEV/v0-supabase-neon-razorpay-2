# Load Balancer & Queue System Documentation

## Overview
The system now implements an intelligent load balancing and queue management system for distributing API requests across 6 Hugging Face endpoints with automatic failover and queue management.

## Architecture

### Endpoints
Six Hugging Face endpoints are configured:
- `https://darkmindforever-server.hf.space/v1/chat/completions`
- `https://darkmindforever-server2.hf.space/v1/chat/completions`
- `https://darkmindforever-server3.hf.space/v1/chat/completions`
- `https://darkmindforever-server4.hf.space/v1/chat/completions`
- `https://darkmindforever-server5.hf.space/v1/chat/completions`
- `https://darkmindforever-server6.hf.space/v1/chat/completions`

### Features

#### 1. **Load Balancing**
- Maximum 10 concurrent users per endpoint
- Automatic endpoint selection based on active user count
- Least-loaded endpoint is selected first
- Health check every 30 seconds

#### 2. **Queue System**
- When all endpoints reach 10 users, requests are queued
- 2-minute timeout per queued request
- Queue automatically processes when capacity becomes available
- Real-time queue size monitoring

#### 3. **Health Monitoring**
- Automatic health checks every 30 seconds
- Unhealthy endpoints are skipped during selection
- Failed request tracking per endpoint
- Real-time health status visible via API

#### 4. **Request Tracking**
- Total request count per endpoint
- Failed request count per endpoint
- Active user count per endpoint
- Real-time metrics available

## API Routes

### Health Status Endpoint
**URL:** `GET /api/health/status`

Returns real-time load balancer status including:
- Endpoint health status
- Active users per endpoint
- Total and failed requests
- Queue size
- System message

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-27T17:21:10.245Z",
  "loadBalancer": {
    "endpoints": [
      {
        "endpoint": "darkmindforever-server.hf.space",
        "activeUsers": 1,
        "healthy": true,
        "totalRequests": 10,
        "failedRequests": 0
      }
      // ... more endpoints
    ],
    "queueSize": 3,
    "totalEndpoints": 6
  },
  "message": "Running with 6 endpoints. Queue size: 3"
}
```

### Demo Chat Endpoint
**URL:** `POST /api/chat/demo`

**Request:**
```json
{
  "message": "Your message here"
}
```

**Features:**
- Streaming response with Server-Sent Events (SSE)
- 3 messages per 24 hours per IP
- Automatic load balancing
- Queue management when all endpoints are full
- Cloudynic AI branding in system message

**Response Headers:**
- `Content-Type: text/event-stream`
- `X-Remaining-Limit: Number of remaining demo calls`

### V1 API Endpoint
**URL:** `POST /api/v1/prompt` (also supports GET)

**POST Request:**
```json
{
  "prompt": "Your prompt here",
  "key": "optional_api_key",
  "train": "optional_training_instruction"
}
```

**GET Request:**
```
GET /api/v1/prompt?prompt=Your%20prompt&key=optional_key&train=optional_instruction
```

**Features:**
- Rate limiting per plan
- API key validation
- User authentication
- Load balancing across endpoints
- Queue management

**Response:**
```json
{
  "response": "AI generated response"
}
```

## Implementation Details

### Load Balancer Class (EndpointLoadBalancer)
Located in `/lib/api-utils.ts`

**Key Methods:**
- `getEndpoint()`: Returns available endpoint or queues request
- `acquireEndpoint(url)`: Mark endpoint as in-use
- `releaseEndpoint(url, success)`: Release endpoint back to pool
- `getStatus()`: Get current system status

**Constraints:**
- `MAX_USERS_PER_ENDPOINT`: 10 concurrent users
- `HEALTH_CHECK_INTERVAL`: 30 seconds
- `REQUEST_TIMEOUT`: 2 minutes queue timeout

### Integration Points

#### Demo Chat Route
File: `/app/api/chat/demo/route.ts`

Process:
1. Check IP-based daily limit (3 requests/day)
2. Get endpoint from load balancer (may queue)
3. Acquire endpoint (increment active user count)
4. Stream response through TransformStream
5. Release endpoint when stream completes

#### V1 API Route
File: `/app/api/v1/prompt/route.ts`

Process:
1. Validate API key (if provided)
2. Check rate limit per plan
3. Get endpoint from load balancer (may queue)
4. Acquire endpoint
5. Fetch response
6. Release endpoint
7. Log usage to database

## Monitoring & Debugging

### Check System Status
```bash
curl http://localhost:3000/api/health/status | jq .
```

### Test Demo Endpoint
```bash
curl -X POST http://localhost:3000/api/chat/demo \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!"}'
```

### Test V1 API
```bash
curl -X POST http://localhost:3000/api/v1/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is AI?"}'
```

### Server Logs
When running with `pnpm dev`, you'll see:
```
[v0] Demo chat: Requesting endpoint from load balancer...
[v0] Endpoint acquired: darkmindforever-server.hf.space | Active: 1/10
[v0] Demo chat: Using endpoint: darkmindforever-server.hf.space
[v0] Endpoint released: darkmindforever-server.hf.space | Active: 0/10 | Queue: 0
```

## Error Handling

### Queued Requests
- Requests exceeding 10 per endpoint are automatically queued
- Queue processes in FIFO order
- 2-minute timeout per request
- Timeout error: "Queue timeout: No available endpoints after 2 minutes"

### Failed Endpoints
- Endpoint marked as unhealthy after failed response
- Health check runs every 30 seconds
- Unhealthy endpoints are skipped during selection
- Requests automatically retry with different endpoint

### Rate Limits
- **Demo**: 3 requests per 24 hours per IP
- **V1 API Free**: 1 request per minute
- **V1 API Pro**: 30 requests per minute
- **V1 API Pro Max**: Unlimited

## Performance Metrics

### With Current Setup
- 6 endpoints × 10 users max = 60 concurrent connections
- Excess requests automatically queued
- Health monitoring prevents bad endpoints from receiving traffic
- Queue ensures fair request ordering

### Load Distribution Examples
- 15 concurrent requests: ~3 requests per endpoint
- 30 concurrent requests: 5 per endpoint
- 60 concurrent requests: All endpoints at capacity (10 each)
- 70 concurrent requests: 60 distributed, 10 queued

## Future Enhancements

Potential improvements:
- [ ] Weighted endpoint selection (some endpoints faster?)
- [ ] Auto-scaling endpoint pool based on demand
- [ ] Request priority levels
- [ ] WebSocket support for real-time updates
- [ ] Metrics dashboard
- [ ] Database-backed queue (for multi-instance support)

## Troubleshooting

### All Endpoints Returning 500
Check if Hugging Face endpoints are accessible:
```bash
curl https://darkmindforever-server.hf.space/v1/chat/completions
```

### Queue Growing Indefinitely
- Check endpoint health via status endpoint
- Verify endpoints are responsive
- Review failed request counts

### Slow Responses
- Check active user counts via status endpoint
- Review queue size
- Consider adding more endpoints

### Memory Issues
- Monitor global.endpointLoadBalancer creation
- Ensure streams are properly released
- Check TransformStream closing behavior
