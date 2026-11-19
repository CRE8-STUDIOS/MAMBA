<!-- Modelling grid (/work/modelling). Filters: all, brands, campaign, runway, magazine. -->

<script>
	import ProjectGrid from '#lib/components/ProjectGrid.svelte';

	let { data } = $props();
</script>

<ProjectGrid title="Modelling" {data} />
