const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const http = require("http");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo so @fresh-food/ui and @fresh-food/design-tokens are bundled
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and prioritize projectRoot node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Proxy /api/ requests directly to the NestJS backend (port 4000)
// This allows mobile devices connecting via Expo Tunnel or LAN to access the backend seamlessly
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith("/api/")) {
        const options = {
          hostname: "127.0.0.1",
          port: 4000,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: "localhost:4000",
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on("error", (err) => {
          console.warn("[Metro API Proxy] Failed to reach backend:", err.message);
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 502,
              message: "Backend unreachable on port 4000",
            }),
          );
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;

