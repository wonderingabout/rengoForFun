// go game server:

"use strict";
// make a class later

const Game = {
    player: { color: "B",
              oppositeColor: "W",
              players: [],
              blackPlayers: [],
              whitePlayers: [],
              isTeam: false,
            },
    boards: { current:  [],
              previous: [],
              twoAgo:   []
            },
    createNewBoard() {
        this.boards.current = getNewBoard();
    },
    line: null, // ex: 4
    colm: null, // ex: 3
    move: "", // ex: "R16"
    lines: [],
    colms: [],
    moves: [],
    fetchLineColm(server) {
        this.line = server.line;
        this.colm = server.colm;
    },
    assignMove() {
        this.move = convertLineColmToMove(this.line, this.colm);
    },
    checkRepeatedBoardPosition() {
        return checkRepeatedBoardPositionTwoAgo(this.boards.current, this.boards.twoAgo);
    },
    assignGroup() {
        this.group = getGroup(this.line, this.colm, this.boards.current);
    },
    captures: { B: [],
                W: []
              },
    playCaptures() {
        captureCapturableNearbyGroups(this.boards.current, this.player.color,
                                      this.player.oppositeColor,
                                      this.captures, this.line, this.colm);
    },
    fakeCaptures() {
        // check what would happen if we play the capture,
        // using a deep copy of the real board as well as
        // all other parameters fake copies if needed
        const fakeBoard = { ...this.boards.current };
        const fakeCaptures = { ...this.captures };
        captureCapturableNearbyGroups(fakeBoard, this.player.color,
                                      this.player.oppositeColor,
                                      fakeCaptures, this.line, this.colm);
        
    },
    checkSnapbackPosition() {
        // check if next player can capture the stone that captured a stone,
        // with a different number of captures for both players
        
    },
    checkSuicide() {
        // return true if the move is played in the last liberty of the group
    },
    score: null,
    winner: null,
    checkPass() {
        return (this.move === "pass");
    },
    checkDoublePass() {
        return (this.checkPass() && (this.move === this.moves[this.moves.length - 1]));
    },
    statuses: { isFull: false,
                isPlaying: false,
                isScored: false,
                isResigned: false,
                isFinished: false
              },
    updateStatus() {
        for (status in this.statuses) {
            // we should not need to update these if we enforce
            // specific behaviour when they become true
            if (status === "isFull") {
                this.statuses[status] = checkBoardIsFull(this.boards.current);

            } else {
                this.statuses[status] = server.statuses[status];
            }
        }
    },
    updateBoards() {
        this.boards.twoAgo = this.boards.previous;
        this.boards.previous = this.boards.current;
        this.boards.current = getNewBoard();
    },
    playMove() {
        this.boards.current[this.line][this.colm] = this.player.color;
    
        // if (capture) capture and remove dead stones and add to captures count
        this.captureGroup();
    
        this.moves.push(this.move);
        this.lines.push(this.line);
        this.colms.push(this.colm);
    
    },
    switchPlayer() {
        this.player.oppositeColor = this.player.color;
        this.player.color = getOppositePlayer(this.player.color);
    },
    playGame() {
        createBoard();

        while (!this.gameState.values.some( (bool) => Boolean(bool)) ) {
            this.fetchLineColm(server);
            if (!this.checkPass()) {
                if (this.boards.current[this.line][this.colm]) {
                    this.showBoardMsg(`Invalid board move requested: already filled`);
                    continue;
                }
                if (this.checkSuicide()) {
                    this.showBoardMsg(`Invalid board move requested: move would result in `
                                      + `a suicide, not allowed`);
                    continue;
                }
                if (this.checkRepeatedBoardPositionTwoAgo()) {
                    // ko rule
                    if (!this.checkSnapback()) {
                        this.ShowBoardMsg(`Invalid board move requested: can't recapture in a ko position`);
                        continue;
                    }
                    // superko rule (chinese)
                    // https://senseis.xmp.net/?Superko
                    // avoid double ko and send two repeat one
                }
                this.playMove();
                this.switchPlayer();
                this.updateStatus();
                this.updateBoards();
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
    },
    showBoardMsg(msg, server) {
        // post msg through server API
    }
};

Game.playGame();

function convertLineColmToMove(line, colm) {
    if (line === "pass" && colm === "pass") {
        return "pass";
    } else {
        const letters = ["A", "B", "C", "D", "E", "F", "G",
                         "H", "I", "J", "K", "L", "M", "N",
                         "O", "P", "Q", "R", "S", "T"];
        return `${letters[line]}${colm + 1}`;
    }
}

function checkLineColmIsNotValid(line, colm) {
    return [line, colm].some( (e) => e < 0 || e > 19 );
}

function getNewBoard() {
    const newBoard = [];
    for (let i = 0; i <= 18; i++) {
        newBoard[i] = [];
        for (let j = 0; j <= 18; j++) {
            newBoard[i][j] = null;
        }
    }
    return newBoard;
}

function checkRepeatedBoardPositionTwoAgo(boardCurrent, boardTwoAgo) {
    for (let i = 0; i <= 18; i++) {
        for (let j = 0; j <= 18; j++) {
            if (boardCurrent[i][j] !== boardTwoAgo[i][j]) return false;
        }
    }
    return true;
}

function getNewGroup(x, y, gameBoard) {
    return { color: gameBoard[x][y],
             oppositeColor: getOppositeColor(gameBoard[x][y]),
             board: getNewBoard(),
             lines: [],
             colms: [],
             liberties: { lines: [],
                          colms: []
                        }
           };
}

// using recursion:
// example and initial recursion code are provided by @Dorus: https://github.com/Dorus
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
function fill(x, y, gameBoard, group) {
    if (checkLineColmIsNotValid(x, y)) return; // check if stone is out of board edges

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
}

function getAdjacentValidStones(line, colm) {
    // get all adjacent stones coordinates in array format,
    // minus the invalid ones
    return [ [line, colm - 1],
             [line, colm + 1],
             [line - 1, colm],
             [line + 1, colm] 
           ].filter( ([l, c]) => [l, c].every( !checkLineColmIsNotValid(l, c) ) );
}

function filterAdjacentStonesOppositeColor(adjacent, board, oppositeColor) {
    // remove empty and our group color: we only capture opposite color dead stones
    return adjacent.filter( ([l, c]) => board[l][c] === oppositeColor );
}

function getGroup(x, y, gameBoard) {
    // check if there is no stone (hence no group) in that position
    if (!gameBoard[x][y]) {
        return;
    }
    const group = this.getNewGroup(x, y, gameBoard);

    fill(x, y, gameBoard, group);
    delete group.board; // we don't need it anymore, we can recreate it anytime if needed with group coordinates
    return group;
}

function checkGroupIsCapturable(group, line, colm) {
    // TODO: need to add ko check
    if (group.liberties.lines.length === 1 &&
        group.liberties.lines[0] === line &&
        group.liberties.colms[0] === colm) {
        return true;
    }
    return false;
}

function removeGroup(group, board) {
    // return the passed board with all stones of dead group removed, 
    // do not play our move
    for (i in [...Array(group.lines.length)]) {
        const lines = group.lines;
        const colms = group.colms;
        board[lines[i]][colms[i]] = null;
    }
}

function captureCapturableNearbyGroups(board, playerColor, playerOppositeColor, captures, line, colm) {
    const adjacentValid = getAdjacentStones(line, colm);
    const adjacentOppositeColor = filterAdjacentStonesOppositeColor(adjacentValid,
                                  board, playerOppositeColor);
    let isCaptured = false;
    for ([l, c] of adjacentOppositeColor) {
        let linesCaptured = 0;
        let colmsCaptured = 0;
        let group = getGroup(l, c, board);
        if (checkGroupIsCapturable(group, l, c)) {
            removeGroup(group, board);
            linesCaptured = linesCaptured + group.lines.length;
            colmsCaptured = colmsCaptured + group.colms.length;
            isCaptured = true;
        }
    }
    if (isCaptured) {
        board[line][colm] = playerColor;
        captures[playerColor].push(linesCaptured);
        captures[playerOppositeColor].push(colmsCaptured);
    }
}

// TODO remaining:

function checkBoardIsFull(board) {
    for (let i = 0; i <= 18; i++) {
        for (let j = 0; j <= 18; j++) {
            if (!board[i][j]) {
                return false;
            }
        }
    }
    return true;
}

function getOppositeColor(color) {
    return (color === "B" ? "W" : "B");
}
