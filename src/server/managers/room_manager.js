import { Socket } from "socket.io";
import { Room } from "../core/room.js";

export class RoomManger {
    constructor() {
        /** @type {Map<string, Room>} */
        this.rooms = new Map();

        this.roomChars = "QWERTYUIOPASDFGHJKLZXCVBNM";
        this.roomCodeLen = 6;

        // Used for fast lookup
        /** @type {Map<socket, string>} */
        this.socketsToRoomIDs = new Map();

        /** @type {Map<string, Room>} */
        this.publicRooms = new Map()
    }

    /**
     *
     * @param {object} data
     * @param {string} data.shape
     * @param {number} data.level
     * @param {boolean} data.isPublic
     */
    createRoom(data) {
        let ID = "";

        for (let i = 0; i < this.roomCodeLen; i++)
            ID += this.roomChars[Math.floor(Math.random() * this.roomChars.length)];

        const room = new Room({ ...data, id: ID });

        this.rooms.set(ID, room);

        if (data.isPublic)
            this.publicRooms.set(ID, room);

        return ID;
    }

    /**
     * @param {string} ID
     */
    removeRoom(ID) {
        if (this.publicRooms.has(ID)) this.publicRooms.delete(ID);
        this.rooms.delete(ID);
    }

    /**
     * @param {Socket} socket
     * @param {string} roomID
     */
    addSocketToRoom(socket, roomID) {
        const room = this.rooms.get(roomID);

        room.addSocket(socket);
        this.socketsToRoomIDs.set(socket, roomID);
    }

    /**
     * @param {Socket} socket
     */
    removeSocketFromRoom(socket) {
        if (this.socketsToRoomIDs.has(socket)) {
            const room = this.rooms.get(this.socketsToRoomIDs.get(socket));
            this.socketsToRoomIDs.delete(socket)
            if (room.sockets.size === 1) {
                this.removeRoom(room.id);
                return;
            }
            room.removeSocket(socket)
            this.socketsToRoomIDs.delete(socket)

        }

    }
}