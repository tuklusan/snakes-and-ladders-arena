# DeepSeek API Contract — Reconciled for Review Harness

**Reconciliation Date:** 2026-08-30
**Specification Version:** DeepSeek v2.0 Workflow
**Run ID:** REVIEW-20260830-001

---

## 1. Resolved API Contract

| Parameter | Value | Source |
|-----------|-------|--------|
| **Model** | `deepseek-v4-pro` | [Model Matrix](https://api-docs.deepseek.com/quick_start/pricing) |
| **Model Generation** | DeepSeek-V4-Pro-0813 | [Change Log](https://api-docs.deepseek.com/updates) |
| **Base URL (OpenAI)** | `https://api.deepseek.com` | [API Docs](https://api-docs.deepseek.com) |
| **Base URL (Anthropic)** | `https://api.deepseek.com/anthropic` | [API Docs](https://api-docs.deepseek.com) |
| **Endpoint** | `POST /chat/completions` | [Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion) |
| **Authentication** | `Authorization: Bearer ${DEEPSEEK_API_KEY}` | [API Docs](https://api-docs.deepseek.com) |
| **Context Length** | 1M tokens | [Pricing](https://api-docs.deepseek.com/quick_start/pricing) |
| **Max Output** | 384K tokens | [Pricing](https://api-docs.deepseek.com/quick_start/pricing) |

---

## 2. Thinking Mode Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Thinking Toggle** | `{"thinking": {"type": "enabled"}}` (via `extra_body`) | [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) |
| **Reasoning Effort** | `max` (for canonical exhaustive review) | Options: `low`, `high`, `max` |
| **Default Effort** | `high` | Mapped: `medium`→`high`, `xhigh`→`high` |
| **Streaming** | `false` (non-stream for review) | Required for JSON output |
| **Unsupported in Thinking** | `temperature`, `top_p`, `presence_penalty`, `frequency_penalty` | Ignored if passed |

---

## 3. JSON Output Configuration

```json
{
  "response_format": { "type": "json_object" }
}
```
- Must explicitly instruct model to output JSON in prompt
- Empty content possible → must retry
- Truncation indicated by `finish_reason: "length"` → must retry
- Schema validation required locally

---

## 3. Current Logical Request Shape (Chat Completions)

```json
POST https://api.deepseek.com/chat/completions
Headers:
  Content-Type: application/json
  Authorization: Bearer ${DEEPSEEK_API_KEY}

Body:
{
  "model": "deepseek-v4-pro",
  "messages": [
    {"role": "system", "content": "<system prompt>"},
    {"role": "user", "content": "<user prompt with code chunk>"}
  ],
  "thinking": {"type": "enabled"},
  "reasoning_effort": "max",
  "response_format": {"type": "json_object"},
  "max_tokens": 32768,
  "temperature": 0.1,
  "stream": false
}
```

**Note:** When using OpenAI SDK, `thinking` must be passed via `extra_body`:
```python
extra_body={"thinking": {"type": "enabled"}}
```

---

## 4. Documented Finish Reasons

| Reason | Meaning | Harness Action |
|--------|---------|----------------|
| `stop` | Natural completion | Accept |
| `length` | Output truncated | **Retry with larger max_tokens** |
| `content_filter` | Content filtered | Fail round |
| `tool_calls` | Tool calls made | N/A (not used) |
| `insufficient_system_resource` | System resource issue | Retry with backoff |

---

## 5. Retry Policy (Bounded)

| Condition | Action |
|-----------|--------|
| Timeout | Exponential backoff + jitter, max 3 attempts |
| Connection reset | Exponential backoff + jitter, max 3 attempts |
| HTTP 408 | Retry with backoff |
| HTTP 429 | Honor `Retry-After`, max 3 attempts |
| HTTP 5xx (retryable) | Exponential backoff + jitter, max 3 attempts |
| Empty JSON response | Retry (documented behavior) |
| Truncated output (`finish_reason: length`) | Retry with larger `max_tokens` |
| Auth failure (401) | **Fail closed - do not retry** |
| Schema error (400) | **Fail closed - do not retry** |

---

## 6. Responses API (Available but Not Used)

- Native Responses API supported as of 2026-08-13
- Adapted for Codex
- Not used for this review (Chat Completions is stable and documented)

---

## 7. Rate Limits & Pricing (Peak/Off-Peak)

- Peak/off-peak pricing effective 2026-08-16
- Off-peak = 50% of peak
- Off-peak hours: Not specified in current docs
- Implement conservative rate limiting: 3s between requests, 5s between batches

---

## 8. API Contract Hash

```
API_CONTRACT_HASH: sha256 of canonical JSON representation
(To be computed and recorded at harness initialization)
```

---

## 9. Documentation Sources Reconciled

| Source | URL | Retrieved | Hash |
|--------|-----|-----------|------|
| API Home | https://api-docs.deepseek.com | 2026-08-30 | - |
| Chat Completions | https://api-docs.deepseek.com/api/create-chat-completion | 2026-08-30 | - |
| JSON Output | https://api-docs.deepseek.com/guides/json_mode | 2026-08-30 | - |
| Thinking Mode | https://api-docs.deepseek.com/guides/thinking_mode | 2026-08-30 | - |
| Change Log | https://api-docs.deepseek.com/updates | 2026-08-30 | - |
| Pricing/Models | https://api-docs.deepseek.com/quick_start/pricing | 2026-08-30 | - |

---

## 10. Reconciliation Notes

- **No conflicts found** between official pages
- V4 Pro GA release (2026-08-13) confirmed current
- Model identifier `deepseek-v4-pro` maps to DeepSeek-V4-Pro-0813
- Thinking mode `reasoning_effort: max` supported
- JSON Output with `response_format: {type: "json_object"}` supported
- Chat Completions endpoint stable and documented
- Responses API available but not required

---

**CTO Certification:** This API contract has been reconciled against current official DeepSeek documentation as of 2026-08-30. All review harness implementation MUST conform to this contract.

**Signed:** CTO, SANYALnet Labs
**Date:** 2026-08-30