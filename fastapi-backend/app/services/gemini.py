import httpx
import json
import asyncio
import traceback
import re
from app.config import settings

def extract_json_object(text: str) -> dict | None:
    if not text: return None

    # 1. Clean up the text - remove surrounding whitespace and potential markdown artifacts
    text = text.strip()

    # 2. Try simple json.loads first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 3. Look for json code blocks: ```json ... ``` or ``` ... ```
    json_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_block_match:
        inner_text = json_block_match.group(1).strip()
        try:
            return json.loads(inner_text)
        except json.JSONDecodeError:
            # Attempt repair on the block
            repaired = repair_json(inner_text)
            try:
                return json.loads(repaired)
            except:
                pass

    # 4. Find the first '{' and attempt extraction/repair
    start = text.find("{")
    if start != -1:
        potential_json = text[start:]
        # First try to find the last '}'
        end = potential_json.rfind("}")
        if end != -1:
            raw_obj = potential_json[: end + 1]
            try:
                # Remove control characters
                clean_obj = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', raw_obj)
                return json.loads(clean_obj)
            except json.JSONDecodeError:
                # Try fixing trailing commas
                try:
                    fixed = re.sub(r',\s*([\]}])', r'\1', clean_obj)
                    return json.loads(fixed)
                except:
                    pass

        # If we reach here, it's either truncated or has deeper issues
        repaired = repair_json(potential_json)
        try:
            return json.loads(repaired)
        except:
            pass

    return None

def repair_json(text: str) -> str:
    """
    Robustly attempt to repair truncated or malformed JSON.
    Closes open strings, brackets, and braces.
    """
    stack = []
    is_in_string = False
    is_escaped = False

    # 1. First, handle control characters carefully.
    # We want to remove most control characters except for common ones like \n, \r, \t
    # which are often used in JSON and might be handled by the parser if cleaned up.
    # However, raw newlines inside strings are technically invalid in JSON.
    # A safer approach is to remove them or escape them.

    # We remove characters in range 00-1F except 09 (tab), 0A (LF), 0D (CR)
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)

    repaired_chars = []
    last_char = ''

    for i, char in enumerate(text):
        if is_escaped:
            is_escaped = False
            repaired_chars.append(char)
            last_char = char
            continue

        if char == '"':
            is_in_string = not is_in_string
            repaired_chars.append(char)
        elif char == '\\' and is_in_string:
            is_escaped = True
            repaired_chars.append(char)
        elif not is_in_string:
            if char == '{' or char == '[':
                stack.append(char)
                repaired_chars.append(char)
            elif char == '}':
                if stack and stack[-1] == '{':
                    stack.pop()
                    repaired_chars.append(char)
            elif char == ']':
                if stack and stack[-1] == '[':
                    stack.pop()
                    repaired_chars.append(char)
            elif char in (' ', '\n', '\r', '\t', ':', ',', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '.', 'e', 'E', 't', 'r', 'u', 'e', 'f', 'a', 'l', 's', 'e', 'n', 'u', 'l', 'l'):
                # Basic whitelist of chars allowed outside strings
                repaired_chars.append(char)
        else:
            # Inside string: handle raw newlines by escaping them
            if char == '\n':
                repaired_chars.append('\\')
                repaired_chars.append('n')
            elif char == '\r':
                repaired_chars.append('\\')
                repaired_chars.append('r')
            elif char == '\t':
                repaired_chars.append('\\')
                repaired_chars.append('t')
            else:
                repaired_chars.append(char)

        if i < len(text) - 1:
            last_char = char

    repaired = "".join(repaired_chars).strip()

    # 2. Close open string
    if is_in_string:
        # If it ends with a dangling backslash, remove it
        if repaired.endswith('\\'):
            repaired = repaired[:-1]
        repaired += '"'

    # 3. Handle trailing separators or truncated values
    repaired = repaired.strip()
    if repaired.endswith(':'):
        repaired += ' null'
    elif repaired.endswith(','):
        repaired = repaired[:-1]

    # Check if it ends in the middle of a literal (true, false, null)
    # This is a bit complex, but simple version:
    for literal in ["true", "false", "null"]:
        for i in range(1, len(literal)):
            if repaired.endswith(literal[:i]) and not repaired.endswith(literal):
                repaired = repaired[:-(i)] + literal
                break

    # 4. Close open braces/brackets
    while stack:
        opener = stack.pop()
        if opener == '{':
            repaired += '}'
        else:
            repaired += ']'

    return repaired

def normalize_ai_payload(payload: dict) -> dict:
    # Preserve original payload while ensuring defaults for critical keys
    normalized = payload.copy()

    defaults = {
        "summary": "Report generated successfully.",
        "insights": ["Data processing complete."],
        "recommendations": [],
        "top_keywords_overview": "",
        "competitor_analysis": {
            "inferred_actions": ["No direct competitor intelligence detected in this period."],
            "confidence": "low",
            "actionable_steps": ["Maintain current bidding strategy and monitor market fluctuations."]
        },
        "table_explanations": {},
        "section_specific_advice": {},
        "slide_descriptions": {},
    }

    for key, val in defaults.items():
        if key not in normalized or normalized[key] is None or (isinstance(normalized[key], (list, dict, str)) and not normalized[key]):
            normalized[key] = val

    return normalized

async def call_ollama_simple(site_info: dict, google_cur: dict, google_prev: dict, meta_current: dict) -> dict | None:
    """Generate only section_specific_advice using a short, focused prompt."""
    prompt = f"""Generate a JSON object with key "section_specific_advice".
The value is an object with these keys: kpi_advice, campaign_advice, keyword_advice, device_advice, search_term_advice, demographic_advice, day_hour_advice, network_advice, asset_advice, meta_campaign_advice, meta_adset_advice, meta_device_advice.
For each key, write a detailed, multi-sentence paragraph (3-5 sentences) that explains the issue, references the numbers below, and gives actionable recommendations. Be expert and direct.

Business: {site_info.get('name')} ({site_info.get('url')})
Google Ads (current vs previous):
- Impressions: {google_cur.get('impressions',0)} vs {google_prev.get('impressions',0)}
- Clicks: {google_cur.get('clicks',0)} vs {google_prev.get('clicks',0)}
- Leads: {google_cur.get('conversions',0)} vs {google_prev.get('conversions',0)}
- Cost: ₹{google_cur.get('cost',0):.2f} vs ₹{google_prev.get('cost',0):.2f}
Meta Ads:
- Spend: ₹{meta_current.get('spend',0):.2f}
- Leads: {meta_current.get('leads',0)}
- CTR: {meta_current.get('ctr',0):.1f}%

Return ONLY valid JSON.
"""
    return await call_ollama(prompt)

async def call_ollama_seo_simple(site_info: dict, ga4_totals: dict, gsc_agg: dict) -> dict | None:
    """Generate only section_specific_advice for SEO using a short, focused prompt."""
    prompt = f"""Generate a JSON object with key "section_specific_advice".
The value is an object with keys: kpi_advice, country_advice, activity_advice, page_title_advice, channel_advice, event_advice, platform_advice.
For each key, write a detailed paragraph (3-5 sentences) explaining the issue, referencing numbers below, and giving actionable recommendations.

Business: {site_info.get('name')} ({site_info.get('url')})
GA4:
- Users: {ga4_totals.get('totalUsers',{}).get('current',0)} vs previous {ga4_totals.get('totalUsers',{}).get('previous',0)}
- Sessions: {ga4_totals.get('sessions',{}).get('current',0)} vs previous {ga4_totals.get('sessions',{}).get('previous',0)}
GSC:
- Clicks: {gsc_agg.get('clicks',0)}
- CTR: {gsc_agg.get('ctr',0):.2%}
- Position: {gsc_agg.get('position',0):.1f}

Return ONLY valid JSON.
"""
    return await call_ollama(prompt)

async def call_ollama(prompt: str) -> dict | None:
    print("---> Attempting local fallback via Ollama (llama3.2)...")
    if len(prompt) > 3000:
        prompt = prompt[-3000:]

    url = "http://localhost:11434/api/generate"
    timeout = httpx.Timeout(600.0, connect=10.0, read=590.0, write=20.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                url,
                json={
                    "model": "llama3.2",
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "num_predict": 800,
                        "temperature": 0.7
                    }
                }
            )
            if resp.status_code == 200:
                result = resp.json()
                response_text = result.get("response", "")
                parsed = extract_json_object(response_text)
                if parsed:
                    print("✅ Ollama success")
                    return normalize_ai_payload(parsed)
                else:
                    print(f"!!! Ollama response failed to parse JSON. Raw: {response_text[:100]}...")
    except Exception as e:
        print(f"!!! Ollama exception: {type(e).__name__}")
    return None

async def summarize_advice(advice_list: list[str]) -> list[str]:
    """Use Gemini to shorten advice sentences to a single concise line for presentation."""
    if not advice_list:
        return []

    prompt = f"""Summarize each of the following marketing advice sentences into EXACTLY ONE short, punchy sentence.
Each summary MUST be a single line (max 12-15 words).
DO NOT include multiple sentences. DO NOT use technical jargon if possible.
Focus on the ACTION and the RESULT.
Keep the most important data point if present, but be extremely concise.
Ensure they fit perfectly on a presentation slide.

Advice list:
{json.dumps(advice_list, indent=2)}

Return ONLY a JSON object with a key "recommendations" which is an array of the summarized strings in the same order.
"""
    try:
        result = await call_gemini(prompt)
        summarized = result.get("recommendations")
        if summarized and len(summarized) == len(advice_list):
            return summarized
    except Exception:
        pass
    return advice_list # Fallback to original if something goes wrong

async def call_gemini(prompt: str, normalize: bool = True) -> dict:
    key = settings.gemini_api_key
    if not key:
        print("!!! GEMINI_API_KEY is missing from environment")
        return normalize_ai_payload({}) if normalize else {}

    # Refined priority list:
    model_candidates = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-1.5-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro",
    ]

    full_prompt = "Output ONLY a valid JSON object. No markdown, no explanations. Ensure every key is present.\n\n" + prompt

    async with httpx.AsyncClient(http1=True) as client:
        for model in model_candidates:
            # Priority to v1beta for newest features (JSON mode)
            for version in ["v1beta", "v1"]:
                url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent"

                gen_config = {
                    "temperature": 0.1, # Even lower temperature for maximum stability
                    "maxOutputTokens": 8192
                }

                if version == "v1beta":
                    gen_config["responseMimeType"] = "application/json"

                print(f"[Gemini Attempt] Trying {model} ({version})...")

                try:
                    resp = await client.post(url, params={"key": key}, json={
                        "contents": [{"parts": [{"text": full_prompt}]}],
                        "generationConfig": gen_config
                    }, timeout=60.0)

                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            print(f"!!! {model} ({version}) returned no candidates.")
                            continue

                        candidate = candidates[0]
                        content = candidate.get("content", {})
                        parts = content.get("parts", [])

                        if not parts:
                            print(f"!!! {model} ({version}) returned empty parts.")
                            continue

                        text = parts[0].get("text", "")
                        if not text:
                            print(f"!!! {model} ({version}) returned empty text.")
                            continue

                        parsed = extract_json_object(text)
                        if parsed:
                            # Use the label if provided for more granular logging
                            log_label = f" for {prompt.splitlines()[0][:30]}..." if not normalize else ""
                            print(f"✅ [GEMINI] Success: {model} ({version})")
                            return normalize_ai_payload(parsed) if normalize else parsed
                        else:
                            print(f"!!! [GEMINI] {model} ({version}) 200 OK but JSON parsing failed.")
                            # Try to see if it's truncated and repairable
                            repaired = repair_json(text)
                            try:
                                parsed_repaired = json.loads(repaired)
                                print(f"✅ [GEMINI] Success (Repaired): {model} ({version})")
                                return normalize_ai_payload(parsed_repaired) if normalize else parsed_repaired
                            except:
                                print(f"Full response text (Failed to parse):\n{text[:500]}...")
                    elif resp.status_code == 429:
                        print(f"!!! {model} ({version}) 429 Rate Limit Exceeded. Waiting 5s...")
                        await asyncio.sleep(5) # Simple backoff
                        # Retry once for 429 if it's the first attempt on this model
                        continue
                    elif resp.status_code == 404:
                        # Silently skip if it's the v1 version of a preview model
                        if version == "v1beta":
                            print(f"!!! {model} ({version}) 404 Model Not Found.")
                    elif resp.status_code == 400:
                        print(f"!!! {model} ({version}) 400 Bad Request. Body: {resp.text[:150]}")
                    elif resp.status_code == 503:
                        print(f"!!! {model} ({version}) 503 Service Unavailable.")
                    else:
                        print(f"!!! {model} ({version}) Error {resp.status_code}")
                except Exception as e:
                    print(f"!!! {model} ({version}) Exception: {type(e).__name__}")
                    continue

        print("--- All Gemini attempts failed. Fallback to Ollama may follow. ---")
        return normalize_ai_payload({}) if normalize else {}
