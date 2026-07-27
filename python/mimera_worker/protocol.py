import platform
from dataclasses import dataclass
from typing import Any, Dict

from . import PROTOCOL_VERSION


@dataclass
class ProtocolError(Exception):
    code: str
    message: str
    data: Any = None

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


def dispatch(method: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(params, dict):
        raise ProtocolError("INVALID_PARAMS", "Worker params must be an object")
    if method == "health":
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "runtime": f"Python {platform.python_version()}",
            "capabilities": ["health"],
        }
    raise ProtocolError("METHOD_NOT_FOUND", f"Unknown worker method: {method}")


def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    request_id = request.get("id")
    if not isinstance(request_id, str) or not request_id:
        raise ProtocolError("INVALID_REQUEST", "Request id must be a non-empty string")
    if request.get("protocolVersion") != PROTOCOL_VERSION:
        raise ProtocolError("PROTOCOL_MISMATCH", "Unsupported protocol version")
    method = request.get("method")
    if not isinstance(method, str) or not method:
        raise ProtocolError("INVALID_REQUEST", "Method must be a non-empty string")
    params = request.get("params", {})
    result = dispatch(method, params)
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "id": request_id,
        "ok": True,
        "result": result,
    }
