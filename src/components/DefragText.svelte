<script>
  import { onMount } from 'svelte';

  // Configuration
  export let text = ` 88888    db    8b    d8 888888 .dP"Y8     88  88    db    88""Yb 88""Yb 88 .dP"Y8
    88   dPYb   88b  d88 88__   \`Ybo."     88  88   dPYb   88__dP 88__dP 88 \`Ybo."
o.  88  dP__Yb  88YbdP88 88""   o.\`Y8b     888888  dP__Yb  88"Yb  88"Yb  88 o.\`Y8b
"bodP' dP""""Yb 88 YY 88 888888 8bodP'     88  88 dP""""Yb 88  Yb 88  Yb 88 8bodP'
`;

  let displayGrid = [];
  let rows = 0;
  let cols = 0;
  let mounted = false;
  let cursorRow = 0;
  let cursorCol = 0;
  let charsPerFrame = 3; // Process multiple characters per frame
  let isDefragging = false;

  // Parse the ASCII art into a 2D grid with padding
  function parseText(text) {
    // Filter out empty lines at start and end
    const lines = text.split('\n').filter((line, i, arr) => {
      if (i === 0 && line.trim() === '') return false;
      if (i === arr.length - 1 && line.trim() === '') return false;
      return true;
    });
    const maxCols = Math.max(...lines.map(l => l.length));
    const paddedWidth = maxCols + 4; // 2 column padding on each side

    // Create padded rows from the text
    const contentRows = lines.map(line => {
      const chars = [' ', ' ', ...line.split('')]; // Add left padding
      // Pad to max width + right padding
      while (chars.length < paddedWidth) {
        chars.push(' ');
      }
      return chars;
    });

    // Add top padding row and bottom padding row
    const emptyRow = Array(paddedWidth).fill(' ');
    return [emptyRow, ...contentRows, emptyRow];
  }

  // Initialize with scattered positions
  function initializeGrid() {
    const targetGrid = parseText(text);
    rows = targetGrid.length;
    cols = targetGrid[0].length;

    // Collect all non-space characters with their positions
    const chars = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (targetGrid[r][c] !== ' ') {
          chars.push({
            char: targetGrid[r][c],
            targetRow: r,
            targetCol: c,
          });
        }
      }
    }

    // Generate scattered positions
    const allPositions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        allPositions.push({ row: r, col: c });
      }
    }

    // Shuffle positions
    for (let i = allPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    // Assign scattered positions to chars
    chars.forEach((char, i) => {
      char.currentRow = allPositions[i].row;
      char.currentCol = allPositions[i].col;
    });

    // Build display grid (spaces everywhere initially)
    displayGrid = Array(rows).fill(null).map(() => Array(cols).fill(' '));

    // Build junk grid with random characters for empty spaces
    junkGrid = Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => randomJunk())
    );

    // Place scattered chars
    chars.forEach(char => {
      displayGrid[char.currentRow][char.currentCol] = char.char;
    });

    return chars;
  }

  let chars = [];
  let scatteredChars = [];
  let junkGrid = []; // Grid of random junk characters for empty spaces

  // Characters to use for "junk" data in empty spaces (ASCII only for uniform width)
  const junkChars = '0123456789ABCDEFabcdef#@%&*+-=~^';

  // Generate random junk character
  function randomJunk() {
    return junkChars[Math.floor(Math.random() * junkChars.length)];
  }

  // Build a map of current positions for fast lookup
  function buildPositionMap() {
    const map = new Map();
    chars.forEach(ch => {
      map.set(`${ch.currentRow},${ch.currentCol}`, ch);
    });
    return map;
  }

  // Defrag animation - single cursor scanning left-to-right, top-to-bottom
  // Processes multiple characters per frame for speed
  export function defrag() {
    if (isDefragging) return;
    isDefragging = true;

    // Sort scattered chars by position (top-to-bottom, left-to-right)
    scatteredChars = chars
      .filter(ch => ch.currentRow !== ch.targetRow || ch.currentCol !== ch.targetCol)
      .sort((a, b) => {
        if (a.currentRow !== b.currentRow) return a.currentRow - b.currentRow;
        return a.currentCol - b.currentCol;
      });

    let positionMap = buildPositionMap();
    let charIndex = 0;

    function step() {
      if (charIndex >= scatteredChars.length) {
        isDefragging = false;
        return;
      }

      // Process multiple characters per frame
      for (let i = 0; i < charsPerFrame && charIndex < scatteredChars.length; i++) {
        const charHere = scatteredChars[charIndex];

        // Update cursor to this character's position
        cursorRow = charHere.currentRow;
        cursorCol = charHere.currentCol;

        // Check if there's a character at the target position
        const targetKey = `${charHere.targetRow},${charHere.targetCol}`;
        const charAtTarget = positionMap.get(targetKey);

        if (charAtTarget && charAtTarget !== charHere) {
          // Swap positions
          const oldKey = `${charHere.currentRow},${charHere.currentCol}`;

          charAtTarget.currentRow = charHere.currentRow;
          charAtTarget.currentCol = charHere.currentCol;
          displayGrid[charHere.currentRow][charHere.currentCol] = charAtTarget.char;

          // Update position map
          positionMap.set(oldKey, charAtTarget);
        } else {
          // Clear old position
          const oldKey = `${charHere.currentRow},${charHere.currentCol}`;
          displayGrid[charHere.currentRow][charHere.currentCol] = ' ';
          positionMap.delete(oldKey);
        }

        // Move to target
        charHere.currentRow = charHere.targetRow;
        charHere.currentCol = charHere.targetCol;
        displayGrid[charHere.targetRow][charHere.targetCol] = charHere.char;
        positionMap.set(targetKey, charHere);

        charIndex++;
      }

      displayGrid = displayGrid; // Trigger reactivity

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // Scatter the text
  export function scatter() {
    chars = initializeGrid();
  }

  onMount(() => {
    chars = initializeGrid();
    mounted = true;

    // Auto-start defrag after a brief delay
    setTimeout(defrag, 500);
  });
</script>

<div class="defrag-text">
  {#if mounted}
    <pre class="text-grid font-extrabold">{#each displayGrid as row, r}{#each row as char, c}<span
      class:cursor={isDefragging && cursorRow === r && cursorCol === c}
      class:junk={char === ' '}
      class:data={char !== ' '}
    >{char === ' ' ? junkGrid[r][c] : char}</span>{/each}
{/each}</pre>
  {/if}
</div>

<style>
  .defrag-text {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background: #331421;
    border-radius: 4px;
  }

  .text-grid {
    font-family: monospace;
    font-size: 14px;
    line-height: 1.2;
    margin: 0;
    white-space: pre;
  }

  .data {
    color: #ff8800;
  }

  .junk {
    color: #592239;
  }

  .cursor {
    background: hotpink;
    color: black;
  }
</style>
