import json
import sys
from typing import Any, Dict

from . import PROTOCOL_VERSION
from .protocol import ProtocolError, handle_request


def error_response(request_id: Any, error: ProtocolError) -> Dict[str, Any]:
    response: Dict[str, Any] = {
        "protocolVersion": PROTOCOL_VERSION,
        "id": request_id if isinstance(request_id, str) else "unknown",
        "ok": False,
        "error": {
            "code": error.code,
            "message": error.message,
        },
    }
    if error.data is not None:
        response["error"]["data"] = error.data
    return response


def main() -> int:
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        request_id: Any = "unknown"
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ProtocolError("INVALID_REQUEST", "Request must be a JSON object")
            request_id = request.get("id", "unknown")
            response = handle_request(request)
        except json.JSONDecodeError as error:
            response = error_response(
                request_id,
                ProtocolError("INVALID_JSON", "Request is not valid JSON", {"position": error.pos}),
            )
        except ProtocolError as error:
            response = error_response(request_id, error)
        except Exception:
            response = error_response(
                request_id,
                ProtocolError("WORKER_FAILURE", "Python worker failed safely"),
            )
        sys.stdout.write(json.dumps(response, separators=(",", ":")) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
