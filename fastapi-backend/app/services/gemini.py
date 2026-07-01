import httpx
import json
import asyncio
import traceback
import re
from app.config import settings

def extract_json_object(text: str) -> dict | None:
    if not text: return None
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError: pass
    json_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_block_match:
        inner_text = json_block_match.group(1).strip()
        try: return json.loads(inner_text)
        except json.JSONDecodeError:
            repaired = repair_json(inner_text)
            try: return json.loads(repaired)
            except: pass
    start = text.find("{")
    if start != -1:
        potential_json = text[start:]
        end = potential_json.rfind("}")
        if end != -1:
            raw_obj = potential_json[: end + 1]
            try:
                clean_obj = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', raw_obj)
                return json.loads(clean_obj)
            except json.JSONDecodeError:
                try:
                    fixed = re.sub(r',\s*([\]}])', r'\1', clean_obj)
                    return json.loads(fixed)
                except: pass
        repaired = repair_json(potential_json)
        try: return json.loads(repaired)
        except: pass
    return None

def repair_json(text: str) -> str:
    if not text: return ""
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)
    stack = []
    is_in_string = False
    is_escaped = False
    repaired_chars = []
    for char in text:
        if is_escaped:
            is_escaped = False
            repaired_chars.append(char)
            continue
        if char == '"':
            is_in_string = not is_in_string
            repaired_chars.append(char)
        elif char == '\\' and is_in_string:
            is_escaped = True
            repaired_chars.append(char)
        elif not is_in_string:
            if char in ('{', '['):
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
                repaired_chars.append(char)
        else:
            if char == '\n': repaired_chars.extend(['\\', 'n'])
            elif char == '\r': repaired_chars.extend(['\\', 'r'])
            elif char == '\t': repaired_chars.extend(['\\', 't'])
            else: repaired_chars.append(char)
    repaired = "".join(repaired_chars).strip()
    if is_in_string:
        if repaired.endswith('\\'): repaired = repaired[:-1]
        repaired += '"'
    if stack and stack[-1] == '{':
        last_colon = repaired.rfind(':')
        last_quote = repaired.rfind('"')
        if last_quote > last_colon:
            last_comma = repaired[:last_quote].rfind(',')
            if last_comma > last_colon: repaired = repaired[:last_comma]
            elif last_colon != -1: repaired = repaired[:last_colon+1] + ' "Data truncated"'
    for literal in ["true", "false", "null"]:
        for i in range(1, len(literal)):
            if repaired.endswith(literal[:i]) and not repaired.endswith(literal):
                repaired = repaired[:-i] + literal
                break
    while stack:
        opener = stack.pop()
        repaired = repaired.strip()
        if repaired.endswith(','): repaired = repaired[:-1]
        repaired += '}' if opener == '{' else ']'
    return repaired

def normalize_ai_payload(payload: dict) -> dict:
    normalized = payload.copy()
    defaults = {
        "summary": "Report generated successfully.", "insights": ["Data processing complete."],
        "recommendations": [], "top_keywords_overview": "",
        "competitor_analysis": {"inferred_actions": ["No actions detected."], "confidence": "low", "actionable_steps": ["Monitor market."]},
        "table_explanations": {}, "section_specific_advice": {}, "slide_descriptions": {},
    }
    for key, val in defaults.items():
        if key not in normalized or not normalized[key]: normalized[key] = val
    return normalized

ai_semaphore = asyncio.Semaphore(1)

async def call_gemini(prompt: str, normalize: bool = True) -> dict:
    key = settings.gemini_api_key
    if not key: return normalize_ai_payload({}) if normalize else {}
    model_candidates = [
        "gemini-3.5-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.1-pro-preview",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite-preview-02-05",
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash-thinking-exp-01-21",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-2.0-pro-exp-02-05"
    ]
    full_prompt = "Output ONLY valid JSON. No markdown.\n\n" + prompt
    async with ai_semaphore:
        async with httpx.AsyncClient(http1=True) as client:
            for model in model_candidates:
                for version in ["v1beta", "v1"]:
                    url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent"
                    gen_config = {"temperature": 0.1, "maxOutputTokens": 8192}
                    if version == "v1beta": gen_config["responseMimeType"] = "application/json"
                    for attempt in range(1, 3):
                        print(f"[Gemini Attempt] {model} ({version}) - Attempt {attempt}...")
                        try:
                            resp = await client.post(url, params={"key": key}, json={"contents": [{"parts": [{"text": full_prompt}]}], "generationConfig": gen_config}, timeout=90.0)
                            if resp.status_code == 200:
                                data = resp.json()
                                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                if not text:
                                    print(f"!!! {model} returned empty response.")
                                    continue
                                print(f"--- RAW OUTPUT ({model}) ---\n{text[:500]}...\n-------------------")
                                parsed = extract_json_object(text)
                                if parsed: return normalize_ai_payload(parsed) if normalize else parsed
                                # Try repair
                                parsed_rep = extract_json_object(repair_json(text))
                                if parsed_rep: return normalize_ai_payload(parsed_rep) if normalize else parsed_rep
                            elif resp.status_code == 429:
                                print(f"!!! {model} 429 Rate Limit. Skipping.")
                                break
                            elif resp.status_code == 404:
                                print(f"!!! {model} ({version}) 404 Not Found. Skipping.")
                                break
                            else:
                                err_body = resp.text[:200]
                                print(f"!!! {model} ({version}) failed with status {resp.status_code}: {err_body}")
                                break
                        except Exception as e:
                            print(f"!!! Exception for {model}: {str(e)}")
                            await asyncio.sleep(1)
    return normalize_ai_payload({}) if normalize else {}

async def summarize_advice(advice_list: list[str]) -> list[str]:
    if not advice_list: return []
    prompt = f"Summarize these strings into punchy 12-word sentences. JSON 'recommendations' array: {json.dumps(advice_list)}"
    try:
        res = await call_gemini(prompt)
        if res.get("recommendations"): return res["recommendations"]
    except: pass
    return advice_list
