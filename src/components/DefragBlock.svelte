<script>
  export let position;
  export let cellSize;
  export let gap;
</script>

<rect
  x={$position.col * (cellSize + gap)}
  y={$position.row * (cellSize + gap)}
  width={cellSize}
  height={cellSize}
  class="block"
  rx="2"
/>

<style>
  .block {
    fill: currentColor;
    filter: drop-shadow(0 0 2px currentColor);
  }
</style>
