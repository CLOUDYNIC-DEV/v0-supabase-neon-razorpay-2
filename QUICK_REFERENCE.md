# Load Balancer Quick Reference

## System Overview
- **6 Endpoints** with automatic load balancing
- **10 Max Users** per endpoint (60 total capacity)
- **Queue System** for excess requests (2-min timeout)
- **Health Monitoring** every 30 seconds
- **Real-time Metrics** available

## API Endpoints

### 1. Health Status Check
```bash
# Check system status
curl http://localhost:3000/api/health/status | jq .

# Response includes:
# - Endpoint health (healthy: true/false)
# - Active users per endpoint
# - Total and failed requests
# - Queue size
```

### 2. Demo Chat (Streaming)
```bash
# Stream-based chat endpoint
curl -X POST http://localhost:3000/api/chat/demo \
  -H "Content-Type: application/json" \
  -d '{"message":"Your message here"}'

# Limit: 3 requests per 24 hours per IP
# Returns: Server-sent events (SSE) stream
```

### 3. V1 API - POST Method
```bash
# JSON-based AI prompt endpoint
curl -X POST http://localhost:3000/api/v1/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Your prompt",
    "key": "optional_api_key",
    "train": "optional_training_instruction"
  }'

# Returns: JSON with "response" field
```

### 4. V1 API - GET Method
```bash
# Query string-based AI prompt endpoint
curl "http://localhost:3000/api/v1/prompt?prompt=Your%20prompt&key=api_key"

# Returns: Plain text response
```

## Load Balancer Logic

### How It Works
1. **Request comes in** → Load balancer checks all endpoints
2. **Find available** → Selects endpoint with fewest active users
3. **Check capacity** → If all at 10 users, add to queue
4. **Process** → Request executes, endpoint marked as in-use
5. **Complete** → Endpoint released, next queued request processes

### Status Codes
- **200**: Success
- **429**: Rate limited or all endpoints at capacity
- **500**: Internal error or queue timeout
- **400**: Invalid input
- **401**: Invalid API key

## Rate Limits

### Demo Chat
- Limit: 3 requests per 24 hours
- Tracked by: Client IP address
- Header: `X-Remaining-Limit: N`

### V1 API Free (IP-based)
- Limit: 1 request per minute
- Tracked by: Client IP address

### V1 API Pro (API Key)
- Limit: 30 requests per minute
- Tracked by: User ID from API key

### V1 API Pro Max (API Key)
- Limit: Unlimited

## Monitoring

### Check Real-Time Status
```bash
curl http://localhost:3000/api/health/status | jq '.loadBalancer'

# Output shows:
# - Endpoint names
# - Active users per endpoint (0-10)
# - Healthy status (true/false)
# - Total requests processed
# - Failed requests count
# - Queue size
```

### Example Status Response
```json
{
  "endpoints": [
    {
      "endpoint": "darkmindforever-server.hf.space",
      "activeUsers": 2,
      "healthy": true,
      "totalRequests": 10,
      "failedRequests": 0
    }
    // ... 5 more endpoints
  ],
  "queueSize": 0,
  "totalEndpoints": 6
}
```

### View Server Logs
```bash
# When running: pnpm dev
# Look for [v0] tagged messages:

[v0] Demo chat: Requesting endpoint from load balancer...
[v0] Endpoint acquired: darkmindforever-server.hf.space | Active: 1/10
[v0] Demo chat: Using endpoint: darkmindforever-server.hf.space
[v0] Endpoint released: darkmindforever-server.hf.space | Active: 0/10 | Queue: 0
```

## Testing Commands

### Quick Test Suite
```bash
# Test 1: Health check
curl http://localhost:3000/api/health/status | jq '.status'

# Test 2: Demo chat
curl -X POST http://localhost:3000/api/chat/demo \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' | head -c 200

# Test 3: V1 API
curl -X POST http://localhost:3000/api/v1/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' | jq '.response' | head -c 100

# Test 4: Check metrics
curl http://localhost:3000/api/health/status | jq '.loadBalancer.endpoints[0]'
```

## Troubleshooting

### Issue: Rate limit exceeded
**Cause:** Exceeded request limit  
**Solution:**
- Demo: Wait 24 hours or use different IP
- V1 API Free: Wait 1 minute
- V1 API Pro: Use higher tier plan or check API key

### Issue: Queue timeout error
**Cause:** All endpoints at capacity for 2+ minutes  
**Solution:**
- Check endpoint health: `curl http://localhost:3000/api/health/status`
- Verify Hugging Face endpoints are responsive
- Check if endpoints are experiencing issues

### Issue: Empty response from demo chat
**Cause:** Endpoint returning null/undefined  
**Solution:**
- Check health status endpoint
- Try again (endpoint may be temporarily unhealthy)
- Review server logs for errors

### Issue: Slow response times
**Cause:** All endpoints near capacity  
**Solution:**
- Check active user count via health endpoint
- Monitor queue size
- Requests are automatically queued if needed

## Architecture Files

### Core Implementation
- **`lib/api-utils.ts`**: EndpointLoadBalancer class, endpoint config
- **`app/api/chat/demo/route.ts`**: Demo chat with load balancing
- **`app/api/v1/prompt/route.ts`**: V1 API with load balancing
- **`app/api/health/status/route.ts`**: Health monitoring endpoint

### Documentation
- **`LOAD_BALANCER_README.md`**: Detailed documentation
- **`TEST_VERIFICATION.md`**: Test results and verification
- **`QUICK_REFERENCE.md`**: This file

## Performance Specs

| Metric | Value |
|--------|-------|
| Max Users Per Endpoint | 10 |
| Total Endpoints | 6 |
| Max Concurrent Users | 60 |
| Health Check Interval | 30 seconds |
| Queue Timeout | 2 minutes |
| Demo Rate Limit | 3/day per IP |
| V1 Free Rate Limit | 1/min per IP |
| V1 Pro Rate Limit | 30/min per user |

## Environment Setup

### Start Development Server
```bash
cd /vercel/share/v0-project
pnpm install
pnpm dev
```

### Build for Production
```bash
pnpm build
pnpm start
```

### No New Environment Variables Required
The system uses only the configured endpoints in the code.

## Next Steps

1. **Test the endpoints** using curl commands above
2. **Monitor via health endpoint** for real-time metrics
3. **Review logs** while running `pnpm dev`
4. **Deploy to production** when ready
5. **Monitor queue size** during high traffic

## Support

- **Health Status**: `GET /api/health/status`
- **Debug Logs**: Console output when running `pnpm dev`
- **Error Messages**: Check response error field
- **Performance Metrics**: Use health status endpoint

---

Last Updated: 2026-05-27  
Status: ✅ Production Ready
