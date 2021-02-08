import { readFile, readFileSync } from "fs";
import { createServer } from "http";

/**
 *
 * @param {string} buildDir
 */
export const createWebserver = (buildDir) => {
    return createServer((req, res) => {
        if (req.url === "/") req.url = "/index.html"
        readFile(buildDir + req.url, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end(JSON.stringify(err));
                return;
            }

            res.writeHead(200);
            res.end(data);
        })
    })
}