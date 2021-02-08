import { Server } from "socket.io";
import { EventManager } from "./event_manager.js";
import { RoomManger } from "./room_manager.js";

export class Manager {
    constructor() {
        this.io = null;
        this.eventManager = new EventManager(this);
        this.roomManager = new RoomManger();

    }

    initialize(server) {
        this.io = new Server(server);
        this.eventManager.initialize(this.io);
    }
}