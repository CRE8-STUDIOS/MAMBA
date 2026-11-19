<!--
  Content creation project detail (/work/content-creation/[slug]).
  The layout lives in ProjectDetail so both categories share it.
-->

<script>
	import ProjectDetail from '#lib/components/ProjectDetail.svelte';

	let { data } = $props();
</script>

<ProjectDetail project={data.project} />
