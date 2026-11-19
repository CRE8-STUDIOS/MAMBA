<!--
  Project grid with type filters, shared by /work/modelling and
  /work/content-creation. Filters are links that set ?type=…, so a filtered
  view can be shared; "All" links back to the page without a param.
-->

<script>
	import { page } from '$app/state';

	let { title, data } = $props();

	const labels = {
		brand: 'Brands',
		campaign: 'Campaign',
		runway: 'Runway',
		magazine: 'Magazine',
		concept: 'Concepts'
	};
</script>

<h1>{title}</h1>

<nav aria-label="Filter projects">
	<a href={page.url.pathname} aria-current={data.type ? undefined : 'page'}>All</a>
	{#each data.types as type (type)}
		<a href="?type={type}" aria-current={data.type === type ? 'page' : undefined}>{labels[type]}</a>
	{/each}
</nav>

<ul>
	{#each data.projects as project (project.id)}
		<li><a href={project.url}>{project.title}</a></li>
	{/each}
</ul>
