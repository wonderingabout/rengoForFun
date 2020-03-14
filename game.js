// go game engine (rengo)
// rules: "chinese"

"use strict";

///////////////////
////// Game ///////
///////////////////

class Game {
    constructor(width, height, handicap, komi, playersB, playersW) {
        this.outputs =  { width,
                          height,
                          handicap,
                          komi,
                          queues:  { B: playersB,
                                     W: playersW 
                                   },
                          colm:   null, // exs:   4  ,  16
                          row:    null, // exs:   3  ,  17
                          move:   ""    // exs: "dc" , "pq"
                        };
        this.boards =   { game:     [],
                          previous: [],
                          twoAgo:   []
                        },
        this.inputs =   { turn: 0,
                          queues:  { current:  [],
                                     opponent: []
                                   },
                          currentPlayer: "",
                          colors:  { color:    'B',
                                     opponent: 'W'
                                   },
                          adjacentValid: []
                        };
        this.logs =     { played:  { colms:   [],
                                     rows:    [],
                                     moves:   [],
                                     players: []
                                   },
                          removed: [ [], // colms captured at turn index
                                     []  // rows
                                   ],
                          totalCapturesForPlayer: [],
                        };
        this.group = {};
        this.tests = { getNewBoard: this.getNewBoard,
                       checkColmRowAreValid: this.checkColmRowAreValid,
                       getAdjacentValidStones: this.getAdjacentValidStones,
                       filterAdjacentStones: this.filterAdjacentStones,
                       checkMoveWouldCaptureGroup: this.checkMoveWouldCaptureGroup,
                       removeGroup: this.removeGroup,
                       updateTotalCapturesForPlayer: this.updateTotalCapturesForPlayer,
                       removeCapturableNearbyGroups: this.removeCapturableNearbyGroups,
                     };
        this.testResult = false;
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
    guessCurrentColor() {
        this.inputs.colors.color = ((this.inputs.turn - this.outputs.handicap) % 2 === 0 ? 'B' : 'W');
    }
    loadColors() {
        this.inputs.colors.color = this.guessCurrentColor();
        this.inputs.colors.opponent = (this.inputs.colors.color === 'B' ? 'W' : 'B');
    }
    loadQueues() {
        this.inputs.queues.current = this.outputs.queues[this.inputs.colors.color];
        this.inputs.queues.opponent = this.outputs.queues[this.inputs.colors.opponent];
    }
    fetchColmRow() {
        this.outputs.colm = server.colm;
        this.outputs.row = server.row;
    }
    convertColmRowToMove() {
        if (this.outputs.colm === '') {
            this.outputs.move = '';
        } else {
            const index_a = "a".codePointAt(0);
            const row =  String.fromCodePoint(index_a + this.outputs.colm);
            const colm = String.fromCodePoint(index_a + this.outputs.row);
            this.outputs.move = `${row}${colm}`;
            // "aa" to "ss", pass is ''
            // see: https://en.wikipedia.org/wiki/Smart_Game_Format
        }
    }
    importNextMove() {
        this.fetchColmRow();
        this.convertColmRowToMove();
    }
    getAdjacentValidStones() {
        // get all adjacent stones coordinates in array format,
        // minus the invalid ones
        return [ [this.inputs.colm    , this.inputs.row - 1],
                 [this.inputs.colm    , this.inputs.row + 1],
                 [this.inputs.colm - 1, this.inputs.row    ],
                 [this.inputs.colm + 1, this.inputs.row    ] 
               ].filter( ([c, r]) => this.checkColmRowAreValid(c, r) );
    }
    filterAdjacentStones(adjacent, targetColor) {
        return adjacent.filter( ([c, r]) => this.boards.game[c][r] === targetColor );
    }
    checkAlreadyFilled() {
        return this.boards.game[this.inputs.colm][this.inputs.row];
    }
    checkColmRowAreValid() {
        for (const [e, size] of [ [this.outputs.colm, this.outputs.width],
                                  [this.outputs.row, this.outputs.height] ]) {
            if (e < 0 || e > size - 1) return false;
        }
        return true;
    }
    defineOurGroup() {
        this.group = new Group(this.outputs.colm, this.outputs.row,
                               this.boards.current, this.outputs.width,
                               this.outputs.height, this.outputs.colors,
                               this.getNewBoard, this.checkColmRowAreValid);
    }
    checkMoveWouldCaptureGroup(grp, c, r) {
        if (grp.liberties.colms.length === 1 &&
            grp.liberties.colms[0] === c &&
            grp.liberties.rows[0] === r) {
            return true;
        }
        return false;
    }
    checkNearbyGroupsWouldBeCaptured() {
        // remove empty and our group adjacent colors: we only capture opponent dead stones
        const adjacentOpponent = this.filterAdjacentStones(this.inputs.adjacentValid, this.inputs.colors.opponent);

        for ([c, r] of adjacentOpponent) {
            const grp = new Group(c, r, this.boards.game, this.outputs.width, this.outputs.height,
                                  this.outputs.colors, this.getNewBoard, this.checkColmRowAreValid);
            if (this.checkMoveWouldCaptureGroup(grp, c, r)) {
                return true;
            }
        }
        return false;
    }
    removeGroup(grp, board) {
        // return the passed board with all stones of dead group removed, 
        // do not play our move
        for (i = 0; i < grp.colms.length; i++) {
            board[grp.colms[i]][grp.rows[i]] = null;
            this.logs.removed[this.inputs.turn][0].push(grp.colms[i]);
            this.logs.removed[this.inputs.turn][1].push(grp.rows[i]);
        }
    }
    updateTotalCapturesForPlayer() {
        if (this.inputs.turn < 2) {
            this.logs.totalCapturesForPlayer.push(this.inputs.removed[this.inputs.turn][0]);
        }
        const twoAgoCapturesNum = this.inputs.removed[this.inputs.turn - 2][0].length - 1;
        const currCapturesNum = this.inputs.removed[this.inputs.turn][0].length - 1;
        const total = twoAgoCapturesNum + currCapturesNum;
        this.logs.totalCapturesForPlayer.push(total);
    }
    removeCapturableNearbyGroups(board) {
        // remove empty and our group adjacent colors: we only capture opponent dead stones
        const adjacentOpponent = this.filterAdjacentStones(this.inputs.adjacentValid, this.inputs.colors.opponent);

        for ([c, r] of adjacentOpponent) {
            let colmsCaptured = 0;
            let rowsCaptured = 0;
            const grp = new Group(c, r, board, this.outputs.width, this.outputs.height,
                                  this.outputs.colors, this.getNewBoard, this.checkColmRowAreValid);
            if (this.checkMoveWouldCaptureGroup(grp, c, r)) {
                // remove dead group
                colmsCaptured = colmsCaptured + grp.colms.length;
                rowsCaptured = rowsCaptured + grp.rows.length;
                this.removeGroup(grp);
            }
        }
        this.updateTotalCapturesForPlayer();
    }
    checkSuicide() {
        // if our move can capture nearby groups, it can't be a suicide
        const moveCanCapture = this.checkNearbyGroupsWouldBeCaptured();
        if (moveCanCapture) return false;

        // if our group only has one liberty left and we play in it, it is a suicide
        if (this.group.liberties.colms.length === 1 &&
            this.group.liberties.colms[0] === this.outputs.colm &&
            this.group.liberties.rows[0] === this.outputs.row) {
            return true;
        }
        return false;
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
        if (this.checkAlreadyFilled()) {
            return { isPlayable: false,
                     message: `Invalid board move requested: already filled` };
        }

        this.inputs.adjacentValid = this.getAdjacentValidStones();
        const cardinalLiberties = this.filterAdjacentStones(this.inputs.adjacentValid, '');

        // no need to test our group if the move has has more than 2 cardinal liberties
        if (cardinalLiberties.colms.length < 2) {
            this.defineOurGroup();
            // no need to test our group if our group has more than 2 liberties
            // (then it cannot be suicide,
            // nor ko a ko stone has only one liberty)
            // TODO: handle send two repeat one exception separately
            if (this.group.liberties.colms.length < 2) {
                if (this.checkSuicide()) {
                    return { isPlayable: false,
                             message: `Invalid board move requested: move would `
                                      + `result in a suicide, not allowed` };
                }
                if (this.checkRepeatedBoardPositionTwoAgo()) {
                    // TODO: pass as little parameters as possible
                    const testSnapback = new FakeGame();
                    testSnapback.checkSnapbackPosition();
                    const isSnapback = testSnapback.testResult;
        
                    const testSendTwoRepeatOne = new FakeGame();
                    testSendTwoRepeatOne.checkSendTwoRepeatOne();
                    const isSendTwoRepeatOne = testSendTwoRepeatOne.testResult;
            
                    // ko rule
                    if (!isSnapback &&
                        !isSendTwoRepeatOne) {
                        return { isPlayable: false,
                                 msg: `Invalid board move requested: can't recapture in a ko position` };
                    }
                }
            }
        }

        return { isPlayable: true,
                 msg: "" };
    }
    playMove() {
        removeCapturableNearbyGroups();
        this.boards[this.inputs.colm][this.inputs.row] = this.player.color;
    }
    updateLogPlayed() {
        this.logs.played.colms.push(this.outputs.colm);
        this.logs.played.rows.push(this.outputs.row);
        this.logs.played.moves.push(this.outputs.move);
        this.logs.played.players.push(this.inputs.currentPlayer);
    }
    updateBoards() {
        this.boards.twoAgo = this.boards.previous;
        this.boards.previous = this.boards.game;
    }
    updateColors() {
        this.inputs.colors.opponent = this.players.colors.color;
        this.inputs.colors.color = guessCurrentColor();
    }
    updateQueues() {
        const temp = [...this.inputs.queues.opponent];

        this.inputs.queues.current.push(this.inputs.queues.current[0]);
        this.inputs.queues.current.shift();
        this.inputs.queues.opponent = this.inputs.queues.current;
        
        this.inputs.queues.current = temp;
    }
    createNewLogsRemoved() {
        this.logs.removed[this.inputs.turn] = [ [], // colms
                                                []  // rows
                                              ];
    }
    goToNextTurn() {
        this.inputs.turn++;

        this.updateBoards();
        this.updateColors(); // need to update turn first to get correct color
        this.updateQueues();
        this.createNewLogsRemoved();
        this.inputs.adjacentValid = [];
        this.inputs.currentPlayer = this.inputs.queues.current[0];
        this.testResult = false;

        this.group = {};
    }
    processTurn() {
        this.playMove();
        this.updateLogPlayed();

        this.goToNextTurn();
        if (!this.checkPass()) {
            this.statuses.isFull = this.checkBoardIsFull();
        }
    }

    checkPass() {
        return (this.move === '');
    }
    checkDoublePass() {
        return (this.checkPass() && (this.moves[this.moves.length - 2] === ''));
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
    preGame() {
        this.boards.game = this.getNewBoard();

        let whiteIndex = 0;
        for (let i = 0; i < this.outputs.handicap; i++) {
            if (whiteIndex > this.outputs.queues.W.length - 1) {
                whiteIndex = 0;
            }
            this.inputs.queues.current.push(this.outputs.queues.W[i]);
            whiteIndex++;
        }
        for (i = this.inputs.queues.current.length; i > 0; i--) {
            this.importNextMove();
            if (this.checkAlreadyFilled()) {
                this.showBoardMsg(`Invalid board move requested: already filled`);
                continue;
            }
            this.boards.game[this.inputs.colm][this.inputs.row];
            this.updateLogPlayed();

            this.inputs.turn++;
            // do not change color until first player plays all handicap stones
            this.inputs.queues.current.shift();
            this.inputs.currentPlayer = this.inputs.queues.current[0];
            this.createNewLogsRemoved();
        }
    }
    initializeGame() {
        this.loadColors(); // to get the correct queues, load colors first
        this.loadQueues();
        this.inputs.currentPlayer = this.inputs.queues.current[0];
    }
    scoreGame() {
        // let both players manually remove dead stones
        // until they both agree on score
    }
    endGame() {
        // update all data of the completed game before
        // we submit it to server
    }
    playGame() {
        this.preGame();
        this.initializeGame();
        
        while (!this.statuses.some( (bool) => !!bool )) {
            this.importNextMove();
            if (!this.checkPass()) {
                // Game tests

                const testResult = this.testMoveIsPlayable();
                if (!testResult.isPlayable) {
                    this.showBoardMsg(testResult.msg);
                    continue; // do not play invalid move, try again
                }
                this.processTurn();
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
                this.processTurn();
                continue;
            }
        }
    }
    uploadGameToServer(server) {
        // once the game has ended, upload it to server
    }
    showBoardMsg(msg, server) {
        // post msg through server API
    }
}

//////////////////////
////// FakeGame //////
//////////////////////

class FakeGame {
    constructor(boards, outputs, inputs, logs, group, tests, testResult) {
        this.boards = { ...boards };
        this.outputs = { ...outputs };
        this.inputs = { ...inputs };
        this.logs = { ...logs };
        this.group = { ...group };

        this.tests = tests;
        for (testMethod in tests) {
            this[testMethod] = tests[testMethod];
        }

        this.testResult = testResult;
        // check what would happen if we play the capture,
        // using a deep copy of the real board as well as
        // all other parameters fake copies if needed
    }
    checkSnapbackPosition() {
        // check if next player can capture the stone group that captured a group,
        // with a different number of captures for both players
        // this just checks if a position is a snapback position

        this.testResult = result;
    }
    checkSendTwoRepeatOne() {
        // TODO: add specification

        // superko rule (chinese)
        // https://senseis.xmp.net/?Superko
        // avoid double ko
        // and send two repeat one

        this.testResult = result;
    }
}

///////////////////
////// Group //////
///////////////////

class Group {
    constructor(colm, row, gameBoard, width, height, colors, getNewBoard, checkColmRow) {
        if (gameBoard[colm][row]) {
            // check if there is no stone (hence no group) in that position
            this.outputs =   { colm,
                               row,
                               width,
                               height
                             };
            this.boards =    { game:  gameBoard,
                               group: this.getNewBoard()
                             };
            this.inputs =    { colors };
            this.stones =    { colms: [],
                               rows:  []
                             };
            this.liberties = { colms: [],
                               rows:  []
                             };
            this.getNewBoard = getNewBoard;
            this.checkColmRowAreValid = checkColmRow;

            this.fill(this.outputs.colm, this.outputs.row);
            delete this.boards; // cleanup
        } else {
            return;
        }
    }
    fill(colm, row) {
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
        if (!this.checkColmRowAreValid()) return; // check if stone is out of board edges
        if (this.boards.game[colm][row] === this.inputs.colors.opponent) {
            return; // check if we found an opponent colored stone, not in our group
        }
        if (!this.boards.game[colm][row]) { // check if we found a liberty of the group
            this.boards.group[colm][row] = 'L';
            this.liberties.colms.push(colm);
            this.liberties.rows.push(row);
            return;
        }

        // else this.boards.GAME[colm][row] === this.outputs.colors.color,
        // do we want to add it to our GROUP board?
        if (this.boards.group[colm][row]) {
            return; // not if we have already done this spot before ("our color" or "L")
        }

        // all good, we can add this new stone in our group
        this.boards.group[colm][row] = this.inputs.colors.color;
        this.stones.colms.push(colm);
        this.stones.rows.push(row);
        // then check the leaves of that new stone of our group
        fill(colm    , row + 1);
        fill(colm    , row - 1);
        fill(colm + 1, row    );
        fill(colm - 1, row    );
    }
}
