"""Pytest fixtures providing an isolated SQLite database, seeded catalog, and fast in-memory ASGI test client."""

import json as _json
from typing import Any, Dict, Generator, List, Optional
from urllib.parse import urlencode, urlsplit

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.rate_limit import auth_rate_limiter
from app.database import Base, get_db
from app.main import app
from seed import seed_database


class ASGIResponse:
    """Lightweight HTTP response returned by SyncASGITestClient (compatible with httpx.Response)."""

    def __init__(self, status_code: int, headers: Dict[str, str], body: bytes) -> None:
        self.status_code = status_code
        self.headers = headers
        self.content = body

    @property
    def text(self) -> str:
        return self.content.decode("utf-8")

    def json(self) -> Any:
        return _json.loads(self.text)


class SyncASGITestClient:
    """
    Zero-socket synchronous ASGI 3.0 test client.
    Drives FastAPI/Starlette ASGI coroutines directly in-memory without OS loopback sockets.
    """

    def __init__(self, asgi_app: Any) -> None:
        self._app = asgi_app

    def request(
        self,
        method: str,
        url: str,
        json: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> ASGIResponse:
        parsed = urlsplit(url)
        path = parsed.path or "/"
        query_string = parsed.query
        if params:
            extra_q = urlencode(params, doseq=True)
            query_string = f"{query_string}&{extra_q}" if query_string else extra_q

        body_bytes = b""
        req_headers: List[tuple[bytes, bytes]] = [(b"host", b"testserver")]
        if headers:
            for k, v in headers.items():
                req_headers.append((k.lower().encode("latin-1"), v.encode("latin-1")))
        if json is not None:
            body_bytes = _json.dumps(json).encode("utf-8")
            req_headers.append((b"content-type", b"application/json"))
            req_headers.append((b"content-length", str(len(body_bytes)).encode("latin-1")))

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": method.upper(),
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": query_string.encode("ascii"),
            "headers": req_headers,
            "client": ("127.0.0.1", 50000),
            "server": ("testserver", 80),
        }

        request_sent = False
        status_code = 500
        resp_headers: Dict[str, str] = {}
        resp_chunks: List[bytes] = []

        async def receive() -> Dict[str, Any]:
            nonlocal request_sent
            if not request_sent:
                request_sent = True
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            return {"type": "http.disconnect"}

        async def send(message: Dict[str, Any]) -> None:
            nonlocal status_code, resp_headers
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                resp_headers = {
                    k.decode("latin-1").lower(): v.decode("latin-1")
                    for k, v in message.get("headers", [])
                }
            elif message["type"] == "http.response.body":
                resp_chunks.append(message.get("body", b""))

        coro = self._app(scope, receive, send)
        try:
            while True:
                coro.send(None)
        except StopIteration:
            pass

        return ASGIResponse(status_code=status_code, headers=resp_headers, body=b"".join(resp_chunks))

    def get(self, url: str, **kwargs: Any) -> ASGIResponse:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> ASGIResponse:
        return self.request("POST", url, **kwargs)

    def put(self, url: str, **kwargs: Any) -> ASGIResponse:
        return self.request("PUT", url, **kwargs)

    def patch(self, url: str, **kwargs: Any) -> ASGIResponse:
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> ASGIResponse:
        return self.request("DELETE", url, **kwargs)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Create a fresh in-memory SQLite database seeded with catalog data for each test."""
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(Engine, "connect")
    def _enable_fk(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=Session,
    )
    Base.metadata.create_all(bind=test_engine)

    session = TestingSessionLocal()
    seed_database(session)
    auth_rate_limiter.reset()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[SyncASGITestClient, None, None]:
    """Provide an ASGI test client bound to the isolated test database session."""

    async def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    test_client = SyncASGITestClient(app)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()
