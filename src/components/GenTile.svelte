<script lang="ts">
  // A tile linking to a tool or a list: bold label over a small status line. `req` highlights the status.
  let { href, label, sub, req = false }: { href: string; label: string; sub: string; req?: boolean } = $props();
</script>

<a class="gen" class:req {href}><b>{label}</b><small>{sub}</small></a>

<style>
  a.gen{text-decoration:none;color:inherit}
  .gen{min-height:82px;border-radius:14px;border:2px solid var(--line);background:var(--surface);text-align:left;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0}
  .gen b{font:800 clamp(17px,5vw,22px)/1.05 var(--f-display);text-transform:uppercase;letter-spacing:.01em}
  .gen small{font:500 11px/1.3 var(--f-mono);color:var(--muted);overflow-wrap:anywhere}
  .gen:active{transform:scale(.97)}
  .gen.req small{color:var(--accent)}
</style>
