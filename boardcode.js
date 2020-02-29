// go game server:

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
    checkLineColmIsValid(line, colm) {
        return [line, colm].some( e => (e < 0 || e > 19) );
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
    group: {},
    createGroup() {
        this.group = { lines: [],
                       colms: [],
                       currColmIsEmpty: false,
                       color: this.board[this.line][this.colm],
                       previous:  { jMin: null,
                                    jMax: null,
                                    line: null,
                                    colms: [],
                                    colmIsEmpty: false // to enter the loop while
                                  },
                       current:   { jMin: null,
                                    jMax: null,
                                    line: null,
                                    colms: [],
                                    colmIsEmpty: false // to enter the loop while
                                  },
                       first:     { jMin: null,
                                    jMax: null,
                                    line: null,
                                    colms: [],
                                    colmIsEmpty: false // to enter the loop while
                                  },
                       liberties: { lines: [],
                                    colms: []
                                  }
                     };
    },
    assignGroupColmsInSameLine(line) {

        // using the "swiper" method:
        for (let jMinus = this.colm; jMinus >= 0; jMinus--) {
            if (this.board[line][jMinus] === this.group.color) {
                this.group.lines.push(line);
                this.group.colms.push(jMinus);
                this.group.current.colms.push(jMinus);
                this.group.current.colmIsEmpty = false;
                this.group.current.jMin = jMinus;
            } else {
                if (!this.board[line][jMinus] && checkLineColmIsValid(line, jMinus)) {
                    this.group.liberties.lines.push(line);
                    this.group.liberties.colms.push(jMinus);
                }
                break;
            }
        }

        for (let jPlus = this.colm + 1; jPlus <= 18; jPlus++) {
            if (this.board[line][jPlus] === this.group.color) {
                this.group.lines.push(line);
                this.group.colms.push(jPlus);
                this.group.current.colms.push(jPlus);
                this.group.current.colmIsEmpty = false;
                this.group.current.jMax = jPlus;
            } else {
                if (!this.board[line][jPlus] && checkLineColmIsValid(line, jPlus)) {
                    this.group.liberties.lines.push(line);
                    this.group.liberties.colms.push(jPlus);
                }
                break;
            }
        }
        // storing first line group data so that we don't process it
        // again in assignGroupStonesInAllLines() when switching from
        // line-- to line++
        if (line === this.line) {
            this.group.first = this.group.current;
        }
    },
    assignGroupStonesInAllLines() {
        this.createGroup();

        // for all lines, due to possible complex and intertwined
        // group shapes, check all colms of the same line (0 to 18):
        // if there is at least one stone in this line (!colmIsEmpty),
        // there may be several more in the next lines

        while (!this.group.previous.colmIsEmpty) {
            // going from this.line to lowest (most at left) line,
            // starting from this.line
            for (let iMinus = this.line; iMinus >= 0; iMinus--) {
                this.assignGroupColmsInSameLine(iMinus);
            }

            // backup old current to previous,
            this.group.previous = this.group.current;

            // empty old current so we can use it again for lines++
            this.group.current.jMin = this.colm;
            this.group.current.jMax = this.colm;
            this.group.current.line = line;
            this.group.current.colms = [];
            this.group.current.colmIsEmpty = true;
        }

        // going from this.line to highest (most at right) line,
        // starting from this.line + 1 (already did this.line, 
        // so we assign it as the previous line before this.line + 1)
        this.group.previous = this.group.first;

        while (!this.group.previous.colmIsEmpty) {
            for (let iPlus = this.line + 1; iPlus <= 18; iPlus++) {
                this.assignGroupColmsInSameLine(iPlus);
            }
        }

        // cleaning after all is done
        delete this.group.first;
        delete this.group.current;
        delete this.group.previous;
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
    updateStatus() {
       this.isFull = checkAndRefreshBoardIsFull();
    
        // we should not need to update these if we enforce
        // specific behaviour when they become true
        for (status in this.statuses) {
            if (status === "isFull") {
                for (let i = 0; i <= 18; i++) {
                    for (let j = 0; j <= 18; j++) {
                        if (!board[i][j]) {
                            this.statuses[status] = false;
                        }
                    }
                }
                this.statuses[status] = true;
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
    getOppositeColor() {
        return (this.player.color === "B" ? "W" : "B");
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
