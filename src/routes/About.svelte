<script lang="ts">
  import about from '../../content/about.json';
</script>

<section class="group about">
  <h2>{about.title}</h2>
  <p>{about.why}</p>
  <p>{about.thanks}</p>
  <p>
    {about.contactIntro}
    {#if about.contactUrl}
      <a href={about.contactUrl} target="_blank" rel="noopener noreferrer">{about.contact}</a>.
    {:else}
      {about.contact}.
    {/if}
  </p>
  <p>{about.donateIntro}</p>
  {#if about.donateUrl}
    <a class="btn" href={about.donateUrl} target="_blank" rel="noopener noreferrer">{about.donateLabel}</a>
    <p class="hint">{about.donateOffline}</p>
  {:else}
    <p class="hint">{about.donateLabel} link coming soon.</p>
  {/if}
</section>
