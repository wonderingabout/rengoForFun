// go game server:

// make a class later

const Game = {
    player: { color: "B",
              players: [],
              blackPlayers: [],
              whitePlayers: [],
              isTeam: false,
            },
    board: [],
    createBoard() {
        for (let i = 0; i <= 18; i++) {
            this.board[i] = [];
            for (let j = 0; j <= 18; j++) {
                this.board[i][j] = null;
            }
        }
    },
    line: null, // ex: 4
    colm: null, // ex: 3
    move: "", // ex: "R16"
    lines: [],
    colms: [],
    moves: [],
    getLineColm(server) {
        this.line = server.line;
        this.colm = server.colm;
    },
    checkLineColmIsNotValid(line, colm) {
        return [line, colm].some( (e) => e < 0 || e > 19 );
    },
    convertLineColmToMove() {
        if (this.line === "pass" && this.colm === "pass") {
            this.move = "pass";
        } else {
            const letters = ["A", "B", "C", "D", "E", "F", "G",
                             "H", "I", "J", "K", "L", "M", "N",
                             "O", "P", "Q", "R", "S", "T"];
            this.move = `${letters[this.line]}${this.colm + 1}`;
        }
    },
    checkRepeatedMoveTwoAgo() {
        // ...... repeated board position is more complex than just
        // checking move from 2 moves ago, should be able to backwards calculate
        // board as it was 2 moves ago
        // start with this for now
        return (this.moves[this.moves.length - 2] === move);
    },
    checkSnapback() {
        //const fakeCapture = ......................
        return ((this.captures.length - 1) !== fakeCapture);
    },
    createNewGroup(line, colm) {
        this.group = { color: this.board[line][colm],
                       oppositeColor: getOppositeColor(this.board[line][colm]),
                       board: createBoard()
                     };
    },
    // using recursion:
    // ex: of how it works provided by @Dorus: https://github.com/Dorus
    // inspired on https://en.m.wikipedia.org/wiki/Flood_fill
    fill(x, y, color, oppositeColor, gameBoard, groupBoard) {
        // fill a new empty groupBoard only with the group's coordinates
    },
    fillSanityChecks(x, y, color, oppositeColor, gameBoard, groupBoard) {
        // check if there is no stone (hence no group) in that position
        if (!gameBoard[x][y]) {
            throw new `No group in position line:${x} colm:${y}`;
        }
        this.fill(x, y, color, oppositeColor, gameBoard, groupBoard);
    },
    captures: { B: [],
                W: [],
                current: 0
              },
    fakeCaptureNewBoard() {
        // don't actually capture, return a copy of what
        // the future board would be if the capture happened 
    },
    captureGroup() {
        // remove all stones of dead group, do not play our move
    },
    checkSuicide() {
        // return true if the move is played in the last liberty of the group
    },
    showBoardMsg(msg) {
        // post msg through server API
    },
    score: null,
    winner: null,
    checkPass() {
        return (this.move === "pass");
    },
    checkDoublePass() {
        return (this.move === this.moves[this.moves.length - 1]);
    },
    statuses: { isFull: false,
                isPlaying: false,
                isScored: false,
                isResigned: false,
                isFinished: false
              },
    checkBoardIsFull(board) {
        for (let i = 0; i <= 18; i++) {
            for (let j = 0; j <= 18; j++) {
                if (!board[i][j]) {
                    return false;
                }
            }
        }
        return true;
    },
    updateStatus() {
        for (status in this.statuses) {
            // we should not need to update these if we enforce
            // specific behaviour when they become true
            if (status === "isFull") {
                this.statuses[status] = checkBoardIsFull(this.board);

            } else {
                this.statuses[status] = server.statuses[status];
            }
        }
    },
    playMove() {
        this.board[this.line][this.colm] = this.player.color;
    
        // if (capture) capture and remove dead stones and add to captures count
        this.captureGroup();
    
        this.moves.push(this.move);
        this.lines.push(this.line);
        this.colms.push(this.colm);
    
    },
    getOppositeColor(color) {
        return (color === "B" ? "W" : "B");
    },
    switchPlayer() {
        this.player.color = getOppositePlayer();
    },
    playGame() {
        this.createBoard();

        while (!this.gameState.values.some( (bool) => Boolean(bool)) ) {
            this.getMove(server);
            if (!this.checkPass()) {
                if (this.board[this.line][this.colm]) {
                    this.showBoardMsg(`Invalid board move requested: already filled`);
                    continue;
                }
                // ko rule
                if (this.checkRepeatedMoveTwoAgo() &&
                    !this.checkSnapback()) {
                    this.ShowBoardMsg(`Invalid board move requested: can't recapture in a ko position`);
                    continue;
                }
                this.playMove();
                this.switchPlayer();
                this.updateStatus();
                continue;
            } else {
                // pass is a move, resign is an event: handle differently
                if (this.checkDoublePass()) {
                    this.scoreGame();
                    if (this.statuses.isScored) {
                        this.endGame();
                        this.uploadGameToServer(server);
                        break;
                    }
                    continue;
                }
                continue;
            }
        }
    },
    scoreGame() {
        // let both players manually remove dead stones
        // until they both agree on score
    },
    endGame() {
        // update all data of the completed game before
        // we submit it to server
    },
    uploadGameToServer(server) {
        // once the game has ended, upload it to server
    }
};

Game.playGame();
