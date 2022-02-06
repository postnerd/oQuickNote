<script>
	import { onMount } from "svelte";

    export let clickHandler;
	export let bottom;
	export let disabled;
	export let isTransparent = false;
	
	let button;

	onMount(() => {
		button.addEventListener("mouseenter", () => {
			if (isTransparent)
				button.classList.remove("transparent");
				button.classList.add("solid");
		});

		button.addEventListener("mousemove", () => {
			if (isTransparent)
				button.classList.remove("transparent");
				button.classList.add("solid");
		});

		button.addEventListener("mouseleave", () => {
			if (isTransparent)
				button.classList.remove("solid");
				button.classList.add("transparent");
		});
	});
</script>


<button bind:this="{button}" class="{isTransparent ? "transparent" : "solid"}" style="--bottom: {bottom}" on:click="{clickHandler}" {disabled}>
	<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-save" viewBox="0 0 16 16">
		<path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z"/>
	</svg>
</button>


<style>
	@keyframes fadeOut {
		from {opacity: 1;}
		to {opacity: 0.1;}
	}

	@keyframes fadeIn {
		from {opacity: 0.1;}
		to {opacity: 1;}
	}

	button {
		position:fixed;
		width:45px;
		height:45px;
		bottom:var(--bottom);
		right:20px;
		background-color:#3d95e1;
		color:#FFF;
		border-radius:50px;
		text-align:center;
        border: none;
	}

	button:disabled {
		background-color: gray;
	}

	.transparent {
		opacity: 0.1;
		animation-name: fadeOut;
		animation-duration: 1s;
	}

	.solid {
		opacity: 1;
		animation-name: fadeIn;
		animation-duration: 1s;
	}
</style>