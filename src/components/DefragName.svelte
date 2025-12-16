<script>
  import { onMount } from 'svelte';
  import DefragBlock from './DefragBlock.svelte';

  // Configuration
  export let name = 'JAMES';
  export let cellSize = 16;
  export let gap = 2;
  export let cols = 30;
  export let rows = 10;
  export let cursorSpeed = 5; // ms per cell
  export let flashDuration = 30; // ms

  let blocks = [];
  let targetPositions = new Set();
  let mounted = false;
  let cursorPos = { col: 0, row: 0 };
  let isDefragging = false;
  let flashingBlockId = null;

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

    const scattered = generateScatteredPositions(targetArray.length, cols, rows);

    blocks = targetArray.map((target, i) => ({
      id: i,
      col: scattered[i].col,
      row: scattered[i].row,
      targetCol: target.col,
      targetRow: target.row,
    }));
  }

  // Sleep utility
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Trigger the defrag animation with cursor
  export async function defrag() {
    if (isDefragging) return;
    isDefragging = true;
    cursorPos = { col: 0, row: 0 };

    // Scan left-to-right, top-to-bottom
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cursorPos = { col, row };

        // Check if there's a scattered block at this position
        const blockAtCursor = blocks.find(b => b.col === col && b.row === row);

        if (blockAtCursor && (blockAtCursor.col !== blockAtCursor.targetCol || blockAtCursor.row !== blockAtCursor.targetRow)) {
          // Flash the block
          flashingBlockId = blockAtCursor.id;
          await sleep(flashDuration);
          flashingBlockId = null;

          // Teleport to target position
          blockAtCursor.col = blockAtCursor.targetCol;
          blockAtCursor.row = blockAtCursor.targetRow;
          blocks = blocks; // Trigger reactivity
        }

        await sleep(cursorSpeed);
      }
    }

    isDefragging = false;
  }

  // Scatter blocks back to random positions
  export function scatter() {
    const scattered = generateScatteredPositions(blocks.length, cols, rows);
    blocks = blocks.map((block, i) => ({
      ...block,
      col: scattered[i].col,
      row: scattered[i].row,
    }));
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
      {#each blocks as block (block.id)}
        <rect
          x={block.col * (cellSize + gap)}
          y={block.row * (cellSize + gap)}
          width={cellSize}
          height={cellSize}
          class="block"
          class:flashing={flashingBlockId === block.id}
          rx="2"
        />
      {/each}

      {#if isDefragging}
        <rect
          x={cursorPos.col * (cellSize + gap)}
          y={cursorPos.row * (cellSize + gap)}
          width={cellSize}
          height={cellSize}
          class="cursor"
          rx="2"
        />
      {/if}
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

  .block {
    fill: currentColor;
    filter: drop-shadow(0 0 2px currentColor);
  }

  .block.flashing {
    fill: white;
    filter: drop-shadow(0 0 4px white);
  }

  .cursor {
    fill: none;
    stroke: hotpink;
    stroke-width: 2;
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
