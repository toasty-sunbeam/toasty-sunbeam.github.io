<script>
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut, backOut } from 'svelte/easing';
  import DefragBlock from './DefragBlock.svelte';

  // Configuration
  export let name = 'JAMES';
  export let cellSize = 12;
  export let gap = 2;
  export let cols = 60;
  export let rows = 20;
  export let animationDuration = 600;
  export let staggerDelay = 15;

  let blocks = [];
  let targetPositions = new Set();
  let canvas;
  let mounted = false;

  // Each block's animated position
  let animatedBlocks = [];

  // Convert name text to grid coordinates using canvas pixel sampling
  function getNamePixels(text, cols, rows, cellSize) {
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');
    
    // Size canvas to match our grid
    offscreen.width = cols * cellSize;
    offscreen.height = rows * cellSize;
    
    // Draw text centered
    ctx.fillStyle = 'black';
    ctx.font = `bold ${rows * cellSize * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, offscreen.width / 2, offscreen.height / 2);
    
    // Sample pixels at grid positions
    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const filled = new Set();
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Sample center of each cell
        const x = Math.floor(col * cellSize + cellSize / 2);
        const y = Math.floor(row * cellSize + cellSize / 2);
        const idx = (y * offscreen.width + x) * 4;
        
        // Check alpha channel
        if (imageData.data[idx + 3] > 128) {
          filled.add(`${col},${row}`);
        }
      }
    }
    
    return filled;
  }

  // Generate scattered starting positions
  function generateScatteredPositions(count, cols, rows) {
    const positions = [];
    const used = new Set();
    
    for (let i = 0; i < count; i++) {
      let col, row, key;
      do {
        col = Math.floor(Math.random() * cols);
        row = Math.floor(Math.random() * rows);
        key = `${col},${row}`;
      } while (used.has(key));
      
      used.add(key);
      positions.push({ col, row });
    }
    
    return positions;
  }

  // Initialize blocks with scattered and target positions
  function initializeBlocks() {
    targetPositions = getNamePixels(name, cols, rows, cellSize);
    const targetArray = Array.from(targetPositions).map(key => {
      const [col, row] = key.split(',').map(Number);
      return { col, row };
    });
    
    // Sort targets for nice left-to-right, top-to-bottom defrag order
    targetArray.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    const scattered = generateScatteredPositions(targetArray.length, cols, rows);
    
    blocks = targetArray.map((target, i) => ({
      id: i,
      startCol: scattered[i].col,
      startRow: scattered[i].row,
      targetCol: target.col,
      targetRow: target.row,
    }));
    
    // Create tweened stores for each block
    animatedBlocks = blocks.map((block, i) => {
      const store = tweened(
        { col: block.startCol, row: block.startRow },
        { 
          duration: animationDuration,
          easing: backOut,
          delay: i * staggerDelay
        }
      );
      return { id: block.id, position: store };
    });
  }

  // Trigger the defrag animation
  export function defrag() {
    animatedBlocks.forEach((block, i) => {
      const target = blocks[i];
      block.position.set({ col: target.targetCol, row: target.targetRow });
    });
  }

  // Scatter blocks back to random positions
  export function scatter() {
    const scattered = generateScatteredPositions(blocks.length, cols, rows);
    animatedBlocks.forEach((block, i) => {
      block.position.set({ col: scattered[i].col, row: scattered[i].row });
    });
  }

  onMount(() => {
    initializeBlocks();
    mounted = true;
    
    // Auto-start defrag after a brief delay
    setTimeout(defrag, 500);
  });

  // Calculate pixel positions
  $: gridWidth = cols * (cellSize + gap);
  $: gridHeight = rows * (cellSize + gap);
</script>

<div class="defrag-container">
  <svg 
    width={gridWidth} 
    height={gridHeight} 
    viewBox="0 0 {gridWidth} {gridHeight}"
    class="defrag-grid"
  >
    {#if mounted}
      {#each animatedBlocks as block (block.id)}
        <DefragBlock position={block.position} {cellSize} {gap} />
      {/each}
    {/if}
  </svg>
</div>

<style>
  .defrag-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }

  .defrag-grid {
    background: transparent;
  }

  /* Optional: Add a subtle grid background */
  .defrag-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 14px 14px;
    pointer-events: none;
  }
</style>
