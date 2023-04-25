const { request } = require("http")

const port = process.env.HEALTHCHECK_PORT || 80

const req = request(`http://localhost:${port}/`, res =>
  process.exit(res.statusCode == 200 ? 0 : 1)
)

req.on("error", () => process.exit(1))

req.end()
