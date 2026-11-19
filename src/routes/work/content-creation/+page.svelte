<!--
  Content creation grid (/work/content-creation).
  Published content creation projects with filters: all, brands, concepts.
  Filters are links that set ?type=…, so a filtered view can be shared.
-->

<script>
	import { projectUrl } from '#lib/api.js';

	let { data } = $props();

	// Filter labels and the ?type= value each one sets (null = all)
	const filters = [
		{ label: 'All', type: null },
		{ label: 'Brands', type: 'brand' },
		{ label: 'Concepts', type: 'concept' }
	];
</script>

<h1>Content creation</h1>

<nav aria-label="Filter projects">
	{#each filters as filter (filter.label)}
		<a
			href={filter.type ? `?type=${filter.type}` : '/work/content-creation'}
			aria-current={data.type === filter.type ? 'page' : undefined}>{filter.label}</a
		>
	{/each}
</nav>

<ul>
	{#each data.projects as project (project.id)}
		<li><a href={projectUrl(project)}>{project.title}</a></li>
	{/each}
</ul>
