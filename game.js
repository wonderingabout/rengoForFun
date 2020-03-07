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
                          colm:   null, // ex: 4
                          row:    null, // ex: 3
                          move:   "",   // ex: "R16"
                          sgf:    "",   // ex: "jg" TODO, see https://en.wikipedia.org/wiki/Smart_Game_Format
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
                        };
        this.logs =     { played:  { colms:   [],
                                     rows:    [],
                                     moves:   [],
                                     gtps:    [],
                                     players: []
                                   },
                          removed: { "0": { colms: [],
                                            rows:  []
                                          },
                                     num: []
                                   },
                          sgf: ""
                        };
        this.tests =    { methods: { getNewBoard: this.getNewBoard,
                                     checkColmRowAreNotValid: this.checkColmRowAreNotValid,
                                     getAdjacentValidStones: this.getAdjacentValidStones,
                                     filterAdjacentStonesOpponent: this.filterAdjacentStonesOpponent,
                                     checkMoveWouldCaptureGroup: this.checkMoveWouldCaptureGroup,
                                     removeGroup: this.removeGroup,
                                     removeCapturableNearbyGroups: this.removeCapturableNearbyGroups,
                                   },
                          result: false
                        };
        this.testingMethods = [];
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
    convertColmRowToMoveString() {
        if (this.outputs.colm === "pass" && this.outputs.row === "pass") {
            this.outputs.move = "pass";
            return;
        } else {
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G',
                             'H', 'I', 'J', 'K', 'L', 'M', 'N',
                             'O', 'P', 'Q', 'R', 'S', 'T'];
            this.outputs.move = `${letters[this.outputs.colm]}${this.outputs.row + 1}`;
        }
    }
    convertColmRowToGtp() {
        // convert colm and row to GTP format
        // this.outputs.gtp
    }
    importNextMove() {
        this.fetchColmRow();
        this.convertColmRowToMoveString();
        this.convertColmRowToGtp();
    }
    checkAlreadyFilled() {
        return this.boards.game[this.inputs.colm][this.inputs.row];
    }
    checkRepeatedBoardPositionTwoAgo() {
        for (let i = 0; i < this.inputs.width; i++) {
            for (let j = 0; j < this.inputs.height; j++) {
                if (this.boards.game[i][j] !== this.boards.twoAgo[i][j]) return false;
            }
        }
        return true;
    }
    checkColmRowAreNotValid() {
        for (const [e, dimension] of [ [this.outputs.colm, this.outputs.width],
                                       [this.outputs.row, this.outputs.height] ]) {
            if (e < 0 || e > dimension) return false;
        }
        return true;
    }
    testMoveIsPlayable() {
        // return true if our move ends in a valid situation, else false.
        /* checks it("does not end up in a suicide"),
                  it("does not illicitly repeat a previous board position")
        */

        const testSuicide = new FakeGame();
        if (testSuicide.checkSuicide().test.result) {
            return { isPlayable: false,
                     message: `Invalid board move requested: move would `
                              + `result in a suicide, not allowed` };
        }
        delete testSuicide;

        if (this.checkRepeatedBoardPositionTwoAgo()) {
            const testSnapbackPosition = new FakeGame();
            const testSendTwoRepeatOne = new FakeGame();
    
            // ko rule
            if (!testSnapbackPosition.checkSnapbackPosition().tests.result &&
                !testSendTwoRepeatOne.checkSendTwoRepeatOne().tests.result) {
                return { isPlayable: false,
                         msg: `Invalid board move requested: can't recapture in a ko position` };
            }
            
            // superko rule (chinese)
            // https://senseis.xmp.net/?Superko
    
            // avoid double ko
            
            // and send two repeat one
        }

        return { isPlayable: true,
                 msg: "" };
    }
    getAdjacentValidStones() {
        // get all adjacent stones coordinates in array format,
        // minus the invalid ones
        return [ [this.inputs.colm    , this.inputs.row - 1],
                 [this.inputs.colm    , this.inputs.row + 1],
                 [this.inputs.colm - 1, this.inputs.row    ],
                 [this.inputs.colm + 1, this.inputs.row    ] 
                ].filter( ([c, r]) => [c, r].every( !this.checkColmRowAreNotValid(c, r) ) );
    }
    filterAdjacentStonesOpponent(adjacent) {
        return adjacent.filter( ([c, r]) => this.boards.game[c][r] === this.inputs.colors.opponent );
    }
    checkMoveWouldCaptureGroup(grp, c, r) {
        if (grp.liberties.colms.length === 1 &&
            grp.liberties.colms[0] === c &&
            grp.liberties.rows[0] === r) {
            return true;
        }
        return false;
    }
    removeGroup(grp) {
        // return the passed board with all stones of dead group removed, 
        // do not play our move
        for (i = 0; i < grp.colms.length; i++) {
            this.boards.game[grp.colms[i]][grp.rows[i]] = null;
            this.logs.removed[this.inputs.turn].colms.push(grp.colms[i]);
            this.logs.removed[this.inputs.turn].rows.push(grp.rows[i]);
        }
    }
    removeCapturableNearbyGroups() {
        const adjacentValid = this.getAdjacentValidStones();
        // remove empty and our group adjacent colors: we only capture opponent dead stones
        const adjacentOpponent = this.filterAdjacentStonesOpponent(adjacentValid);

        for ([c, r] of adjacentOpponent) {
            let colmsCaptured = 0;
            let rowsCaptured = 0;
            const grp = new Group(c, r, this.boards.game, this.outputs.width, this.outputs.height,
                                  this.outputs.colors, this.getNewBoard, this.checkColmRowAreNotValid);
            if (grp && this.checkMoveWouldCaptureGroup(grp, c, r)) {
                // remove dead group
                colmsCaptured = colmsCaptured + grp.colms.length;
                rowsCaptured = rowsCaptured + grp.rows.length;
                this.removeGroup(grp);
            }
        }
        this.logs.removed[this.inputs.turn].num = colmsCaptured;
    }
    playMove() {
        removeCapturableNearbyGroups();
        this.boards[this.inputs.colm][this.inputs.row] = this.player.color;
    }
    logPlayed() {
        this.logs.played.colms.push(this.outputs.colm);
        this.logs.played.rows.push(this.outputs.row);
        this.logs.played.moves.push(this.outputs.move);
        this.logs.played.gtps.push(this.outputs.gtp);
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

        this.inputs.queues.current.push(this.inputs.queues[0]);
        this.inputs.queues.current.shift();

        this.inputs.queues.opponent = this.inputs.queues.current;
        this.inputs.queues.current = temp;
    }
    updateInputs() {
        this.inputs.turn++;
        this.updateColors(); // need to update turn first to get correct color
        this.updateQueues();
        this.inputs.currentPlayer = this.inputs.queues.current[0];
    }
    createNextRemovedLogs() {
        if (!this.logs.removed[this.inputs.turn]) {
            this.logs.removed[this.inputs.turn] = { [this.inputs.turn]: { colms: [],
                                                                          rows:  []
                                                                        },
                                                                        num: []
                                                  };
        }
    }
    processTurn() {
        this.playMove();
        this.logPlayed();

        if (!this.checkPass()) {
            this.statuses.isFull = this.checkBoardIsFull();
        }
        this.updateBoards();
        this.updateInputs();
        this.createNextRemovedLogs();

        this.tests.result = false;
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
            this.logPlayed();

            this.inputs.turn++;
            this.inputs.queues.current.shift();
            this.inputs.currentPlayer = this.inputs.queues.current[0];
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
                if (this.checkAlreadyFilled()) {
                    this.showBoardMsg(`Invalid board move requested: already filled`);
                    continue;
                }
                // FakeGame tests
                this.tests.result = this.testMoveIsPlayable();
                if (!this.tests.result.isPlayable) {
                    this.showBoardMsg(this.tests.result.msg);
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
    constructor(boards, outputs, inputs, logs, tests) {
        this.boards = { ...boards };
        this.outputs = { ...outputs };
        this.inputs = { ...inputs };
        this.logs = { ...logs };

        this.tests = { result: tests.result };
        for (testMethod in tests.methods) {
            this[testMethod] = tests.methods[testMethod];
        }
        this.tests = tests;
        // check what would happen if we play the capture,
        // using a deep copy of the real board as well as
        // all other parameters fake copies if needed
    }

    checkSuicide() {
        // return true if no liberty is gained after playing in the last liberty of the group
        // TODO
    }
    checkSnapbackPosition() {
        // check if next player can capture the stone group that captured a group,
        // with a different number of captures for both players
        // this just checks if a position is a snapback position
        /*this.removeCapturableNearbyGroups();
        if (this.fake.group.liberties.colms.length === 1) {
            // next player (switchPlayer())
            this.fake.player.opponentColor = this.fake.player.color;
            this.fake.player.color = switchColor(this.fake.player.color);
            // next move
            this.fake.inputs.colm = this.fake.group.liberties.colms[0];
            this.fake.inputs.row = this.fake.group.liberties.rows[0];
            
            this.playFakeCaptures();
            // TODO: replace with this.fake.logs, replace moveNumber with this.fake.turn, increment this.fake.turn
            // we remove only our opponentColorStones !!!! can make code much smarter !!
            const currentMoveNumber = this.fake.logs.turn.length - 1;
            // can guess player color based on turn ratherthis.fake.logs.captures.color
            const currentTurnCapturesNumber  = this.fake.logs.captures[this.fake.logs.captures]
                                                   .colms[currentMoveNumber];
            const previousTurnCapturesNumber = this.fake.logs.captures[this.fake.captures.opponentColor]
                                                   .colms[moveNumber];
            if (previousTurnCapturesNumber !== currentTurnCapturesNumber) {
                return true;
            }
            return false;
        } TODO rewrite this*/
    }
    checkSendTwoRepeatOne() {
        // add specification
    }
}

///////////////////
////// Group //////
///////////////////

class Group {
    constructor(colm, row, gameBoard, width, height, colors, getNewBoard, checkColmRow) {
        if (gameBoard[x][y]) {
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
            this.checkColmRowAreNotValid = checkColmRow;

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
        if (this.checkColmRowAreNotValid()) return; // check if stone is out of board edges
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
