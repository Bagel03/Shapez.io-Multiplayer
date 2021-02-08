import { cachebust } from "../core/cachebust";
import { GameState } from "../core/game_state";
import { GLOBAL_APP } from "../core/globals";
import { makeButton, makeDiv } from "../core/utils";
import { awaitMessage } from "../../server/core/await_message.js";
import { HubGoals } from "../game/hub_goals";

export class RoomSelectState extends GameState {
    constructor() {
        super("RoomSelectState");
        this.app = GLOBAL_APP;
        const savegameMetadata = this.app.savegameMgr.getSavegamesMetaData()[0];
        if (savegameMetadata) {
            this.savegame = this.app.savegameMgr.getSavegameById(savegameMetadata.internalId);
            console.log("found a game")
        } else {
            this.savegame = this.app.savegameMgr.createNewSavegame();
            console.log("had to make new room")
        }
    }

    getInnerHTML() {
        return `
            <div class="logo">
                <img src="${cachebust("res/logo.png")}" alt="shapez.io Logo">
                <span class="updateLabel">v${G_BUILD_VERSION}</span>
            </div>
            <div class="maincontainer">
                <div class="createroom"></div>
                <div class="selectroom"></div>
                <div class="entercode">
                </div>
            </div>
        `;
    }

    getElements() {
        this.elements = {
            main: this.htmlElement.querySelector(".maincontainer"),

            /** @type {HTMLElement} */
            createRoomSection: null,
            /** @type {HTMLElement} */
            selectRoomSection: null,
            /** @type {HTMLElement} */
            enterCodeSection: null,
            /** @type {HTMLElement} */
            createRoomButton: null,
            /** @type {HTMLElement} */
            createRoomInfo: null,
            /** @type {HTMLElement} */
            importButton: null,
            /** @type {HTMLElement} */
            createRoomLevelInfo: null,
            /** @type {HTMLElement} */
            createRoomLevelText: null,
            /** @type {HTMLElement} */
            publicPrivateButton: null,
            /** @type {HTMLInputElement} */
            enterCodeInput: null,
            /** @type {HTMLElement} */
            joinRoomButton: null
        }


        this.elements.createRoomSection = this.elements.main.querySelector(".createroom");
        this.elements.selectRoomSection = this.elements.main.querySelector(".selectroom");
        this.elements.enterCodeSection = this.elements.main.querySelector(".entercode");

        this.elements.createRoomButton = makeButton(this.elements.createRoomSection, ["styledbutton", "createroombutton"], "CREATE ROOM");

        this.elements.createRoomInfo = makeDiv(this.elements.createRoomSection, null, ["mainroominfo"], null);

        this.elements.importButton = makeButton(this.elements.createRoomInfo, ["styledbutton", "importbutton"], "IMPORT");

        /** @type {HubGoals} */
        const hubGoals = this.savegame.hasGameDump() ?
            this.savegame.getCurrentDump().hubGoals : { level: 1, currentGoal: { definition: { cachedHash: "CuCuCuCu" } } };

        this.elements.createRoomLevelInfo = makeDiv(this.elements.createRoomInfo, null, ["levelinfo"], null);
        this.elements.createRoomLevelText = makeDiv(this.elements.createRoomLevelInfo, null, ["leveltext"], "LEVEL " + hubGoals.level);
        this.elements.createRoomShape = makeDiv(this.elements.createRoomLevelInfo, null, ["roomshape"], null);
        this.elements.createRoomShape.appendChild(this.drawShape(hubGoals.currentGoal.definition.cachedHash, 75, 75));

        this.elements.publicPrivateButton = makeButton(this.elements.createRoomInfo, ["styledbutton", "public"], "PUBLIC");

        this.elements.enterCodeInput = document.createElement("input");
        this.elements.enterCodeInput.maxLength = 6;
        this.elements.enterCodeSection.appendChild(this.elements.enterCodeInput);
        this.elements.joinRoomButton = makeButton(this.elements.enterCodeSection, ["sytledbutton"], "JOIN")
    }

    async onEnter() {
        this.getElements();
        this.trackClicks(this.elements.publicPrivateButton, this.onPublicPrivateButtonClicked);
        this.trackClicks(this.elements.createRoomButton, this.onCreateRoomButtonClicked);
        this.trackClicks(this.elements.joinRoomButton, this.onJoinButtonClicked);

        this.app.socket.emit("request rooms");
        const roomsData = await awaitMessage(this.app.socket, "rooms");

        roomsData.forEach(data => {
            this.renderRoom(data.id, data.level, data.members, data.shape);
        });

    }

    showCodeErrPopup(code) {
        console.log("Cant find code");
    }

    onPublicPrivateButtonClicked() {
        if (this.elements.publicPrivateButton.classList.contains("public")) {
            this.elements.publicPrivateButton.classList.remove("public");
            this.elements.publicPrivateButton.classList.add("private");
            this.elements.publicPrivateButton.innerText = "PRIVATE";
        } else {
            this.elements.publicPrivateButton.classList.remove("private");
            this.elements.publicPrivateButton.classList.add("public");
            this.elements.publicPrivateButton.innerText = "PUBLIC"
        }
    }

    async onRoomButtonClicked(roomcode) {
        const roomID = roomcode;

        // Request to join that room
        this.app.socket.emit("join room", roomID);

        const savegameData = await awaitMessage(this.app.socket, "savegame");

        const savegame = this.app.savegameMgr.createNewSavegame();
        savegame.currentData = savegameData;

        this.moveToState("InGameState", { savegame })
    }

    async onCreateRoomButtonClicked() {
        // Make initial request to create room
        /** @type {HubGoals} */
        const hubGoals = this.savegame.hasGameDump() ?
            this.savegame.getCurrentDump().hubGoals : { level: 1, currentGoal: { definition: { cachedHash: "CuCuCuCu" } } };

        const data = {
            isPublic: this.elements.publicPrivateButton.classList.contains("public"),
            level: hubGoals.level,
            shape: hubGoals.currentGoal.definition.cachedHash
        }

        this.app.socket.emit("create room", data);
        console.log(data)

        // Get the room id of the newly created room
        const roomID = await awaitMessage(this.app.socket, "created room");

        // Request to join that room
        this.app.socket.emit("join room", roomID);

        // Wait for the server to request a savegame for the room
        await awaitMessage(this.app.socket, "savegame request");

        // Send the new savegame back to the server
        this.app.socket.emit("savegame", this.savegame.currentData);

        const { savegame } = this;

        // Join the room
        this.moveToState("InGameState", {
            savegame
        });
    }

    onImportButtonClicked() { }

    async onJoinButtonClicked() {
        const roomID = this.elements.enterCodeInput.value.toUpperCase();

        // Request to join that room
        this.app.socket.emit("join room", roomID);

        const savegameData = await this.tryJoinRoom(roomID);

        if (typeof savegameData === "string") {
            this.showCodeErrPopup(roomID);
            return;
        }

        const savegame = this.app.savegameMgr.createNewSavegame();
        savegame.currentData = savegameData;

        this.moveToState("InGameState", { savegame })
    }

    tryJoinRoom(code) {
        return Promise.race([awaitMessage(this.app.socket, "savegame"), awaitMessage(this.app.socket, "no room exists")]);
    }

    renderRoom(roomcode, lvlNum, personcount, lvlKey) {
        const room = makeButton(this.elements.selectRoomSection, ["room", "styledbutton"], null)
        makeDiv(room, null, ["roomcode"], roomcode);

        const personAmount = makeDiv(room, null, ["personinfo"], null);
        makeDiv(personAmount, null, ["personcount"], personcount);
        const personImg = document.createElement("img");
        personImg.src = cachebust("res/ui/icons/person.png");
        personAmount.appendChild(personImg);

        const lvlInfo = makeDiv(room, null, ["levelinfo"], null)
        makeDiv(lvlInfo, null, ["levelnum"], lvlNum);
        const shape = makeDiv(lvlInfo, null, ["shape"])
        shape.appendChild(this.drawShape(lvlKey, 50, 50));

        this.trackClicks(room, () => this.onRoomButtonClicked(roomcode));
    }


    drawShape(key, w, h) {
        // COPIDED CODE GO BRRRRRRRRRRRRRRRRRRR

        /* {


         */
        const maxLayer = 4;

        /** @enum {string} */
        const enumSubShape = {
            rect: "rect",
            circle: "circle",
            star: "star",
            windmill: "windmill",
        };

        /** @enum {string} */
        const enumSubShapeToShortcode = {
            [enumSubShape.rect]: "R",
            [enumSubShape.circle]: "C",
            [enumSubShape.star]: "S",
            [enumSubShape.windmill]: "W",
        };

        /** @enum {enumSubShape} */
        const enumShortcodeToSubShape = {};
        for (const key in enumSubShapeToShortcode) {
            enumShortcodeToSubShape[enumSubShapeToShortcode[key]] = key;
        }

        const arrayQuadrantIndexToOffset = [
            { x: 1, y: -1 }, // tr
            { x: 1, y: 1 }, // br
            { x: -1, y: 1 }, // bl
            { x: -1, y: -1 }, // tl
        ];

        // From colors.js
        /** @enum {string} */
        const enumColors = {
            red: "red",
            green: "green",
            blue: "blue",

            yellow: "yellow",
            purple: "purple",
            cyan: "cyan",

            white: "white",
            uncolored: "uncolored",
        };

        /** @enum {string} */
        const enumColorToShortcode = {
            [enumColors.red]: "r",
            [enumColors.green]: "g",
            [enumColors.blue]: "b",

            [enumColors.yellow]: "y",
            [enumColors.purple]: "p",
            [enumColors.cyan]: "c",

            [enumColors.white]: "w",
            [enumColors.uncolored]: "u",
        };

        /** @enum {string} */
        const enumColorsToHexCode = {
            [enumColors.red]: "#ff666a",
            [enumColors.green]: "#78ff66",
            [enumColors.blue]: "#66a7ff",

            // red + green
            [enumColors.yellow]: "#fcf52a",

            // red + blue
            [enumColors.purple]: "#dd66ff",

            // blue + green
            [enumColors.cyan]: "#87fff5",

            // blue + green + red
            [enumColors.white]: "#ffffff",

            [enumColors.uncolored]: "#aaaaaa",
        };

        /** @enum {enumColors} */
        const enumShortcodeToColor = {};
        for (const key in enumColorToShortcode) {
            enumShortcodeToColor[enumColorToShortcode[key]] = key;
        }

        CanvasRenderingContext2D.prototype.beginCircle = function (x, y, r) {
            if (r < 0.05) {
                this.beginPath();
                this.rect(x, y, 1, 1);
                return;
            }
            this.beginPath();
            this.arc(x, y, r, 0, 2.0 * Math.PI);
        };

        const possibleShapesString = Object.keys(enumShortcodeToSubShape).join('');
        const possibleColorsString = Object.keys(enumShortcodeToColor).join('');
        const layerRegex = new RegExp('([' + possibleShapesString + '][' + possibleColorsString + ']|-{2}){4}');

        /////////////////////////////////////////////////////

        function radians(degrees) {
            return (degrees * Math.PI) / 180.0;
        }

        /**
         * Generates the definition from the given short key
         */
        function fromShortKey(key) {
            const sourceLayers = key.split(":");
            if (sourceLayers.length > maxLayer) {
                throw new Error("Only " + maxLayer + " layers allowed");
            }

            let layers = [];
            for (let i = 0; i < sourceLayers.length; ++i) {
                const text = sourceLayers[i];
                if (text.length !== 8) {
                    throw new Error("Invalid layer: '" + text + "' -> must be 8 characters");
                }

                if (text === "--".repeat(4)) {
                    throw new Error("Empty layers are not allowed");
                }

                if (!layerRegex.test(text)) {
                    throw new Error("Invalid syntax in layer " + (i + 1));
                }

                const quads = [null, null, null, null];
                for (let quad = 0; quad < 4; ++quad) {
                    const shapeText = text[quad * 2 + 0];
                    const subShape = enumShortcodeToSubShape[shapeText];
                    const color = enumShortcodeToColor[text[quad * 2 + 1]];
                    if (subShape) {
                        if (!color) {
                            throw new Error("Invalid shape color key: " + key);
                        }
                        quads[quad] = {
                            subShape,
                            color,
                        };
                    } else if (shapeText !== "-") {
                        throw new Error("Invalid shape key: " + shapeText);
                    }
                }
                layers.push(quads);
            }

            return layers;
        }

        /**
         *
         * @param {any} layers
         * @param {HTMLCanvasElement} canvas
         */
        function renderShape(layers, canvas) {
            const context = canvas.getContext("2d");

            context.save();
            context.clearRect(0, 0, 1000, 1000);

            // const w = 512;
            // const h = 512;
            const dpi = 1;

            context.translate((w * dpi) / 2, (h * dpi) / 2);
            context.scale((dpi * w) / 23, (dpi * h) / 23);

            context.fillStyle = "#e9ecf7";

            const quadrantSize = 10;
            const quadrantHalfSize = quadrantSize / 2;

            context.fillStyle = "rgba(40, 50, 65, 0.1)";
            context.beginCircle(0, 0, quadrantSize * 1.15);
            context.fill();

            for (let layerIndex = 0; layerIndex < layers.length; ++layerIndex) {
                const quadrants = layers[layerIndex];

                const layerScale = Math.max(0.1, 0.9 - layerIndex * 0.22);

                for (let quadrantIndex = 0; quadrantIndex < 4; ++quadrantIndex) {
                    if (!quadrants[quadrantIndex]) {
                        continue;
                    }
                    const { subShape, color } = quadrants[quadrantIndex];

                    const quadrantPos = arrayQuadrantIndexToOffset[quadrantIndex];
                    const centerQuadrantX = quadrantPos.x * quadrantHalfSize;
                    const centerQuadrantY = quadrantPos.y * quadrantHalfSize;

                    const rotation = radians(quadrantIndex * 90);

                    context.translate(centerQuadrantX, centerQuadrantY);
                    context.rotate(rotation);

                    context.fillStyle = enumColorsToHexCode[color];
                    context.strokeStyle = "#555";
                    context.lineWidth = 1;

                    const insetPadding = 0.0;

                    switch (subShape) {
                        case enumSubShape.rect: {
                            context.beginPath();
                            const dims = quadrantSize * layerScale;
                            context.rect(
                                insetPadding + -quadrantHalfSize,
                                -insetPadding + quadrantHalfSize - dims,
                                dims,
                                dims
                            );

                            break;
                        }
                        case enumSubShape.star: {
                            context.beginPath();
                            const dims = quadrantSize * layerScale;

                            let originX = insetPadding - quadrantHalfSize;
                            let originY = -insetPadding + quadrantHalfSize - dims;

                            const moveInwards = dims * 0.4;
                            context.moveTo(originX, originY + moveInwards);
                            context.lineTo(originX + dims, originY);
                            context.lineTo(originX + dims - moveInwards, originY + dims);
                            context.lineTo(originX, originY + dims);
                            context.closePath();
                            break;
                        }

                        case enumSubShape.windmill: {
                            context.beginPath();
                            const dims = quadrantSize * layerScale;

                            let originX = insetPadding - quadrantHalfSize;
                            let originY = -insetPadding + quadrantHalfSize - dims;
                            const moveInwards = dims * 0.4;
                            context.moveTo(originX, originY + moveInwards);
                            context.lineTo(originX + dims, originY);
                            context.lineTo(originX + dims, originY + dims);
                            context.lineTo(originX, originY + dims);
                            context.closePath();
                            break;
                        }

                        case enumSubShape.circle: {
                            context.beginPath();
                            context.moveTo(
                                insetPadding + -quadrantHalfSize,
                                -insetPadding + quadrantHalfSize
                            );
                            context.arc(
                                insetPadding + -quadrantHalfSize,
                                -insetPadding + quadrantHalfSize,
                                quadrantSize * layerScale,
                                -Math.PI * 0.5,
                                0
                            );
                            context.closePath();
                            break;
                        }

                        default: {
                            assertAlways(false, "Unkown sub shape: " + subShape);
                        }
                    }

                    context.fill();
                    context.stroke();

                    context.rotate(-rotation);
                    context.translate(-centerQuadrantX, -centerQuadrantY);
                }
            }

            context.restore();
        }

        /////////////////////////////////////////////////////
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        renderShape(fromShortKey(key), canvas);

        return canvas;
    }
}