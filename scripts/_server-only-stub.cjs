// `import "server-only"` throws outside a server component, which is the whole
// point of it: it stops a module reaching a browser bundle. A check script is
// neither, so it says so once, here, rather than every module pretending it
// might be a client.
const Module = require("node:module");
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === "server-only") return {};
  return load.call(this, request, ...rest);
};
