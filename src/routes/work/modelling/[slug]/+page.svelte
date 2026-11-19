<!-- Modelling project detail (/work/modelling/[slug]). Layout lives in ProjectDetail. -->

<script>
	import ProjectDetail from '#lib/components/ProjectDetail.svelte';

	let { data } = $props();
</script>

<ProjectDetail project={data.project} />
