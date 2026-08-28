import ast
import sys

files = [
    "D:/BNB fast/fastapi-backend/app/workers/seo_worker.py",
    "D:/BNB fast/fastapi-backend/app/workers/performance_worker.py"
]

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as source:
            ast.parse(source.read())
        print(f"{f}: OK")
    except SyntaxError as e:
        print(f"{f}: SyntaxError: {e}")
        print(f"Line: {e.lineno}, Offset: {e.offset}, Text: {e.text}")
    except Exception as e:
        print(f"{f}: Error: {e}")
