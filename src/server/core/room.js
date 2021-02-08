import { Socket } from "socket.io";
import { awaitMessage } from "./await_message.js";

export class Room {

    /**
     *
     * @param {object} data
     * @param {string} data.shape
     * @param {number} data.level
     * @param {string} data.id
     * @param {boolean} isPublic
     */
    constructor(data) {
        this.id = data.id;
        this.shape = data.shape;
        this.level = data.level;
        this.isPublic = data.isPublic;

        /** @type {Map<string, Socket>} */
        this.sockets = new Map();
    }

    /** @param {Socket} socket */
    addSocket(socket) {
        this.sockets.set(socket.id, socket);

        if (!this.host) this.host = socket;
    }

    /** @param {Socket} socket */
    removeSocket(socket) {
        this.sockets.delete(socket.id);
        if (this.host.id === socket.id) {
            this.host = this.getSocket();
        }
    }

    getSocket() {
        let socket = null;
        this.sockets.forEach(sock => socket = sock);
        return socket;
    }

    redistributeEvent(sender, event, data) {
        this.sockets.forEach((socket, id) => {
            if (sender.id === id) return;

            socket.emit(event, data);
        })
    }

    async generateSavegame() {
        this.host.emit("savegame request");
        return await awaitMessage(this.host, "savegame")
    }

    getData() {
        return {
            id: this.id,
            level: this.level,
            members: this.sockets.size,
            shape: this.shape
        }
    }
}