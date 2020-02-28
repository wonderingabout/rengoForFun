//go game server:

const board = {};
for (let i = 1; i <= 19; i++) {
    board[i] = null;
    for (let j = 1; j <= 19; j++) {
        board[j] = null;
    }
}

const playing = { player: { color: "B",
                            players: [],
                            blackPlayers: [],
                            whitePlayers: [],
                            isTeam: false,
                          },
                  moves: [], // ex: R16
                  lines: [], // ex: 4
                  colms: [], // ex: 3
                  gameState: { boardIsFull: false,
                               playingIsFinished: false,
                               scoringIsFinished: false,
                               isResigned: false,
                               gameIsFinished: false
                             },
                  captures: { B: [],
                              W: [],
                              current: 0
                            },
                  score: null,
                  winner: null
                };
 
while (!playing.gameState.values.some( (bool) => Boolean(bool)) ) {
    const move = getMove(server);
    const line = move.line;
    const colm = move.colm;
    if (board[line][colm]) {
        showBoardMsg(`Invalid board move requested: already filled`);
        continue;
    }
    // ko rule
    if (checkRepeatedMove(move, playing.moves) &&
        !checkSnapback(move)) {
        ShowBoardMsg(`Invalid board move requested: can't recapture in a ko position`);
        continue;
    }
    if (!playing.gameState.isResigned &&
        checkDoublePass(move, playing.moves)) { // double pass
        // both players can resign any turn,
        // handle resign update separately
        playMove(board, move, playing);
        switchStoneColor(playing.player);
        updateGameState(playing.gameState, board, server);
    } else {
        endGame(playing.gameState, server);
    }
}

console.log("Board is full, moving to scoring phase");
scoreGame(board, playing.gameState);
endGame(playing.gameState, server);

function showBoardMsg(msg) {
    // post msg through server API
}
 
function getMove(server) {
    return { move: server.move,
             line: server.line,
             colm: server.colm
           };
}

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

function updateGameState(gameState, board, server) {
    playing.boardIsFull = checkBoardIsFull(board);

    // we should not need to update these if we enforce
    // specific behaviour when they become true
    for (bool in gameState) {
        if (bool === "boardIsFull") {
            for (let i = 1; i <= 19; i++) {
                for (let j = 1; j <= 19; j++) {
                    if (!board[i][j]) {
                        gameState[bool] = true;
                }
            }
            gameState[bool] = false;
        }
        gameState[bool] = server.gameState[bool];
    }
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