// go game engine (rengo)
// rules: "chinese"

"use strict";

///////////////////
////// Game ///////
///////////////////

class Game {
    constructor(width, height, handicap, players) {
        this.outputs =  { width,
                          height,
                          handicap,
                          players,
                          line:   null, // ex: 4
                          colm:   null, // ex: 3
                          move:   "",   // ex: "R16"
                        };
        this.boards =   { game:     [],
                          previous: [],
                          twoAgo:   []
                        },
        this.inputs =   { turn: 0,
                          currentPlayer: '',
                          playingOrder: [],
                          colors:   { color: 'B',
                                      opponent: 'W'
                                    },
                          testMoveResult: false
                        };
        this.logs =     { played:  { lines:   [],
                                     colms:   [],
                                     moves:   [],
                                     players: []
                                   },
                          removed: { "0": { lines: [],
                                            colms: []
                                          },
                                     num: []
                                   }
                        };
        this.group =    {};
        this.fake =     {};
        this.statuses = { isFull: false,
                          isPlaying: false,
                          isScored: false,
                          isResigned: false, // server-only dependent
                          isFinished: false
                        };
        this.end =      { score: null,
                          winner: null
                        };
    }
    getNewBoard() {
        const newBoard = [];
        for (i = 0; i < this.outputs.width; i++) {
            newBoard[i] = new Array(this.outputs.height);
        }
        return newBoard;
    }
    getPlayingOrder() {
        // play alternatively no matter what the player number is on each side
        const lengthB = this.outputs.players.B.length;
        const lengthW = this.outputs.players.W.length;
        
    }
    checkLineColmAreNotValid() {
        for (const [e, dimension] of [ [this.outputs.line, this.outputs.width],
                                       [this.outputs.colm, this.outputs.height] ]) {
            if (e < 0 || e > dimension) return false;
        }
        return true;
    }
    convertLineColmToMoveString() {
        if (this.outputs.line === "pass" && this.outputs.colm === "pass") {
            this.outputs.move = "pass";
            return;
        } else {
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G',
                             'H', 'I', 'J', 'K', 'L', 'M', 'N',
                             'O', 'P', 'Q', 'R', 'S', 'T'];
            this.outputs.move = `${letters[this.outputs.line]}${this.outputs.colm + 1}`;
        }
    }
    updateOutputs(server) {
        this.outputs.line = server.line;
        this.outputs.colm = server.colm;
        this.outputs.move = this.convertLineColmToMoveString();
    }
    checkAlreadyFilled() {
        return this.boards.game[this.inputs.line][this.inputs.colm];
    }
    checkRepeatedBoardPositionTwoAgo() {
        for (let i = 0; i < this.inputs.width; i++) {
            for (let j = 0; j < this.inputs.height; j++) {
                if (this.boards.game[i][j] !== this.boards.twoAgo[i][j]) return false;
            }
        }
        return true;
    }
    testMoveIsPlayable() {
        // return true if our move ends in a valid situation, else false.
        /* checks it("does not fill already filled position"),
                  it("does not end up in a suicide"),
                  it("does not illicitly repeat a previous board position")
        */

        if (this.checkRepeatedBoardPositionTwoAgo()) {
            const isSnapbackPosition = this.checkSnapbackPosition();
            const isSendTwoRepeatOne = this.checkSendTwoRepeatOne();
    
            // ko rule
            if (!isSnapbackPosition && !isSendTwoRepeatOne) {
                return { isPlayable: false,
                         msg: `Invalid board move requested: can't recapture in a ko position` };
            }
            
            // superko rule (chinese)
            // https://senseis.xmp.net/?Superko
    
            // avoid double ko
            
            // and send two repeat one
        }
        if (this.checkSuicide()) {
            return { isPlayable: false,
                     message: `Invalid board move requested: move would `
                              + `result in a suicide, not allowed` };
        }
    }
    playMove() {
        this.updateOutputs();
        const captureIsPlayable = removeCapturableNearbyGroupsAndReturnResult(this.boards.game,
                                                                              this.inputs,
                                                                              this.outputs,
                                                                              this.logs);
        this.boards[this.inputs.line][this.inputs.colm] = this.player.color;




        this.logs.moves.push(this.move);
        this.logs.lines.push(this.inputs.line);
        this.logs.colms.push(this.inputs.colm);
        // log removed stones
        this.logs
        // no need to log our added move since we have it in lines and colms

    }
    updateBoards() {
        this.boards.twoAgo = this.boards.previous;
        this.boards.previous = this.boards.game;
    }
    updateColors() {
        this.inputs.colors.opponent = this.players.colors.color;
        this.inputs.colors.color = ((this.turn % 2 === 0) ? 'B' : 'W');
    }
    updatePlayers() {
        // update players playingTurn currentPlayer
    }
    updateInputs() {
        this.inputs.turn++;
        this.updateColors(); // need to update turns first to get correct color
        this.updatePlayers();
        this.testMoveResult = false;


this.logs =     { played:  { lines:   [],
                       colms:   [],
                       moves:   [],
                     },
            removed: { "0": { lines: [],
                              colms: []
                            },
                       num: []
                     }
          };

    }
    checkPass() {
        return (this.move === "pass");
    }
    checkDoublePass() {
        return (this.checkPass() && (this.moves[this.moves.length - 2] === "pass"));
    }
    checkBoardIsFull() {
        for (let i = 0; i < this.outputs.width; i++) {
            for (let j = 0; j < this.outputs.height; j++) {
                if (!this.boards.game[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }
    playGame() {
        this.outputs.width = server.width;
        this.outputs.height = server.height;
        this.boards.game = this.getNewBoard();
        this.playingOrder = this.getPlayingOrder();
        this.currentPlayer = this.playingOrder[0];

        while (!this.gameState.values.some( (bool) => !!bool )) {
            this.fetchLineColm(server);
            if (!this.checkPass()) {
                // Game tests
                if (this.checkAlreadyFilled()) {
                    this.showBoardMsg(`Invalid board move requested: already filled`);
                    continue;
                }
                // FakeGame tests
                this.testMoveResult = this.testMoveIsPlayable();
                if (!this.testMoveResult.isPlayable) {
                    this.showBoardMsg(this.testMoveResult.msg);
                    continue; // do not play invalid move, try again
                }
                this.playMove();

                this.statuses.isFull = this.checkBoardIsFull();
                this.updateBoards();
                this.updateInputs();
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
    }
    scoreGame() {
        // let both players manually remove dead stones
        // until they both agree on score
    }
    endGame() {
        // update all data of the completed game before
        // we submit it to server
    }
    uploadGameToServer(server) {
        // once the game has ended, upload it to server
    }
    showBoardMsg(msg, server) {
        // post msg through server API
    }
};

///////////////////
////// Group //////
///////////////////

class Group {
    constructor(line, colm, gameBoard, width, height, color, opponent) {
        if (gameBoard[x][y]) {
            // check if there is no stone (hence no group) in that position
            this.outputs =   { line,
                               colm,
                               width,
                               height
                             };
            this.boards =    { game:  gameBoard,
                               group: this.getNewBoard()
                             };
            this.inputs =    { colors: { color,
                                         opponent
                                       }
                             };
            this.stones =    { lines: [],
                               colms: []
                             };
            this.liberties = { lines: [],
                               colms: []
                             };
            this.fill(this.outputs.line, this.outputs.colm);
            delete this.boards; // cleanup
        } else {
            return;
        }
    }
    getNewBoard() {
        const newBoard = [];
        for (i = 0; i < this.outputs.width; i++) {
            newBoard[i] = new Array(this.outputs.height);
        }
        return newBoard;
    }
    checkLineColmAreNotValid() {
        for (const [e, dimension] of [ [this.outputs.line, this.outputs.width],
                                       [this.outputs.colm, this.outputs.height] ]) {
            if (e < 0 || e > dimension) return false;
        }
        return true;
    }
    fill(line, colm) {
        // using recursion:
        // example and initial recursion code are provided by @Dorus: https://github.com/Dorus
        // inspired on https://en.m.wikipedia.org/wiki/Flood_fill
        /*  example board (this.boards.game):

            ....
            WBB.
            .WB.
            ..W.

            group board example for x = 2 and y = 2:

            .LL.
            .BBL
            ..BL
            ....

        */
        if (this.checkLineColmAreNotValid()) return; // check if stone is out of board edges
        if (this.boards.game[line][colm] === this.inputs.colors.opponent) {
            return; // check if we found an opponent colored stone, not in our group
        }
        if (!this.boards.game[line][colm]) { // check if we found a liberty of the group
            this.boards.group[line][colm] = 'L';
            this.liberties.lines.push(line);
            this.liberties.colms.push(colm);
            return;
        }

        // else this.boards.GAME[line][colm] === this.outputs.colors.color,
        // do we want to add it to our GROUP board?
        if ((this.boards.group[line][colm] === this.outputs.colors.color) ||
            (this.boards.group[line][colm] === 'L')) {
            return; // not if we have already done this spot before
        }

        // all good, we can add this new stone in our group
        this.boards.group[line][colm] = this.inputs.colors.color;
        this.stones.lines.push(line);
        this.stones.colms.push(colm);
        // then check the leaves of that new stone of our group
        fill(line    , colm + 1);
        fill(line    , colm - 1);
        fill(line + 1, colm    );
        fill(line - 1, colm    );
    }
}

//////////////////////
////// FakeGame //////
//////////////////////

class FakeGame {
    constructor(boards, outputs, inputs, group, logs) {
        this.boards = { ...boards };
        this.outputs = { ...outputs };
        this.inputs = { ...inputs };
        this.group = { ...group };
        this.logs = { ...logs };
    }
    playFakeCaptures() {
        // check what would happen if we play the capture,
        // using a deep copy of the real board as well as
        // all other parameters fake copies if needed
        this.assignFakeSettings();
        removeCapturableNearbyGroupsAndReturnResult(this.fake.boards.game,
                                                    this.fake.outputs,
                                                    this.fake.inputs,
                                                    this.fake.logs);
    }
    checkSuicide() {
        // return true if no liberty is gained after playing in the last liberty of the group
        this.assignFakeSettings();
        // TODO
    }
    checkSnapbackPosition() {
        // check if next player can capture the stone group that captured a group,
        // with a different number of captures for both players
        // this just checks if a position is a snapback position
        this.assignFakeSettings();
        this.playFakeCaptures();
        if (this.fake.group.liberties.lines.length === 1) {
            // next player (switchPlayer())
            this.fake.player.opponentColor = this.fake.player.color;
            this.fake.player.color = getOpponentColor(this.fake.player.color);
            // next move
            this.fake.inputs.line = this.fake.group.liberties.lines[0];
            this.fake.inputs.colm = this.fake.group.liberties.colms[0];
            
            this.playFakeCaptures();
            // TODO: replace with this.fake.logs, replace moveNumber with this.fake.turn, increment this.fake.turn
            // we remove only our opponentColorStones !!!! can make code much smarter !!
            const currentMoveNumber = this.fake.logs.turn.length - 1;
            // can guess player color based on turn ratherthis.fake.logs.captures.color
            const currentTurnCapturesNumber  = this.fake.logs.captures[this.fake.logs.captures]
                                                   .lines[currentMoveNumber];
            const previousTurnCapturesNumber = this.fake.logs.captures[this.fake.captures.opponentColor]
                                                   .lines[moveNumber];
            if (previousTurnCapturesNumber !== currentTurnCapturesNumber) {
                return true;
            }
            return false;
        }
    }
    checkSendTwoRepeatOne() {
        // add specification
        this.assignFakeSettings();
    }
}








function getAdjacentValidStones(line, colm) {
    // get all adjacent stones coordinates in array format,
    // minus the invalid ones
    return [ [line, colm - 1],
             [line, colm + 1],
             [line - 1, colm],
             [line + 1, colm] 
           ].filter( ([l, c]) => [l, c].every( !checkLineColmAreNotValid(l, c) ) );
}

function filterAdjacentStonesOpponentColor(adjacent, board, opponentColor) {
    return adjacent.filter( ([l, c]) => board[l][c] === opponentColor );
}

function checkCurrentMoveWouldCaptureGroup(group, line, colm) {
    if (group.liberties.lines.length === 1 &&
        group.liberties.lines[0] === line &&
        group.liberties.colms[0] === colm) {
        return true;
    }
    return false;
}

function removeGroup(group, board, logs) {
    // return the passed board with all stones of dead group removed, 
    // do not play our move
    for (i = 0; i < group.lines.length; i++) {
        board[group.lines[i]][group.lines[i]] = null;
        logs
    }
}

function removeCapturableNearbyGroupsAndReturnResult(board, outputs, inputs, logs) {
    const adjacentValid = getAdjacentValidStones(inputs.line, inputs.colm);
    // remove empty and our group adjacent colors: we only capture opponentColor dead stones
    const adjacentOpponent = filterAdjacentStonesOpponentColor(adjacentValid, board,
                                                               inputs.colors.opponent);
    for ([l, c] of adjacentOpponent) {
        let linesCaptured = 0;
        let colmsCaptured = 0;
        const grp = new Group(l, c, board, outputs.width, outputs.height);
        if (checkCurrentMoveWouldCaptureGroup(group, l, c)) {
            // remove dead group
            removeGroup(group, board);
            linesCaptured = linesCaptured + group.lines.length;
            colmsCaptured = colmsCaptured + group.colms.length;
            isCaptured = true;
        }
    }
    captures[playerColor].lines.push(linesCaptured);
    captures[playerColor].lines.push(colmsCaptured);
    captures[playerOpponentColor].lines.push(0);
    captures[playerOpponentColor].lines.push(0);
}

function getOpponentColor(color) {
    return (color === 'B' ? 'W' : 'B');
} // TODO: guess player color based on turn number %2 or not
