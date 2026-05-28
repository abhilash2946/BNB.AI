import httpx
import json
import re
import asyncio
from app.config import settings

def extract_json_object(text: str) -> dict | None:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    candidate = text[start : end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None

def normalize_ai_payload(payload: object) -> dict:
    if not isinstance(payload, dict):
        return {
            "summary": "SEO analysis completed. Details are available in the dashboard.",
            "insights": ["Successfully processed site performance data"],
            "recommendations": [],
            "top_keywords_overview": "The top keywords table summarizes the search queries generating organic traffic and shows which terms are contributing most to visibility.",
            "table_explanations": {},
        }
    summary = payload.get("summary") or payload.get("overview") or payload.get("narrative") or payload.get("text") or "SEO analysis completed. Details are available in the dashboard."
    insights = payload.get("insights") or payload.get("findings") or payload.get("highlights") or []
    if isinstance(insights, str):
        insights = [insights]
    if not isinstance(insights, list):
        insights = []

    recommendations = payload.get("recommendations") or payload.get("actions") or payload.get("next_steps") or []
    if isinstance(recommendations, str):
        recommendations = [{"title": "Recommendation", "description": recommendations, "impact": "High", "effort": "Medium"}]
    if isinstance(recommendations, list):
        normalized_recs = []
        for rec in recommendations:
            if isinstance(rec, str):
                normalized_recs.append({"title": "SEO Advice", "description": rec, "impact": "High", "effort": "Medium"})
            elif isinstance(rec, dict):
                normalized_recs.append({
                    "title": rec.get("title") or "SEO Advice",
                    "description": rec.get("description") or "N/A",
                    "impact": rec.get("impact") or "High",
                    "effort": rec.get("effort") or "Medium"
                })
        recommendations = normalized_recs
    else:
        recommendations = []

    top_keywords_overview = payload.get("top_keywords_overview") or payload.get("secondary_overview") or payload.get("keywords_overview") or ""
    if not isinstance(top_keywords_overview, str):
        top_keywords_overview = ""
    table_explanations = payload.get("table_explanations") or {}
    if not isinstance(table_explanations, dict):
        table_explanations = {}
    return {
        "summary": summary,
        "insights": insights or ["Successfully processed site performance data"],
        "recommendations": recommendations or ["Review organic traffic and keyword trends"],
        "top_keywords_overview": top_keywords_overview,
        "table_explanations": table_explanations,
    }

async def call_gemini(prompt: str) -> dict:
    # Prioritizing the latest 2.5 models, with 2.0 and 1.5 as robust fallbacks.
    # All Flash models listed below have a generous free tier in Google AI Studio.
    model_candidates = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest"
    ]
    params = {"key": settings.gemini_api_key}
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "summary": {"type": "STRING"},
                    "insights": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "recommendations": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "title": {"type": "STRING"},
                                "description": {"type": "STRING"},
                                "impact": {"type": "STRING"},
                                "effort": {"type": "STRING"}
                            },
                            "required": ["title", "description", "impact", "effort"]
                        }
                    },
                    "top_keywords_overview": {"type": "STRING"},
                    "table_explanations": {
                        "type": "OBJECT",
                        "properties": {
                            "kpi_overview": {"type": "STRING"},
                            "active_users_by_country": {"type": "STRING"},
                            "user_activity_over_time": {"type": "STRING"},
                            "views_by_page_title": {"type": "STRING"},
                            "sessions_by_channel": {"type": "STRING"},
                            "event_count_by_event_name": {"type": "STRING"},
                            "key_events_by_platform": {"type": "STRING"}
                        },
                        "required": ["kpi_overview", "active_users_by_country", "user_activity_over_time",
                                     "views_by_page_title", "sessions_by_channel", "event_count_by_event_name",
                                     "key_events_by_platform"]
                    }
                },
                "required": ["summary", "insights", "recommendations", "top_keywords_overview", "table_explanations"]
            }
        }
    }

    async with httpx.AsyncClient() as client:
        last_error = None
        for attempt, model in enumerate(model_candidates, start=1):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                print(f"---> Calling Gemini API ({model})...")
                resp = await client.post(url, params=params, headers=headers, json=payload, timeout=60.0)

                # If model doesn't support responseSchema, retry without it
                if resp.status_code == 400 and "responseSchema" in resp.text:
                    print(f"!!! {model} does not support responseSchema, retrying without it...")
                    fallback_payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.3,
                            "maxOutputTokens": 2048,
                            "responseMimeType": "application/json"
                        }
                    }
                    resp = await client.post(url, params=params, headers=headers, json=fallback_payload, timeout=60.0)

                if resp.status_code != 200:
                    error_text = resp.text
                    print(f"!!! Gemini API Error {resp.status_code} on {model}: {error_text}")
                    if resp.status_code in {429, 500, 503} and attempt < len(model_candidates):
                        last_error = Exception(f"Gemini API Error {resp.status_code}: {error_text}")
                        await asyncio.sleep(0.5 * attempt)
                        continue
                    if attempt < len(model_candidates):
                        continue
                    raise Exception(f"Gemini API Error {resp.status_code}: {error_text}")

                result = resp.json()
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                parsed = extract_json_object(text)
                if parsed is not None:
                    return normalize_ai_payload(parsed)
                print(f"!!! No JSON object found in Gemini response for {model}")
                print(f"Raw text from AI: {text}")
                last_error = ValueError("No JSON object found in Gemini response")
            except (KeyError, IndexError, json.JSONDecodeError, ValueError) as e:
                print(f"!!! Error processing Gemini response from {model}: {e}")
                last_error = e
                if attempt < len(model_candidates):
                    await asyncio.sleep(0.5 * attempt)
                    continue
            except Exception as e:
                print(f"!!! Gemini call failed on {model}: {e}")
                last_error = e
                if attempt < len(model_candidates):
                    await asyncio.sleep(0.5 * attempt)
                    continue
        print(f"!!! Gemini fallback exhausted: {last_error}")
        return normalize_ai_payload({})
