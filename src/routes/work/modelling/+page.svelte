<!--
  Modelling grid (/work/modelling).
  Published modelling projects with filters: all, brands, campaign, runway,
  magazine. Filters are links that set ?type=…, so a filtered view can be shared.
-->

<script>
	import { projectUrl } from '#lib/api.js';

	let { data } = $props();

	// Filter labels and the ?type= value each one sets (null = all)
	const filters = [
		{ label: 'All', type: null },
		{ label: 'Brands', type: 'brand' },
		{ label: 'Campaign', type: 'campaign' },
		{ label: 'Runway', type: 'runway' },
		{ label: 'Magazine', type: 'magazine' }
	];
</script>

<h1>Modelling</h1>

<nav aria-label="Filter projects">
	{#each filters as filter (filter.label)}
		<a
			href={filter.type ? `?type=${filter.type}` : '/work/modelling'}
			aria-current={data.type === filter.type ? 'page' : undefined}>{filter.label}</a
		>
	{/each}
</nav>

<ul>
	{#each data.projects as project (project.id)}
		<li><a href={projectUrl(project)}>{project.title}</a></li>
	{/each}
</ul>
