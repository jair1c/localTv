from main import app


@app.middleware("http")
async def strip_backend_prefix(request, call_next):
    """Permite que FastAPI funcione tanto en /api como en /__backend/api en Vercel."""
    prefix = "/__backend"
    path = request.scope.get("path", "")

    if path == prefix:
        request.scope["path"] = "/"
    elif path.startswith(f"{prefix}/"):
        request.scope["path"] = path[len(prefix):]

    return await call_next(request)
