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
    line: -1, // ex: 4
    colm: -1, // ex: 3
    move: "", // ex: "R16"
    lines: [],
    colms: [],
    moves: [],
    getLineColm(server) {
        this.line = server.line,
        this.colm = server.colm
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
        return (this.captures.length - 1 !== fakeCapture);
    },
    getAdjacentStonesCoordinates(line, colm) {
        return { left:   { isEdge:  line <= 0, 
                           line:    line - 1,
                           colm
                         },
                 right:  { isEdge:  line >= 18,
                           line:    line + 1,
                           colm
                         },
                 top:    { isEdge:  colm <= 0,
                           line,
                           colm:    colm - 1
                         },
                 bottom: { isEdge:  colm >= 18,
                           line,
                           colm:    colm + 1
                         }
               };
    },
    getAdjacentStonesInSameGroup(line, colm) {
        const adjacent = getAdjacentStonesCoordinates(line, colm);
        const adjacentInSameGroup = {};
        for (dir in adjacent) {
            if (!adjacent[dir].isEdge &&
                this.board[adjcent[dir].line][adjacent[dir].colm] === this.player.color) {
                adjacentInSameGroup[dir] = adjacent[dir];
            }
        }
        return adjacentInSameGroup;
    },
    // TODO:
    // getNearbyGroupStones() {}
    // getAllStonesOfGroup() {}
    //
    // getGroupLiberties() {}
    captures: { B: [],
                W: [],
                current: 0
              },
    fakeCaptureNewBoard() {
        // don't actually capture, return a copy of what
        // the future board would be if the capture happened 
    },
    captureGroup() {
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
                for (let i = 1; i <= 18; i++) {
                    for (let j = 1; j <= 18; j++) {
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
        // 
    },
    uploadGameToServer(server) {
        // once the game has ended, upload it to server
    }
};

Game.playGame();

 









function getNearbyGroupStones(parentLine, parentColm, board, player) {
    const groupStatus = { lines: [parentLine],
                          colms: [parentColm],
                          parentLine,
                          parentColm
                        };

    for (dir in getAdjacentStonesInSameGroup(parentLine, parentColm, board, player)) { // exit if no keys
        groupStatus.lines.push(adjacentInSameGroup[dir].line);
        groupStatus.colms.push(adjacentInSameGroup[dir].colm);
        const adjacentChildInSameGroup = getAdjacentStonesInSameGroup(adjacentInSameGroup[dir].line,
                                                                adjacentInSameGroup[dir].colm,
                                                                board, player);
        // increment adjacent when we're done with this dir and all its children
    }
    


}

function getCoordinateLiberties(line, colm, board) {
    const adjacent = getAdjacentStonesStatus(line, colm, board);
    const liberties = {};
    for (dir in adjacent) {
        if (!adjacent[dir].isEdge &&
            !adjacent[dir].content) {
            liberties[dir] = true;
        }
    }
    const libertiesTotal = Object.values(liberties)
                                 .reduce( (acc, curr) => (acc + curr), 0 );
    liberties.total = libertiesTotal;
    return liberties;
}

function getGroupLiberties(line, colm, board) {
}
 

 


