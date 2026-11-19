<!-- Content creation project detail (/work/content-creation/[slug]). Layout lives in ProjectDetail. -->

<script>
	import ProjectDetail from '#lib/components/ProjectDetail.svelte';

	let { data } = $props();
</script>

<ProjectDetail project={data.project} />
