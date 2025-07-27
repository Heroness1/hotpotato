import React, { useState, useEffect } from 'react';
import { useStateTogether, useStateTogetherWithPerUserValues } from 'react-together';

// Mock Web3 functionality - replace with actual web3 library
const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0);
  const [connected, setConnected] = useState(false);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setAccount(accounts[0]);
        setConnected(true);
        // Mock balance - replace with actual balance check
        setBalance(Math.random() * 10 + 5);
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const payEntryFee = async () => {
    // Mock transaction - replace with actual smart contract call
    return new Promise((resolve) => {
      setTimeout(() => {
        setBalance(prev => prev - 0.1);
        resolve({ success: true, txHash: '0x' + Math.random().toString(16).substr(2, 64) });
      }, 2000);
    });
  };

  const distributePrizes = async (winners, amounts) => {
    // Mock prize distribution - replace with actual smart contract call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, txHash: '0x' + Math.random().toString(16).substr(2, 64) });
      }, 3000);
    });
  };

  return { account, balance, connected, connectWallet, payEntryFee, distributePrizes };
};

const HotPotatoGame = () => {
  // Wallet integration
  const { account, balance, connected, connectWallet, payEntryFee, distributePrizes } = useWallet();

  // Transaction states
  const [isJoining, setIsJoining] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  // Shared game state
  const [gameState, setGameState] = useStateTogether('gameState', {
    status: 'waiting', // 'waiting', 'playing', 'finished'
    players: [],
    potatoHolder: null,
    pot: 0,
    gameTimer: 60,
    startTime: null,
    winners: []
  });

  // Per-user state for joined status
  const [userState, setUserState] = useStateTogetherWithPerUserValues('userState', {
    hasJoined: false,
    playerId: null
  });

  const [localTimer, setLocalTimer] = useState(60);
  const [timeUntilNext, setTimeUntilNext] = useState(5);

  // Generate unique player ID
  const generatePlayerId = () => {
    return `player_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Join game function with real payment
  const joinGame = async () => {
    if (gameState.status !== 'waiting' || userState.hasJoined || !connected) return;

    if (balance < 0.1) {
      alert('Insufficient MON balance!');
      return;
    }

    setIsJoining(true);

    try {
      const result = await payEntryFee();

      if (result.success) {
        const playerId = generatePlayerId();
        const playerName = `${account.slice(0, 6)}...${account.slice(-4)}`;

        setGameState(prev => ({
          ...prev,
          players: [...prev.players, { 
            id: playerId, 
            name: playerName, 
            address: account,
            txHash: result.txHash 
          }],
          pot: prev.pot + 0.1
        }));

        setUserState({
          hasJoined: true,
          playerId: playerId
        });
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      alert('Transaction failed! Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Start game function
  const startGame = () => {
    if (gameState.players.length < 3) return;

    const randomPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)];

    setGameState(prev => ({
      ...prev,
      status: 'playing',
      potatoHolder: randomPlayer.id,
      startTime: Date.now(),
      gameTimer: 60
    }));
  };

  // Pass potato function
  const passPotato = () => {
    if (gameState.status !== 'playing') return;

    const availablePlayers = gameState.players.filter(p => p.id !== gameState.potatoHolder);
    if (availablePlayers.length === 0) return;

    const randomPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

    setGameState(prev => ({
      ...prev,
      potatoHolder: randomPlayer.id
    }));
  };

  // End game function with prize distribution
  const endGame = async () => {
    const winners = gameState.players.filter(p => p.id !== gameState.potatoHolder);
    const totalPrize = gameState.pot * 0.95; // 5% house fee
    const winAmount = winners.length > 0 ? totalPrize / winners.length : 0;

    setGameState(prev => ({
      ...prev,
      status: 'finished',
      winners: winners.map(w => ({ ...w, winAmount }))
    }));

    // Distribute prizes automatically
    if (winners.length > 0) {
      setIsDistributing(true);
      try {
        const winnerAddresses = winners.map(w => w.address);
        const amounts = winners.map(() => winAmount);

        await distributePrizes(winnerAddresses, amounts);
        console.log('Prizes distributed successfully!');
      } catch (error) {
        console.error('Failed to distribute prizes:', error);
      } finally {
        setIsDistributing(false);
      }
    }
  };

  // Reset game function
  const resetGame = () => {
    setGameState({
      status: 'waiting',
      players: [],
      potatoHolder: null,
      pot: 0,
      gameTimer: 60,
      startTime: null,
      winners: []
    });

    setUserState({
      hasJoined: false,
      playerId: null
    });

    setLocalTimer(60);
    setTimeUntilNext(5);
  };

  // Game timer effect
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
      const remaining = Math.max(0, 60 - elapsed);

      setLocalTimer(remaining);

      if (remaining <= 0) {
        endGame();
        return;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.startTime]);

  // Potato passing timer effect
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const interval = setInterval(() => {
      setTimeUntilNext(prev => {
        if (prev <= 1) {
          passPotato();
          return Math.random() * 3 + 3; // 3-6 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.status]);

  const currentPlayer = gameState.players.find(p => p.id === userState.playerId);
  const potatoHolderName = gameState.players.find(p => p.id === gameState.potatoHolder)?.name;
  const hasPotatoStatic = userState.playerId === gameState.potatoHolder;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-600 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">
            🥔 Hot Potato
          </h1>
          <p className="text-xl text-orange-100">
            Don't be the one holding the potato when time runs out!
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Wallet Connection */}
          {!connected && (
            <div className="text-center mb-8 p-6 bg-blue-50 rounded-xl">
              <h3 className="text-xl font-bold mb-4">Connect Your Wallet</h3>
              <button
                onClick={connectWallet}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
              >
                Connect MetaMask
              </button>
            </div>
          )}

          {connected && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Connected Wallet</p>
                  <p className="font-mono font-bold">{account}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Balance</p>
                  <p className="font-bold text-green-600">{balance.toFixed(2)} MON</p>
                </div>
              </div>
            </div>
          )}

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center bg-orange-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-orange-800">{gameState.players.length}</div>
              <div className="text-orange-600">Players</div>
            </div>
            <div className="text-center bg-green-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-800">{gameState.pot.toFixed(1)} MON</div>
              <div className="text-green-600">Prize Pool</div>
            </div>
            <div className="text-center bg-blue-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-800">{localTimer}s</div>
              <div className="text-blue-600">Time Left</div>
            </div>
          </div>

          {/* Game Status */}
          {gameState.status === 'waiting' && (
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Waiting for Players</h2>
              <p className="text-gray-600 mb-6">Entry fee: 0.1 MON • Minimum 3 players</p>

              {!userState.hasJoined ? (
                <button
                  onClick={joinGame}
                  disabled={!connected || balance < 0.1 || isJoining}
                  className={`font-bold py-4 px-8 rounded-xl text-xl transition-all transform hover:scale-105 ${
                    !connected || balance < 0.1 || isJoining
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isJoining ? '⏳ Processing...' : 'Join Game (0.1 MON)'}
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-green-600 font-semibold">✅ You're in the game!</p>
                  {gameState.players.length >= 3 && (
                    <button
                      onClick={startGame}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all transform hover:scale-105"
                    >
                      Start Game!
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {gameState.status === 'playing' && (
            <div className="text-center mb-8">
              <div className={`text-8xl mb-4 ${hasPotatoStatic ? 'animate-bounce' : ''}`}>
                🥔{hasPotatoStatic ? '🔥' : ''}
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {hasPotatoStatic ? '😱 YOU HAVE THE POTATO!' : `${potatoHolderName} has the potato`}
              </h2>
              <p className="text-gray-600 mb-4">
                Next pass in {Math.ceil(timeUntilNext)} seconds
              </p>
              <div className={`text-6xl font-bold ${localTimer <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                {localTimer}s
              </div>
            </div>
          )}

          {gameState.status === 'finished' && (
            <div className="text-center mb-8">
              <div className="text-8xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-4">Game Over!</h2>

              {isDistributing && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-blue-600 font-semibold">⏳ Distributing prizes...</p>
                </div>
              )}

              {gameState.winners.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xl">
                    <span className="text-red-600 font-bold">
                      {gameState.players.find(p => p.id === gameState.potatoHolder)?.name}
                    </span>
                    {' '}was left holding the potato! 🥔
                  </p>
                  <div className="bg-green-100 rounded-xl p-4">
                    <h3 className="text-xl font-bold text-green-800 mb-2">Winners!</h3>
                    {gameState.winners.map((winner, index) => (
                      <div key={index} className="text-green-700 font-mono">
                        {winner.name}: +{winner.winAmount.toFixed(3)} MON
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xl">No winners this round!</p>
              )}

              <button
                onClick={resetGame}
                className="mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
              >
                Play Again
              </button>
            </div>
          )}

          {/* Players List */}
          {gameState.players.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Players in Game</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gameState.players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg text-center font-semibold ${
                      player.id === gameState.potatoHolder
                        ? 'bg-orange-200 text-orange-800 border-2 border-orange-400'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    {player.name}
                    {player.id === gameState.potatoHolder && ' 🥔'}
                    {player.id === userState.playerId && ' (You)'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-orange-100">
          <p>Built with Multisynq & Monad Testnet</p>
        </div>
      </div>
    </div>
  );
};

export default HotPotatoGame;