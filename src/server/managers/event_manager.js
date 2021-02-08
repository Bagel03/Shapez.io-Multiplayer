import { Server, Socket } from "socket.io";
import { Manager } from "./backend_manager.js"

export class EventManager {

    /**
     *
     * @param {Manager} manager
     */
    constructor(manager) {
        this.io = null;
        this.manager = manager;
    }

    /**
    * @param {Server} io
    */
    initialize(io) {
        this.io = io;
        this.io.sockets.on("connect", socket => this.addSocket(socket))
    }

    /**
     * @param {Socket} socket
     */
    addSocket(socket) {
        console.log("New socket");
        // Room stuff
        socket.on("create room", data => this.createRoom(socket, data));
        socket.on("join room", roomID => this.joinRoom(socket, roomID));
        socket.on("leave room", () => this.leaveRoom(socket));
        socket.on("request rooms", () => this.sendPublicRooms(socket));

        socket.on("disconnect", () => this.removeSocket(socket))

        // // In-game stuff
        socket.on("place item", (data) => this.placeItem(socket, data));
        // socket.on("place bulk item");
        socket.on("delete item", (data) => this.deleteItem(socket, data));
        // socket.on("delete bulk item");
    }

    /**
     *
     * @param {Socket} socket
     */
    removeSocket(socket) {
        this.manager.roomManager.removeSocketFromRoom(socket);
    }

    /**
     * @param {Socket} socket
     */
    createRoom(socket, data) {
        const roomID = this.manager.roomManager.createRoom(data);
        socket.emit("created room", roomID);
    }

    /**
     * @param {Socket} socket
     * @param {string} roomID
     */
    async joinRoom(socket, roomID) {
        if (!this.manager.roomManager.rooms.has(roomID)) {
            socket.emit("no room exists", roomID);
            return;
        }


        this.manager.roomManager.addSocketToRoom(socket, roomID);
        const savegame = await this.manager.roomManager.rooms.get(roomID).generateSavegame();

        socket.emit("savegame", savegame)

    }

    /**
     * @param {Socket} socket
     */
    leaveRoom(socket) {
        this.manager.roomManager.removeSocketFromRoom(socket)
    }

    sendPublicRooms(socket) {
        const dataArr = Array.from(this.manager.roomManager.publicRooms.values())
            .map(room => room.getData());

        socket.emit("rooms", dataArr);
    }

    /**
     *
     * @param {Socket} socket
     * @param {any} data
     */
    placeItem(socket, data) {
        const roomID = this.manager.roomManager.socketsToRoomIDs.get(socket);
        const room = this.manager.roomManager.rooms.get(roomID);

        room.redistributeEvent(socket, "place item", data)
    }

    deleteItem(socket, data) {
        const roomID = this.manager.roomManager.socketsToRoomIDs.get(socket);
        const room = this.manager.roomManager.rooms.get(roomID);
        console.log("deleting item")
        room.redistributeEvent(socket, "delete item", data)
    }
}