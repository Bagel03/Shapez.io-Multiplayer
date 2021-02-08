export const awaitMessage = (socket, message) => {
    return new Promise((res, rej) => socket.once(message, res));
}