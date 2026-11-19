<!--
  Project detail layout, shared by /work/modelling/[slug] and
  /work/content-creation/[slug] so it's only built once.
  Shows title, brand, description and the gallery on the project's theme_color.
-->

<script>
	let { project } = $props();
</script>

<article style:background-color={project.theme_color}>
	<h1>{project.title}</h1>

	{#if project.brand_name}
		<p>
			{#if project.brand_logo_url}
				<img src={project.brand_logo_url} alt={project.brand_name} />
			{:else}
				{project.brand_name}
			{/if}
		</p>
	{/if}

	{#if project.description}
		<p>{project.description}</p>
	{/if}

	<!-- Gallery, already sorted by sort_order in getProjectBySlug -->
	{#each project.project_images as image (image.id)}
		<img src={image.image_url} alt={image.alt_text} />
	{/each}
</article>
