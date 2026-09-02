<script lang="ts">
	// Il campo nascosto che dimostra che il modulo arriva da noi.
	// Va dentro **ogni** modulo che manda dati. Vedi src/lib/server/csrf.ts
	let { token }: { token: string } = $props();
</script>

<input type="hidden" name="csrf" value={token} />
