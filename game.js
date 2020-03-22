// go game engine (rengo)
// working on console (command-line) only for now

"use strict";

////////////////////
///// Settings /////
////////////////////

class Settings {
    constructor() {
        // do not take methods in the returned new object
        this.settings= {};

        this.assignDate();
        this.assignRules();
        this.promptGameSettings();
        this.promptPlayersQueues();
        this.createGameQueue();
    }
    assignDate() {
        const dateStr = new Date();

        const year   = dateStr.getFullYear();
        const month  = dateStr.getUTCMonth() + 1; // from 1 to 12
        const day    = dateStr.getUTCDate();

        this.settings.dateStr = `${year}-${month}-${day}`;
    }
    assignRules() {
        // only chinese rules are supported for now
        this.settings.rules = "chinese";
    }
    promptGameSettings() {
        const settingsToAsk = [ ["width"   ,  19,    1,  25],
                                ["height"  ,  19,    1,  25],
                                ["handicap",  0 ,    0,  18],
                                ["komi"    , 7.5, -361, 361]
                              ];
        for (const [setting, deft, min, max] of settingsToAsk) {
            let suitedDeft = deft;
            let suitedMin  = min;
            // beware: always ask handicap before komi, and width before height
            if (setting === "height" && this.settings.width === 1) {
                suitedDeft = 2;
                suitedMin  = 2;
            }
            if (setting === "komi" && this.settings.handicap > 0) {
                suitedDeft = 0.5;
            }
            const result = prompt(`Choose ${setting}`, suitedDeft).toFixed(1);
            if (typeof result !== "number") {
                console.log("Error: this is not a number, please enter a number");
                continue;
            }
            if (result < min || result > max) {
                console.log(`Error: the ${setting} specified is out of range of allowed`
                            + `values based on already entered values.`
                            + `\nMin is ${suitedMin}, max is ${max}`
                            + `\nplease enter an allowed value in that range`);
                continue;
            }
            this.settings[setting] = result;
        }
    }
    promptPlayersQueues() {
        this.settings.queues = {};
        let maxPlayersPerTeam = 4;
        for (const color of [ "black", "white"]) {
            for (i = 0; i < maxPlayersPerTeam; i++) {
                const player = prompt(`Please enter a player in ${color} team`
                                      + `\n(minimum players per team is 1 player,`
                                      + `maximum is 4 players):`, "");
                
                this.settings.queues[color].push(String(player).slice(0,20));
                if (i >= maxPlayersPerTeam) {
                    console.log(`Max players per team is ${maxPlayersPerTeam}, ${color} team is full !`
                                + `\nAll team players are: ${team.join(", ")}`);
                }
            }
        }
    }
    createGameQueue() {
        this.settings.queue = []; // game queue

        let blackCurrentIndex = 0;
        let whiteCurrentIndex = 0;

        const queueFinalLength = this.settings.queues.black.length * this.settings.queues.white.length;
        for (i = 0; i < queueFinalLength; i++) {
            if (i > this.settings.queues.black.length - 1) blackCurrentIndex = 0;
            if (i > this.settings.queues.white.length - 1) whiteCurrentIndex = 0;
            
            this.settings.queue.push(this.settings.queues.black[blackCurrentIndex],
                                     this.settings.queues.white[whiteCurrentIndex]);
            blackCurrentIndex++;
            whiteCurrentIndex++;
        }
    }
}

///////////////////
////// Board //////
///////////////////

class Board {
    constructor(width, height) {
        // do not create "boards" container
        this.game = [];

        // [height][width] is preferred over [width][height] to process
        // easily moves such as "Q4"  : (width: 16; height 4 ), not "4Q"
        //                      "D17" : (width: 4 ; height 17), not "17D"
        for (h = 0; h < height; h++) {
            this.game[h] = new Array(width);
        }
    }
}

//////////////////
////// Move //////
//////////////////

class Move {
    constructor(width, height, checkColmRowAreValid) {
        // do not take methods in the returned new object
        this.move = {};
        this.settings = { width,
                          height
                        };
        this.checkColmRowAreValid = checkColmRowAreValid;
        
        /* notes: - horizontal lines (rows, width) are numbers to write them in one grid char, same as OGS
                  - * vertical lines (colms, height) are capital letters from "A" to "T".
                    * For historical reasons, as well as for readability, the letter "I" is skipped not to
                      mistake it with "l".
                    * so we take the first 19 characters from "A" to "T" (skipping "I")
                  - sgf format uses small letters, and it includes "i" though, so the
                    first 19 characters go from "a" to "s"
                  - examples of move structure:
                        colm:   4  ,   16;
                        row:    3  ,   17;
                        text: "D3" , "Q17";
                        sgff: "dc" , "pq".
        */

        this.limits = { charCode: { min: "A".codePointAt(0),
                                    // from 1 to width, ex: from 1 to 19,
                                    // then adjust (+ 1) if higher than "I" to get the right character
                                    max: this.getColmCodePointAdjusted("A".codePointAt(0) + this.settings.width),
                                    exception: "I".codePointAt(0)
                                  },
                        num:      { min: 1,
                                    max: this.settings.height
                                  },
                        size:     { min: 2,
                                    max: 3
                                  }
                      };

        this.promptMoveText();
        this.parseMoveTextToColmRow();
        this.parseColmRowToSgff();
    }
    getColmCodePointAdjusted(currentWidthColm) {
        // add one to compensate if we skip "I":
        const currentCodePoint = currentWidthColm.codePointAt(0);
        if (currentCodePoint > "I".codePointAt(0)) {
            // "H" remains "H", ("I" is not allowed), "J" and higher all add 1
            // (ex: "J" -> "K")
            return currentCodePoint + 1;
        }
        return currentCodePoint;
    }
    getColmCodePointRaw(adjustedWidthColm) {
        // get back our initial unadjusted first character codePoint
        const adjustedCodePoint = adjustedWidthColm.codePointAt(0);
        if (adjustedCodePoint > "I".codePointAt(0)) {
            // "H" remains "H", ("I" is allowed), "J" and higher all substract 1
            // (ex: "J" -> "I", "K" -> "J", etc.)
            return adjustedCodePoint - 1;
        }
        return adjustedCodePoint;
    }
    checkMoveTextIsValid(text) {
        if (text !== '') { // pass

            // example of valid move : "Q16".
            // handle all exceptions:
            // not "q16", not "16Q", not "16q", not "ZA16", not "D99".

            if (typeof text !== "string") return false;
            if (text.length < this.limits.size.min ||
                text.length > this.limits.size.max) {
                return false;    
            }

            const charCode = text[0].codePointAt(0);
            if (charCode < this.limits.charCode.min ||
                charCode > this.limits.charCode.max) {
                return false;
            }
            if (charCode === this.limits.charCode.exception) return false;

            const fullNum = Number(text.slice(1));
            if (!isFinite(fullNum)) return false;

            if (fullNum < this.limits.num.min ||
                fullNum > this.limits.num.max) {
                return false;
            }
        }
        return true;
    }
    promptMoveText() {
        let text = "";
        while (!this.checkMoveTextIsValid(text)) {
            const exampleValidMove = `${this.limits.charCode.min}${Math.floor((this.limits.num.min + this.limits.num.max) / 2)}`;
            const errorMsg = `Please enter your move in a valid format:`
                             + `\n- first character: choose a CAPITAL LETTER between `
                             + `${this.limits.charCode.min} and ${this.limits.charCode.max}`
                             + `(${this.limits.charCode.exception} is not allowed).`
                             + `\n- second character: choose a number between `
                             + `${this.limits.num.min} and ${this.limits.num.max}.`
                             + `\nPress ENTER to pass`
                             + `\nFor example ${exampleValidMove}.`
                             + `\n\nYour move: `;
            text = prompt(errorMsg, "").trim();
        }
        this.move.text = text;
    }
    parseMoveTextToColmRow() {
        if (this.move.text === '') {
            this.move.colm = '';
            this.move.row = '';
        } else {
            // substract 1 if we skipped "I", we need to work with raw positions (include "I")
            // to get accurate colm position number
            const colmCodePointRaw  = this.getColmCodePointRaw(this.move.text[0].codePointAt(0));
            const widthCodePointRaw = "A".codePointAt(0) + this.settings.width;

            this.move.colm = widthCodePointRaw - colmCodePointRaw;
            // ex: A is at position 0 (A + 0), C is at position 2 (A + 2), D is at position 3 (A + 3)

            this.move.row =  Number(this.move.text.slice(1));
        }
    }
    parseColmRowToSgff() {
        // sgf move played syntax is from "aa" up to "zz" (for width and height 25),
        // pass is '',
        // see Sgf class for details.
        
        if (this.move.text === '') {
            this.move.sgff = '';
        } else {
            const colmSgff = "a".codePointAt(0) + this.move.colm;
            const rowSgff  = "a".codePointAt(0) + this.move.row;
            this.move.sgff = `${colmSgff}${rowSgff}`; // ex: "pq"
        }
    }
    /*parseColmRowToMove() {
        notes: we don't need this method for now as we play in console-only and
               we parse move line and colm based on move prompted (ex: "Q4").
               But we'll add it again when we run rengo on a website with a server.


        if (this.move.colm === '') {
            this.move.sgff = '';
        } else {
            const index_a = "a".codePointAt(0);
            const row =  String.fromCodePoint(index_a + this.move.colm);
            const colm = String.fromCodePoint(index_a + this.move.row);
            this.move.sgff = `${row}${colm}`;
        }
        
    }*/
}

//////////////////
////// Game //////
//////////////////

class Game {
    constructor() {
        console.log("Welcome on javascript rengo console !!\n Have a fun and have a nice game !!");

        this.settings = new Settings().settings;
        this.move  =    {};
        this.boards =   { game:     [],
                          previous: [],
                          twoAgo:   []
                        },
        this.inputs =   { turn: 0,
                          queue: [],
                          colors:   { color:    'B',
                                      opponent: 'W'
                                    },
                          adjacent: { adjacentValid: [],
                                      adjacentOpponent: []
                                    }
                        };
        this.logs =     { played:   { colms:   [],
                                      rows:    [],
                                      moves:   [],
                                      players: []
                                    },
                          removed:  [ [], // colms captured at turn index
                                      []  // rows
                                    ],
                          totalCapturesForPlayer: [],
                        };
        this.group = {};
        this.tests = { checkColmRowAreValid: this.checkColmRowAreValid,
                       checkMoveWouldCaptureGroup: this.checkMoveWouldCaptureGroup,
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
    guessCurrentColor() {
        this.inputs.colors.color = ((this.inputs.turn - this.settings.handicap) % 2 === 0 ? 'B' : 'W');
    }
    loadColors() {
        this.inputs.colors.color = this.guessCurrentColor();
        this.inputs.colors.opponent = (this.inputs.colors.color === 'B' ? 'W' : 'B');
    }
    loadQueue() {
        this.inputs.queue = this.settings.queue;
    }
    promptNewMove() {
        this.move = new Move(this.settings.width, this.settings.height);
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
    filterAdjacentStones(targetColor) {
        return this.inputs.adjacent.adjacentValid
               .filter( ([c, r]) => this.boards.game[c][r] === targetColor );
    }
    checkAlreadyFilled() {
        return this.boards.game[this.inputs.colm][this.inputs.row];
    }
    checkColmRowAreValid() {
        for (const [e, size] of [ [this.move.colm, this.settings.width],
                                  [this.move.row, this.settings.height] ]) {
            if (e < 0 || e > size - 1) return false;
        }
        return true;
    }
    defineOurGroup() {
        this.group = new Group(this.move.colm, this.move.row,
                               this.boards.current, this.settings.width,
                               this.settings.height, this.inputs.colors,
                               this.checkColmRowAreValid);
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
        for ([c, r] of this.inputs.adjacent.adjacentOpponent) {
            const grp = new Group(c, r, this.boards.game, this.settings.width, this.settings.height,
                                  this.inputs.colors, this.checkColmRowAreValid);
            if (this.checkMoveWouldCaptureGroup(grp, c, r)) {
                return true;
            }
        }
        return false;
    }
    removeGroup(grp) {
        // remove in game board all stones of dead group removed, 
        // do not play our move
        for (i = 0; i < grp.colms.length; i++) {
            board[grp.colms[i]][grp.rows[i]] = undefined;
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
    removeCapturableNearbyGroups() {
        for ([c, r] of this.inputs.adjacent.adjacentOpponent) {
            let colmsCaptured = 0;
            let rowsCaptured = 0;
            const grp = new Group(c, r, this.boards.game, this.settings.width, this.settings.height,
                                  this.inputs.colors, this.checkColmRowAreValid);
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
            this.group.liberties.colms[0] === this.move.colm &&
            this.group.liberties.rows[0] === this.move.row) {
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
                     message: "Invalid board move requested: already filled" };
        }

        this.inputs.adjacentValid = this.getAdjacentValidStones();
        // remove empty and our group adjacent colors: we only capture opponent dead stones
        this.inputs.adjacentOpponent = this.filterAdjacentStones(this.inputs.colors.opponent);

        const cardinalLiberties = this.filterAdjacentStones('');

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
                             message: "Invalid board move requested: move would "
                                      + "result in a suicide, not allowed" };
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
                                 msg: "Invalid board move requested: can't "
                                      + "recapture in a ko position" };
                    }
                }
            }
        }

        return { isPlayable: true,
                 msg: "" };
    }
    playMove(isRemove) {
        if (isRemove) removeCapturableNearbyGroups();
        this.boards[this.inputs.colm][this.inputs.row] = this.player.color;

        this.logs.played.colms.push(this.move.colm);
        this.logs.played.rows.push(this.move.row);
        this.logs.played.moves.push(this.move.move);
        this.logs.played.sgff.push(this.move.sgff);
        this.logs.played.players.push(this.inputs.queue[0]);
    }
    updateBoards() {
        this.boards.twoAgo = this.boards.previous;
        this.boards.previous = this.boards.game;
    }
    updateColors() {
        this.inputs.colors.opponent = this.players.colors.color;
        this.inputs.colors.color = guessCurrentColor();
    }
    updateQueue() {
        this.inputs.queue.push(this.inputs.queue[0]);
        this.inputs.queue.shift();
    }
    createNewAdjacent() {
        this.inputs.adjacentValid = [];
        this.inputs.adjacentOpponent = [];
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
        this.updateQueue();

        this.createNewAdjacent();
        this.createNewLogsRemoved();
        this.group = {};
        this.testResult = false;
    }
    processTurn() {
        this.playMove(true);

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
        for (let i = 0; i < this.settings.width; i++) {
            for (let j = 0; j < this.settings.height; j++) {
                if (!this.boards.game[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }
    preGame() {
        this.boards.game = new Board().game;

        let blackIndex = 0;
        for (let i = 0; i < this.settings.handicap; i++) {
            if (blackIndex > this.settings.queues.black.length - 1) {
                blackIndex = 0;
            }

            this.promptNewMove();
            if (this.checkAlreadyFilled()) {
                this.showBoardMsg("Invalid board move requested: already filled");
                continue;
            }
            this.playMove(false);

            this.turn++;
            // do not change color until first player plays all handicap stones
            this.createNewLogsRemoved();
            blackIndex++;
        }
    }
    initializeGame() {
        this.loadColors(); // to get the correct player data, load colors first
        this.loadQueue();
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
            this.promptNewMove();
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
                        //this.uploadGameToServer(server);
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

////////////////////
///// FakeGame /////
////////////////////

class FakeGame {
    constructor(board, move, inputs, logs, group, tests, testResult) {
        this.boards = { game: { ...board } };
        this.move = { ...move };
        this.inputs = { ...inputs };
        this.logs = { ...logs };
        this.group = { ...group };

        this.tests = tests;
        for (testMethod in tests) {
            this[testMethod] = tests[testMethod];
        }

        this.removeOnlyGroup = function (grp) {
            for (i = 0; i < grp.colms.length; i++) {
                this.boards.game[grp.colms[i]][grp.rows[i]] = undefined;
            }
        };

        this.removeOnlyCapturableNearbyGroups = function () {
            for ([c, r] of this.inputs.adjacent.adjacentOpponent) {
                const grp = new Group(c, r, this.boards.game, this.settings.width, this.settings.height,
                                      this.inputs.colors, this.checkColmRowAreValid);
                if (this.checkMoveWouldCaptureGroup(grp, c, r)) {
                    // remove dead group
                    this.removeOnlyGroup(grp);
                }
            }
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
        this.removeOnlyCapturableNearbyGroups();
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
    constructor(colm, row, gameBoard, width, height, colors, checkColmRow) {
        if (gameBoard[colm][row]) {
            // check if there is no stone (hence no group) in that position
            this.move =      { colm,
                               row,
                               width,
                               height
                             };
            this.boards =    { game:  gameBoard,
                               group: new Board().game
                             };
            this.inputs =    { colors };
            this.stones =    { colms: [],
                               rows:  []
                             };
            this.liberties = { colms: [],
                               rows:  []
                             };
            this.checkColmRowAreValid = checkColmRow;

            this.fill(this.move.colm, this.move.row);
            // delete this.boards; // cleanup, let garbage collector handle that
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

        // else this.boards.GAME[colm][row] === this.inputs.colors.color,
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

/////////////////
////// Sgf //////
/////////////////

/*TODO
class Sgf {
    constructor(width, height) {
        // do not take methods in the returned new object
        this.sgf = {};

        // details about sgf here: https://en.wikipedia.org/wiki/Smart_Game_Format
                                   https://www.red-bean.com/sgf/
                                   https://www.red-bean.com/sgf/go.html

    }
}*/