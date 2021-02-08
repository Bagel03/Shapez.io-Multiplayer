/** typehints:start */
// import { InGameState } from "../states/ingame";
// import { GameRoot } from "./root";
/** typehints:end */

export class SocketManager {

    /**
     *
     * @param {GameRoot} root
     */
    constructor(root) {
        this.root = root;
        this.socket = this.root.app.socket;

        this.initialize();
    }

    initialize() {
        this.socket.on("savegame request", () => {
            /** @type {InGameState} */
            //@ts-ignore
            const gameState = this.root.app.stateMgr.currentState;

            gameState.savegame.updateData(this.root);
            this.socket.emit("savegame", gameState.savegame.currentData);
        })

        this.socket.on("place item", data => this.onItemPlaced(data))
        this.socket.on("delete item", data => this.onItemDeleted(data))
    }

    onItemPlaced(data) {
        this.root.logic.placeItemFromServer(data);
    }

    onItemDeleted(data) {
        this.root.logic.deleteBuildingFromServer(data);
    }

    emitPlaceItemEvent(itemData) {
        this.socket.emit("place item", itemData)
    }

    emitDeleteItemEvent(data) {
        this.socket.emit("delete item", data)
    }
}