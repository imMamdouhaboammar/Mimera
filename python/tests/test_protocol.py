import unittest

from mimera_worker.protocol import dispatch


class ProtocolTests(unittest.TestCase):
    def test_health_reports_protocol_and_runtime(self):
        result = dispatch("health", {})
        self.assertEqual(result["protocolVersion"], "1")
        self.assertTrue(result["runtime"].startswith("Python "))

    def test_unknown_method_raises_protocol_error(self):
        with self.assertRaisesRegex(Exception, "METHOD_NOT_FOUND"):
            dispatch("missing.method", {})


if __name__ == "__main__":
    unittest.main()
