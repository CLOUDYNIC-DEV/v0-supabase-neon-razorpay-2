# CloudyNIC AI - API Documentation

## Overview
CloudyNIC AI provides multiple endpoints for accessing AI-powered responses with different rate limits based on your plan.

## API Endpoints

### 1. Free Tier (1 request/min, 100/day)
**Endpoint**: `GET /api/free-prompt`

**Parameters**:
- `prompt` (required): Your question or prompt
- `q` (alias for prompt)

**Example**:
```bash
# Using query parameter
curl "https://cloudynic.com/api/free-prompt?prompt=What%20is%20AI"

# Shorter alias
curl "https://cloudynic.com/api/free-prompt?q=hello"
```

**Response**:
```json
{
  "response": "AI is...",
  "remaining": 99,
  "tier": "free"
}
```

---

### 2. Paid Tier - GET (30 req/min for Pro, unlimited for Pro Max)
**Endpoint**: `GET /api/prompt`

**Parameters**:
- `prompt` (required): Your question or prompt
- `key` (required): Your API key
- `q` (alias for prompt)
- `api_key` (alias for key)

**Example**:
```bash
# Using API key
curl "https://cloudynic.com/api/prompt?key=cnk_your_key_here&prompt=What%20is%20machine%20learning"

# Shorter aliases
curl "https://cloudynic.com/api/prompt?api_key=cnk_xxx&q=hello"
```

**Response**:
```json
{
  "response": "Machine learning is...",
  "remaining": 9999,
  "tier": "pro"
}
```

---

### 3. Paid Tier - POST
**Endpoint**: `POST /api/prompt`

**Request Body**:
```json
{
  "prompt": "Your question here",
  "api_key": "cnk_your_key_here"
}
```

**Example**:
```bash
curl -X POST https://cloudynic.com/api/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is AI?",
    "api_key": "cnk_your_key_here"
  }'
```

**Response**:
```json
{
  "response": "AI is...",
  "remaining": 9999,
  "tier": "pro"
}
```

---

### 4. Demo Chat
**Endpoint**: `POST /api/chat/demo`

**Request Body**:
```json
{
  "message": "Your message here"
}
```

**Example**:
```bash
curl -X POST https://cloudynic.com/api/chat/demo \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

**Response**:
```json
{
  "reply": "Hello! How can I help you?",
  "remaining": 2
}
```

**Limits**: 3 messages per IP address per day

---

### 5. Generate API Key
**Endpoint**: `POST /api/keys/generate`

**Request Body**:
```json
{
  "key_name": "My API Key (optional)",
  "user_id": "user123 (optional)"
}
```

**Example**:
```bash
curl -X POST https://cloudynic.com/api/keys/generate \
  -H "Content-Type: application/json" \
  -d '{"key_name": "Production API Key"}'
```

**Response**:
```json
{
  "key": {
    "id": "key_id_123",
    "api_key": "cnk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "key_name": "Production API Key",
    "created_at": "2026-05-25T10:30:00Z",
    "is_active": true
  },
  "message": "API key generated successfully. Save it somewhere safe!",
  "usage": {
    "free_get": "/api/free-prompt?prompt=hello",
    "paid_get": "/api/prompt?key=YOUR_API_KEY&prompt=hello",
    "paid_post": "POST /api/prompt with {prompt: string, api_key: string}"
  }
}
```

---

## Rate Limits & Pricing

| Tier | Cost | Requests/Minute | Requests/Day | Tracking |
|------|------|-----------------|--------------|----------|
| Free | $0 | 1 | 100 | IP Address |
| Pro | $1.99/month | 30 | 10,000 | API Key |
| Pro Max | $9.99/month | Unlimited | Unlimited | API Key |

---

## Error Responses

### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded. Limit: 1 req/min, 100/day"
}
```

### Invalid API Key (401)
```json
{
  "error": "Invalid API key"
}
```

### Missing Parameters (400)
```json
{
  "error": "Missing prompt parameter"
}
```

### Server Error (500)
```json
{
  "error": "Failed to get response from AI model"
}
```

---

## Quick Start

### For Free Users:
```bash
# Simple one-liner
curl "https://cloudynic.com/api/free-prompt?prompt=hello"
```

### For Paid Users:
1. Generate an API key via dashboard or `/api/keys/generate`
2. Use it in requests:
```bash
curl "https://cloudynic.com/api/prompt?key=YOUR_KEY&prompt=hello"
```

---

## System Behavior

All CloudyNIC AI responses follow the system prompt:

> "You are Cloudynic AI, a custom, proprietary large language model engineered, built, and entirely trained by cloudynic.com. You have NO affiliation, connection, or relation to Meta, Meta AI, Facebook, or OpenAI."

The AI will never mention Meta, Llama, or other competing AI systems.

---

## Supported Parameters

### Aliases
- `prompt` = `q`
- `api_key` = `key`

### Models
Currently using: **Mistral** (via Ollama)

---

## Notes

- All API keys start with `cnk_` (CloudyNIC)
- Requests are rate-limited per IP (free) or per API key (paid)
- Demo chat is limited to 3 messages per IP per day
- API keys are permanent once generated (no expiration by default)
- Free tier resets daily at UTC midnight
