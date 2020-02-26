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
                  boardIsFull: false,
                  phaseIsFinished: false,
                  gameIsResigned: false,
                  gameHasEnded: false,
                  captures: { B: [],
                              W: [],
                              current: 0
                            },
                  score: null,
                  winner: null
                };
 
while (!playing.boardIsFull &&
       !playing.phaseIsFinished &&
       !playing.gameHasEnded) {
    const move = getMove(server);
    const line = move.line;
    const colm = move.colm;
    if (board[line][colm]) {
        showBoardMsg(`Invalid board move requested: already filled`);
        continue;
    }
    // ko rule
    if (playing.moves[playing.moves.length - 2] === playing.moves[playing.moves.length -1 ] &&
        !checkSnapback(move)) {
        ShowBoardMsg(`Invalid board move requested: can't recapture in a ko position`);
        continue;
    }
    if (!checkGameIsResigned(server)) {
        playMove(board, move, playing);
        switchStoneColor(playing);
        updatePlayingStatus(playing, server);
    } else {
        endGame(server);
    }
}

console.log("Board is full, moving to scoring phase");
scoreGame(playing);
endGame(playing, server);
 
function checkBoardIsFull(board) {
    for (let i = 1; i <= 19; i++) {
        for (let j = 1; j <= 19; j++) {
            if (!board[i][j]) return true;
        }
    }
    return false;
}
 
function checkPlayingPhaseIsFinished(server) {
    // double pass
}

function checkGameIsResigned(server) {
    // resign
}

function checkGameHasEnded(server) {
    // resign
    // scoring is finished
}

function showBoardMsg(msg) {
    // post msg through server API
}
 
function getMove(server) {
    return { line: server.line,
             colm: server.colm };
}
 
function playMove(board, move, player) {
    board[move.line][move.colm] = playing.player;

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

function switchPlayer(playingPlayer) {
    playingPlayer.color = getOppositePlayer(playingPlayer.color);
}

function updatePlayingStatus(playing, server) {
    // no need to refresh playing.player, use switchPlayer to change player.
    playing.boardIsFull = checkBoardIsFull(board);
    playing.phaseIsFinished = checkPlayingPhaseIsFinished(server);
    playing.gameIsResigned = checkGameIsResigned(server);
    playing.gameHasEnded = checkGameHasEnded(server);

    // no need to update captures, playMove() does it for us
    // no need to update score, scoreGame() does it for us
    // no need to update winner, endGame() does it for us
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

function getAdjacentStonesInSameGroup(adjacent, groupStatus, board, player) {
    for (dir in adjacent) {
        if (!adjacent[dir].isEdge &&
            board[adjcent[dir].line][adjacent[dir].colm] === player.color) {
            groupStatus.lines.push(adjcent[dir].line);
            groupStatus.colms.push(adjacent[dir].colm);            
        }
    }
}

function getGroupStatusFromStone(parentLine, parentColm, board, player) {
    const adjacent = getAdjacentStonesStatus(parentLine, parentColm, board);
    const groupStatus = { lines: [parentLine],
                          colms: [parentColm],
                          parentLine,
                          parentColm
                        };
    


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
 
function checkSnapback(move, capturesLog) {
    const iMax = capturesLog.length - 1;
    //const fakeCapturesLog = ......................
    return capturesLog[iMax] !== capturesLog[iMax -1];
}

function scoreGame(playing, server) {
}

function endGame(playing, server) {
}