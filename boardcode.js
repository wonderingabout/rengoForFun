// go game server:

// see also: https://mathjs.org/docs/datatypes/matrices.html

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
    LineColmToStringCoordinates() {
        const letters = ["A", "B", "C", "D", "E", "F", "G", "H",
                         "I", "J", "K", "L", "M", "N", "O", "P",
                         "Q", "R", "S", "T", "U", "V", "W"];
        this.move = `${letters[this.line]}${this.colm + 1}`;
    },
    captures: { B: [],
                W: [],
                current: 0
              },
    score: null,
    winner: null,
    statuses: { boardIsFull: false,
                playingIsFinished: false,
                scoringIsFinished: false,
                isResigned: false,
                gameIsFinished: false
              },
    updateGameState(server) {
       this.boardIsFull = checkAndRefreshBoardIsFull();
    
        // we should not need to update these if we enforce
        // specific behaviour when they become true
        for (status in this.statuses) {
            if (status === "boardIsFull") {
                for (let i = 1; i <= 19; i++) {
                    for (let j = 1; j <= 19; j++) {
                        if (!board[i][j]) {
                            this.statuses[status] = true;
                        }
                    }
                }
                this.statuses[status] = false;
            } else {
                this.statuses[status] = server.statuses[status];
            }
        }
    },
    showBoardMsg(msg) {
        // post msg through server API
    },
    playGame() {
        this.createBoard();

        while (!this.gameState.values.some( (bool) => Boolean(bool)) ) {
            this.getMove(server);

            if (this.board[line][colm]) {
                this.showBoardMsg(`Invalid board move requested: already filled`);
                continue;
            }
            // ko rule
            if (this.checkRepeatedMove() &&
                !this.checkSnapback()) {
                this.ShowBoardMsg(`Invalid board move requested: can't recapture in a ko position`);
                continue;
            }
            if (!this.gameState.isResigned &&
                this.checkDoublePass()) { // double pass
                // both players can resign any turn,
                // handle resign update separately
                this.playMove();
                this.switchStoneColor();
                this.updateGameState(server);
            } else {
                this.endGame(server);
            }
        }

        console.log("Moving to scoring phase");
        this.scoreGame();
        this.endGame(server);
    }
};

playing.playGame();

 











function checkRepeatedBoardPosition(move, moves) {
    // ...... repeated board position is more complex than just
    // checking move from 2 moves ago, should be able to backwards calculate
    // board as it was 2 moves ago
    return (moves[moves.length - 2] === move);
}

function checkSnapback(move, capturesLog) {
    const iMax = capturesLog.length - 1;
    //const fakeCapturesLog = ......................
    return capturesLog[iMax] !== capturesLog[iMax -1];
}

function checkDoublePass(move, moves) {
    return (moves[moves.length - 1] === move);
}

function playMove(board, move, player) {
    board[move.line][move.colm] = player.color;

    // if (capture) capture and remove dead stones and add to captures count
    /*captures: { B: [0],
        W: [0],
        current: 0,
    const currentCapturesNumber = 
    logs.captures[playing.player].push(currentCapturesNumber);
    logs.captures[playing.player].push(currentCapturesNumber);
    const oppositePlayer = getOppositePlayer(playing.player); 
    logs.captures[oppositePlayer].push(0);*/

    playing.moves.push(JSON.stringify(move));
    playing.lines.push(move.line);
    playing.colms.push(move.colm);

}

function getOppositePlayer(color) {
    return (color === "B" ? "W" : "B");
}

function switchPlayer(player) {
    player.color = getOppositePlayer(player.color);
}


function getAdjacentStonesCoordinates(line, colm) {
    return { left:   { isEdge:  line <= 1, 
                       line:    line - 1,
                       colm
                     },
             right:  { isEdge:  line >= 19,
                       line:    line + 1,
                       colm
                     },
             top:    { isEdge:  colm <= 1,
                       line,
                       colm:    colm - 1
                     },
             bottom: { isEdge:  colm >= 19,
                       line,
                       colm:    colm + 1
                     }
           };
}

function getAdjacentStonesInSameGroup(line, colm, board, player) {
    const adjacent = getAdjacentStonesCoordinates(line, colm);
    const adjacentInSameGroup = {};
    for (dir in adjacent) {
        if (!adjacent[dir].isEdge &&
            board[adjcent[dir].line][adjacent[dir].colm] === player.color) {
            adjacentInSameGroup[dir] = adjacent[dir];
        }
    }
    return adjacentInSameGroup;
}

function getGroupStatusFromStone(parentLine, parentColm, board, player) {
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

function getStoneLibertiesStatus(line, colm, board) {
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

function countGroupLiberties(line, colm, board) {
}
 
function captureGroup(line, colm, board) {
}
 
function fakeCaptureGroup(line, colm, board) {
}

function scoreGame(playing, server) {
}

function endGame(playing, server) {
}