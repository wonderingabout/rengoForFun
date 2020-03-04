// go game engine (rengo)
// rules: "chinese"

"use strict";
// make a class later

const Game = {
    player: { color: "",
              oppositeColor: "",
              players: [],
              blackPlayers: [],
              whitePlayers: [],
              isTeam: false,
            },
    boards: { current:  [],
              previous: [],
              twoAgo:   []
            },
    line: null, // ex: 4
    colm: null, // ex: 3
    move: "", // ex: "R16"
    logs: { turn: 0,
            played:   { lines: [],
                        colms: [],
                        moves: []
                      },
            captures: { "0": { lines: [],
                               colms: [],
                             },
                      },
          },
    fetchLineColm(server) {
        this.line = server.line;
        this.colm = server.colm;
    },
    checkRepeatedBoardPosition() {
        return checkRepeatedBoardPositionTwoAgo(this.boards.current, this.boards.twoAgo);
    },
    fake: { board: [],
            line: 0,
            colm: 0,
            player: {},
            group: {},
            logs: {},
          },
    // make a class fakeGame later
    assignFakeSettings() {
        this.fake.board = { ...this.boards.current };
        this.fake.line = this.line;
        this.fake.colm = this.colm;
        this.fake.player.color = this.player.color;
        this.fake.player.oppositeColor = this.player.oppositeColor;
        this.fake.group = { ...this.group };
        this.fake.logs = { ...this.logs };
    },
    playFakeCaptures() {
        // check what would happen if we play the capture,
        // using a deep copy of the real board as well as
        // all other parameters fake copies if needed
        this.assignFakeSettings();
        removeCapturableNearbyGroupsAndReturnResult(this.fake.board, this.fake.player.color,
                                                   this.fake.player.oppositeColor,
                                                   this.fake.line, this.fake.colm,
                                                   this.fake.logs);
    },
    testMoveResult: false,
    getTestMoveIsPlayableResult() {
        // return true if our move ends in a valid situation, else false.
        /* checks it("does not fill already filled position"),
                  it("does not end up in a suicide"),
                  it("does not illicitly repeat a previous board position")
        */    
        if (this.boards.current[this.line][this.colm]) {
            return { isPlayable: false,
                     msg: `Invalid board move requested: already filled` };
        }
        if (this.checkSuicide()) {
            return { isPlayable: false,
                     message: `Invalid board move requested: move would `
                              + `result in a suicide, not allowed` };
        }
        if (this.checkRepeatedBoardPositionTwoAgo()) {
            const isSnapback = this.checkSnapback();
            const isDoubleKo = this.checkDoubleKo();
            const isSendTwoRepeatOne = this.checkSendTwoRepeatOne();

            // ko rule
            if (!isSnapback && !isDoubleKo && !isSendTwoRepeatOne) {
                return { isPlayable: false,
                         msg: `Invalid board move requested: can't recapture in a ko position` };
            }
            
            // superko rule (chinese)
            // https://senseis.xmp.net/?Superko

            // avoid double ko
            
            // and send two repeat one
        }
    },
    checkSnapbackPosition() {
        // check if next player can capture the stone group that captured a group,
        // with a different number of captures for both players
        // this just checks if a position is a snapback position
        this.assignFakeSettings();
        this.playFakeCaptures();
        if (this.fake.group.liberties.lines.length === 1) {
            // next player (switchPlayer())
            this.fake.player.oppositeColor = this.fake.player.color;
            this.fake.player.color = getOppositeColor(this.fake.player.color);
            // next move
            this.fake.line = this.fake.group.liberties.lines[0];
            this.fake.colm = this.fake.group.liberties.colms[0];
            
            this.playFakeCaptures();
            // TODO: replace with this.fake.logs, replace moveNumber with this.fake.turn, increment this.fake.turn
            // we remove only our oppositeColorStones !!!! can make code much smarter !!
            const currentMoveNumber = this.fake.logs.turn.length - 1;
            // can guess player color based on turn ratherthis.fake.logs.captures.color
            const currentTurnCapturesNumber  = this.fake.logs.captures[this.fake.logs.captures]
                                                   .lines[currentMoveNumber];
            const previousTurnCapturesNumber = this.fake.logs.captures[this.fake.captures.oppositeColor]
                                                   .lines[moveNumber];
            if (previousTurnCapturesNumber !== currentTurnCapturesNumber) {
                return true;
            }
            return false;
        }
    },
    checkDoubleKo() {
        // add specification
        this.assignFakeSettings();
    },
    checkSendTwoRepeatOne() {
        // add specification
        this.assignFakeSettings();
    },
    playMove() {
        removeCapturableNearbyGroupsAndReturnResult(this.boards.current,
            this.player.color, this.player.oppositeColor,
            this.line, this.colm, this.logs);
        this.boards[this.line][this.colm] = this.player.color;

        // TODO: add logs object later
        this.move = getConvertLineColmToMove(this.line, this.colm);
        this.logs.moves.push(this.move);
        this.logs.lines.push(this.line);
        this.logs.colms.push(this.colm);
        // log removed stones
        this.logs
        // no need to log our added move since we have it in lines and colms

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
        this.boards.current = getBoardNew();
    },
    switchPlayer() {
        this.player.oppositeColor = this.player.color;
        this.player.color = getOppositePlayer(this.player.color);
    },
    playGame() {
        this.boards.current = getBoardNew();

        while (!this.gameState.values.some( (bool) => !!bool )) {
            this.fetchLineColm(server);
            if (!this.checkPass()) {
                this.testMoveResult = this.getTestMoveIsPlayableResult();
                if (!this.testMoveResult.isPlayable) {
                    this.showBoardMsg(this.testMoveResult.msg);
                    continue; // do not play invalid move, try again
                }
                this.playMove();

                this.switchPlayer();
                this.updateStatus();
                this.updateBoards();
                this.turn++;
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

function getConvertLineColmToMove(line, colm) {
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

function getBoardNew() {
    const newBoard = [];
    for (let i = 0; i <= 18; i++) {
        newBoard[i] = [];
        for (let j = 0; j <= 18; j++) {
            newBoard[i][j] = null;
        }
    }
    return newBoard;
}

function getGroupNew(x, y, gameBoard) {
    return { color: gameBoard[x][y],
             oppositeColor: getOppositeColor(gameBoard[x][y]),
             board: getBoardNew(),
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
    return adjacent.filter( ([l, c]) => board[l][c] === oppositeColor );
}

function getGroup(x, y, gameBoard) {
    // check if there is no stone (hence no group) in that position
    if (!gameBoard[x][y]) {
        return;
    }
    const group = this.getGroupNew(x, y, gameBoard);

    fill(x, y, gameBoard, group);
    delete group.board; // we don't need it anymore, we can recreate it anytime if needed with group coordinates
    return group;
}

function checkCurrentMoveWouldCaptureGroup(group, line, colm) {
    if (group.liberties.lines.length === 1 &&
        group.liberties.lines[0] === line &&
        group.liberties.colms[0] === colm) {
        return true;
    }
    return false;
}

function checkSuicide(group, line, colm) {
    // return true if no liberty is gained after playing in the last liberty of the group
}

function checkRepeatedBoardPositionTwoAgo(boardCurrent, boardTwoAgo) {
    for (let i = 0; i <= 18; i++) {
        for (let j = 0; j <= 18; j++) {
            if (boardCurrent[i][j] !== boardTwoAgo[i][j]) return false;
        }
    }
    return true;
}

function removeGroup(group, board) {
    // return the passed board with all stones of dead group removed, 
    // do not play our move
    for (i = 0; i <= group.lines.length; i++) {
        const lines = group.lines;
        const colms = group.colms;
        board[lines[i]][colms[i]] = null;
    }
}

function removeCapturableNearbyGroupsAndReturnResult(board, playerColor, playerOppositeColor, line, colm, captures) {
    const adjacentValid = getAdjacentStones(line, colm);
    // remove empty and our group adjacent colors: we only capture oppositeColor dead stones
    const adjacentOppositeColor = filterAdjacentStonesOppositeColor(adjacentValid, board,
                                                                    playerOppositeColor);
    for ([l, c] of adjacentOppositeColor) {
        let linesCaptured = 0;
        let colmsCaptured = 0;
        let group = getGroup(l, c, board);
        if (checkCurrentMoveWouldCaptureGroup(group, l, c)) {
            if (!checkSuicide(group, l, c)) {
                // remove dead group
                removeGroup(group, board);
                linesCaptured = linesCaptured + group.lines.length;
                colmsCaptured = colmsCaptured + group.colms.length;
                isCaptured = true;
            } else {
                this.showBoardMsg(`Playing in last liberty of the group, not allowed`)
                return true;
            }
        }
    }
    captures[playerColor].lines.push(linesCaptured);
    captures[playerColor].lines.push(colmsCaptured);
    captures[playerOppositeColor].lines.push(0);
    captures[playerOppositeColor].lines.push(0);
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
