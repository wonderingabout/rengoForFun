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
    getNewGroup(x, y, gameBoard) {
        return { color: gameBoard[x][y],
                 oppositeColor: this.getOppositeColor(gameBoard[x][y]),
                 board: this.createBoard(),
                 lines: [],
                 colms: [],
                 liberties: { lines: [],
                              colms: []
                            }
               };
    },
    // using recursion:
    // ex: of how it works provided by @Dorus: https://github.com/Dorus
    // inspired on https://en.m.wikipedia.org/wiki/Flood_fill
    /*  input (gameBoard):

        ....
        WBB.
        .WB.
        ..W.

        output (groupBoard) for x = 2 and y = 2:

        .LL.
        .BBL
        ..BL
        ....

    */
    fill(x, y, gameBoard, group) {
        if (this.checkLineColmIsNotValid(x, y)) return; // check if stone is out of board edges

        if (gameBoard[x][y] === group.oppositeColor) return; // check if stone is not part of our group (opposite color)
        if (!gameBoard[x][y]) {
            group.board[x][y] = "L"; // liberty of the group (empty stone)
            group.liberties.lines.push(x);
            group.liberties.colms.push(y);
            return;
        }

        // else gameBoard[x][y] === group.color, do we want to add it ?
        if (group.board[x][y] === group.color || group.board[x][y] === "L") return; // check if we have done this spot before

        group.board[x][y] = group.color; // mark group.board spot as done (our group color),
        group.lines.push(x); // keep track of all our group stone coordinates
        group.colms.push(y);
        // then check the leaves of that marked stone of our group
        fill(x    , y + 1, gameBoard, group);
        fill(x    , y - 1, gameBoard, group);
        fill(x + 1, y    , gameBoard, group);
        fill(x - 1, y    , gameBoard, group);
    },
    getGroup(x, y, gameBoard) {
        // check if there is no stone (hence no group) in that position
        if (!gameBoard[x][y]) {
            return;
        }
        const group = this.getNewGroup(x, y, gameBoard);

        this.fill(x, y, gameBoard, group);
        return group;
    },
    assignGroup() {
        this.group = this.getGroup(this.line, this.colm, this.board);
    },
    checkGroupIsCapturable(group) {
        if (group.liberties.lines.length === 1 &&
            group.liberties.lines[0] === this.line &&
            group.liberties.colms[0] === this.colm) {
            return true;
        }
        return false;
    },
    captures: { B: [],
                W: []
              },
    removeGroup(group) {
        // remove all stones of dead group, do not play our move
        const groupLength = this.group.lines.length;
        for (i in [...Array(groupLength)]) {
            const lines = this.group.lines;
            const colms = this.group.colms;
            this.board[lines[i]][colms[i]] = null;
        }
        this.captures[group.oppositeColor].push(groupLength);
        this.captures[group.color].push(0);
    },
    fakeCaptureGroup(group) {
        // don't actually capture, return a copy of what
        // the future board would be if the capture happened 
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
