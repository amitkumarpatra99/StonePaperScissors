/** * SOUND ENGINE (Web Audio API)
 * Synthesizes sounds in real-time. No external files needed.
 */
const SoundFX = {
  ctx: null,
  enabled: true,
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playTone(freq, type, duration, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  playMoveX() {
    // High tech 'blip'
    this.playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1200, 'triangle', 0.1, 0.05), 50);
  },

  playMoveO() {
    // Deeper 'thud'
    this.playTone(200, 'sine', 0.15, 0.15);
    setTimeout(() => this.playTone(400, 'sine', 0.1, 0.1), 50);
  },

  playWin() {
    // Arpeggio
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.1), i * 100);
    });
  },

  playLose() {
    // Descending
    [400, 300, 200].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.3, 0.05), i * 150);
    });
  },

  playDraw() {
    this.playTone(300, 'square', 0.2, 0.05);
  },
  
  playClick() {
    this.playTone(800, 'sine', 0.05, 0.02);
  }
};

/**
 * GAME LOGIC
 */
const app = {
  boardEl: document.getElementById('board'),
  statusEl: document.getElementById('status'),
  difficultyEl: document.getElementById('difficulty'),
  scoreHumanEl: document.getElementById('scoreHuman'),
  scoreAIEl: document.getElementById('scoreAI'),
  scoreTieEl: document.getElementById('scoreTie'),
  
  state: {
    cells: Array(9).fill(''),
    human: 'X',
    ai: 'O',
    turn: 'X',
    history: [],
    scores: { h: 0, a: 0, t: 0 },
    gameOver: false,
    aiDelay: 400
  },

  init() {
    this.renderBoard();
    this.bindEvents();
    
    // Resume audio context on first click anywhere
    document.addEventListener('click', () => SoundFX.init(), { once: true });
  },

  renderBoard() {
    this.boardEl.innerHTML = '';
    this.state.cells.forEach((val, i) => {
      const cell = document.createElement('div');
      cell.className = `cell ${val ? 'disabled' : ''}`;
      cell.dataset.index = i;
      cell.innerHTML = val ? this.getSVG(val) : '';
      cell.onclick = () => this.handleHumanMove(i);
      this.boardEl.appendChild(cell);
    });
  },

  getSVG(type) {
    if (type === 'X') {
      return `<svg viewBox="0 0 100 100" class="mark-x" width="60" height="60"><path d="M20,20 L80,80 M80,20 L20,80" fill="none" /></svg>`;
    }
    return `<svg viewBox="0 0 100 100" class="mark-o" width="60" height="60"><circle cx="50" cy="50" r="35" fill="none" /></svg>`;
  },

  handleHumanMove(idx) {
    if (this.state.gameOver || this.state.cells[idx] !== '' || this.state.turn !== this.state.human) return;
    
    this.makeMove(idx, this.state.human);
    
    if (!this.state.gameOver) {
      this.statusEl.textContent = "AI Calculating...";
      this.statusEl.style.color = "var(--text-muted)";
      setTimeout(() => this.makeAIMove(), this.state.aiDelay);
    }
  },

  makeMove(idx, player) {
    this.state.cells[idx] = player;
    this.state.history.push({ idx, player });
    
    // Update UI for specific cell only
    const cell = this.boardEl.children[idx];
    cell.innerHTML = this.getSVG(player);
    cell.classList.add('disabled');

    // Sound
    player === 'X' ? SoundFX.playMoveX() : SoundFX.playMoveO();

    // Check Win
    const win = this.checkWin(this.state.cells);
    if (win) {
      this.endGame(win);
    } else if (this.state.cells.every(c => c !== '')) {
      this.endGame(null); // Draw
    } else {
      this.state.turn = player === 'X' ? 'O' : 'X';
      if(this.state.turn === this.state.human) {
         this.statusEl.textContent = "Your Turn";
         this.statusEl.style.color = "var(--primary)";
      }
    }
  },

  makeAIMove() {
    if(this.state.gameOver) return;

    const lvl = parseInt(this.difficultyEl.value);
    let moveIdx;

    if (lvl === 1) { // Random
      const empty = this.state.cells.map((v, i) => v === '' ? i : null).filter(v => v !== null);
      moveIdx = empty[Math.floor(Math.random() * empty.length)];
    } else if (lvl === 2) { // 70% Perfect
       if(Math.random() > 0.3) moveIdx = this.minimax(this.state.cells, this.state.ai).index;
       else {
         const empty = this.state.cells.map((v, i) => v === '' ? i : null).filter(v => v !== null);
         moveIdx = empty[Math.floor(Math.random() * empty.length)];
       }
    } else { // Impossible
      moveIdx = this.minimax(this.state.cells, this.state.ai).index;
    }

    this.makeMove(moveIdx, this.state.ai);
  },

  minimax(board, player) {
    const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
    
    // Check terminal states
    const win = this.checkWin(board);
    if (win && win.winner === this.state.ai) return { score: 10 };
    if (win && win.winner === this.state.human) return { score: -10 };
    if (empty.length === 0) return { score: 0 };

    const moves = [];
    for (let i of empty) {
      let newBoard = [...board];
      newBoard[i] = player;
      let result = this.minimax(newBoard, player === this.state.ai ? this.state.human : this.state.ai);
      moves.push({ index: i, score: result.score });
    }

    return player === this.state.ai 
      ? moves.reduce((best, m) => m.score > best.score ? m : best)
      : moves.reduce((best, m) => m.score < best.score ? m : best);
  },

  checkWin(board) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8], // rows
      [0,3,6],[1,4,7],[2,5,8], // cols
      [0,4,8],[2,4,6]          // diags
    ];
    for (let line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    return null;
  },

  endGame(winData) {
    this.state.gameOver = true;
    
    if (winData) {
      // Highlight line
      winData.line.forEach(idx => this.boardEl.children[idx].classList.add('win'));
      
      if (winData.winner === this.state.human) {
        this.statusEl.textContent = "VICTORY!";
        this.statusEl.style.color = "var(--success)";
        this.state.scores.h++;
        this.scoreHumanEl.textContent = this.state.scores.h;
        SoundFX.playWin();
      } else {
        this.statusEl.textContent = "DEFEAT";
        this.statusEl.style.color = "var(--secondary)";
        this.state.scores.a++;
        this.scoreAIEl.textContent = this.state.scores.a;
        SoundFX.playLose();
      }
    } else {
      this.statusEl.textContent = "DRAW";
      this.statusEl.style.color = "#fff";
      this.state.scores.t++;
      this.scoreTieEl.textContent = this.state.scores.t;
      SoundFX.playDraw();
    }
  },

  resetGame() {
    this.state.cells = Array(9).fill('');
    this.state.gameOver = false;
    this.state.history = [];
    this.state.turn = 'X';
    this.renderBoard();
    
    SoundFX.playClick();
    
    if (this.state.human === 'X') {
      this.statusEl.textContent = "Your Turn";
      this.statusEl.style.color = "var(--primary)";
    } else {
      this.statusEl.textContent = "AI Starting...";
      setTimeout(() => this.makeAIMove(), 600);
    }
  },

  bindEvents() {
    // New Game
    document.getElementById('newGame').onclick = () => this.resetGame();
    
    // Side Switch
    const btnX = document.getElementById('chooseX');
    const btnO = document.getElementById('chooseO');
    
    const setSide = (side) => {
      SoundFX.playClick();
      this.state.human = side;
      this.state.ai = side === 'X' ? 'O' : 'X';
      btnX.className = `btn switch-btn ${side === 'X' ? 'active' : ''}`;
      btnO.className = `btn switch-btn ${side === 'O' ? 'active' : ''}`;
      this.resetGame();
    };
    
    btnX.onclick = () => setSide('X');
    btnO.onclick = () => setSide('O');

    // Undo
    document.getElementById('undoBtn').onclick = () => {
      SoundFX.playClick();
      if(this.state.history.length < 2 || this.state.gameOver) return;
      
      // Remove last two moves (AI + Human)
      this.state.history.pop(); 
      this.state.history.pop();
      
      // Rebuild board
      this.state.cells = Array(9).fill('');
      this.state.history.forEach(m => this.state.cells[m.idx] = m.player);
      this.renderBoard();
    };

    // Reset Scores
    document.getElementById('resetScore').onclick = () => {
      SoundFX.playClick();
      this.state.scores = { h:0, a:0, t:0 };
      this.scoreHumanEl.textContent = 0;
      this.scoreAIEl.textContent = 0;
      this.scoreTieEl.textContent = 0;
    };

    // Speed
    document.getElementById('animSpeed').oninput = (e) => this.state.aiDelay = e.target.value;

    // Sound Toggle
    const sndBtn = document.getElementById('soundBtn');
    sndBtn.onclick = () => {
      SoundFX.enabled = !SoundFX.enabled;
      sndBtn.style.opacity = SoundFX.enabled ? '1' : '0.3';
    };
  }
};

// Start
app.init();