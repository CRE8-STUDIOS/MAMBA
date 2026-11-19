<!-- Content creation grid (/work/content-creation). Filters: all, brands, concepts. -->

<script>
	import ProjectGrid from '#lib/components/ProjectGrid.svelte';

	let { data } = $props();
</script>

<ProjectGrid title="Content creation" {data} />
