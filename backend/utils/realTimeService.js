class RealTimeService {
  static emitToRoom(room, event, payload) {
    // noop for tests; in production this would use socket.io or pub/sub
    return true;
  }

  static broadcast(event, payload) {
    return true;
  }
}

module.exports = { RealTimeService };
