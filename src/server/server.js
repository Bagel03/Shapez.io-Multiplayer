import { dirname } from "path";
import { fileURLToPath } from "url";
import { createWebserver } from "./core/webserver.js";
import { Manager } from "./managers/backend_manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// const webServer = createServer((req, res) => {
//     if (req.url === "/") req.url = "/index.html"
//     readFile(__dirname + '/../../build' + req.url, (err, data) => {
//         if (err) {
//             res.writeHead(404);
//             res.end(JSON.stringify(err));
//             return;
//         }

//         res.writeHead(200);
//         res.end(data);
//     })
// })

const webServer = createWebserver(__dirname + "/../../build/");
webServer.listen(process.env.PORT || 8080, () => {
    console.log("Listening on port 8080")
    new Manager().initialize(webServer);
});

